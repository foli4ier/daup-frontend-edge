/**
 * Kortrijk house-session client (fetch + Web Crypto only).
 *
 * Live routes on the seed origin (production https://mcp.daup.co.za):
 *   POST /house/otp/challenge
 *   POST /house/session
 *   POST /house/session/redeem/issue
 *   POST /house/session/verify
 *   POST /house/session/logout
 *   POST /house/session/redeem
 *
 * The signing secret stays on the seed. This module never mints a bearer.
 * credentials: 'include' lets the seed set its host-only session cookie
 * when the browser will store it. A bearer in the JSON body is sent back
 * as Authorization on later calls (cross-site Hub → seed).
 */

import { resolveHouseMcpBaseUrl } from '../houseMcp';
import { claimsIncludeRole } from './claims';

export const HOUSE_SESSION_COOKIE = 'daup_house_session';
export const HOUSE_REDEEM_QUERY = 'houseRedeem';

const REDEEM_RE = /^hr_[A-Za-z0-9_-]{16,}$/;

export class HouseSeedError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string) {
    super(code);
    this.name = 'HouseSeedError';
    this.status = status;
    this.code = code;
  }
}

export interface HouseFetchOptions {
  seed?: string;
  fetchImpl?: typeof fetch;
  bearer?: string;
}

export interface OtpChallenge {
  challengeId: string;
  expiresAt: number | null;
}

export interface PlaceSessionIssue {
  bearer: string;
  expiresAt: number | null;
}

export function resolveHouseSeedOrigin(explicit?: string): string {
  const given = (explicit || '').trim();
  if (given) return resolveHouseMcpBaseUrl(given);
  let fromEnv = '';
  try {
    const value = import.meta.env?.VITE_HOUSE_SEED_URL;
    if (typeof value === 'string') fromEnv = value.trim();
  } catch {
    fromEnv = '';
  }
  if (fromEnv) return resolveHouseMcpBaseUrl(fromEnv);
  return resolveHouseMcpBaseUrl();
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function readString(body: unknown, keys: string[]): string {
  const record = asRecord(body);
  if (!record) return '';
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
}

function readExpiry(body: unknown): number | null {
  const record = asRecord(body);
  const value = record?.expiresAt ?? record?.expires_at;
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function errorText(body: unknown): string {
  return readString(body, ['error', 'message']);
}

async function postJson(path: string, payload: unknown, options: HouseFetchOptions = {}): Promise<{ status: number; body: unknown }> {
  const headers: Record<string, string> = {
    'content-type': 'application/json',
    accept: 'application/json'
  };
  const bearer = (options.bearer || '').trim();
  if (bearer) headers.authorization = `Bearer ${bearer}`;
  const doFetch = options.fetchImpl || fetch;
  const response = await doFetch(`${resolveHouseSeedOrigin(options.seed)}${path}`, {
    method: 'POST',
    credentials: 'include',
    headers,
    body: JSON.stringify(payload ?? {})
  });
  const text = await response.text();
  let body: unknown = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = { error: 'bad response' };
    }
  }
  const failure = errorText(body);
  if (!response.ok || failure) {
    throw new HouseSeedError(response.status, failure || 'request failed');
  }
  return { status: response.status, body };
}

export function phoneHasEnoughDigits(phone: string): boolean {
  const digits = (phone || '').replace(/\D/g, '');
  return digits.length >= 8;
}

export async function requestOtpChallenge(args: {
  placeId: string;
  phone?: string;
  peerId?: string;
} & HouseFetchOptions): Promise<OtpChallenge> {
  const placeId = (args.placeId || '').trim();
  const phone = (args.phone || '').trim();
  const peerId = (args.peerId || '').trim();
  if (!placeId) throw new HouseSeedError(400, 'placeId is required');
  if (!phone && !peerId) throw new HouseSeedError(400, 'phone is required');
  if (phone && !phoneHasEnoughDigits(phone)) throw new HouseSeedError(400, 'phone is invalid');
  const { body } = await postJson('/house/otp/challenge', {
    placeId,
    ...(phone ? { phone } : {}),
    ...(peerId ? { peerId } : {})
  }, args);
  const challengeId = readString(body, ['challengeId', 'challenge_id']);
  if (!challengeId) throw new HouseSeedError(502, 'challenge missing');
  return { challengeId, expiresAt: readExpiry(body) };
}

export function bearerFromSessionBody(body: unknown): string {
  const record = asRecord(body);
  if (record && claimsIncludeRole(record.claims)) {
    delete record.claims;
  }
  const named = readString(body, ['placeSession', 'session', 'daup_house_session']);
  if (named) return named;
  // Last-resort JSON bearer. Callers must not copy this onto an app URL.
  return readString(body, ['token']);
}

export async function createPlaceSession(args: {
  placeId: string;
  phone?: string;
  peerId?: string;
  challengeId: string;
  code: string;
} & HouseFetchOptions): Promise<PlaceSessionIssue> {
  const placeId = (args.placeId || '').trim();
  const challengeId = (args.challengeId || '').trim();
  const code = (args.code || '').trim();
  const phone = (args.phone || '').trim();
  const peerId = (args.peerId || '').trim();
  if (!placeId || !challengeId || !code) throw new HouseSeedError(400, 'otp verification required');
  const { body } = await postJson('/house/session', {
    placeId,
    challengeId,
    code,
    ...(phone ? { phone } : {}),
    ...(peerId ? { peerId } : {})
  }, args);
  return {
    bearer: bearerFromSessionBody(body),
    expiresAt: readExpiry(body)
  };
}

export function readHouseRedeem(body: unknown): string {
  const redeem = readString(body, ['houseRedeem', 'redeem', 'id']);
  if (!REDEEM_RE.test(redeem)) return '';
  return redeem;
}

export async function issueHouseRedeem(options: HouseFetchOptions = {}): Promise<string> {
  const { body } = await postJson('/house/session/redeem/issue', {}, options);
  const redeem = readHouseRedeem(body);
  if (!redeem) throw new HouseSeedError(502, 'redeem missing');
  return redeem;
}

export async function verifyPlaceSession(options: HouseFetchOptions = {}): Promise<boolean> {
  try {
    await postJson('/house/session/verify', {}, options);
    return true;
  } catch (error) {
    if (error instanceof HouseSeedError && (error.status === 401 || error.status === 403)) return false;
    throw error;
  }
}

export async function logoutPlaceSession(options: HouseFetchOptions = {}): Promise<void> {
  await postJson('/house/session/logout', {}, options);
}
