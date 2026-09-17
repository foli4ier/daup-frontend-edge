import { beforeEach, describe, expect, it } from 'vitest';
import {
  DEFAULT_HOSTED_SEEDNODE_ENDPOINT,
  attachHostedSeednodeStub,
  isSeednodeAttached,
  loadSeednodeConfig,
  saveSeednodeConfig
} from './seednode';
import { DEFAULT_HOUSE_MCP_BASE } from './houseMcp';
import { bindCompanyId, mintCompanyId, normalizeEnabledApps, preferHeldCompanyId } from './companyNode';
import {
  NODE_TRIAL_STARTED,
  PAST_DUE_GRACE_DAYS,
  TRIAL_DAYS,
  TRIAL_MS,
  assertNodeWrite,
  hasFullAppAccess,
  loadNodeEntitlement,
  loadTrialEvent,
  maybeFireNodeTrialStarted,
  resolveNodeSubscriptionStatus,
  saveNodeEntitlement
} from './entitlements';
import { LOCATION_MONTHLY_ZAR_EX_VAT, NODE_SUB_MONTHLY_ZAR_EX_VAT, SEED_HOSTED_MONTHLY_ZAR_EX_VAT, stubMonthlyLines } from './priceMeters';

describe('companyId bind', () => {
  it('mints once and never remints when a held id is supplied', () => {
    const first = bindCompanyId(null);
    expect(first.minted).toBe(true);
    expect(first.companyId).toMatch(/^co_/);
    const again = bindCompanyId(first.companyId);
    expect(again.minted).toBe(false);
    expect(again.companyId).toBe(first.companyId);
    expect(preferHeldCompanyId(first.companyId, mintCompanyId())).toBe(first.companyId);
    expect(preferHeldCompanyId('', 'co_incoming')).toBe('co_incoming');
  });

  it('keeps enableable app order and drops consumer EatOut', () => {
    expect(normalizeEnabledApps(['eatout', 'farm', 'eatery', 'farm', 'nope'])).toEqual(['eatery', 'farm']);
  });
});

describe('hosted seednode stub', () => {
  it('uses the live house MCP host and counts as attached', () => {
    expect(DEFAULT_HOSTED_SEEDNODE_ENDPOINT).toBe(DEFAULT_HOUSE_MCP_BASE);
    expect(DEFAULT_HOSTED_SEEDNODE_ENDPOINT).toBe('https://mcp.daup.co.za');
    const seed = attachHostedSeednodeStub('co_held');
    expect(seed).toEqual({
      endpoint: 'https://mcp.daup.co.za',
      mode: 'hosted',
      companyId: 'co_held'
    });
    expect(isSeednodeAttached(seed)).toBe(true);
    expect(isSeednodeAttached({ endpoint: 'https://mcp.daup.co.za', mode: 'hosted' })).toBe(false);
  });
});

describe('node.trial_started', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('fires once when mint + hydrate + seed attach succeed and keeps original timestamps', () => {
    const now = Date.parse('2026-09-17T12:00:00Z');
    const first = maybeFireNodeTrialStarted({
      companyId: 'co_olive',
      minted: true,
      hydrated: true,
      seednodeAttached: true,
      enabledApps: ['eatery', 'project'],
      now
    });
    expect(first.fired).toBe(true);
    expect(first.event?.event).toBe(NODE_TRIAL_STARTED);
    expect(first.event?.trial_started_at).toBe(now);
    expect(first.event?.trial_ends_at).toBe(now + TRIAL_MS);
    expect(first.entitlement?.node_subscription_status).toBe('trial');
    expect(first.entitlement?.enabled_apps).toEqual(['eatery', 'project']);
    expect(first.entitlement?.billable_locations).toBe(1);

    const again = maybeFireNodeTrialStarted({
      companyId: 'co_olive',
      minted: true,
      hydrated: true,
      seednodeAttached: true,
      enabledApps: ['farm'],
      now: now + 86_400_000
    });
    expect(again.fired).toBe(false);
    expect(again.event?.trial_started_at).toBe(now);
    expect(again.event?.trial_ends_at).toBe(now + TRIAL_MS);
    expect(loadTrialEvent('co_olive')?.trial_started_at).toBe(now);
    expect(TRIAL_DAYS).toBe(30);
  });

  it('does not fire on draft, failed hydrate, missing mint, or missing seed', () => {
    const now = Date.parse('2026-09-17T12:00:00Z');
    expect(maybeFireNodeTrialStarted({
      companyId: 'co_draft',
      minted: false,
      hydrated: true,
      seednodeAttached: true,
      enabledApps: ['eatery'],
      now
    }).fired).toBe(false);
    expect(maybeFireNodeTrialStarted({
      companyId: 'co_hydrate',
      minted: true,
      hydrated: false,
      seednodeAttached: true,
      now
    }).fired).toBe(false);
    expect(maybeFireNodeTrialStarted({
      companyId: 'co_seed',
      minted: true,
      hydrated: true,
      seednodeAttached: false,
      now
    }).fired).toBe(false);
    expect(maybeFireNodeTrialStarted({
      companyId: '',
      minted: true,
      hydrated: true,
      seednodeAttached: true,
      now
    }).fired).toBe(false);
    expect(loadTrialEvent('co_draft')).toBeNull();
    expect(loadTrialEvent('co_hydrate')).toBeNull();
    expect(loadTrialEvent('co_seed')).toBeNull();
  });
});

describe('node entitlement gate', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('gives full access to enabled apps during trial and blocks suspended writes', () => {
    const now = Date.parse('2026-09-17T12:00:00Z');
    const entitlement = saveNodeEntitlement({
      companyId: 'co_gate',
      node_subscription_status: 'trial',
      trial_started_at: now,
      trial_ends_at: now + TRIAL_MS,
      enabled_apps: ['farm', 'project'],
      billable_locations: 1,
      payment_method_ok: false
    });
    expect(hasFullAppAccess(entitlement, 'farm', now + 1000)).toBe(true);
    expect(hasFullAppAccess(entitlement, 'eatery', now + 1000)).toBe(false);
    expect(assertNodeWrite(entitlement, 'farm', now + 1000).allowed).toBe(true);

    const afterTrial = now + TRIAL_MS + 1000;
    expect(resolveNodeSubscriptionStatus(entitlement, afterTrial)).toBe('past_due');
    expect(assertNodeWrite(entitlement, 'farm', afterTrial)).toMatchObject({
      allowed: false,
      reason: 'past_due'
    });

    const suspendedAt = now + TRIAL_MS + PAST_DUE_GRACE_DAYS * 24 * 60 * 60 * 1000 + 1000;
    expect(resolveNodeSubscriptionStatus(entitlement, suspendedAt)).toBe('suspended');
    expect(assertNodeWrite(entitlement, 'farm', suspendedAt)).toEqual({
      allowed: false,
      reason: 'suspended',
      status: 'suspended'
    });
    expect(PAST_DUE_GRACE_DAYS).toBe(7);
  });

  it('becomes active after trial when the payment stub is ok', () => {
    const now = Date.parse('2026-09-17T12:00:00Z');
    const entitlement = saveNodeEntitlement({
      companyId: 'co_paid',
      node_subscription_status: 'trial',
      trial_started_at: now,
      trial_ends_at: now + TRIAL_MS,
      enabled_apps: ['eatery'],
      billable_locations: 2,
      payment_method_ok: true
    });
    expect(resolveNodeSubscriptionStatus(entitlement, now + TRIAL_MS + 1000)).toBe('active');
    expect(assertNodeWrite(entitlement, 'eatery', now + TRIAL_MS + 1000).allowed).toBe(true);
    expect(loadNodeEntitlement('co_paid')?.billable_locations).toBe(2);
  });
});

describe('price meters', () => {
  it('stubs node + extra location + hosted seed in ZAR', () => {
    expect(NODE_SUB_MONTHLY_ZAR_EX_VAT).toBe(499);
    expect(LOCATION_MONTHLY_ZAR_EX_VAT).toBe(79);
    expect(SEED_HOSTED_MONTHLY_ZAR_EX_VAT).toBe(199);
    expect(stubMonthlyLines({ billableLocations: 1, seedMode: 'hosted', inTrial: true })).toEqual([
      { code: 'NODE_TRIAL', units: 1, zarExVat: 0 }
    ]);
    expect(stubMonthlyLines({ billableLocations: 1, seedMode: 'hosted', inTrial: false })).toEqual([
      { code: 'NODE_SUB_MONTHLY', units: 1, zarExVat: 499 },
      { code: 'SEED_HOSTED_MONTHLY', units: 1, zarExVat: 199 }
    ]);
    const reseller = stubMonthlyLines({ billableLocations: 10, seedMode: 'hosted', inTrial: false });
    expect(reseller).toEqual([
      { code: 'NODE_SUB_MONTHLY', units: 1, zarExVat: 499 },
      { code: 'LOCATION_MONTHLY', units: 9, zarExVat: 711 },
      { code: 'SEED_HOSTED_MONTHLY', units: 10, zarExVat: 1990 }
    ]);
    expect(stubMonthlyLines({ billableLocations: 1, seedMode: 'on-prem', inTrial: false })).toEqual([
      { code: 'NODE_SUB_MONTHLY', units: 1, zarExVat: 499 }
    ]);
  });
});

describe('seednode persist', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('stores hosted stub config for the bound companyId', () => {
    const seed = saveSeednodeConfig(attachHostedSeednodeStub('co_persist'));
    expect(loadSeednodeConfig()).toEqual(seed);
  });
});
