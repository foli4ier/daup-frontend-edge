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
  /** Present only while the seed is in mock OTP mode. Empty when WhatsApp sends the code. */
  mockCode: string;
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

/** Seed may send unix seconds. The hold compares epoch milliseconds. */
export function expiryToMs(value: number): number {
  if (value > 0 && value < 1e11) return Math.round(value * 1000);
  return value;
}

function readExpiry(body: unknown): number | null {
  const record = asRecord(body);
  const value = record?.expiresAt ?? record?.expires_at;
  if (typeof value === 'number' && Number.isFinite(value)) return expiryToMs(value);
  if (typeof value === 'string' && /^\d+$/.test(value.trim())) return expiryToMs(Number(value));
  return null;
}

function readError(body: unknown): string {
  const record = asRecord(body);
  if (!record) return '';
  const error = record.error;
  if (typeof error === 'string' && error.trim()) return error.trim();
  const nested = asRecord(error);
  if (nested) {
    const message = nested.message ?? nested.error;
    if (typeof message === 'string' && message.trim()) return message.trim();
  }
  return '';
}

/**
 * A 2xx body may include a human `message` ("Place session ready") next to
 * placeSession / houseRedeem. That string is not a failure. Only `error`,
 * `ok: false`, or a non-2xx status abort the call.
 */
function failureCode(body: unknown, httpOk: boolean): string {
  const error = readError(body);
  if (error) return error;
  const record = asRecord(body);
  if (record?.ok === false) return readString(body, ['message']) || 'request failed';
  if (!httpOk) return readString(body, ['message']) || 'request failed';
  return '';
}

async function postJson(path: string, payload: unknown, options: HouseFetchOptions = {}): Promise<{ status: number; body: unknown; response: Response }> {
  const headers: Record<string, string> = {
    'content-type': 'application/json',
    accept: 'application/json'
  };
  const bearer = stripBearerPrefix(options.bearer || '');
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
  const failure = failureCode(body, response.ok);
  if (!response.ok || failure) {
    throw new HouseSeedError(response.status, failure || 'request failed');
  }
  return { status: response.status, body, response };
}

function stripBearerPrefix(value: string): string {
  return (value || '').trim().replace(/^Bearer\s+/i, '').trim();
}

const BEARER_KEYS = ['placeSession', 'place_session', 'session', 'daup_house_session', 'token'];

function readBearerValue(value: unknown): string {
  if (typeof value === 'string') return stripBearerPrefix(value);
  const record = asRecord(value);
  if (!record) return '';
  for (const key of BEARER_KEYS) {
    const child = record[key];
    if (typeof child === 'string' && child.trim()) return stripBearerPrefix(child);
  }
  for (const key of BEARER_KEYS) {
    const inner = readString(asRecord(record[key]), BEARER_KEYS);
    if (inner) return stripBearerPrefix(inner);
  }
  return '';
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
  return { challengeId, expiresAt: readExpiry(body), mockCode: readMockCode(body) };
}

/** Digits the seed returns only while mock OTP is on. Never invented here. */
export function readMockCode(body: unknown): string {
  const code = readString(body, ['mockCode', 'mock_code']).replace(/\s+/g, '');
  if (!/^[0-9A-Za-z]{4,12}$/.test(code)) return '';
  return code;
}

export function normalizeOtpCode(code: string): string {
  return (code || '').replace(/\s+/g, '').trim();
}

function sessionHeaderBearer(response: Response | undefined): string {
  if (!response || typeof response.headers?.get !== 'function') return '';
  return stripBearerPrefix(response.headers.get('mcp-session-id') || '');
}

export function bearerFromSessionBody(body: unknown, response?: Response): string {
  const record = asRecord(body);
  if (record && claimsIncludeRole(record.claims)) {
    delete record.claims;
  }
  const named = readBearerValue(body);
  if (named) return named;
  // `session` may be the bearer string (handled above) or `{ placeSession, token }`.
  for (const key of ['session', 'data', 'result']) {
    const nested = readBearerValue(asRecord(body)?.[key]);
    if (nested) return nested;
  }
  // CORS exposes Mcp-Session-Id. The browser can read it; Set-Cookie it cannot.
  return sessionHeaderBearer(response);
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
  const code = normalizeOtpCode(args.code || '');
  const phone = (args.phone || '').trim();
  const peerId = (args.peerId || '').trim();
  if (!placeId || !challengeId || !code) throw new HouseSeedError(400, 'otp verification required');
  const { body, response } = await postJson('/house/session', {
    placeId,
    challengeId,
    code,
    ...(phone ? { phone } : {}),
    ...(peerId ? { peerId } : {})
  }, args);
  const bearer = bearerFromSessionBody(body, response);
  if (!bearer) throw new HouseSeedError(502, 'session missing');
  return {
    bearer,
    expiresAt: readExpiry(body)
  };
}

const REDEEM_KEYS = ['houseRedeem', 'house_redeem', 'redeem', 'redeemId', 'id'];

function firstRedeem(body: unknown): string {
  const record = asRecord(body);
  if (!record) {
    const direct = typeof body === 'string' ? body.trim() : '';
    return REDEEM_RE.test(direct) ? direct : '';
  }
  for (const key of REDEEM_KEYS) {
    const value = record[key];
    if (typeof value === 'string' && REDEEM_RE.test(value.trim())) return value.trim();
    const nested = asRecord(value);
    if (!nested) continue;
    const inner = readString(nested, ['houseRedeem', 'house_redeem', 'id', 'redeem']);
    if (REDEEM_RE.test(inner)) return inner;
  }
  return '';
}

export function readHouseRedeem(body: unknown): string {
  const direct = firstRedeem(body);
  if (direct) return direct;
  const record = asRecord(body);
  for (const key of ['data', 'result']) {
    const nested = firstRedeem(record?.[key]);
    if (nested) return nested;
  }
  return '';
}

export async function issueHouseRedeem(options: HouseFetchOptions = {}): Promise<string> {
  // Empty body. The seed checks the bearer before any audience field.
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
