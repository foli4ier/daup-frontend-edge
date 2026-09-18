import { existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  attachHostedSeednodeStub,
  attachOnPremSeednodeStub,
  DEFAULT_HOSTED_SEEDNODE_ENDPOINT,
  HOSTED_SEED_DOOR_LABEL,
  isSeednodeAttached,
  loadSeednodeConfig,
  loadSeednodeForPlace,
  ON_PREM_SEED_ENDPOINT,
  onPremAttachFields,
  saveSeednodeConfig,
  saveSeednodeForPlace,
  seedConfigForMode,
  seednodeDoorHost,
  SEED_SETUP_ZIP_HREF
} from './seednode';
import { DEFAULT_HOUSE_MCP_BASE } from './houseMcp';
import { bindCompanyId, bindPlaceId, mintCompanyId, normalizeEnabledApps, preferHeldCompanyId } from './companyNode';
import {
  NODE_TRIAL_EVENTS_KEY,
  NODE_TRIAL_STARTED,
  PAST_DUE_GRACE_DAYS,
  PLACE_TRIAL_STARTED,
  TRIAL_DAYS,
  TRIAL_MS,
  assertNodeWrite,
  hasFullAppAccess,
  loadNodeEntitlement,
  loadPlaceEntitlement,
  loadTrialEvent,
  maybeFireNodeTrialStarted,
  maybeFirePlaceTrialStarted,
  resolveNodeSubscriptionStatus,
  saveNodeEntitlement
} from './entitlements';
import {
  LOCATION_MONTHLY_DEAD,
  PLACE_SUB_MONTHLY_ZAR_EX_VAT,
  SEED_HOSTED_MONTHLY_ZAR_EX_VAT,
  stubMonthlyLines
} from './priceMeters';

describe('companyId / placeId bind', () => {
  it('mints once and never remints when a held id is supplied', () => {
    const first = bindCompanyId(null);
    expect(first.minted).toBe(true);
    expect(first.companyId).toMatch(/^co_/);
    const again = bindCompanyId(first.companyId);
    expect(again.minted).toBe(false);
    expect(again.companyId).toBe(first.companyId);
    expect(preferHeldCompanyId(first.companyId, mintCompanyId())).toBe(first.companyId);
    expect(preferHeldCompanyId('', 'co_incoming')).toBe('co_incoming');
    expect(bindPlaceId(first.companyId)).toEqual({ companyId: first.companyId, minted: false });
  });

  it('keeps enableable app order and drops consumer EatOut', () => {
    expect(normalizeEnabledApps(['eatout', 'farm', 'eatery', 'farm', 'nope'])).toEqual(['eatery', 'farm']);
  });
});

describe('hosted seednode stub', () => {
  it('uses the live house host and counts as attached', () => {
    expect(DEFAULT_HOSTED_SEEDNODE_ENDPOINT).toBe(DEFAULT_HOUSE_MCP_BASE);
    expect(DEFAULT_HOSTED_SEEDNODE_ENDPOINT).toBe('https://mcp.daup.co.za');
    const seed = attachHostedSeednodeStub('co_held');
    expect(seed).toEqual({
      endpoint: 'https://mcp.daup.co.za',
      mode: 'hosted',
      placeId: 'co_held',
      companyId: 'co_held'
    });
    expect(isSeednodeAttached(seed)).toBe(true);
    expect(isSeednodeAttached({ endpoint: 'https://mcp.daup.co.za', mode: 'hosted' })).toBe(false);
    expect(seednodeDoorHost(seed)).toBe(HOSTED_SEED_DOOR_LABEL);
    expect(seednodeDoorHost(seed)).toBe('daup.co.za');
    const onPrem = attachOnPremSeednodeStub({
      companyId: 'co_held',
      placeId: 'place-olive',
      ownerEmail: 'owner@theolive.co.za'
    });
    expect(onPrem).toEqual({
      endpoint: 'http://127.0.0.1:8080',
      mode: 'on-prem',
      companyId: 'co_held',
      placeId: 'place-olive',
      ownerEmail: 'owner@theolive.co.za'
    });
    expect(seednodeDoorHost(onPrem)).toBe('This premises.');
    expect(seedConfigForMode({ mode: 'hosted', companyId: 'co_held' }).mode).toBe('hosted');
    expect(SEED_SETUP_ZIP_HREF).toBe('/on-prem/daup-onprem-seed-v0.zip');
    const zipPath = join(dirname(fileURLToPath(import.meta.url)), '../../public/on-prem/daup-onprem-seed-v0.zip');
    expect(existsSync(zipPath)).toBe(true);
    const listing = execSync(`unzip -l ${JSON.stringify(zipPath)}`, { encoding: 'utf8' });
    expect(listing).toContain('onprem-pack/start-house.sh');
    expect(listing).toContain('onprem-pack/start-house.bat');
    expect(listing).toContain('onprem-pack/healthcheck.sh');
    expect(listing).toContain('onprem-pack/start-tunnel.sh');
    expect(listing).toContain('onprem-pack/README.md');
    expect(listing).not.toMatch(/\.exe\b/i);
    expect(onPremAttachFields({
      ownerEmail: 'Owner@TheOlive.co.za',
      companyId: 'co_held',
      placeId: 'place-olive'
    })).toEqual({
      mode: 'on-prem',
      endpoint: ON_PREM_SEED_ENDPOINT,
      ownerEmail: 'owner@theolive.co.za',
      companyId: 'co_held',
      placeId: 'place-olive'
    });
    expect(onPremAttachFields({
      ownerEmail: 'owner@theolive.co.za',
      companyId: 'co_held',
      placeId: ''
    })).toBeNull();
  });
});

describe('place.trial_started', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('fires once when mint + hydrate + seed attach succeed and keeps original timestamps', () => {
    const now = Date.parse('2026-09-17T12:00:00Z');
    const first = maybeFirePlaceTrialStarted({
      placeId: 'co_olive',
      minted: true,
      hydrated: true,
      seednodeAttached: true,
      enabledApps: ['eatery', 'project'],
      now
    });
    expect(first.fired).toBe(true);
    expect(first.event?.event).toBe(PLACE_TRIAL_STARTED);
    expect(first.event?.placeId).toBe('co_olive');
    expect(first.event?.companyId).toBe('co_olive');
    expect(first.event?.trial_started_at).toBe(now);
    expect(first.event?.trial_ends_at).toBe(now + TRIAL_MS);
    expect(first.entitlement?.place_subscription_status).toBe('trial');
    expect(first.entitlement?.node_subscription_status).toBe('trial');
    expect(first.entitlement?.enabled_apps).toEqual(['eatery', 'project']);
    expect(first.entitlement?.placeId).toBe('co_olive');

    const again = maybeFirePlaceTrialStarted({
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
    expect(loadTrialEvent('co_olive')?.event).toBe(PLACE_TRIAL_STARTED);
    expect(TRIAL_DAYS).toBe(30);
  });

  it('maps stored node.trial_started / companyId without reminting', () => {
    const now = Date.parse('2026-09-17T12:00:00Z');
    localStorage.setItem(NODE_TRIAL_EVENTS_KEY, JSON.stringify({
      co_olive: {
        event: NODE_TRIAL_STARTED,
        companyId: 'co_olive',
        trial_started_at: now,
        trial_ends_at: now + TRIAL_MS
      }
    }));
    const mapped = loadTrialEvent('co_olive');
    expect(mapped?.event).toBe(PLACE_TRIAL_STARTED);
    expect(mapped?.placeId).toBe('co_olive');
    expect(mapped?.companyId).toBe('co_olive');
    const again = maybeFireNodeTrialStarted({
      companyId: 'co_olive',
      minted: true,
      hydrated: true,
      seednodeAttached: true,
      now: now + 86_400_000
    });
    expect(again.fired).toBe(false);
    expect(again.event?.trial_started_at).toBe(now);
    expect(JSON.parse(localStorage.getItem(NODE_TRIAL_EVENTS_KEY) || '{}').co_olive.event).toBe(NODE_TRIAL_STARTED);
  });

  it('does not fire on draft, failed hydrate, missing mint, or missing seed', () => {
    const now = Date.parse('2026-09-17T12:00:00Z');
    expect(maybeFirePlaceTrialStarted({
      placeId: 'co_draft',
      minted: false,
      hydrated: true,
      seednodeAttached: true,
      enabledApps: ['eatery'],
      now
    }).fired).toBe(false);
    expect(maybeFirePlaceTrialStarted({
      companyId: 'co_hydrate',
      minted: true,
      hydrated: false,
      seednodeAttached: true,
      now
    }).fired).toBe(false);
    expect(maybeFirePlaceTrialStarted({
      placeId: 'co_seed',
      minted: true,
      hydrated: true,
      seednodeAttached: false,
      now
    }).fired).toBe(false);
    expect(maybeFirePlaceTrialStarted({
      placeId: '',
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

describe('place entitlement gate', () => {
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
    expect(entitlement.placeId).toBe('co_gate');
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
    expect(loadPlaceEntitlement('co_paid')?.placeId).toBe('co_paid');
  });
});

describe('price meters', () => {
  it('stubs place + hosted seed in ZAR and keeps LOCATION dead', () => {
    expect(PLACE_SUB_MONTHLY_ZAR_EX_VAT).toBe(199);
    expect(SEED_HOSTED_MONTHLY_ZAR_EX_VAT).toBe(299);
    expect(LOCATION_MONTHLY_DEAD).toBe(true);
    expect(stubMonthlyLines({ seedMode: 'hosted', inTrial: true })).toEqual([
      { code: 'PLACE_TRIAL', units: 1, zarExVat: 0 }
    ]);
    expect(stubMonthlyLines({ seedMode: 'hosted', inTrial: false })).toEqual([
      { code: 'PLACE_SUB_MONTHLY', units: 1, zarExVat: 199 },
      { code: 'SEED_HOSTED_MONTHLY', units: 1, zarExVat: 299 }
    ]);
    expect(stubMonthlyLines({
      seedMode: 'hosted',
      inTrial: false,
      billableLocations: 10
    })).toEqual([
      { code: 'PLACE_SUB_MONTHLY', units: 1, zarExVat: 199 },
      { code: 'SEED_HOSTED_MONTHLY', units: 1, zarExVat: 299 }
    ]);
    expect(stubMonthlyLines({ seedMode: 'on-prem', inTrial: false })).toEqual([
      { code: 'PLACE_SUB_MONTHLY', units: 1, zarExVat: 199 },
      { code: 'SEED_HOSTED_MONTHLY', units: 1, zarExVat: 0 }
    ]);
    expect(JSON.stringify(stubMonthlyLines({ seedMode: 'hosted', inTrial: false, billableLocations: 10 })))
      .not.toContain('LOCATION');
  });
});

describe('seednode persist', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('stores hosted stub config for the bound place id', () => {
    const seed = saveSeednodeConfig(attachHostedSeednodeStub('co_persist'));
    expect(loadSeednodeConfig()).toEqual(seed);
    const byPlace = saveSeednodeForPlace('co_second', attachHostedSeednodeStub('co_second'));
    expect(loadSeednodeForPlace('co_second')).toEqual(byPlace);
    expect(loadSeednodeForPlace('co_persist')).toEqual(seed);
    const onPrem = saveSeednodeForPlace('co_onprem', seedConfigForMode({
      mode: 'on-prem',
      companyId: 'co_onprem',
      placeId: 'place-onprem',
      ownerEmail: 'owner@theolive.co.za'
    }));
    expect(onPrem.mode).toBe('on-prem');
    expect(onPrem.placeId).toBe('place-onprem');
    expect(onPrem.companyId).toBe('co_onprem');
    expect(onPrem.ownerEmail).toBe('owner@theolive.co.za');
    expect(loadSeednodeForPlace('co_onprem')?.placeId).toBe('place-onprem');
    expect(loadSeednodeForPlace('co_onprem')?.mode).toBe('on-prem');
    expect(loadSeednodeForPlace('co_persist')?.mode).toBe('hosted');
  });
});
