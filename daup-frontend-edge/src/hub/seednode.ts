/**
 * Hub seednode config (slice A stub, P1 per-place).
 *
 * Shape: { endpoint, mode: "hosted" | "on-prem", placeId? / companyId? }
 * Default hosted endpoint is the live house host (mcp.daup.co.za).
 * Door chrome uses daup.co.za — no MCP word on kitchen doors.
 *
 * Persist attach config. Do not block on seednode_status MCP tools.
 * Connected badge polling is slice C. Hosted↔on-prem switch is slice C —
 * this module never remints a live place id.
 */

/** Same origin as DEFAULT_HOUSE_MCP_BASE in houseMcp.ts — Hub's canonical hosted host. */
export const DEFAULT_HOSTED_SEEDNODE_ENDPOINT = 'https://mcp.daup.co.za';
export const HOSTED_SEED_DOOR_LABEL = 'daup.co.za';
export const SEEDNODE_STORAGE_KEY = 'daup_seednode_config';
export const SEEDNODE_BY_PLACE_KEY = 'daup_seednode_by_place';

export type SeednodeMode = 'hosted' | 'on-prem';

export interface SeednodeConfig {
  endpoint: string;
  mode: SeednodeMode;
  /** Licensed place id (mapped from companyId). */
  placeId?: string;
  /** Legacy A+B field. Same value as placeId when present. */
  companyId?: string;
}

function asPlaceKey(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export function asSeednodeMode(value: unknown): SeednodeMode {
  return value === 'on-prem' ? 'on-prem' : 'hosted';
}

export function asSeednodeConfig(value: unknown): SeednodeConfig | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Record<string, unknown>;
  const endpoint = typeof raw.endpoint === 'string' ? raw.endpoint.trim() : '';
  if (!endpoint) return null;
  const config: SeednodeConfig = {
    endpoint,
    mode: asSeednodeMode(raw.mode)
  };
  const placeId = asPlaceKey(raw.placeId ?? raw.place_id ?? raw.companyId ?? raw.company_id);
  if (placeId) {
    config.placeId = placeId;
    config.companyId = placeId;
  }
  return config;
}

export function defaultHostedSeednode(placeId: string): SeednodeConfig {
  const id = asPlaceKey(placeId);
  const config: SeednodeConfig = {
    endpoint: DEFAULT_HOSTED_SEEDNODE_ENDPOINT,
    mode: 'hosted'
  };
  if (id) {
    config.placeId = id;
    config.companyId = id;
  }
  return config;
}

/** Hosted stub attach. Counts as attached for trial start. */
export function attachHostedSeednodeStub(placeId: string): SeednodeConfig {
  return defaultHostedSeednode(placeId);
}

export function isSeednodeAttached(config: SeednodeConfig | null | undefined): boolean {
  if (!config) return false;
  return Boolean(config.endpoint && config.mode && (config.placeId || config.companyId));
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

export function loadSeednodeMap(): Record<string, SeednodeConfig> {
  const parsed = readJson<Record<string, unknown>>(SEEDNODE_BY_PLACE_KEY, {});
  const out: Record<string, SeednodeConfig> = {};
  if (!parsed || typeof parsed !== 'object') return out;
  for (const [key, value] of Object.entries(parsed)) {
    const config = asSeednodeConfig({
      ...(value as object),
      placeId: asPlaceKey((value as { placeId?: string; companyId?: string }).placeId)
        || asPlaceKey((value as { companyId?: string }).companyId)
        || asPlaceKey(key)
    });
    if (config && (config.placeId || config.companyId)) {
      const id = config.placeId || config.companyId || key;
      out[id] = config;
    }
  }
  const legacy = loadSeednodeConfig();
  const legacyId = legacy?.placeId || legacy?.companyId;
  if (legacy && legacyId && !out[legacyId]) out[legacyId] = legacy;
  return out;
}

export function loadSeednodeForPlace(placeId?: string | null): SeednodeConfig | null {
  const id = asPlaceKey(placeId);
  if (!id) return loadSeednodeConfig();
  return loadSeednodeMap()[id] || null;
}

export function saveSeednodeForPlace(placeId: string, config: SeednodeConfig): SeednodeConfig {
  const id = asPlaceKey(placeId);
  const next = asSeednodeConfig({ ...config, placeId: id || config.placeId, companyId: id || config.companyId })
    || config;
  if (id) {
    const all = loadSeednodeMap();
    all[id] = next;
    writeJson(SEEDNODE_BY_PLACE_KEY, all);
  }
  saveSeednodeConfig(next);
  return next;
}

export function loadSeednodeConfig(): SeednodeConfig | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(SEEDNODE_STORAGE_KEY);
    if (!raw) return null;
    return asSeednodeConfig(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function saveSeednodeConfig(config: SeednodeConfig): SeednodeConfig {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(SEEDNODE_STORAGE_KEY, JSON.stringify(config));
    } catch {
      // ignore quota
    }
  }
  return config;
}

export function clearSeednodeConfig(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(SEEDNODE_STORAGE_KEY);
    localStorage.removeItem(SEEDNODE_BY_PLACE_KEY);
  } catch {
    // ignore
  }
}

/** Kitchen host label — strip the mcp. prefix so doors stay kitchen English. */
export function seednodeDoorHost(config: SeednodeConfig | null | undefined): string {
  if (!config?.endpoint) return HOSTED_SEED_DOOR_LABEL;
  try {
    const host = new URL(config.endpoint).hostname.replace(/^mcp\./i, '');
    return host || HOSTED_SEED_DOOR_LABEL;
  } catch {
    return HOSTED_SEED_DOOR_LABEL;
  }
}

/** Kitchen chrome stays free of protocol words. Advanced / tests may show this stub. */
export function seednodePendingLabel(config: SeednodeConfig | null | undefined): string {
  if (!config) return 'Seednode: none';
  return `Seednode: ${config.mode} (pending)`;
}
