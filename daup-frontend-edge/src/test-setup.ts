import { vi } from 'vitest';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/** House MCP stays offline in unit tests unless a case stubs fetch. */
vi.stubGlobal('fetch', vi.fn(async () => {
  throw new TypeError('Failed to fetch');
}));
