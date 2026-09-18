import { describe, expect, it } from 'vitest';
import {
  daysLeftOnTrialLabel,
  hasBannedDoorCopy,
  HOSTED_SEED_SUMMARY,
  PLACE_SUB_LINE,
  renewsInDaysLabel,
  SEED_HOSTED_LINE,
  SEED_HOSTED_ON_PREM_LINE,
  SEEDNODE_MODE_ON_PREM
} from './copy';
import { TRIAL_MS } from './entitlements';
import {
  asPlaceSubClock,
  DAY_MS,
  placeChoiceLines,
  placeChoiceTotalLine,
  placeSubscriptionDisplay,
  remainingPeriodCopy,
  remainingPeriodDays,
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
