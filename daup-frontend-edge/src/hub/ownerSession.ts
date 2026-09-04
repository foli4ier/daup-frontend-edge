import { persistOwnerCookie, mintOwnerArrivalToken, readOwnerArrivalToken, readOwnerCookie, expireOwnerCookie } from './ownerArrival';
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
  const value = normalizeOwnerEmail(email);
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
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
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(OWNER_SESSION_STORAGE_KEY);
  } catch {
    // ignore
  }
  expireOwnerCookie();
}

export function loadOwnerSession(): OwnerSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = readOwnerSession(localStorage.getItem(OWNER_SESSION_STORAGE_KEY));
    if (stored) return stored;
  } catch {
    // fall through to cookie
  }
  const cookieToken = readOwnerCookie();
  const claims = readOwnerArrivalToken(cookieToken || undefined);
  if (claims?.email) {
    return { email: claims.email, signedInAt: Date.now() };
  }
  return null;
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
  return { ok: true, session };
}

export function writeOwnerCompanionCookie(email: string, house = ''): void {
  // Host-only on the hub. Never Domain=.daup.co.za. Handoff is the token URL.
  if (!house.trim() || !isRegisteredOwnerEmail(email)) return;
  const token = mintOwnerArrivalToken({ email, house });
  persistOwnerCookie(token);
}

export type HubSurface = 'email-door' | 'wizard' | 'home';

export function resolveHubSurface(args: {
  session: OwnerSession | null;
  hasHouse: boolean;
  namingPlace?: boolean;
}): HubSurface {
  if (!args.session) return 'email-door';
  if (args.namingPlace || !args.hasHouse) return 'wizard';
  return 'home';
}

/** Drop the host-only house cookie. Keep the signed-in email session. */
export function clearHouseCompanionCookie(): void {
  expireOwnerCookie();
}

export function hasNamedHouse(placeName?: string | null): boolean {
  return Boolean((placeName || '').trim());
}
