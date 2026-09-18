/**
 * My places subscription chrome (list cards + place detail).
 *
 * Kitchen English only. Meters stay PLACE_SUB R199 and SEED_HOSTED R299 / R0.
 * Remaining period is a stub: trial_ends_at, else trial_started + 30d, else
 * the next 30-day boundary after that for a paid place. No checkout (G).
 */

import {
  daysLeftOnTrialLabel,
  HOSTED_SEED_SUMMARY,
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

export type PlaceSubClock = Pick<
  PlaceEntitlement,
  'trial_started_at' | 'trial_ends_at' | 'payment_method_ok'
>;

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
      payment_method_ok: args.entitlement.payment_method_ok === true
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
  now = Date.now()
): number | null {
  const first = stubPeriodEnd(clock);
  if (first == null || !clock) return null;
  const status = resolvePlaceSubscriptionStatus(clock, now);
  if (status !== 'active' || now < first) return first;
  const elapsed = now - first;
  const cycles = Math.floor(elapsed / TRIAL_MS) + 1;
  return first + cycles * TRIAL_MS;
}

export function remainingPeriodDays(endsAt: number, now = Date.now()): number {
  return Math.max(0, Math.ceil((endsAt - now) / DAY_MS));
}

export function remainingPeriodCopy(
  clock: PlaceSubClock | null | undefined,
  now = Date.now()
): string {
  if (!clock) return '';
  const status = resolvePlaceSubscriptionStatus(clock, now);
  const end = stubRenewsAt(clock, now);
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
}): {
  status: PlaceSubscriptionStatus | null;
  choiceLines: string[];
  totalLine: string;
  remaining: string;
  seedSummary: string;
} {
  const seedMode = args.seedMode || 'hosted';
  const clock = asPlaceSubClock(args);
  const now = args.now ?? Date.now();
  return {
    status: clock ? resolvePlaceSubscriptionStatus(clock, now) : null,
    choiceLines: placeChoiceLines(seedMode),
    totalLine: placeChoiceTotalLine(seedMode),
    remaining: remainingPeriodCopy(clock, now),
    seedSummary: seedMode === 'on-prem' ? SEEDNODE_MODE_ON_PREM : HOSTED_SEED_SUMMARY
  };
}
