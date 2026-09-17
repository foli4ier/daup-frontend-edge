/**
 * Hub seednode config (slice A stub).
 *
 * Shape: { endpoint, mode: "hosted" | "on-prem", companyId? }
 * Default hosted endpoint is the live house MCP base (mcp.daup.co.za).
 *
 * Slice A: persist attach config. Do not block on seednode_status MCP tools.
 * Connected badge polling is slice C. Switch UI is slice F — never remint.
 */

/** Same origin as DEFAULT_HOUSE_MCP_BASE in houseMcp.ts — Hub's canonical hosted MCP. */
export const DEFAULT_HOSTED_SEEDNODE_ENDPOINT = 'https://mcp.daup.co.za';
export const SEEDNODE_STORAGE_KEY = 'daup_seednode_config';

export type SeednodeMode = 'hosted' | 'on-prem';

export interface SeednodeConfig {
  endpoint: string;
  mode: SeednodeMode;
  companyId?: string;
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
  const companyId = typeof raw.companyId === 'string' ? raw.companyId.trim() : '';
  if (companyId) config.companyId = companyId;
  return config;
}

export function defaultHostedSeednode(companyId: string): SeednodeConfig {
  const id = (companyId || '').trim();
  const config: SeednodeConfig = {
    endpoint: DEFAULT_HOSTED_SEEDNODE_ENDPOINT,
    mode: 'hosted'
  };
  if (id) config.companyId = id;
  return config;
}

/** Hosted stub attach. Counts as attached for trial start. */
export function attachHostedSeednodeStub(companyId: string): SeednodeConfig {
  return defaultHostedSeednode(companyId);
}

export function isSeednodeAttached(config: SeednodeConfig | null | undefined): boolean {
  if (!config) return false;
  return Boolean(config.endpoint && config.mode && config.companyId);
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
  } catch {
    // ignore
  }
}

/** Kitchen chrome stays free of seed words. Advanced / tests may show this stub. */
export function seednodePendingLabel(config: SeednodeConfig | null | undefined): string {
  if (!config) return 'Seednode: none';
  return `Seednode: ${config.mode} (pending)`;
}
