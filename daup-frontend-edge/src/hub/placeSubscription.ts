/**
 * My places subscription chrome (list cards + place detail).
 *
 * Kitchen English only. Meters stay PLACE_SUB R199 and SEED_HOSTED R299 / R0.
 * A chosen plan is place only (R199), hosted seed (R299), or both (R199+R299).
 * Annual is 10% off twelve months of that choice. The trial is 30 days first.
 * Remaining period: trial end, else paid_until, else the next monthly or annual cycle.
 * Paystack confirms the charge. Choosing a plan does not mark the place paid.
 */

import {
  daysLeftOnTrialLabel,
  HOSTED_SEED_SUMMARY,
  PERIOD_ENDED_LABEL,
  PLACE_SUB_LINE,
  renewsInDaysLabel,
  SEED_HOSTED_LINE,
  SEED_HOSTED_ON_PREM_LINE,
  SEEDNODE_MODE_ON_PREM
} from './copy';
import {
  resolvePlaceSubscriptionStatus,
  TRIAL_MS,
  type PlaceEntitlement,
  type PlaceSubscriptionStatus
} from './entitlements';
import {
  PLACE_SUB_MONTHLY_ZAR_EX_VAT,
  SEED_HOSTED_MONTHLY_ZAR_EX_VAT,
  stubCatalogLines
} from './priceMeters';
import type { SeednodeMode } from './seednode';

export const DAY_MS = 24 * 60 * 60 * 1000;
export const ANNUAL_MONTHS = 12;
export const ANNUAL_DISCOUNT_PERCENT = 10;
export const ANNUAL_PERIOD_DAYS = 365;
export const ANNUAL_PERIOD_MS = ANNUAL_PERIOD_DAYS * DAY_MS;
export const PLACE_PLAN_KEY = 'daup_place_plans';

/** Place only, hosted seed only, or both. R498 is 199 + 299, not a third product. */
export type PlaceBundle = 'place' | 'hosted-seed' | 'both';
export type PlaceCadence = 'monthly' | 'annual';

export interface PlacePlanChoice {
  bundle: PlaceBundle;
  cadence: PlaceCadence;
}

export interface PlacePlanQuote {
  bundle: PlaceBundle;
  cadence: PlaceCadence;
  monthlyZar: number;
  annualListCents: number;
  annualCents: number;
  discountCents: number;
  line: string;
}

export function bundleMonthlyZar(bundle: PlaceBundle): number {
  if (bundle === 'place') return PLACE_SUB_MONTHLY_ZAR_EX_VAT;
  if (bundle === 'hosted-seed') return SEED_HOSTED_MONTHLY_ZAR_EX_VAT;
  return PLACE_SUB_MONTHLY_ZAR_EX_VAT + SEED_HOSTED_MONTHLY_ZAR_EX_VAT;
}

/** 10% off twelve months, in cents. */
export function bundleAnnualCents(bundle: PlaceBundle): number {
  const listCents = bundleMonthlyZar(bundle) * ANNUAL_MONTHS * 100;
  const discountCents = Math.round(listCents * ANNUAL_DISCOUNT_PERCENT / 100);
  return listCents - discountCents;
}

export function formatZarFromCents(cents: number): string {
  const abs = Math.abs(Math.round(cents));
  const rands = Math.floor(abs / 100);
  const frac = abs % 100;
  return frac === 0 ? `R${rands}` : `R${rands}.${String(frac).padStart(2, '0')}`;
}

export function placePlanQuote(bundle: PlaceBundle, cadence: PlaceCadence): PlacePlanQuote {
  const monthlyZar = bundleMonthlyZar(bundle);
  const annualListCents = monthlyZar * ANNUAL_MONTHS * 100;
  const annualCents = bundleAnnualCents(bundle);
  const line = cadence === 'monthly'
    ? `R${monthlyZar} a month.`
    : `${formatZarFromCents(annualCents)} a year. 10% off ${formatZarFromCents(annualListCents)}.`;
  return {
    bundle,
    cadence,
    monthlyZar,
    annualListCents,
    annualCents,
    discountCents: annualListCents - annualCents,
    line
  };
}

export function trialThenPlanCopy(quoteLine: string): string {
  return `The trial is 30 days. Then ${quoteLine}`;
}

export function defaultPlacePlan(seedMode: SeednodeMode = 'hosted'): PlacePlanChoice {
  return {
    bundle: seedMode === 'on-prem' ? 'place' : 'both',
    cadence: 'monthly'
  };
}

export function billingPeriodMs(cadence: PlaceCadence = 'monthly'): number {
  return cadence === 'annual' ? ANNUAL_PERIOD_MS : TRIAL_MS;
}

/** ZAR subunits (cents). Annual is the discounted year, not twelve full months. */
export function planAmountCents(bundle: PlaceBundle, cadence: PlaceCadence): number {
  const quote = placePlanQuote(bundle, cadence);
  return cadence === 'annual' ? quote.annualCents : quote.monthlyZar * 100;
}

function asBundle(value: unknown): PlaceBundle | null {
  if (value === 'place' || value === 'hosted-seed' || value === 'both') return value;
  return null;
}

function asCadence(value: unknown): PlaceCadence | null {
  if (value === 'monthly' || value === 'annual') return value;
  return null;
}

function readPlans(): Record<string, PlacePlanChoice> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(PLACE_PLAN_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!parsed || typeof parsed !== 'object') return {};
    const out: Record<string, PlacePlanChoice> = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (!value || typeof value !== 'object') continue;
      const row = value as Record<string, unknown>;
      const bundle = asBundle(row.bundle);
      const cadence = asCadence(row.cadence);
      const id = key.trim();
      if (!id || !bundle || !cadence) continue;
      out[id] = { bundle, cadence };
    }
    return out;
  } catch {
    return {};
  }
}

export function loadPlacePlan(placeId?: string | null): PlacePlanChoice | null {
  const id = (placeId || '').trim();
  if (!id) return null;
  return readPlans()[id] || null;
}

/** Saves the chosen plan only. Never writes payment_method_ok or card data. */
export function savePlacePlan(placeId: string, choice: PlacePlanChoice): PlacePlanChoice | null {
  const id = (placeId || '').trim();
  const bundle = asBundle(choice.bundle);
  const cadence = asCadence(choice.cadence);
  if (!id || !bundle || !cadence || typeof window === 'undefined') return null;
  const next = { bundle, cadence };
  const all = readPlans();
  all[id] = next;
  try {
    localStorage.setItem(PLACE_PLAN_KEY, JSON.stringify(all));
  } catch {
    return null;
  }
  return next;
}

export function resolvePlacePlan(args: {
  placeId?: string | null;
  seedMode?: SeednodeMode;
  plan?: PlacePlanChoice | null;
}): PlacePlanChoice {
  if (args.plan && asBundle(args.plan.bundle) && asCadence(args.plan.cadence)) {
    return { bundle: args.plan.bundle, cadence: args.plan.cadence };
  }
  return loadPlacePlan(args.placeId) || defaultPlacePlan(args.seedMode || 'hosted');
}

export type PlaceSubClock = Pick<
  PlaceEntitlement,
  'trial_started_at' | 'trial_ends_at' | 'payment_method_ok'
> & Partial<Pick<PlaceEntitlement, 'paid_until' | 'paystack_reference'>>;

export function asPlaceSubClock(args: {
  entitlement?: PlaceSubClock | null;
  trialStartedAt?: number | null;
  trialEndsAt?: number | null;
  paymentMethodOk?: boolean;
}): PlaceSubClock | null {
  if (args.entitlement?.trial_started_at || args.entitlement?.trial_ends_at) {
    return {
      trial_started_at: args.entitlement.trial_started_at,
      trial_ends_at: args.entitlement.trial_ends_at,
      payment_method_ok: args.entitlement.payment_method_ok === true,
      paid_until: args.entitlement.paid_until ?? null,
      paystack_reference: args.entitlement.paystack_reference ?? null
    };
  }
  const started = typeof args.trialStartedAt === 'number' ? args.trialStartedAt : null;
  const ends = typeof args.trialEndsAt === 'number' ? args.trialEndsAt : null;
  if (!started && !ends) return null;
  return {
    trial_started_at: started,
    trial_ends_at: ends ?? (started != null ? started + TRIAL_MS : null),
    payment_method_ok: args.paymentMethodOk === true
  };
}

/** trial_ends_at, else trial_started + 30d. */
export function stubPeriodEnd(clock: PlaceSubClock | null | undefined): number | null {
  if (!clock) return null;
  if (typeof clock.trial_ends_at === 'number') return clock.trial_ends_at;
  if (typeof clock.trial_started_at === 'number') return clock.trial_started_at + TRIAL_MS;
  return null;
}

/**
 * Trial: period end. Paid: that same stub, or the next 30-day cycle after it
 * so “Renews in N days.” still has a date once the first month has passed.
 */
export function stubRenewsAt(
  clock: PlaceSubClock | null | undefined,
  now = Date.now(),
  cadence: PlaceCadence = 'monthly'
): number | null {
  const first = stubPeriodEnd(clock);
  if (first == null || !clock) return null;
  const status = resolvePlaceSubscriptionStatus(clock, now);
  if (status === 'active' && typeof clock.paid_until === 'number') return clock.paid_until;
  if (status !== 'active' || now < first) return first;
  const periodMs = billingPeriodMs(cadence);
  const elapsed = now - first;
  const cycles = Math.floor(elapsed / periodMs) + 1;
  return first + cycles * periodMs;
}

export function remainingPeriodDays(endsAt: number, now = Date.now()): number {
  return Math.max(0, Math.ceil((endsAt - now) / DAY_MS));
}

export function remainingPeriodCopy(
  clock: PlaceSubClock | null | undefined,
  now = Date.now(),
  cadence: PlaceCadence = 'monthly'
): string {
  if (!clock) return '';
  const status = resolvePlaceSubscriptionStatus(clock, now);
  if (status === 'past_due' || status === 'suspended') return PERIOD_ENDED_LABEL;
  const end = stubRenewsAt(clock, now, cadence);
  if (end == null) return '';
  const days = remainingPeriodDays(end, now);
  if (status === 'trial') return daysLeftOnTrialLabel(days);
  if (status === 'active') return renewsInDaysLabel(days);
  return '';
}

export function placeChoiceLines(seedMode: SeednodeMode = 'hosted'): string[] {
  const catalog = stubCatalogLines({ seedMode });
  return catalog.map(line => {
    if (line.code === 'PLACE_SUB_MONTHLY') return PLACE_SUB_LINE;
    if (line.code === 'SEED_HOSTED_MONTHLY') {
      return line.zarExVat === 0 ? SEED_HOSTED_ON_PREM_LINE : SEED_HOSTED_LINE;
    }
    return '';
  }).filter(Boolean);
}

export function placeChoiceTotalLine(seedMode: SeednodeMode = 'hosted'): string {
  const hosted = seedMode === 'hosted' ? SEED_HOSTED_MONTHLY_ZAR_EX_VAT : 0;
  const total = PLACE_SUB_MONTHLY_ZAR_EX_VAT + hosted;
  return `R${total} a month.`;
}

export function placeSubscriptionDisplay(args: {
  entitlement?: PlaceEntitlement | null;
  seedMode?: SeednodeMode;
  trialStartedAt?: number | null;
  trialEndsAt?: number | null;
  paymentMethodOk?: boolean;
  now?: number;
  placeId?: string | null;
  plan?: PlacePlanChoice | null;
}): {
  status: PlaceSubscriptionStatus | null;
  choiceLines: string[];
  totalLine: string;
  quoteLine: string;
  plan: PlacePlanChoice;
  quote: PlacePlanQuote;
  remaining: string;
  seedSummary: string;
  paymentDue: boolean;
} {
  const seedMode = args.seedMode || 'hosted';
  const plan = resolvePlacePlan({
    placeId: args.placeId,
    seedMode,
    plan: args.plan
  });
  const quote = placePlanQuote(plan.bundle, plan.cadence);
  const clock = asPlaceSubClock(args);
  const now = args.now ?? Date.now();
  const status = clock ? resolvePlaceSubscriptionStatus(clock, now) : null;
  return {
    status,
    choiceLines: placeChoiceLines(seedMode),
    totalLine: placeChoiceTotalLine(seedMode),
    quoteLine: quote.line,
    plan,
    quote,
    remaining: remainingPeriodCopy(clock, now, plan.cadence),
    seedSummary: seedMode === 'on-prem' ? SEEDNODE_MODE_ON_PREM : HOSTED_SEED_SUMMARY,
    paymentDue: status === 'past_due' || status === 'suspended'
  };
}
