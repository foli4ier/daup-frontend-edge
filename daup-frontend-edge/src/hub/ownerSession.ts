import { expireOwnerCookie } from './ownerArrival';
import { clearPlaceSessionHold } from './house-session/hold';
import { INVALID_EMAIL_MESSAGE } from './copy';

export const OWNER_SESSION_STORAGE_KEY = 'daup:hub:owner_session';

export interface OwnerSession {
  email: string;
  signedInAt: number;
}

export function normalizeOwnerEmail(email: string): string {
  return (email || '').trim().toLowerCase();
}

export function isRegisteredOwnerEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeOwnerEmail(email));
}

export function readOwnerSession(raw: string | null): OwnerSession | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as OwnerSession;
    if (!parsed || !isRegisteredOwnerEmail(parsed.email)) return null;
    return { email: normalizeOwnerEmail(parsed.email), signedInAt: parsed.signedInAt || 0 };
  } catch {
    return null;
  }
}

export function saveOwnerSession(session: OwnerSession): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(OWNER_SESSION_STORAGE_KEY, JSON.stringify(session));
  } catch {
    // ignore quota
  }
}

export function clearOwnerSession(): void {
  clearPlaceSessionHold();
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(OWNER_SESSION_STORAGE_KEY);
  } catch {
    // ignore
  }
  retireOwnerArrivalCookie();
}

/**
 * Email the person typed on the hub door, stored in localStorage.
 * The legacy daup_owner cookie is not a session and is not read.
 * Previously this restored claims.email from that cookie after checking
 * its pepper hash — that was treating a forgeable token as identity.
 */
export function loadOwnerSession(): OwnerSession | null {
  retireOwnerArrivalCookie();
  if (typeof window === 'undefined') return null;
  try {
    return readOwnerSession(localStorage.getItem(OWNER_SESSION_STORAGE_KEY));
  } catch {
    return null;
  }
}

export function signInWithEmail(
  email: string,
  now: Date = new Date()
): { ok: true; session: OwnerSession } | { ok: false; reason: string } {
  if (!isRegisteredOwnerEmail(email)) {
    return { ok: false, reason: INVALID_EMAIL_MESSAGE };
  }
  const session: OwnerSession = {
    email: normalizeOwnerEmail(email),
    signedInAt: now.getTime()
  };
  saveOwnerSession(session);
  retireOwnerArrivalCookie();
  return { ok: true, session };
}

export type HubSurface = 'email-door' | 'wizard' | 'home';

export function resolveHubSurface(args: {
  session: OwnerSession | null;
  hasHouse: boolean;
  namingPlace?: boolean;
}): HubSurface {
  if (!args.session) return 'email-door';
  // Wizard only when the owner starts Register a new house. / beginNamingPlace.
  // Signed-in hub surface (Places pane). Do not assume eatery-only or auto-open wizard.
  if (args.namingPlace) return 'wizard';
  return 'home';
}

/** Drop the legacy host-only house cookie. Keep the typed email session. */
export function retireOwnerArrivalCookie(): void {
  expireOwnerCookie();
}

/** Drop the legacy host-only house cookie. Keep the typed email session. */
export function clearHouseCompanionCookie(): void {
  retireOwnerArrivalCookie();
}

export function hasNamedHouse(placeName?: string | null): boolean {
  return Boolean((placeName || '').trim());
}
