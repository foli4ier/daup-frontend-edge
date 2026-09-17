/**
 * Company / place node identity for Hub (slice A).
 *
 * One company = one place = one licensed node. Mint `companyId` once and
 * reuse forever — never remint on re-login, seed switch, or hydrate.
 */

export const COMPANY_ID_PREFIX = 'co_';

export const ENABLEABLE_APP_IDS = [
  'eatery',
  'project',
  'farm',
  'reseller',
  'maker',
  'chat'
] as const;

export type EnableableAppId = (typeof ENABLEABLE_APP_IDS)[number];

/** EatOut is a free consumer client — it does not mint or ride enabled_apps. */
export const CONSUMER_APP_IDS = ['eatout'] as const;

export function isEnableableAppId(value: unknown): value is EnableableAppId {
  return typeof value === 'string' && (ENABLEABLE_APP_IDS as readonly string[]).includes(value);
}

export function normalizeEnabledApps(values: unknown): EnableableAppId[] {
  if (!Array.isArray(values)) return [];
  const seen = new Set<EnableableAppId>();
  for (const value of values) {
    if (!isEnableableAppId(value)) continue;
    seen.add(value);
  }
  return ENABLEABLE_APP_IDS.filter(id => seen.has(id));
}

export function mintCompanyId(now = Date.now()): string {
  const uuid = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${now.toString(16)}-${Math.random().toString(16).slice(2, 10)}`;
  return `${COMPANY_ID_PREFIX}${uuid}`;
}

export function asCompanyId(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

/**
 * Bind an existing companyId, or mint once if absent.
 * Passing a held id is always a no-op remint — original id wins.
 */
export function bindCompanyId(existing?: string | null): { companyId: string; minted: boolean } {
  const held = asCompanyId(existing);
  if (held) return { companyId: held, minted: false };
  return { companyId: mintCompanyId(), minted: true };
}

/** Prefer the Hub-held id. Incoming ids never replace a bound companyId. */
export function preferHeldCompanyId(held?: string | null, incoming?: string | null): string {
  return asCompanyId(held) || asCompanyId(incoming);
}

export interface CompanyNodeRecord {
  companyId: string;
  enabledApps: EnableableAppId[];
  billableLocations: number;
}

export function asCompanyNodeRecord(value: unknown): CompanyNodeRecord | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Record<string, unknown>;
  const companyId = asCompanyId(raw.companyId);
  if (!companyId) return null;
  const enabledApps = normalizeEnabledApps(raw.enabledApps ?? raw.enabled_apps);
  const locationsRaw = raw.billableLocations ?? raw.billable_locations;
  const billableLocations = typeof locationsRaw === 'number' && Number.isFinite(locationsRaw)
    ? Math.max(1, Math.floor(locationsRaw))
    : 1;
  return { companyId, enabledApps, billableLocations };
}

export function primaryChainApp(enabledApps: readonly string[]): 'eatery' | 'farm' | 'reseller' | 'maker' {
  for (const id of enabledApps) {
    if (id === 'eatery' || id === 'farm' || id === 'reseller' || id === 'maker') return id;
  }
  return 'eatery';
}
