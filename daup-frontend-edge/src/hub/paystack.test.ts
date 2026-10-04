import { afterEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  PAYSTACK_NEED_EMAIL_LABEL,
  PAYSTACK_NOT_READY_LABEL,
  hasBannedDoorCopy
} from './copy';
import {
  loadPlaceEntitlement,
  paystackPeriodOpen,
  resolvePlaceSubscriptionStatus,
  savePlaceEntitlement,
  TRIAL_MS
} from './entitlements';
import {
  applyPaystackVerdict,
  paystackReturnReference,
  startPaystackCheckout
} from './paystackEntitlement';
import {
  handlePaystackRequest,
  paystackSignatureHex
} from './paystackHandler';
import {
  decidePaystackEntitlement,
  expectedCharge,
  paystackReference,
  planFromReference
} from './paystack';
import { PLACE_PLAN_KEY } from './placeSubscription';

const SECRET = 'sk_test_example_not_a_real_key';
const NOW = Date.parse('2026-10-04T12:00:00Z');
const here = dirname(fileURLToPath(import.meta.url));

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' }
  });
}

describe('Paystack entitlement', () => {
  afterEach(() => {
    localStorage.clear();
  });

  it('prices the locked plans in cents and keeps the account number out of the hub', () => {
    expect(expectedCharge('place', 'monthly').amountCents).toBe(19900);
    expect(expectedCharge('hosted-seed', 'monthly').amountCents).toBe(29900);
    expect(expectedCharge('both', 'monthly').amountCents).toBe(49800);
    expect(expectedCharge('both', 'annual').amountCents).toBe(498 * 12 * 90);
    const reference = paystackReference('co_olive', 'hosted-seed', 'annual', NOW);
    expect(reference).toBe(`ps.co-olive.hosted-seed.annual.${NOW}`);
    expect(reference).not.toContain('_');
    expect(planFromReference(reference)).toEqual({ bundle: 'hosted-seed', cadence: 'annual' });
    const tree = readFileSync(join(here, 'copy.ts'), 'utf8')
      + readFileSync(join(here, 'placeSubscription.ts'), 'utf8');
    expect(tree).not.toContain('2606460754');
    expect(tree).not.toContain('MR FRANS OLIVIER');
    expect(hasBannedDoorCopy(PAYSTACK_NOT_READY_LABEL + PAYSTACK_NEED_EMAIL_LABEL)).toBe(false);
  });

  it('treats card, Ozow, and Capitec Pay as paid only for the covered period', () => {
    const expected = expectedCharge('both', 'monthly');
    for (const channel of ['card', 'eft', 'capitec_pay']) {
      const verdict = decidePaystackEntitlement({
        now: NOW,
        expectedAmountCents: expected.amountCents,
        periodMs: expected.periodMs,
        placeId: 'co_olive',
        bundle: 'both',
        cadence: 'monthly',
        charge: {
          found: true,
          status: 'success',
          amount: 49800,
          currency: 'ZAR',
          paidAt: NOW,
          reference: 'ps.co-olive.both.monthly.1',
          channel
        }
      });
      expect(verdict.paid).toBe(true);
      expect(verdict.paidUntil).toBe(NOW + expected.periodMs);
      expect(verdict.channel).toBe(channel);
    }
  });

  it('does not leave a successful charge paid after the period, or on a mismatch', () => {
    const expected = expectedCharge('place', 'monthly');
    const expired = decidePaystackEntitlement({
      now: NOW + expected.periodMs,
      expectedAmountCents: expected.amountCents,
      periodMs: expected.periodMs,
      charge: {
        found: true,
        status: 'success',
        amount: 19900,
        currency: 'ZAR',
        paidAt: NOW,
        reference: 'ps.co-olive.place.monthly.1'
      }
    });
    expect(expired.paid).toBe(false);
    expect(expired.clearPaid).toBe(true);
    expect(expired.reason).toBe('period ended');

    const mismatch = decidePaystackEntitlement({
      now: NOW,
      expectedAmountCents: expected.amountCents,
      periodMs: expected.periodMs,
      charge: {
        found: true,
        status: 'success',
        amount: 100,
        currency: 'ZAR',
        paidAt: NOW,
        reference: 'ps.co-olive.place.monthly.1'
      }
    });
    expect(mismatch.paid).toBe(false);
    expect(mismatch.clearPaid).toBe(true);

    const pending = decidePaystackEntitlement({
      now: NOW,
      expectedAmountCents: expected.amountCents,
      periodMs: expected.periodMs,
      charge: { found: true, status: 'pending', amount: 19900, currency: 'ZAR', reference: 'other' }
    });
    expect(pending.paid).toBe(false);
    expect(pending.clearPaid).toBe(false);

    const failed = decidePaystackEntitlement({
      now: NOW,
      expectedAmountCents: expected.amountCents,
      periodMs: expected.periodMs,
      charge: { found: true, status: 'failed', amount: 19900, currency: 'ZAR', reference: 'ps.co-olive.place.monthly.1' }
    });
    expect(failed.paid).toBe(false);
    expect(failed.clearPaid).toBe(true);
  });

  it('lets an active subscription or paid invoice entitle, and a failed renewal does not', () => {
    const expected = expectedCharge('both', 'annual');
    const active = decidePaystackEntitlement({
      now: NOW,
      expectedAmountCents: expected.amountCents,
      periodMs: expected.periodMs,
      bundle: 'both',
      cadence: 'annual',
      charge: {
        found: true,
        status: 'success',
        amount: expected.amountCents,
        currency: 'ZAR',
        paidAt: NOW - expected.periodMs,
        reference: 'ps.co-olive.both.annual.1',
        channel: 'card'
      },
      subscription: {
        found: true,
        status: 'active',
        amount: expected.amountCents,
        code: 'SUB_olive',
        nextPaymentAt: NOW + 10 * 24 * 60 * 60 * 1000
      }
    });
    expect(active.paid).toBe(true);
    expect(active.reason).toBe('subscription');
    expect(active.subscriptionCode).toBe('SUB_olive');

    const attention = decidePaystackEntitlement({
      now: NOW,
      expectedAmountCents: expected.amountCents,
      periodMs: expected.periodMs,
      charge: {
        found: true,
        status: 'success',
        amount: expected.amountCents,
        currency: 'ZAR',
        paidAt: NOW,
        reference: 'ps.co-olive.both.annual.1'
      },
      subscription: { found: true, status: 'attention', code: 'SUB_olive', amount: expected.amountCents }
    });
    expect(attention.paid).toBe(false);
    expect(attention.clearPaid).toBe(true);

    const invoice = decidePaystackEntitlement({
      now: NOW,
      expectedAmountCents: 19900,
      periodMs: TRIAL_MS,
      invoice: { found: true, status: 'success', amount: 19900, paidAt: NOW }
    });
    expect(invoice.paid).toBe(true);
    expect(invoice.reason).toBe('invoice');

    const invoiceFailed = decidePaystackEntitlement({
      now: NOW,
      expectedAmountCents: 19900,
      periodMs: TRIAL_MS,
      charge: {
        found: true,
        status: 'success',
        amount: 19900,
        currency: 'ZAR',
        paidAt: NOW,
        reference: 'old'
      },
      invoice: { found: true, status: 'failed', amount: 19900 }
    });
    expect(invoiceFailed.paid).toBe(false);
    expect(invoiceFailed.clearPaid).toBe(true);
  });

  it('writes payment_method_ok only from a confirm verdict, and keeps a legacy stub', () => {
    const started = NOW - 40 * 24 * 60 * 60 * 1000;
    savePlaceEntitlement({
      placeId: 'co_olive',
      trial_started_at: started,
      trial_ends_at: started + TRIAL_MS,
      enabled_apps: ['eatery'],
      billable_locations: 1,
      payment_method_ok: true
    });
    expect(paystackPeriodOpen(loadPlaceEntitlement('co_olive')!, NOW)).toBe(true);
    expect(applyPaystackVerdict({
      paid: false,
      clearPaid: true,
      reason: 'failed',
      placeId: 'co_olive',
      reference: 'ps.co-olive.both.monthly.1',
      subscriptionCode: null,
      bundle: 'both',
      cadence: 'monthly',
      paidUntil: null,
      channel: 'card'
    })).toBeNull();
    expect(loadPlaceEntitlement('co_olive')?.payment_method_ok).toBe(true);

    const paidUntil = NOW + TRIAL_MS;
    const applied = applyPaystackVerdict({
      paid: true,
      clearPaid: false,
      reason: 'charge',
      placeId: 'co_olive',
      reference: 'ps.co-olive.both.monthly.1',
      subscriptionCode: null,
      bundle: 'both',
      cadence: 'monthly',
      paidUntil,
      channel: 'eft'
    });
    expect(applied?.payment_method_ok).toBe(true);
    expect(applied?.paid_until).toBe(paidUntil);
    expect(localStorage.getItem(PLACE_PLAN_KEY)).toContain('both');
    expect(resolvePlaceSubscriptionStatus(applied!, NOW)).toBe('active');
    expect(paystackPeriodOpen(applied!, paidUntil)).toBe(false);
    expect(resolvePlaceSubscriptionStatus(applied!, paidUntil)).toBe('suspended');
    const graceCheck = savePlaceEntitlement({
      ...applied!,
      paid_until: (applied!.trial_ends_at || 0) + 24 * 60 * 60 * 1000
    });
    expect(resolvePlaceSubscriptionStatus(
      graceCheck,
      (graceCheck.trial_ends_at || 0) + 2 * 24 * 60 * 60 * 1000
    )).toBe('past_due');

    expect(applyPaystackVerdict({
      paid: false,
      clearPaid: true,
      reason: 'period ended',
      placeId: 'co_olive',
      reference: 'ps.co-olive.both.monthly.1',
      subscriptionCode: null,
      bundle: 'both',
      cadence: 'monthly',
      paidUntil: null,
      channel: null
    })?.payment_method_ok).toBe(false);

    savePlaceEntitlement({
      placeId: 'co_olive',
      trial_started_at: started,
      trial_ends_at: started + TRIAL_MS,
      enabled_apps: ['eatery'],
      billable_locations: 1,
      payment_method_ok: true,
      paystack_reference: 'ps.co-olive.place.monthly.9',
      paid_until: paidUntil
    });
    expect(applyPaystackVerdict({
      paid: false,
      clearPaid: true,
      reason: 'failed',
      placeId: 'co_olive',
      reference: 'ps.co-olive.both.monthly.1',
      subscriptionCode: null,
      bundle: 'both',
      cadence: 'monthly',
      paidUntil: null,
      channel: null
    })).toBeNull();
    expect(loadPlaceEntitlement('co_olive')?.payment_method_ok).toBe(true);
  });

  it('ignores a checkout response that claims the place is paid', async () => {
    const fetchMock = async (input: RequestInfo | URL) => {
      expect(String(input)).toContain('/api/paystack/checkout');
      return jsonResponse({ paid: true, authorizationUrl: 'https://checkout.paystack.com/abc' });
    };
    const original = globalThis.fetch;
    globalThis.fetch = fetchMock as typeof fetch;
    try {
      const result = await startPaystackCheckout({
        email: 'owner@theolive.co.za',
        placeId: 'co_olive',
        bundle: 'place',
        cadence: 'monthly'
      });
      expect(result.paid).toBe(false);
      expect(result.authorizationUrl).toBe('https://checkout.paystack.com/abc');
    } finally {
      globalThis.fetch = original;
    }
    expect(paystackReturnReference('?trxref=ps.co-olive.place.monthly.1&reference=ps.co-olive.place.monthly.1'))
      .toBe('ps.co-olive.place.monthly.1');
    expect(paystackReturnReference('?reference=co_olive')).toBe('');
  });
});

describe('Paystack worker routes', () => {
  it('refuses checkout when the secret is missing and never marks it paid', async () => {
    const response = await handlePaystackRequest(new Request('https://app.daup.co.za/api/paystack/checkout', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email: 'owner@theolive.co.za',
        placeId: 'co_olive',
        bundle: 'both',
        cadence: 'monthly'
      })
    }), {});
    expect(response.status).toBe(503);
    const body = await response.json() as { paid: boolean; message: string };
    expect(body.paid).toBe(false);
    expect(body.message).toBe(PAYSTACK_NOT_READY_LABEL);
    expect(JSON.stringify(body)).not.toContain('sk_');
  });

  it('initializes a ZAR charge for the locked amount and omits a plan code', async () => {
    let forwarded = '';
    const fetchMock = async (input: RequestInfo | URL, init?: RequestInit) => {
      expect(String(input)).toBe('https://api.paystack.co/transaction/initialize');
      expect(init?.headers && (init.headers as Record<string, string>).authorization).toBe(`Bearer ${SECRET}`);
      forwarded = String(init?.body || '');
      return jsonResponse({
        status: true,
        data: { authorization_url: 'https://checkout.paystack.com/olive', reference: 'ignored' }
      });
    };
    const response = await handlePaystackRequest(new Request('https://app.daup.co.za/api/paystack/checkout', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email: 'owner@theolive.co.za',
        placeId: 'co_olive',
        bundle: 'both',
        cadence: 'annual',
        amount: 100,
        card: '4242424242424242',
        channels: ['card'],
        plan: 'PLN_cheap',
        callbackUrl: 'https://app.daup.co.za/places'
      })
    }), { PAYSTACK_SECRET_KEY: SECRET }, { fetch: fetchMock as typeof fetch, now: () => NOW });
    expect(response.status).toBe(200);
    const body = await response.json() as { paid: boolean; authorizationUrl: string; reference: string };
    expect(body.paid).toBe(false);
    expect(body.authorizationUrl).toBe('https://checkout.paystack.com/olive');
    expect(body.reference).not.toContain('_');
    const sent = JSON.parse(forwarded) as Record<string, unknown>;
    expect(sent.amount).toBe(498 * 12 * 90);
    expect(sent.currency).toBe('ZAR');
    expect(sent.channels).toBeUndefined();
    expect(sent.plan).toBeUndefined();
    expect(sent.card).toBeUndefined();
    expect(sent.callback_url).toBe('https://app.daup.co.za/places');
    expect((sent.metadata as { place_id: string }).place_id).toBe('co_olive');
    expect(JSON.stringify(sent)).not.toContain(SECRET);
  });

  it('confirms a successful Ozow charge and clears a missing renewal', async () => {
    const reference = paystackReference('co_olive', 'place', 'monthly', NOW);
    const fetchMock = async (input: RequestInfo | URL) => {
      expect(String(input)).toContain(`/transaction/verify/${encodeURIComponent(reference)}`);
      return jsonResponse({
        status: true,
        data: {
          status: 'success',
          amount: 19900,
          currency: 'ZAR',
          channel: 'eft',
          paid_at: new Date(NOW).toISOString(),
          reference,
          metadata: { place_id: 'co_olive', bundle: 'place', cadence: 'monthly' }
        }
      });
    };
    const response = await handlePaystackRequest(
      new Request(`https://app.daup.co.za/api/paystack/confirm?reference=${encodeURIComponent(reference)}`),
      { PAYSTACK_SECRET_KEY: SECRET },
      { fetch: fetchMock as typeof fetch, now: () => NOW + 1000 }
    );
    const body = await response.json() as { paid: boolean; paidUntil: number; channel: string; placeId: string };
    expect(body.paid).toBe(true);
    expect(body.channel).toBe('eft');
    expect(body.placeId).toBe('co_olive');
    expect(body.paidUntil).toBe(NOW + TRIAL_MS);

    const later = await handlePaystackRequest(
      new Request(`https://app.daup.co.za/api/paystack/confirm?reference=${encodeURIComponent(reference)}`),
      { PAYSTACK_SECRET_KEY: SECRET },
      { fetch: fetchMock as typeof fetch, now: () => NOW + TRIAL_MS }
    );
    const ended = await later.json() as { paid: boolean; clearPaid: boolean; reason: string };
    expect(ended.paid).toBe(false);
    expect(ended.clearPaid).toBe(true);
    expect(ended.reason).toBe('period ended');
  });

  it('checks the webhook signature and does not apply the browser entitlement', async () => {
    const raw = JSON.stringify({ event: 'charge.success', data: { status: 'success', amount: 19900 } });
    const signature = await paystackSignatureHex(SECRET, raw);
    const ok = await handlePaystackRequest(new Request('https://app.daup.co.za/api/paystack/webhook', {
      method: 'POST',
      headers: { 'x-paystack-signature': signature, 'content-type': 'application/json' },
      body: raw
    }), { PAYSTACK_SECRET_KEY: SECRET });
    expect(ok.status).toBe(200);
    const body = await ok.json() as { paid: boolean; applied: boolean };
    expect(body.paid).toBe(false);
    expect(body.applied).toBe(false);

    const bad = await handlePaystackRequest(new Request('https://app.daup.co.za/api/paystack/webhook', {
      method: 'POST',
      headers: { 'x-paystack-signature': 'deadbeef', 'content-type': 'application/json' },
      body: raw
    }), { PAYSTACK_SECRET_KEY: SECRET });
    expect(bad.status).toBe(401);
  });
});
