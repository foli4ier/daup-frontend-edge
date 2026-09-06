/**
 * Hub ↔ house MCP client (JSON-RPC tools/call).
 * Base URL default: https://mcp.daup.co.za  Path: /mcp
 * Soft-fail: never throw to the sign-in / register / delete doors.
 */

import {
  asPlatformPlaceRecord,
  isPlatformAppId,
  type PlatformAppId,
  type PlatformPlaceRecord
} from '../stores/identityStore';

export const DEFAULT_HOUSE_MCP_BASE = 'https://mcp.daup.co.za';
export const HOUSE_MCP_PATH = '/mcp';
export const HOUSE_MCP_TIMEOUT_MS = 6000;

export const HOUSE_MCP_TOOLS = {
  listByEmail: 'places_list_by_email',
  register: 'places_register',
  unregister: 'places_unregister'
} as const;

export type HouseMcpFetch = (input: string, init?: RequestInit) => Promise<Response>;

export interface HouseMcpClientOptions {
  baseUrl?: string;
  fetch?: HouseMcpFetch;
  timeoutMs?: number;
  now?: () => number;
}

export interface HousePlace {
  placeId?: string;
  ownerEmail?: string;
  placeName: string;
  app: PlatformAppId;
  country: string;
  region: string;
  city: string;
  registeredAt?: number;
  updatedAt?: number;
}

export type HouseMcpFailure = { ok: false; reason: string };
export type HouseMcpListOk = { ok: true; email: string; places: HousePlace[] };
export type HouseMcpRegisterOk = { ok: true; place: HousePlace };
export type HouseMcpUnregisterOk = { ok: true };

function readConfiguredBase(): string | undefined {
  try {
    const value = import.meta.env?.VITE_APP_MCP_URL;
    if (typeof value === 'string' && value.trim()) return value.trim();
  } catch {
    // import.meta.env may be missing in some test hosts
  }
  return undefined;
}

export function resolveHouseMcpBaseUrl(raw?: string): string {
  const value = (raw ?? readConfiguredBase() ?? DEFAULT_HOUSE_MCP_BASE).trim();
  const stripped = value.replace(/\/+$/, '');
  const withoutPath = stripped.replace(/\/mcp$/i, '');
  return withoutPath || DEFAULT_HOUSE_MCP_BASE;
}

export function resolveHouseMcpUrl(raw?: string): string {
  return `${resolveHouseMcpBaseUrl(raw)}${HOUSE_MCP_PATH}`;
}

function normalizeEmail(email: string): string {
  return (email || '').trim().toLowerCase();
}

export function housePlaceToPlatform(place: HousePlace): PlatformPlaceRecord | null {
  return asPlatformPlaceRecord({
    placeName: place.placeName,
    app: place.app,
    country: place.country,
    region: place.region,
    city: place.city,
    placeId: place.placeId,
    ownerEmail: place.ownerEmail
  });
}

function asHousePlace(value: unknown): HousePlace | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Record<string, unknown>;
  const placeName = typeof raw.placeName === 'string' ? raw.placeName.trim() : '';
  if (!placeName) return null;
  const region = typeof raw.region === 'string'
    ? raw.region
    : typeof raw.provinceState === 'string'
      ? raw.provinceState
      : '';
  const place: HousePlace = {
    placeName,
    app: isPlatformAppId(raw.app) ? raw.app : 'eatery',
    country: typeof raw.country === 'string' ? raw.country.trim() : '',
    region: region.trim(),
    city: typeof raw.city === 'string' ? raw.city.trim() : ''
  };
  if (typeof raw.placeId === 'string' && raw.placeId.trim()) place.placeId = raw.placeId.trim();
  if (typeof raw.ownerEmail === 'string' && raw.ownerEmail.trim()) {
    place.ownerEmail = normalizeEmail(raw.ownerEmail);
  }
  if (typeof raw.registeredAt === 'number') place.registeredAt = raw.registeredAt;
  if (typeof raw.updatedAt === 'number') place.updatedAt = raw.updatedAt;
  return place;
}

function parseJsonText(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function parseToolResult(payload: unknown): { ok: true; data: unknown } | HouseMcpFailure {
  if (!payload || typeof payload !== 'object') {
    return { ok: false, reason: 'empty-result' };
  }
  const body = payload as {
    error?: { message?: string };
    result?: { content?: Array<{ text?: string }>; isError?: boolean };
  };
  if (body.error) {
    return { ok: false, reason: body.error.message || 'rpc-error' };
  }
  const result = body.result;
  if (!result) return { ok: false, reason: 'empty-result' };
  const text = result.content?.[0]?.text;
  const data = typeof text === 'string' ? parseJsonText(text) : result;
  if (result.isError) {
    return { ok: false, reason: typeof text === 'string' ? text : 'tool-error' };
  }
  if (data == null) return { ok: false, reason: 'unreadable-result' };
  return { ok: true, data };
}

function resolveFetch(custom?: HouseMcpFetch): HouseMcpFetch | null {
  if (custom) return custom;
  if (typeof fetch === 'function') return fetch as HouseMcpFetch;
  return null;
}

let requestId = 1;

export async function callHouseMcpTool(
  name: string,
  args: Record<string, unknown>,
  options: HouseMcpClientOptions = {}
): Promise<{ ok: true; data: unknown } | HouseMcpFailure> {
  const runFetch = resolveFetch(options.fetch);
  if (!runFetch) return { ok: false, reason: 'no-fetch' };

  const url = resolveHouseMcpUrl(options.baseUrl);
  const timeoutMs = options.timeoutMs ?? HOUSE_MCP_TIMEOUT_MS;
  const controller = typeof AbortController === 'function' ? new AbortController() : null;
  const timer = controller
    ? setTimeout(() => controller.abort(), timeoutMs)
    : null;
  const id = requestId;
  requestId += 1;

  try {
    const response = await runFetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'application/json'
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id,
        method: 'tools/call',
        params: { name, arguments: args }
      }),
      signal: controller?.signal
    });
    if (!response.ok) {
      return { ok: false, reason: `http-${response.status}` };
    }
    const payload = await response.json();
    return parseToolResult(payload);
  } catch (err) {
    const name = err && typeof err === 'object' && 'name' in err ? String((err as { name?: string }).name) : '';
    if (name === 'AbortError') return { ok: false, reason: 'timeout' };
    return { ok: false, reason: 'unreachable' };
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function listPlacesByEmail(
  ownerEmail: string,
  options: HouseMcpClientOptions = {}
): Promise<HouseMcpListOk | HouseMcpFailure> {
  const email = normalizeEmail(ownerEmail);
  if (!email) return { ok: false, reason: 'email-required' };
  const called = await callHouseMcpTool(
    HOUSE_MCP_TOOLS.listByEmail,
    { ownerEmail: email },
    options
  );
  if (!called.ok) return called;
  const data = called.data as { email?: string; places?: unknown };
  const places = Array.isArray(data?.places)
    ? data.places.map(asHousePlace).filter((place): place is HousePlace => Boolean(place))
    : [];
  return {
    ok: true,
    email: typeof data?.email === 'string' ? normalizeEmail(data.email) : email,
    places
  };
}

export async function registerHousePlace(
  args: {
    ownerEmail: string;
    placeName: string;
    app?: PlatformAppId | string;
    country?: string;
    region?: string;
    city?: string;
  },
  options: HouseMcpClientOptions = {}
): Promise<HouseMcpRegisterOk | HouseMcpFailure> {
  const ownerEmail = normalizeEmail(args.ownerEmail);
  const placeName = (args.placeName || '').trim();
  if (!ownerEmail || !placeName) return { ok: false, reason: 'email-and-place-required' };
  const called = await callHouseMcpTool(
    HOUSE_MCP_TOOLS.register,
    {
      ownerEmail,
      placeName,
      app: isPlatformAppId(args.app) ? args.app : 'eatery',
      country: (args.country || '').trim(),
      region: (args.region || '').trim(),
      city: (args.city || '').trim()
    },
    options
  );
  if (!called.ok) return called;
  const place = asHousePlace(called.data);
  if (!place) return { ok: false, reason: 'unreadable-place' };
  if (!place.ownerEmail) place.ownerEmail = ownerEmail;
  return { ok: true, place };
}

export async function unregisterHousePlace(
  args: {
    ownerEmail?: string;
    placeName?: string;
    placeId?: string;
  },
  options: HouseMcpClientOptions = {}
): Promise<HouseMcpUnregisterOk | HouseMcpFailure> {
  const ownerEmail = normalizeEmail(args.ownerEmail || '');
  const placeName = (args.placeName || '').trim();
  const placeId = (args.placeId || '').trim();
  if (!placeId && !(placeName && ownerEmail)) {
    return { ok: false, reason: 'place-required' };
  }
  const argumentsPayload: Record<string, string> = {};
  if (placeId) argumentsPayload.placeId = placeId;
  if (placeName) argumentsPayload.placeName = placeName;
  if (ownerEmail) argumentsPayload.ownerEmail = ownerEmail;
  const called = await callHouseMcpTool(HOUSE_MCP_TOOLS.unregister, argumentsPayload, options);
  if (!called.ok) return called;
  return { ok: true };
}
