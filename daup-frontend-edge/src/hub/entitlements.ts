/**
 * Place entitlement service (slice B, P1 per-place billing).
 *
 * Gate product use on the place subscription + enabled_apps — not per-app SKUs.
 * Per-app license checks (verify_subscription_access / withLicenseCheck SKU
 * paywall) are deprecated as the primary gate.
 *
 * Trial clock: event `place.trial_started` fires once when mint + hydrate
 * both succeed AND a seednode is attached (hosted stub counts).
 * Does NOT fire on marketing signup, Gmail login, draft place, or failed hydrate.
 * Idempotent per placeId — keep original timestamps. Existing `node.trial_started`
 * / companyId records map onto place.trial_started / placeId without reminting.
 *
 * After trial_ends_at: active if payment stub OK; else past_due (read-only
 * grace, 7 days) then suspended (no writes). Payment is stubbed — no invoices.
 *
 * Meters: see priceMeters.ts / docs/license-pivot.md.
 */

import {
  asCompanyId,
  asPlaceId,
  normalizeEnabledApps,
  type EnableableAppId
} from './companyNode';

export const PLACE_TRIAL_STARTED = 'place.trial_started';
/** Legacy A+B event name. Treated as PLACE_TRIAL_STARTED on read. */
export const NODE_TRIAL_STARTED = 'node.trial_started';
export const TRIAL_DAYS = 30;
export const PAST_DUE_GRACE_DAYS = 7;
export const TRIAL_MS = TRIAL_DAYS * 24 * 60 * 60 * 1000;
export const PAST_DUE_MS = PAST_DUE_GRACE_DAYS * 24 * 60 * 60 * 1000;

/** Same browser keys as A+B so live place records are not reminted. */
export const PLACE_ENTITLEMENTS_KEY = 'daup_node_entitlements';
export const PLACE_TRIAL_EVENTS_KEY = 'daup_node_trial_events';
export const NODE_ENTITLEMENTS_KEY = PLACE_ENTITLEMENTS_KEY;
export const NODE_TRIAL_EVENTS_KEY = PLACE_TRIAL_EVENTS_KEY;

export type PlaceSubscriptionStatus = 'trial' | 'active' | 'past_due' | 'suspended';
export type NodeSubscriptionStatus = PlaceSubscriptionStatus;

export interface PlaceEntitlement {
  placeId: string;
  /** Mapped from / onto placeId. Same `co_*` value — never remint. */
  companyId: string;
  place_subscription_status: PlaceSubscriptionStatus;
  /** Legacy A+B field. Same value as place_subscription_status. */
  node_subscription_status: PlaceSubscriptionStatus;
  trial_started_at: number | null;
  trial_ends_at: number | null;
  enabled_apps: EnableableAppId[];
  /** Unused in v0 (LOCATION dead). Kept so stored records stay readable. */
  billable_locations: number;
  /** Slice G will wire real payment. Stub false → past_due after trial. */
  payment_method_ok: boolean;
}

export type NodeEntitlement = PlaceEntitlement;

export interface PlaceTrialStartedEvent {
  event: typeof PLACE_TRIAL_STARTED | typeof NODE_TRIAL_STARTED;
  placeId: string;
  companyId: string;
  trial_started_at: number;
  trial_ends_at: number;
}

export type NodeTrialStartedEvent = PlaceTrialStartedEvent;

export type PlaceWriteBlockReason =
  | 'no-company'
  | 'no-place'
  | 'app-not-enabled'
  | 'past_due'
  | 'suspended';

export type NodeWriteBlockReason = PlaceWriteBlockReason;

export interface PlaceWriteGate {
  allowed: boolean;
  reason?: PlaceWriteBlockReason;
  status?: PlaceSubscriptionStatus;
}

export type NodeWriteGate = PlaceWriteGate;

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

function licensedPlaceId(value: unknown): string {
  return asPlaceId(value) || asCompanyId(value);
}

export function minBillableLocations(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.max(1, Math.floor(value));
  }
  return 1;
}

export function resolvePlaceSubscriptionStatus(
  rec: Pick<PlaceEntitlement, 'trial_started_at' | 'trial_ends_at' | 'payment_method_ok'>,
  now = Date.now()
): PlaceSubscriptionStatus {
  if (!rec.trial_started_at || !rec.trial_ends_at) return 'suspended';
  if (now < rec.trial_ends_at) return 'trial';
  if (rec.payment_method_ok) return 'active';
  if (now < rec.trial_ends_at + PAST_DUE_MS) return 'past_due';
  return 'suspended';
}

export const resolveNodeSubscriptionStatus = resolvePlaceSubscriptionStatus;

function isTrialEventName(value: unknown): value is PlaceTrialStartedEvent['event'] {
  return value === PLACE_TRIAL_STARTED || value === NODE_TRIAL_STARTED;
}

export function asPlaceEntitlement(value: unknown): PlaceEntitlement | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Record<string, unknown>;
  const placeId = licensedPlaceId(
    raw.placeId ?? raw.place_id ?? raw.companyId ?? raw.company_id
  );
  if (!placeId) return null;
  const trialStarted = typeof raw.trial_started_at === 'number' ? raw.trial_started_at : null;
  const trialEnds = typeof raw.trial_ends_at === 'number' ? raw.trial_ends_at : null;
  const paymentOk = raw.payment_method_ok === true;
  const rec: PlaceEntitlement = {
    placeId,
    companyId: placeId,
    place_subscription_status: 'suspended',
    node_subscription_status: 'suspended',
    trial_started_at: trialStarted,
    trial_ends_at: trialEnds,
    enabled_apps: normalizeEnabledApps(raw.enabled_apps ?? raw.enabledApps),
    billable_locations: minBillableLocations(raw.billable_locations ?? raw.billableLocations),
    payment_method_ok: paymentOk
  };
  const status = resolvePlaceSubscriptionStatus(rec);
  rec.place_subscription_status = status;
  rec.node_subscription_status = status;
  return rec;
}

export const asNodeEntitlement = asPlaceEntitlement;

export function asPlaceTrialEvent(value: unknown, fallbackId = ''): PlaceTrialStartedEvent | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Record<string, unknown>;
  if (!isTrialEventName(raw.event) && raw.event != null) return null;
  const placeId = licensedPlaceId(raw.placeId ?? raw.place_id ?? raw.companyId ?? raw.company_id)
    || licensedPlaceId(fallbackId);
  if (!placeId) return null;
  if (typeof raw.trial_started_at !== 'number' || typeof raw.trial_ends_at !== 'number') return null;
  return {
    event: isTrialEventName(raw.event) ? raw.event : PLACE_TRIAL_STARTED,
    placeId,
    companyId: placeId,
    trial_started_at: raw.trial_started_at,
    trial_ends_at: raw.trial_ends_at
  };
}

function normalizeLoadedEvent(event: PlaceTrialStartedEvent): PlaceTrialStartedEvent {
  return {
    ...event,
    event: PLACE_TRIAL_STARTED,
    placeId: event.placeId || event.companyId,
    companyId: event.companyId || event.placeId
  };
}

export function loadTrialEvents(): Record<string, PlaceTrialStartedEvent> {
  const parsed = readJson<Record<string, unknown>>(PLACE_TRIAL_EVENTS_KEY, {});
  const out: Record<string, PlaceTrialStartedEvent> = {};
  if (!parsed || typeof parsed !== 'object') return out;
  for (const [key, value] of Object.entries(parsed)) {
    const event = asPlaceTrialEvent(value, key);
    if (event) out[event.placeId] = event;
  }
  return out;
}

export function loadTrialEvent(placeId: string): PlaceTrialStartedEvent | null {
  const id = licensedPlaceId(placeId);
  if (!id) return null;
  const event = loadTrialEvents()[id];
  if (!event) return null;
  return normalizeLoadedEvent(event);
}

function saveTrialEvent(event: PlaceTrialStartedEvent): PlaceTrialStartedEvent {
  const all = loadTrialEvents();
  const existing = all[event.placeId] || all[event.companyId];
  if (existing) return existing;
  all[event.placeId] = event;
  writeJson(PLACE_TRIAL_EVENTS_KEY, all);
  return event;
}

export function loadPlaceEntitlements(): Record<string, PlaceEntitlement> {
  const parsed = readJson<Record<string, unknown>>(PLACE_ENTITLEMENTS_KEY, {});
  const out: Record<string, PlaceEntitlement> = {};
  if (!parsed || typeof parsed !== 'object') return out;
  for (const [key, value] of Object.entries(parsed)) {
    const rec = asPlaceEntitlement({
      ...(value as object),
      placeId: licensedPlaceId((value as { placeId?: string; companyId?: string }).placeId)
        || licensedPlaceId((value as { companyId?: string }).companyId)
        || licensedPlaceId(key)
    });
    if (rec) out[rec.placeId] = rec;
  }
  return out;
}

export const loadNodeEntitlements = loadPlaceEntitlements;

export function loadPlaceEntitlement(placeId?: string | null): PlaceEntitlement | null {
  const id = licensedPlaceId(placeId);
  if (!id) return null;
  return loadPlaceEntitlements()[id] || null;
}

export const loadNodeEntitlement = loadPlaceEntitlement;

export function savePlaceEntitlement(next: Partial<PlaceEntitlement> & {
  placeId?: string;
  companyId?: string;
}): PlaceEntitlement {
  const rec = asPlaceEntitlement(next);
  if (!rec) {
    throw new Error('placeId is required to save a place entitlement');
  }
  rec.place_subscription_status = resolvePlaceSubscriptionStatus(rec);
  rec.node_subscription_status = rec.place_subscription_status;
  const all = loadPlaceEntitlements();
  all[rec.placeId] = rec;
  writeJson(PLACE_ENTITLEMENTS_KEY, all);
  return rec;
}

export const saveNodeEntitlement = savePlaceEntitlement;

export function patchPlaceEntitlement(
  placeId: string,
  patch: Partial<Omit<PlaceEntitlement, 'placeId' | 'companyId'>>
): PlaceEntitlement | null {
  const id = licensedPlaceId(placeId);
  if (!id) return null;
  const current = loadPlaceEntitlement(id) || {
    placeId: id,
    companyId: id,
    place_subscription_status: 'suspended' as const,
    node_subscription_status: 'suspended' as const,
    trial_started_at: null,
    trial_ends_at: null,
    enabled_apps: [],
    billable_locations: 1,
    payment_method_ok: false
  };
  return savePlaceEntitlement({
    ...current,
    ...patch,
    placeId: id,
    companyId: id,
    enabled_apps: patch.enabled_apps
      ? normalizeEnabledApps(patch.enabled_apps)
      : current.enabled_apps,
    billable_locations: minBillableLocations(
      patch.billable_locations ?? current.billable_locations
    )
  });
}

export const patchNodeEntitlement = patchPlaceEntitlement;

export function clearPlaceEntitlement(placeId: string): void {
  const id = licensedPlaceId(placeId);
  if (!id) return;
  const all = loadPlaceEntitlements();
  delete all[id];
  writeJson(PLACE_ENTITLEMENTS_KEY, all);
}

export const clearNodeEntitlement = clearPlaceEntitlement;

/**
 * Fire `place.trial_started` once. Mint + hydrate + attached seednode required.
 * Re-emitting for the same placeId (or mapped companyId) is a no-op.
 */
export function maybeFirePlaceTrialStarted(input: {
  placeId?: string;
  companyId?: string;
  minted: boolean;
  hydrated: boolean;
  seednodeAttached: boolean;
  enabledApps?: readonly string[];
  billableLocations?: number;
  now?: number;
}): {
  fired: boolean;
  event: PlaceTrialStartedEvent | null;
  entitlement: PlaceEntitlement | null;
} {
  const placeId = licensedPlaceId(input.placeId || input.companyId);
  if (!placeId) {
    return { fired: false, event: null, entitlement: null };
  }

  const existingEvent = loadTrialEvent(placeId);
  const nextApps = Array.isArray(input.enabledApps)
    ? normalizeEnabledApps(input.enabledApps)
    : undefined;
  if (existingEvent) {
    const current = loadPlaceEntitlement(placeId);
    const entitlement = patchPlaceEntitlement(placeId, {
      trial_started_at: existingEvent.trial_started_at,
      trial_ends_at: existingEvent.trial_ends_at,
      enabled_apps: nextApps && nextApps.length ? nextApps : current?.enabled_apps,
      billable_locations: input.billableLocations
    });
    return { fired: false, event: existingEvent, entitlement };
  }

  if (!input.minted || !input.hydrated || !input.seednodeAttached) {
    const entitlement = patchPlaceEntitlement(placeId, {
      enabled_apps: nextApps && nextApps.length ? nextApps : undefined,
      billable_locations: input.billableLocations
    });
    return { fired: false, event: null, entitlement };
  }

  const now = input.now ?? Date.now();
  const event: PlaceTrialStartedEvent = {
    event: PLACE_TRIAL_STARTED,
    placeId,
    companyId: placeId,
    trial_started_at: now,
    trial_ends_at: now + TRIAL_MS
  };
  saveTrialEvent(event);
  const entitlement = savePlaceEntitlement({
    placeId,
    companyId: placeId,
    place_subscription_status: 'trial',
    node_subscription_status: 'trial',
    trial_started_at: event.trial_started_at,
    trial_ends_at: event.trial_ends_at,
    enabled_apps: normalizeEnabledApps(input.enabledApps),
    billable_locations: minBillableLocations(input.billableLocations),
    payment_method_ok: false
  });
  return { fired: true, event, entitlement };
}

export const maybeFireNodeTrialStarted = maybeFirePlaceTrialStarted;

export function mergeEnabledApps(
  current: readonly string[] | undefined,
  incoming: readonly string[] | undefined
): {
  next: EnableableAppId[];
  added: EnableableAppId[];
  already: EnableableAppId[];
} {
  const held = normalizeEnabledApps(current);
  const want = normalizeEnabledApps(incoming);
  const already = want.filter(id => held.includes(id));
  const added = want.filter(id => !held.includes(id));
  return {
    next: normalizeEnabledApps([...held, ...added]),
    added,
    already
  };
}

/**
 * Enable apps on an existing place. Dedupes — a second Eatery/Project is a no-op.
 * Does not remint placeId / companyId.
 */
export function enableAppsOnPlace(args: {
  placeId?: string;
  companyId?: string;
  incoming: readonly string[];
  current?: readonly string[];
}): {
  ok: boolean;
  next: EnableableAppId[];
  added: EnableableAppId[];
  already: EnableableAppId[];
  noOp: boolean;
} {
  const id = licensedPlaceId(args.placeId || args.companyId);
  const held = Array.isArray(args.current)
    ? normalizeEnabledApps(args.current)
    : (loadPlaceEntitlement(id)?.enabled_apps || []);
  const merged = mergeEnabledApps(held, args.incoming);
  if (!id) {
    return { ok: false, ...merged, next: held, added: [], noOp: true };
  }
  if (!merged.added.length) {
    return { ok: true, ...merged, next: held, noOp: true };
  }
  patchPlaceEntitlement(id, { enabled_apps: merged.next });
  return { ok: true, ...merged, noOp: false };
}

export function isAppEnabled(entitlement: PlaceEntitlement | null | undefined, appId: string): boolean {
  if (!entitlement) return false;
  return entitlement.enabled_apps.includes(appId as EnableableAppId);
}

/** Full access during trial / active. past_due is read-only. suspended: no writes. */
export function hasFullAppAccess(
  entitlement: PlaceEntitlement | null | undefined,
  appId: string,
  now = Date.now()
): boolean {
  if (!entitlement || !isAppEnabled(entitlement, appId)) return false;
  const status = resolvePlaceSubscriptionStatus(entitlement, now);
  return status === 'trial' || status === 'active';
}

export function assertPlaceWrite(
  entitlement: PlaceEntitlement | null | undefined,
  appId?: string,
  now = Date.now()
): PlaceWriteGate {
  if (!entitlement) return { allowed: false, reason: 'no-place' };
  const status = resolvePlaceSubscriptionStatus(entitlement, now);
  if (appId && !isAppEnabled(entitlement, appId)) {
    return { allowed: false, reason: 'app-not-enabled', status };
  }
  if (status === 'past_due') return { allowed: false, reason: 'past_due', status };
  if (status === 'suspended') return { allowed: false, reason: 'suspended', status };
  return { allowed: true, status };
}

export function assertNodeWrite(
  entitlement: PlaceEntitlement | null | undefined,
  appId?: string,
  now = Date.now()
): PlaceWriteGate {
  const gate = assertPlaceWrite(entitlement, appId, now);
  if (gate.reason === 'no-place') return { ...gate, reason: 'no-company' };
  return gate;
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
