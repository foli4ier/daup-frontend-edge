/**
 * Paystack (South Africa, ZAR) is the only payment door for a place.
 * Amounts are computed here. A checkout URL is not a payment.
 * Entitlement follows a successful charge, an active subscription, or a paid invoice.
 */

import {
  billingPeriodMs,
  planAmountCents,
  type PlaceBundle,
  type PlaceCadence
} from './placeSubscription';

export const PAYSTACK_API = 'https://api.paystack.co';
export const REFERENCE_PATTERN = /^[a-zA-Z0-9.\-=]+$/;

const CHARGE_PENDING = new Set(['pending', 'ongoing', 'processing', 'queued']);
const CHARGE_FAILED = new Set(['failed', 'abandoned', 'reversed']);
const SUBSCRIPTION_PAID = new Set(['active', 'non-renewing']);
const SUBSCRIPTION_UNPAID = new Set(['attention', 'cancelled', 'canceled', 'completed']);

export interface PaystackChargeView {
  found: boolean;
  status?: string | null;
  amount?: number | null;
  currency?: string | null;
  paidAt?: number | null;
  reference?: string | null;
  channel?: string | null;
}

export interface PaystackSubscriptionView {
  found: boolean;
  status?: string | null;
  amount?: number | null;
  code?: string | null;
  nextPaymentAt?: number | null;
}

export interface PaystackInvoiceView {
  found: boolean;
  status?: string | null;
  amount?: number | null;
  paidAt?: number | null;
}

export interface PaystackVerdict {
  paid: boolean;
  /** When false, leave any earlier confirmed payment alone. */
  clearPaid: boolean;
  reason: string;
  placeId: string | null;
  reference: string | null;
  subscriptionCode: string | null;
  bundle: PlaceBundle | null;
  cadence: PlaceCadence | null;
  paidUntil: number | null;
  channel: string | null;
}

export function asBundle(value: unknown): PlaceBundle | null {
  if (value === 'place' || value === 'hosted-seed' || value === 'both') return value;
  return null;
}

export function asCadence(value: unknown): PlaceCadence | null {
  if (value === 'monthly' || value === 'annual') return value;
  return null;
}

/** Paystack references reject underscores. `co_olive` becomes `co-olive`. */
export function paystackReference(
  placeId: string,
  bundle: PlaceBundle,
  cadence: PlaceCadence,
  now = Date.now()
): string {
  const safe = (placeId || '')
    .trim()
    .replace(/_/g, '-')
    .replace(/[^a-zA-Z0-9-]/g, '')
    .slice(0, 40) || 'place';
  const reference = `ps.${safe}.${bundle}.${cadence}.${now}`;
  if (!REFERENCE_PATTERN.test(reference)) {
    throw new Error('Paystack reference was rejected.');
  }
  return reference;
}

export function planFromReference(reference: string): { bundle: PlaceBundle; cadence: PlaceCadence } | null {
  if (!REFERENCE_PATTERN.test(reference)) return null;
  const parts = reference.split('.');
  if (parts.length < 5 || parts[0] !== 'ps') return null;
  const cadence = asCadence(parts[parts.length - 2]);
  const bundle = asBundle(parts[parts.length - 3]);
  if (!bundle || !cadence) return null;
  return { bundle, cadence };
}

function amountMatches(amount: number | null | undefined, expected: number): boolean {
  return typeof amount === 'number' && Number.isFinite(amount) && amount === expected;
}

function currencyOk(currency: string | null | undefined): boolean {
  if (!currency) return true;
  return currency.toUpperCase() === 'ZAR';
}

function unpaid(base: Omit<PaystackVerdict, 'paid' | 'clearPaid' | 'reason'>, reason: string, clearPaid: boolean): PaystackVerdict {
  return { ...base, paid: false, clearPaid, reason, paidUntil: null };
}

/**
 * Successful card, Ozow (`eft`), and Capitec Pay (`capitec_pay`) charges all count.
 * A later failed subscription or a period that has ended does not stay paid.
 * Pending does not clear an earlier confirmation.
 */
export function decidePaystackEntitlement(input: {
  now: number;
  expectedAmountCents: number;
  periodMs: number;
  placeId?: string | null;
  bundle?: PlaceBundle | null;
  cadence?: PlaceCadence | null;
  charge?: PaystackChargeView | null;
  subscription?: PaystackSubscriptionView | null;
  invoice?: PaystackInvoiceView | null;
}): PaystackVerdict {
  const charge = input.charge;
  const subscription = input.subscription;
  const base = {
    placeId: input.placeId ?? null,
    reference: charge?.reference ?? null,
    subscriptionCode: subscription?.code ?? null,
    bundle: input.bundle ?? null,
    cadence: input.cadence ?? null,
    channel: charge?.channel ?? null,
    paidUntil: null as number | null
  };

  if (subscription?.found) {
    const status = (subscription.status || '').toLowerCase();
    if (SUBSCRIPTION_PAID.has(status)) {
      if (subscription.amount != null && !amountMatches(subscription.amount, input.expectedAmountCents)) {
        return unpaid(base, 'amount', true);
      }
      const paidUntil = typeof subscription.nextPaymentAt === 'number'
        ? subscription.nextPaymentAt
        : input.now + input.periodMs;
      const paid = input.now < paidUntil;
      return {
        ...base,
        paid,
        clearPaid: !paid,
        reason: paid ? 'subscription' : 'period ended',
        paidUntil
      };
    }
    if (SUBSCRIPTION_UNPAID.has(status)) {
      return unpaid(base, 'subscription', true);
    }
  }

  const invoice = input.invoice;
  if (invoice?.found) {
    const status = (invoice.status || '').toLowerCase();
    if (status === 'success' || status === 'paid') {
      if (!amountMatches(invoice.amount, input.expectedAmountCents)) {
        return unpaid(base, 'amount', true);
      }
      const paidAt = invoice.paidAt ?? input.now;
      const paidUntil = paidAt + input.periodMs;
      const paid = input.now < paidUntil;
      return {
        ...base,
        paid,
        clearPaid: !paid,
        reason: paid ? 'invoice' : 'period ended',
        paidUntil
      };
    }
    if (status === 'failed') return unpaid(base, 'invoice', true);
    if (status === 'pending') return unpaid(base, 'pending', false);
  }

  if (!charge?.found) return unpaid(base, 'missing', false);

  const status = (charge.status || '').toLowerCase();
  if (CHARGE_PENDING.has(status)) return unpaid(base, 'pending', false);
  if (status === 'success') {
    if (!currencyOk(charge.currency) || !amountMatches(charge.amount, input.expectedAmountCents)) {
      return unpaid(base, 'amount', true);
    }
    const paidAt = charge.paidAt ?? input.now;
    const paidUntil = paidAt + input.periodMs;
    const paid = input.now < paidUntil;
    return {
      ...base,
      paid,
      clearPaid: !paid,
      reason: paid ? 'charge' : 'period ended',
      paidUntil
    };
  }
  if (CHARGE_FAILED.has(status)) return unpaid(base, 'failed', true);
  return unpaid(base, 'unknown', false);
}

export function expectedCharge(bundle: PlaceBundle, cadence: PlaceCadence): {
  amountCents: number;
  periodMs: number;
} {
  return {
    amountCents: planAmountCents(bundle, cadence),
    periodMs: billingPeriodMs(cadence)
  };
}
