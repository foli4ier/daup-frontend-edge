/**
 * Hub → eatery handoff.
 *
 * Choice: a short-lived signed arrival on https://eatery.daup.co.za/owner?token=
 * (same DAUP1 envelope as Floor WhatsApp invites). A .daup.co.za cookie is
 * written as a companion so a later eatery visit can remember the owner
 * without a second email field.
 *
 * Query is token-only. No DID, wallet, instance slug, or MCP on the URL.
 */

import { getModuleEndpoint } from '../utils/envResolver';

export const OWNER_ARRIVAL_PEPPER = 'daup-hub-owner-arrival-v1';
export const OWNER_ARRIVAL_TTL_MS = 15 * 60 * 1000;
export const OWNER_COOKIE_NAME = 'daup_owner';
export const OWNER_COOKIE_MAX_AGE = 60 * 60 * 24;

export interface OwnerArrivalClaims {
  v: 1;
  role: 'owner';
  email: string;
  house: string;
  exp: number;
}

function utf8ToB64url(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  bytes.forEach(byte => {
    binary += String.fromCharCode(byte);
  });
  const b64 = btoa(binary);
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function b64urlToUtf8(value: string): string {
  const padded = value + '==='.slice((value.length + 3) % 4);
  const b64 = padded.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(b64);
  const bytes = Uint8Array.from(binary, ch => ch.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function signArrival(headerAndPayload: string): string {
  const raw = `${OWNER_ARRIVAL_PEPPER}.${headerAndPayload}`;
  let h1 = 0x811c9dc5;
  let h2 = 0x27d4eb2f;
  for (let i = 0; i < raw.length; i++) {
    const char = raw.charCodeAt(i);
    h1 ^= char;
    h1 = Math.imul(h1, 0x01000193);
    h2 ^= char;
    h2 = Math.imul(h2, 0x000001b3);
  }
  return utf8ToB64url(`${(h1 >>> 0).toString(16).padStart(8, '0')}${(h2 >>> 0).toString(16).padStart(8, '0')}`);
}

export function mintOwnerArrivalToken(args: {
  email: string;
  house: string;
  now?: Date;
  ttlMs?: number;
}): string {
  const now = args.now ?? new Date();
  const ttl = args.ttlMs ?? OWNER_ARRIVAL_TTL_MS;
  const payload: OwnerArrivalClaims = {
    v: 1,
    role: 'owner',
    email: (args.email || '').trim().toLowerCase(),
    house: (args.house || '').trim(),
    exp: now.getTime() + ttl
  };
  const header = utf8ToB64url(JSON.stringify({ alg: 'DAUP1', typ: 'JWT' }));
  const body = utf8ToB64url(JSON.stringify(payload));
  return `${header}.${body}.${signArrival(`${header}.${body}`)}`;
}

export function readOwnerArrivalToken(token?: string, now: Date = new Date()): OwnerArrivalClaims | null {
  if (!token) return null;
  const parts = token.trim().split('.');
  if (parts.length !== 3) return null;
  const [header, body, sig] = parts;
  if (!header || !body || !sig) return null;
  if (signArrival(`${header}.${body}`) !== sig) return null;
  try {
    const payload = JSON.parse(b64urlToUtf8(body)) as OwnerArrivalClaims;
    if (payload.v !== 1 || payload.role !== 'owner') return null;
    if (!payload.email || !payload.house) return null;
    if (typeof payload.exp !== 'number' || payload.exp <= now.getTime()) return null;
    return payload;
  } catch {
    return null;
  }
}

export function eateryOwnerOrigin(moduleEndpoint?: string): string {
  const raw = (moduleEndpoint || getModuleEndpoint('daup-eatery') || 'https://eatery.daup.co.za').replace(/\/+$/, '');
  return raw;
}

/** Full navigation target. Token-only query. Owner and house already known. */
export function buildOpenTheHouseUrl(args: {
  email: string;
  house: string;
  now?: Date;
  origin?: string;
}): string {
  const token = mintOwnerArrivalToken({ email: args.email, house: args.house, now: args.now });
  const origin = eateryOwnerOrigin(args.origin);
  return `${origin}/owner?token=${encodeURIComponent(token)}`;
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

export function persistOwnerCookie(token: string, hostname?: string): void {
  if (typeof document === 'undefined') return;
  const host = hostname ?? (typeof window !== 'undefined' ? window.location.hostname : '');
  const parts = [
    `${OWNER_COOKIE_NAME}=${encodeURIComponent(token)}`,
    'Path=/',
    `Max-Age=${OWNER_COOKIE_MAX_AGE}`,
    'SameSite=Lax'
  ];
  if (host.endsWith('daup.co.za')) {
    parts.push('Domain=.daup.co.za');
    parts.push('Secure');
  }
  document.cookie = parts.join('; ');
}

export function readOwnerCookie(cookieHeader?: string): string | null {
  const raw = cookieHeader ?? (typeof document !== 'undefined' ? document.cookie : '');
  if (!raw) return null;
  const match = raw.split(';').map(part => part.trim()).find(part => part.startsWith(`${OWNER_COOKIE_NAME}=`));
  if (!match) return null;
  try {
    return decodeURIComponent(match.slice(OWNER_COOKIE_NAME.length + 1));
  } catch {
    return null;
  }
}

export function navigateToTheHouse(args: { email: string; house: string; origin?: string }): string {
  const url = buildOpenTheHouseUrl(args);
  const token = new URL(url).searchParams.get('token') || '';
  persistOwnerCookie(token);
  if (typeof window !== 'undefined') {
    window.location.assign(url);
  }
  return url;
}
