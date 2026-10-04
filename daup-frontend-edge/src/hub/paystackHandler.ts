/**
 * Paystack checkout and confirm for the Hub Worker.
 * The secret stays in PAYSTACK_SECRET_KEY. This module never logs it.
 * Checkout always answers paid: false. Confirm is the entitlement signal.
 * The webhook can verify Paystack's signature, then stops: place state
 * lives in the browser, so the hub confirms when the owner returns.
 */

import { PAYSTACK_NEED_EMAIL_LABEL, PAYSTACK_NOT_READY_LABEL } from './copy';
import {
  PAYSTACK_API,
  REFERENCE_PATTERN,
  asBundle,
  asCadence,
  decidePaystackEntitlement,
  expectedCharge,
  paystackReference,
  planFromReference,
  type PaystackChargeView,
  type PaystackInvoiceView,
  type PaystackSubscriptionView,
  type PaystackVerdict
} from './paystack';
import type { PlaceBundle, PlaceCadence } from './placeSubscription';

export interface PaystackEnv {
  PAYSTACK_SECRET_KEY?: string;
}

export interface PaystackHandlerDeps {
  fetch?: typeof fetch;
  now?: () => number;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' }
  });
}

function notReady(): Response {
  return json({ paid: false, clearPaid: false, message: PAYSTACK_NOT_READY_LABEL }, 503);
}

export async function paystackSignatureHex(secret: string, raw: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-512' },
    false,
    ['sign']
  );
  const signed = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(raw));
  return [...new Uint8Array(signed)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

function signaturesMatch(left: string, right: string): boolean {
  const a = left.trim().toLowerCase();
  const b = right.trim().toLowerCase();
  if (!a || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function secretFrom(env: PaystackEnv): string {
  return (env.PAYSTACK_SECRET_KEY || '').trim();
}

function epoch(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const ms = Date.parse(value);
    return Number.isFinite(ms) ? ms : null;
  }
  return null;
}

function readMetadata(value: unknown): {
  placeId: string | null;
  bundle: PlaceBundle | null;
  cadence: PlaceCadence | null;
  subscriptionCode: string | null;
} {
  let raw = value;
  if (typeof raw === 'string') {
    try {
      raw = JSON.parse(raw) as unknown;
    } catch {
      raw = null;
    }
  }
  if (!raw || typeof raw !== 'object') {
    return { placeId: null, bundle: null, cadence: null, subscriptionCode: null };
  }
  const row = raw as Record<string, unknown>;
  const placeId = typeof row.place_id === 'string' ? row.place_id.trim() : '';
  const subscription = row.subscription_code;
  return {
    placeId: placeId || null,
    bundle: asBundle(row.bundle),
    cadence: asCadence(row.cadence),
    subscriptionCode: typeof subscription === 'string' && subscription.trim() ? subscription.trim() : null
  };
}

function callbackUrl(value: unknown, origin: string): string | null {
  const raw = typeof value === 'string' && value.trim() ? value.trim() : origin;
  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
    return `${url.origin}${url.pathname}`;
  } catch {
    return null;
  }
}

function emailOk(value: unknown): value is string {
  return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

async function paystackGet(payFetch: typeof fetch, secret: string, path: string): Promise<unknown | null> {
  const response = await payFetch(`${PAYSTACK_API}${path}`, {
    method: 'GET',
    headers: { authorization: `Bearer ${secret}`, accept: 'application/json' }
  });
  if (!response.ok) return null;
  return response.json() as Promise<unknown>;
}

function chargeFrom(data: Record<string, unknown>, reference: string): PaystackChargeView {
  return {
    found: true,
    status: typeof data.status === 'string' ? data.status : null,
    amount: typeof data.amount === 'number' ? data.amount : null,
    currency: typeof data.currency === 'string' ? data.currency : null,
    paidAt: epoch(data.paid_at ?? data.paidAt ?? data.transaction_date),
    reference: typeof data.reference === 'string' ? data.reference : reference,
    channel: typeof data.channel === 'string' ? data.channel : null
  };
}

function subscriptionFrom(body: unknown, code: string): PaystackSubscriptionView | null {
  if (!body || typeof body !== 'object') return null;
  const data = (body as { data?: unknown }).data;
  if (!data || typeof data !== 'object') return null;
  const row = data as Record<string, unknown>;
  return {
    found: true,
    status: typeof row.status === 'string' ? row.status : null,
    amount: typeof row.amount === 'number' ? row.amount : null,
    code: typeof row.subscription_code === 'string' ? row.subscription_code : code,
    nextPaymentAt: epoch(row.next_payment_date)
  };
}

function invoiceFrom(data: Record<string, unknown>): PaystackInvoiceView | null {
  const invoice = data.invoice;
  if (!invoice || typeof invoice !== 'object') return null;
  const row = invoice as Record<string, unknown>;
  const status = typeof row.status === 'string' ? row.status : '';
  if (!status) return null;
  return {
    found: true,
    status,
    amount: typeof row.amount === 'number' ? row.amount : null,
    paidAt: epoch(row.paid_at ?? row.paidAt)
  };
}

async function postCheckout(
  request: Request,
  env: PaystackEnv,
  deps: PaystackHandlerDeps
): Promise<Response> {
  const secret = secretFrom(env);
  if (!secret) return notReady();
  let body: Record<string, unknown> = {};
  try {
    const parsed = await request.json() as unknown;
    if (parsed && typeof parsed === 'object') body = parsed as Record<string, unknown>;
  } catch {
    return json({ paid: false, message: PAYSTACK_NOT_READY_LABEL }, 400);
  }
  if (!emailOk(body.email)) {
    return json({ paid: false, message: PAYSTACK_NEED_EMAIL_LABEL }, 400);
  }
  const bundle = asBundle(body.bundle);
  const cadence = asCadence(body.cadence);
  const placeId = typeof body.placeId === 'string' ? body.placeId.trim() : '';
  if (!bundle || !cadence || !placeId) {
    return json({ paid: false, message: PAYSTACK_NOT_READY_LABEL }, 400);
  }
  const origin = new URL(request.url).origin;
  const callback = callbackUrl(body.callbackUrl, origin);
  if (!callback) return json({ paid: false, message: PAYSTACK_NOT_READY_LABEL }, 400);
  const now = deps.now ? deps.now() : Date.now();
  const reference = paystackReference(placeId, bundle, cadence, now);
  const { amountCents } = expectedCharge(bundle, cadence);
  const payFetch = deps.fetch ?? fetch;
  let upstream: Response;
  try {
    upstream = await payFetch(`${PAYSTACK_API}/transaction/initialize`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${secret}`,
        'content-type': 'application/json',
        accept: 'application/json'
      },
      body: JSON.stringify({
        email: body.email.trim(),
        amount: amountCents,
        currency: 'ZAR',
        reference,
        callback_url: callback,
        metadata: {
          place_id: placeId,
          bundle,
          cadence
        }
      })
    });
  } catch {
    return json({ paid: false, message: PAYSTACK_NOT_READY_LABEL }, 502);
  }
  let payload: unknown = null;
  try {
    payload = await upstream.json();
  } catch {
    payload = null;
  }
  const data = payload && typeof payload === 'object'
    ? (payload as { data?: { authorization_url?: unknown } }).data
    : null;
  const authorizationUrl = data && typeof data.authorization_url === 'string'
    ? data.authorization_url
    : '';
  if (!upstream.ok || !authorizationUrl) {
    return json({ paid: false, message: PAYSTACK_NOT_READY_LABEL }, 502);
  }
  return json({ paid: false, authorizationUrl, reference });
}

async function getConfirm(
  request: Request,
  env: PaystackEnv,
  deps: PaystackHandlerDeps
): Promise<Response> {
  const url = new URL(request.url);
  const reference = (url.searchParams.get('reference') || '').trim();
  if (!REFERENCE_PATTERN.test(reference)) {
    return json({ paid: false, clearPaid: false, reason: 'reference' }, 400);
  }
  const secret = secretFrom(env);
  if (!secret) return notReady();
  const payFetch = deps.fetch ?? fetch;
  const now = deps.now ? deps.now() : Date.now();
  let payload: unknown;
  try {
    payload = await paystackGet(payFetch, secret, `/transaction/verify/${encodeURIComponent(reference)}`);
  } catch {
    return json({ paid: false, clearPaid: false, reason: 'unreachable', reference }, 502);
  }
  const data = payload && typeof payload === 'object'
    ? (payload as { status?: unknown; data?: unknown }).data
    : null;
  if (!payload || !data || typeof data !== 'object') {
    const missing: PaystackVerdict = {
      paid: false,
      clearPaid: true,
      reason: 'missing',
      placeId: null,
      reference,
      subscriptionCode: null,
      bundle: null,
      cadence: null,
      paidUntil: null,
      channel: null
    };
    return json(missing);
  }
  const row = data as Record<string, unknown>;
  const meta = readMetadata(row.metadata);
  const fromReference = planFromReference(reference);
  const bundle = meta.bundle || fromReference?.bundle || null;
  const cadence = meta.cadence || fromReference?.cadence || null;
  if (!bundle || !cadence) {
    return json({
      paid: false,
      clearPaid: true,
      reason: 'amount',
      placeId: meta.placeId,
      reference,
      subscriptionCode: meta.subscriptionCode,
      bundle: null,
      cadence: null,
      paidUntil: null,
      channel: typeof row.channel === 'string' ? row.channel : null
    });
  }
  const expected = expectedCharge(bundle, cadence);
  let subscription: PaystackSubscriptionView | null = null;
  if (meta.subscriptionCode) {
    try {
      const subBody = await paystackGet(
        payFetch,
        secret,
        `/subscription/${encodeURIComponent(meta.subscriptionCode)}`
      );
      subscription = subscriptionFrom(subBody, meta.subscriptionCode);
    } catch {
      subscription = null;
    }
  }
  const verdict = decidePaystackEntitlement({
    now,
    expectedAmountCents: expected.amountCents,
    periodMs: expected.periodMs,
    placeId: meta.placeId,
    bundle,
    cadence,
    charge: chargeFrom(row, reference),
    subscription,
    invoice: invoiceFrom(row)
  });
  return json(verdict);
}

async function postWebhook(request: Request, env: PaystackEnv): Promise<Response> {
  const secret = secretFrom(env);
  if (!secret) return notReady();
  const raw = await request.text();
  const header = request.headers.get('x-paystack-signature') || '';
  const expected = await paystackSignatureHex(secret, raw);
  if (!signaturesMatch(expected, header)) {
    return json({ paid: false, applied: false }, 401);
  }
  return json({
    paid: false,
    applied: false,
    reason: 'The hub stores the place on this browser. It confirms the charge when you return.'
  });
}

export async function handlePaystackRequest(
  request: Request,
  env: PaystackEnv,
  deps: PaystackHandlerDeps = {}
): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, '') || '/';
  if (path === '/api/paystack/checkout' && request.method === 'POST') {
    return postCheckout(request, env, deps);
  }
  if (path === '/api/paystack/confirm' && request.method === 'GET') {
    return getConfirm(request, env, deps);
  }
  if (path === '/api/paystack/webhook' && request.method === 'POST') {
    return postWebhook(request, env);
  }
  return json({ paid: false }, 404);
}
