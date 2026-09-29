/**
 * Hub → app handoff hints.
 *
 * Open the house and Get into Project used to carry a browser-minted
 * owner-arrival token (a hash over a public pepper). That token is not a
 * credential. These URLs pass only non-authoritative hints: an email prefill,
 * a house name, and place ids. Apps must not treat them as proof of identity
 * or ownership.
 *
 * Never set Domain=.daup.co.za. www.daup.co.za has no cookies.
 * The legacy host-only `daup_owner` cookie is expired and never rewritten.
 */

import { getModuleEndpoint } from '../utils/envResolver';

export const OWNER_COOKIE_NAME = 'daup_owner';

/** Query keys that are UX hints only. Not a session, role, or ownership grant. */
export const HANDOFF_EMAIL_HINT = 'emailHint';
export const HANDOFF_HOUSE_HINT = 'houseHint';
export const HANDOFF_PLACE_ID_HINT = 'placeIdHint';

const CREDENTIAL_QUERY_KEYS = new Set([
  'token',
  'email',
  'places',
  'hubplaces',
  'role',
  'daup_owner',
  'daup1'
]);

export interface AppHandoffHints {
  email?: string;
  house?: string;
  placeIds?: string[];
}

export function handoffHintPlaceIds(placeIds?: string[]): string[] {
  const seen = new Set<string>();
  const ids: string[] = [];
  for (const raw of placeIds || []) {
    const id = (raw || '').trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    ids.push(id);
  }
  return ids;
}

/** Append hint params. Never writes token, email, places, or hubPlaces. */
export function appendAppHandoffHints(url: URL, hints: AppHandoffHints): void {
  const email = (hints.email || '').trim().toLowerCase();
  const house = (hints.house || '').trim();
  if (email) url.searchParams.set(HANDOFF_EMAIL_HINT, email);
  if (house) url.searchParams.set(HANDOFF_HOUSE_HINT, house);
  for (const id of handoffHintPlaceIds(hints.placeIds)) {
    url.searchParams.append(HANDOFF_PLACE_ID_HINT, id);
  }
}

/** True when a handoff URL still carries a credential-shaped query param. */
export function handoffPresentsCredential(url: string): boolean {
  try {
    const parsed = new URL(url, 'https://app.daup.co.za');
    for (const key of parsed.searchParams.keys()) {
      if (CREDENTIAL_QUERY_KEYS.has(key.toLowerCase())) return true;
    }
    return false;
  } catch {
    return /[?&](token|email|places|hubPlaces|role|daup_owner|daup1)=/i.test(url);
  }
}

export function eateryOwnerOrigin(moduleEndpoint?: string): string {
  const raw = (moduleEndpoint || getModuleEndpoint('daup-eatery') || 'https://eatery.daup.co.za').replace(/\/+$/, '');
  return raw;
}

/**
 * Eatery owner door. Email + house required so an empty handoff is not opened.
 * Query is hints only.
 */
export function buildOpenTheHouseUrl(args: {
  email: string;
  house: string;
  placeId?: string;
  placeIds?: string[];
  origin?: string;
}): string {
  const email = (args.email || '').trim();
  const house = (args.house || '').trim();
  if (!email || !house) return '';
  const origin = eateryOwnerOrigin(args.origin);
  const url = new URL(`${origin}/owner`);
  appendAppHandoffHints(url, {
    email,
    house,
    placeIds: [args.placeId || '', ...(args.placeIds || [])]
  });
  return url.toString();
}

export function ownerArrivalExposesBannedQuery(url: string): boolean {
  try {
    const parsed = new URL(url, 'https://eatery.daup.co.za');
    const keys = [...parsed.searchParams.keys()].map(key => key.toLowerCase());
    return keys.some(key =>
      key === 'did' ||
      key === 'walletname' ||
      key === 'instance' ||
      key === 'mcp' ||
      key === 'npm'
    );
  } catch {
    return /[?&](did|walletName|instance|mcp|npm)=/i.test(url);
  }
}

const PARENT_DOMAIN_COOKIE_RE = /(?:^|;\s*)Domain\s*=\s*\.?daup\.co\.za\b/i;

/** True if a Set-Cookie / document.cookie write would cover www or eatery. */
export function cookieSetsParentDomain(header: string): boolean {
  return PARENT_DOMAIN_COOKIE_RE.test(header || '');
}

/**
 * Expire the legacy host-only hub cookie. Max-Age=0, Path=/, never Domain.
 * Must match how it was written so the browser actually drops it.
 * This is the only daup_owner write the Hub still performs.
 */
export function buildExpireOwnerCookie(hostname?: string): string {
  const host = hostname ?? (typeof window !== 'undefined' ? window.location.hostname : '');
  const parts = [
    `${OWNER_COOKIE_NAME}=`,
    'Path=/',
    'Max-Age=0',
    'SameSite=Lax'
  ];
  if (host === 'app.daup.co.za') {
    parts.push('Secure');
  }
  const header = parts.join('; ');
  if (cookieSetsParentDomain(header)) {
    return `${OWNER_COOKIE_NAME}=; Path=/; Max-Age=0`;
  }
  return header;
}

export function expireOwnerCookie(hostname?: string): void {
  if (typeof document === 'undefined') return;
  const header = buildExpireOwnerCookie(hostname);
  if (cookieSetsParentDomain(header)) return;
  document.cookie = header;
}

/** Full navigation. Hint URL is the handoff — no cookie write. */
export function navigateToTheHouse(args: {
  email: string;
  house: string;
  placeId?: string;
  placeIds?: string[];
  origin?: string;
}): string {
  const url = buildOpenTheHouseUrl(args);
  if (!url) return '';
  if (typeof window !== 'undefined') {
    try {
      window.location.assign(url);
    } catch {
      // jsdom and some browsers throw on cross-origin assign in tests
    }
  }
  return url;
}
