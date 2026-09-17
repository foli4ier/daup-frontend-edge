/**
 * Node entitlement service (slice B).
 *
 * Gate product use on node subscription + enabled_apps — not per-app SKUs.
 * Per-app license checks (verify_subscription_access / withLicenseCheck SKU
 * paywall) are deprecated as the primary gate.
 *
 * Trial clock: event `node.trial_started` fires once when mint + hydrate
 * both succeed AND a seednode is attached (hosted stub counts).
 * Does NOT fire on marketing signup, Gmail login, draft place, or failed hydrate.
 * Idempotent per companyId — keep original timestamps.
 *
 * After trial_ends_at: active if payment stub OK; else past_due (read-only
 * grace, 7 days) then suspended (no writes). Payment is stubbed — no invoices.
 *
 * Meters: see priceMeters.ts / docs/license-pivot.md.
 */

import {
  asCompanyId,
  normalizeEnabledApps,
  type EnableableAppId
} from './companyNode';

export const NODE_TRIAL_STARTED = 'node.trial_started';
export const TRIAL_DAYS = 30;
export const PAST_DUE_GRACE_DAYS = 7;
export const TRIAL_MS = TRIAL_DAYS * 24 * 60 * 60 * 1000;
export const PAST_DUE_MS = PAST_DUE_GRACE_DAYS * 24 * 60 * 60 * 1000;

export const NODE_ENTITLEMENTS_KEY = 'daup_node_entitlements';
export const NODE_TRIAL_EVENTS_KEY = 'daup_node_trial_events';

export type NodeSubscriptionStatus = 'trial' | 'active' | 'past_due' | 'suspended';

export interface NodeEntitlement {
  companyId: string;
  node_subscription_status: NodeSubscriptionStatus;
  trial_started_at: number | null;
  trial_ends_at: number | null;
  enabled_apps: EnableableAppId[];
  billable_locations: number;
  /** Slice G will wire real payment. Stub false → past_due after trial. */
  payment_method_ok: boolean;
}

export interface NodeTrialStartedEvent {
  event: typeof NODE_TRIAL_STARTED;
  companyId: string;
  trial_started_at: number;
  trial_ends_at: number;
}

export type NodeWriteBlockReason =
  | 'no-company'
  | 'app-not-enabled'
  | 'past_due'
  | 'suspended';

export interface NodeWriteGate {
  allowed: boolean;
  reason?: NodeWriteBlockReason;
  status?: NodeSubscriptionStatus;
}

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore quota
  }
}

export function minBillableLocations(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.max(1, Math.floor(value));
  }
  return 1;
}

export function resolveNodeSubscriptionStatus(
  rec: Pick<NodeEntitlement, 'trial_started_at' | 'trial_ends_at' | 'payment_method_ok'>,
  now = Date.now()
): NodeSubscriptionStatus {
  if (!rec.trial_started_at || !rec.trial_ends_at) return 'suspended';
  if (now < rec.trial_ends_at) return 'trial';
  if (rec.payment_method_ok) return 'active';
  if (now < rec.trial_ends_at + PAST_DUE_MS) return 'past_due';
  return 'suspended';
}

export function asNodeEntitlement(value: unknown): NodeEntitlement | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Record<string, unknown>;
  const companyId = asCompanyId(raw.companyId ?? raw.company_id);
  if (!companyId) return null;
  const trialStarted = typeof raw.trial_started_at === 'number' ? raw.trial_started_at : null;
  const trialEnds = typeof raw.trial_ends_at === 'number' ? raw.trial_ends_at : null;
  const paymentOk = raw.payment_method_ok === true;
  const rec: NodeEntitlement = {
    companyId,
    node_subscription_status: 'suspended',
    trial_started_at: trialStarted,
    trial_ends_at: trialEnds,
    enabled_apps: normalizeEnabledApps(raw.enabled_apps ?? raw.enabledApps),
    billable_locations: minBillableLocations(raw.billable_locations ?? raw.billableLocations),
    payment_method_ok: paymentOk
  };
  rec.node_subscription_status = resolveNodeSubscriptionStatus(rec);
  return rec;
}

export function loadTrialEvents(): Record<string, NodeTrialStartedEvent> {
  const parsed = readJson<Record<string, NodeTrialStartedEvent>>(NODE_TRIAL_EVENTS_KEY, {});
  if (!parsed || typeof parsed !== 'object') return {};
  return parsed;
}

export function loadTrialEvent(companyId: string): NodeTrialStartedEvent | null {
  const id = asCompanyId(companyId);
  if (!id) return null;
  const event = loadTrialEvents()[id];
  if (!event || event.event !== NODE_TRIAL_STARTED) return null;
  return event;
}

function saveTrialEvent(event: NodeTrialStartedEvent): NodeTrialStartedEvent {
  const all = loadTrialEvents();
  const existing = all[event.companyId];
  if (existing) return existing;
  all[event.companyId] = event;
  writeJson(NODE_TRIAL_EVENTS_KEY, all);
  return event;
}

export function loadNodeEntitlements(): Record<string, NodeEntitlement> {
  const parsed = readJson<Record<string, unknown>>(NODE_ENTITLEMENTS_KEY, {});
  const out: Record<string, NodeEntitlement> = {};
  if (!parsed || typeof parsed !== 'object') return out;
  for (const [key, value] of Object.entries(parsed)) {
    const rec = asNodeEntitlement({ ...(value as object), companyId: asCompanyId((value as { companyId?: string }).companyId) || key });
    if (rec) out[rec.companyId] = rec;
  }
  return out;
}

export function loadNodeEntitlement(companyId?: string | null): NodeEntitlement | null {
  const id = asCompanyId(companyId);
  if (!id) return null;
  return loadNodeEntitlements()[id] || null;
}

export function saveNodeEntitlement(next: NodeEntitlement): NodeEntitlement {
  const rec = asNodeEntitlement(next);
  if (!rec) {
    throw new Error('companyId is required to save a node entitlement');
  }
  rec.node_subscription_status = resolveNodeSubscriptionStatus(rec);
  const all = loadNodeEntitlements();
  all[rec.companyId] = rec;
  writeJson(NODE_ENTITLEMENTS_KEY, all);
  return rec;
}

export function patchNodeEntitlement(
  companyId: string,
  patch: Partial<Omit<NodeEntitlement, 'companyId'>>
): NodeEntitlement | null {
  const id = asCompanyId(companyId);
  if (!id) return null;
  const current = loadNodeEntitlement(id) || {
    companyId: id,
    node_subscription_status: 'suspended' as const,
    trial_started_at: null,
    trial_ends_at: null,
    enabled_apps: [],
    billable_locations: 1,
    payment_method_ok: false
  };
  return saveNodeEntitlement({
    ...current,
    ...patch,
    companyId: id,
    enabled_apps: patch.enabled_apps
      ? normalizeEnabledApps(patch.enabled_apps)
      : current.enabled_apps,
    billable_locations: minBillableLocations(
      patch.billable_locations ?? current.billable_locations
    )
  });
}

export function clearNodeEntitlement(companyId: string): void {
  const id = asCompanyId(companyId);
  if (!id) return;
  const all = loadNodeEntitlements();
  delete all[id];
  writeJson(NODE_ENTITLEMENTS_KEY, all);
}

/**
 * Fire `node.trial_started` once. Mint + hydrate + attached seednode required.
 * Re-emitting for the same companyId is a no-op (original timestamps kept).
 */
export function maybeFireNodeTrialStarted(input: {
  companyId: string;
  minted: boolean;
  hydrated: boolean;
  seednodeAttached: boolean;
  enabledApps?: readonly string[];
  billableLocations?: number;
  now?: number;
}): {
  fired: boolean;
  event: NodeTrialStartedEvent | null;
  entitlement: NodeEntitlement | null;
} {
  const companyId = asCompanyId(input.companyId);
  if (!companyId) {
    return { fired: false, event: null, entitlement: null };
  }

  const existingEvent = loadTrialEvent(companyId);
  const nextApps = Array.isArray(input.enabledApps)
    ? normalizeEnabledApps(input.enabledApps)
    : undefined;
  if (existingEvent) {
    const current = loadNodeEntitlement(companyId);
    const entitlement = patchNodeEntitlement(companyId, {
      trial_started_at: existingEvent.trial_started_at,
      trial_ends_at: existingEvent.trial_ends_at,
      enabled_apps: nextApps && nextApps.length ? nextApps : current?.enabled_apps,
      billable_locations: input.billableLocations
    });
    return { fired: false, event: existingEvent, entitlement };
  }

  if (!input.minted || !input.hydrated || !input.seednodeAttached) {
    const entitlement = patchNodeEntitlement(companyId, {
      enabled_apps: nextApps && nextApps.length ? nextApps : undefined,
      billable_locations: input.billableLocations
    });
    return { fired: false, event: null, entitlement };
  }

  const now = input.now ?? Date.now();
  const event: NodeTrialStartedEvent = {
    event: NODE_TRIAL_STARTED,
    companyId,
    trial_started_at: now,
    trial_ends_at: now + TRIAL_MS
  };
  saveTrialEvent(event);
  const entitlement = saveNodeEntitlement({
    companyId,
    node_subscription_status: 'trial',
    trial_started_at: event.trial_started_at,
    trial_ends_at: event.trial_ends_at,
    enabled_apps: normalizeEnabledApps(input.enabledApps),
    billable_locations: minBillableLocations(input.billableLocations),
    payment_method_ok: false
  });
  return { fired: true, event, entitlement };
}

export function isAppEnabled(entitlement: NodeEntitlement | null | undefined, appId: string): boolean {
  if (!entitlement) return false;
  return entitlement.enabled_apps.includes(appId as EnableableAppId);
}

/** Full access during trial / active. past_due is read-only. suspended: no writes. */
export function hasFullAppAccess(
  entitlement: NodeEntitlement | null | undefined,
  appId: string,
  now = Date.now()
): boolean {
  if (!entitlement || !isAppEnabled(entitlement, appId)) return false;
  const status = resolveNodeSubscriptionStatus(entitlement, now);
  return status === 'trial' || status === 'active';
}

export function assertNodeWrite(
  entitlement: NodeEntitlement | null | undefined,
  appId?: string,
  now = Date.now()
): NodeWriteGate {
  if (!entitlement) return { allowed: false, reason: 'no-company' };
  const status = resolveNodeSubscriptionStatus(entitlement, now);
  if (appId && !isAppEnabled(entitlement, appId)) {
    return { allowed: false, reason: 'app-not-enabled', status };
  }
  if (status === 'past_due') return { allowed: false, reason: 'past_due', status };
  if (status === 'suspended') return { allowed: false, reason: 'suspended', status };
  return { allowed: true, status };
}

/** Map legacy per-app module SKUs onto enableable app ids. */
export const MODULE_TO_ENABLED_APP: Record<string, EnableableAppId> = {
  'daup-eatery': 'eatery',
  'daup-farmer': 'farm',
  'daup-reseller': 'reseller',
  'daup-manufacturing': 'maker',
  'daup-project': 'project'
};

export function enabledAppForModule(moduleName: string): EnableableAppId | null {
  return MODULE_TO_ENABLED_APP[moduleName] || null;
}
