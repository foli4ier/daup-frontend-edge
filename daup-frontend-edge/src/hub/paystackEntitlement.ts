/**
 * Browser side of Paystack. Checkout never writes payment_method_ok.
 * Confirm does, and only from the server verdict.
 */

import {
  PAYSTACK_NEED_EMAIL_LABEL,
  PAYSTACK_NOT_READY_LABEL
} from './copy';
import {
  loadPlaceEntitlement,
  loadPlaceEntitlements,
  patchPlaceEntitlement,
  type PlaceEntitlement
} from './entitlements';
import { REFERENCE_PATTERN, type PaystackVerdict } from './paystack';
import { savePlacePlan, type PlaceBundle, type PlaceCadence } from './placeSubscription';

export interface PaystackCheckoutResult {
  paid: false;
  authorizationUrl: string;
  message: string;
}

const KNOWN_MESSAGES = new Set([PAYSTACK_NOT_READY_LABEL, PAYSTACK_NEED_EMAIL_LABEL]);

export function paystackReturnReference(search?: string): string {
  const raw = search ?? (typeof window === 'undefined' ? '' : window.location.search);
  const params = new URLSearchParams(raw.startsWith('?') ? raw.slice(1) : raw);
  const reference = (params.get('reference') || params.get('trxref') || '').trim();
  return REFERENCE_PATTERN.test(reference) ? reference : '';
}

export function clearPaystackReturnQuery(): void {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  if (!url.searchParams.has('reference') && !url.searchParams.has('trxref')) return;
  url.searchParams.delete('reference');
  url.searchParams.delete('trxref');
  const next = `${url.pathname}${url.search}${url.hash}`;
  window.history.replaceState({}, '', next);
}

export function paystackReferencesOnThisHub(): string[] {
  const seen = new Set<string>();
  for (const row of Object.values(loadPlaceEntitlements())) {
    const reference = (row.paystack_reference || '').trim();
    if (REFERENCE_PATTERN.test(reference)) seen.add(reference);
  }
  return [...seen];
}

export function openPaystackCheckout(url: string): void {
  if (typeof window === 'undefined' || !url) return;
  try {
    window.location.assign(url);
  } catch {
    window.location.href = url;
  }
}

export async function startPaystackCheckout(args: {
  email: string;
  placeId: string;
  bundle: PlaceBundle;
  cadence: PlaceCadence;
}): Promise<PaystackCheckoutResult> {
  const callbackUrl = typeof window === 'undefined'
    ? ''
    : `${window.location.origin}${window.location.pathname}`;
  let response: Response;
  try {
    response = await fetch('/api/paystack/checkout', {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({
        email: args.email,
        placeId: args.placeId,
        bundle: args.bundle,
        cadence: args.cadence,
        callbackUrl
      })
    });
  } catch {
    return { paid: false, authorizationUrl: '', message: PAYSTACK_NOT_READY_LABEL };
  }
  let body: { message?: unknown; authorizationUrl?: unknown } = {};
  try {
    body = await response.json() as { message?: unknown; authorizationUrl?: unknown };
  } catch {
    body = {};
  }
  const authorizationUrl = typeof body.authorizationUrl === 'string' ? body.authorizationUrl : '';
  const message = typeof body.message === 'string' && KNOWN_MESSAGES.has(body.message)
    ? body.message
    : PAYSTACK_NOT_READY_LABEL;
  if (!response.ok || !authorizationUrl) {
    return { paid: false, authorizationUrl: '', message };
  }
  return { paid: false, authorizationUrl, message: '' };
}

export async function confirmPaystackReference(reference: string): Promise<PaystackVerdict | null> {
  if (!REFERENCE_PATTERN.test(reference)) return null;
  let response: Response;
  try {
    response = await fetch(`/api/paystack/confirm?reference=${encodeURIComponent(reference)}`, {
      headers: { accept: 'application/json' }
    });
  } catch {
    return null;
  }
  if (!response.ok) return null;
  try {
    return await response.json() as PaystackVerdict;
  } catch {
    return null;
  }
}

function placeForVerdict(verdict: PaystackVerdict): PlaceEntitlement | null {
  const placeId = (verdict.placeId || '').trim();
  if (placeId) {
    const direct = loadPlaceEntitlement(placeId);
    if (direct) return direct;
  }
  const reference = (verdict.reference || '').trim();
  if (!reference) return null;
  return Object.values(loadPlaceEntitlements()).find(row => row.paystack_reference === reference) || null;
}

/** Writes payment_method_ok only when Paystack confirmed, or clears a failed renewal. */
export function applyPaystackVerdict(verdict: PaystackVerdict): PlaceEntitlement | null {
  const current = placeForVerdict(verdict);
  if (!current) return null;
  if (verdict.paid) {
    if (verdict.bundle && verdict.cadence) {
      savePlacePlan(current.placeId, { bundle: verdict.bundle, cadence: verdict.cadence });
    }
    return patchPlaceEntitlement(current.placeId, {
      payment_method_ok: true,
      paystack_reference: verdict.reference,
      paystack_subscription_code: verdict.subscriptionCode,
      paid_until: verdict.paidUntil
    });
  }
  if (!verdict.clearPaid) return null;
  const tracked = Boolean(current.paystack_reference) || typeof current.paid_until === 'number';
  if (!tracked) return null;
  if (
    current.paystack_reference
    && verdict.reference
    && current.paystack_reference !== verdict.reference
  ) {
    return null;
  }
  return patchPlaceEntitlement(current.placeId, {
    payment_method_ok: false,
    paid_until: null
  });
}
