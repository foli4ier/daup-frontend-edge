/**
 * Place-session bodies are person × place. Module roles stay in each app.
 * A claims object that carries a role is ignored — it is not proof and it
 * is never copied onto an Open URL.
 */

const ROLE_KEYS = new Set(['role', 'roles']);

export function claimsIncludeRole(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;
  if (Array.isArray(value)) return value.some(item => claimsIncludeRole(item));
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (ROLE_KEYS.has(key.toLowerCase())) return true;
    if (child && typeof child === 'object' && claimsIncludeRole(child)) return true;
  }
  return false;
}
