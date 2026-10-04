import { beforeEach, describe, expect, it } from 'vitest';
import {
  daysLeftOnTrialLabel,
  hasBannedDoorCopy,
  HOSTED_SEED_SUMMARY,
  PERIOD_ENDED_LABEL,
  PLACE_SUB_LINE,
  renewsInDaysLabel,
  SEED_HOSTED_LINE,
  SEED_HOSTED_ON_PREM_LINE,
  SEEDNODE_MODE_ON_PREM
} from './copy';
import { loadPlaceEntitlement, TRIAL_MS } from './entitlements';
import {
  ANNUAL_DISCOUNT_PERCENT,
  ANNUAL_MONTHS,
  asPlaceSubClock,
  bundleAnnualCents,
  bundleMonthlyZar,
  DAY_MS,
  EFT_PAYEE,
  paymentScreenState,
  PLACE_PLAN_KEY,
  placeChoiceLines,
  placeChoiceTotalLine,
  placePlanQuote,
  placeSubscriptionDisplay,
  remainingPeriodCopy,
  remainingPeriodDays,
  savePlacePlan,
  stubPeriodEnd,
  stubRenewsAt
} from './placeSubscription';

describe('place subscription remaining', () => {
  const started = Date.parse('2026-09-01T12:00:00Z');
  const trialEnds = started + TRIAL_MS;

  it('stubs period end from trial_ends_at or trial_started + 30d', () => {
    expect(stubPeriodEnd({
      trial_started_at: started,
      trial_ends_at: trialEnds,
      payment_method_ok: false
    })).toBe(trialEnds);
    expect(stubPeriodEnd({
      trial_started_at: started,
      trial_ends_at: null,
      payment_method_ok: false
    })).toBe(started + TRIAL_MS);
    expect(stubPeriodEnd(null)).toBeNull();
  });

  it('prints trial days left and paid renew remaining in kitchen English', () => {
    const now = started + 18 * DAY_MS;
    expect(remainingPeriodDays(trialEnds, now)).toBe(12);
    expect(remainingPeriodCopy({
      trial_started_at: started,
      trial_ends_at: trialEnds,
      payment_method_ok: false
    }, now)).toBe('12 days left on trial.');
    expect(daysLeftOnTrialLabel(1)).toBe('1 day left on trial.');
    expect(remainingPeriodCopy({
      trial_started_at: started,
      trial_ends_at: trialEnds,
      payment_method_ok: true
    }, now)).toBe('12 days left on trial.');

    const paidNow = trialEnds + 12 * DAY_MS;
    expect(stubRenewsAt({
      trial_started_at: started,
      trial_ends_at: trialEnds,
      payment_method_ok: true
    }, paidNow)).toBe(trialEnds + TRIAL_MS);
    expect(remainingPeriodCopy({
      trial_started_at: started,
      trial_ends_at: trialEnds,
      payment_method_ok: true
    }, paidNow)).toBe('Renews in 18 days.');
    expect(renewsInDaysLabel(1)).toBe('Renews in 1 day.');
  });

  it('uses vault trial dates when no entitlement is stored', () => {
    const clock = asPlaceSubClock({
      trialStartedAt: started,
      trialEndsAt: trialEnds
    });
    expect(clock?.trial_ends_at).toBe(trialEnds);
    expect(remainingPeriodCopy(clock, started + DAY_MS)).toBe('29 days left on trial.');
  });

  it('keeps protocol words off remaining copy', () => {
    const copy = remainingPeriodCopy({
      trial_started_at: started,
      trial_ends_at: trialEnds,
      payment_method_ok: false
    }, started + DAY_MS);
    expect(hasBannedDoorCopy(copy)).toBe(false);
    expect(copy).not.toMatch(/peer|DID|MCP|node|co_/i);
  });
});

describe('place subscription choice', () => {
  it('shows PLACE_SUB R199 and hosted R299 with a total', () => {
    const hosted = placeSubscriptionDisplay({ seedMode: 'hosted' });
    expect(hosted.choiceLines).toEqual([PLACE_SUB_LINE, SEED_HOSTED_LINE]);
    expect(hosted.choiceLines[0]).toBe('R199 a month for this place.');
    expect(hosted.choiceLines[1]).toBe('R299 hosted seed.');
    expect(hosted.totalLine).toBe('R498 a month.');
    expect(hosted.seedSummary).toBe(HOSTED_SEED_SUMMARY);
    expect(placeChoiceTotalLine('hosted')).toBe('R498 a month.');
  });

  it('shows on-prem as R0 hosted / On this premises. with R199 total', () => {
    const onPrem = placeSubscriptionDisplay({ seedMode: 'on-prem' });
    expect(onPrem.choiceLines).toEqual([PLACE_SUB_LINE, SEED_HOSTED_ON_PREM_LINE]);
    expect(onPrem.seedSummary).toBe(SEEDNODE_MODE_ON_PREM);
    expect(onPrem.totalLine).toBe('R199 a month.');
    expect(placeChoiceLines('on-prem')).toContain(SEED_HOSTED_ON_PREM_LINE);
  });
});

describe('place plan price math', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('prices place, hosted seed, and both as 199, 299, and 199 + 299', () => {
    expect(bundleMonthlyZar('place')).toBe(199);
    expect(bundleMonthlyZar('hosted-seed')).toBe(299);
    expect(bundleMonthlyZar('both')).toBe(498);
    expect(bundleMonthlyZar('both')).toBe(199 + 299);
    expect(placePlanQuote('place', 'monthly').line).toBe('R199 a month.');
    expect(placePlanQuote('hosted-seed', 'monthly').line).toBe('R299 a month.');
    expect(placePlanQuote('both', 'monthly').line).toBe('R498 a month.');
  });

  it('takes 10% off twelve months and shows the annual total', () => {
    expect(ANNUAL_MONTHS).toBe(12);
    expect(ANNUAL_DISCOUNT_PERCENT).toBe(10);
    expect(bundleAnnualCents('place')).toBe(199 * 12 * 90);
    expect(bundleAnnualCents('hosted-seed')).toBe(299 * 12 * 90);
    expect(bundleAnnualCents('both')).toBe(498 * 12 * 90);
    expect(bundleAnnualCents('both')).toBe((199 + 299) * 12 * 90);
    expect(placePlanQuote('place', 'annual').line).toBe('R2149.20 a year. 10% off R2388.');
    expect(placePlanQuote('hosted-seed', 'annual').line).toBe('R3229.20 a year. 10% off R3588.');
    expect(placePlanQuote('both', 'annual').line).toBe('R5378.40 a year. 10% off R5976.');
    expect(placePlanQuote('both', 'annual').discountCents).toBe(498 * 12 * 10);
    expect(hasBannedDoorCopy(placePlanQuote('both', 'annual').line)).toBe(false);
  });

  it('keeps the 30-day trial first, then a year only when they chose annual', () => {
    const started = Date.parse('2026-09-01T12:00:00Z');
    const trialEnds = started + TRIAL_MS;
    const clock = {
      trial_started_at: started,
      trial_ends_at: trialEnds,
      payment_method_ok: true
    };
    const duringTrial = started + 18 * DAY_MS;
    expect(remainingPeriodCopy(clock, duringTrial, 'annual')).toBe('12 days left on trial.');
    const paidNow = trialEnds + 10 * DAY_MS;
    expect(stubRenewsAt(clock, paidNow, 'annual')).toBe(trialEnds + 365 * DAY_MS);
    expect(remainingPeriodCopy(clock, paidNow, 'annual')).toBe('Renews in 355 days.');
    expect(remainingPeriodCopy(clock, paidNow, 'monthly')).toBe('Renews in 20 days.');
  });

  it('says the period has ended when payment is due, without marking the place paid', () => {
    const started = Date.parse('2026-09-01T12:00:00Z');
    const trialEnds = started + TRIAL_MS;
    const clock = {
      trial_started_at: started,
      trial_ends_at: trialEnds,
      payment_method_ok: false
    };
    expect(remainingPeriodCopy(clock, trialEnds + DAY_MS)).toBe(PERIOD_ENDED_LABEL);
    const screen = paymentScreenState(clock);
    expect(screen.payment_method_ok).toBe(false);
    expect(screen.payee).toEqual(EFT_PAYEE);
    expect(EFT_PAYEE.bank).toBe('Capitec');
    expect(EFT_PAYEE.accountHolder).toBe('MR FRANS OLIVIER');
    expect(EFT_PAYEE.accountType).toBe('Savings Account');
    expect(EFT_PAYEE.accountNumber).toBe('2606460754');
    expect(EFT_PAYEE.branchCode).toBe('470010');
    expect(clock.payment_method_ok).toBe(false);
  });

  it('stores the chosen plan and does not store a card or a paid flag', () => {
    expect(savePlacePlan('co_olive', { bundle: 'both', cadence: 'annual' })).toEqual({
      bundle: 'both',
      cadence: 'annual'
    });
    const raw = localStorage.getItem(PLACE_PLAN_KEY) || '';
    expect(raw).toContain('both');
    expect(raw).toContain('annual');
    expect(raw).not.toMatch(/payment_method_ok|card|2606460754|cvv/i);
    expect(loadPlaceEntitlement('co_olive')).toBeNull();
    expect(paymentScreenState({ payment_method_ok: false }).payment_method_ok).toBe(false);
  });
});
