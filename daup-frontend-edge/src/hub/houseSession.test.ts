import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { hasBannedDoorCopy } from './copy';
import {
  CHAT_HOME,
  FINANCE_HOME,
  HOUSE_REDEEM_QUERY,
  HouseSeedError,
  PROJECT_HOME,
  TRADE_HOME,
  appUsesHouseRedeem,
  bearerFromSessionBody,
  buildChatOpenUrl,
  buildHouseAppOpenUrl,
  PLACE_SESSION_STORAGE_KEY,
  clearPlaceSessionHold,
  createPlaceSession,
  houseOtpMockActive,
  phoneHasEnoughDigits,
  readHouseRedeem,
  readPlaceSession,
  rememberPlaceSession,
  requestOtpChallenge,
  resolveHouseSeedOrigin,
  sha256Base64Url
} from './house-session';
import { continueHouseOpen as openHouse, pickHousePlaceId } from './houseOpen';
import { handoffPresentsCredential, ownerArrivalExposesBannedQuery } from './ownerArrival';

const REDEEM = 'hr_abcdefghijklmnopqrstuvwxyz012345';

function jsonResponse(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...headers }
  });
}

describe('house seed origin and redeem urls', () => {
  beforeEach(() => {
    clearPlaceSessionHold();
  });

  it('defaults the seed to Kortrijk and strips a trailing /mcp', () => {
    expect(resolveHouseSeedOrigin('https://mcp.daup.co.za/mcp')).toBe('https://mcp.daup.co.za');
    expect(resolveHouseSeedOrigin('https://mcp.daup.co.za/')).toBe('https://mcp.daup.co.za');
  });

  it('keeps Project on /d/hub and puts houseRedeem beside hints', () => {
    const href = buildHouseAppOpenUrl('project', {
      email: 'Owner@TheOlive.co.za',
      house: 'The Olive',
      placeIds: ['place-olive'],
      houseRedeem: REDEEM,
      origin: PROJECT_HOME
    });
    const parsed = new URL(href);
    expect(parsed.origin).toBe('https://project.daup.co.za');
    expect(parsed.pathname).toBe('/d/hub');
    expect(parsed.searchParams.get('emailHint')).toBe('owner@theolive.co.za');
    expect(parsed.searchParams.get('houseHint')).toBe('The Olive');
    expect(parsed.searchParams.get('placeIdHint')).toBe('place-olive');
    expect(parsed.searchParams.get(HOUSE_REDEEM_QUERY)).toBe(REDEEM);
    expect(handoffPresentsCredential(href)).toBe(false);
    expect(ownerArrivalExposesBannedQuery(href)).toBe(false);
    expect(href).not.toMatch(/[?&](token|email|places|hubPlaces|role|daup1|pepper)=/i);
  });

  it('opens Finance, Trade, Vault, and Property on the home with houseRedeem', () => {
    for (const [app, origin] of [
      ['finance', FINANCE_HOME],
      ['trade', TRADE_HOME],
      ['vault', 'https://vault.daup.co.za'],
      ['property', 'https://property.daup.co.za']
    ] as const) {
      const href = buildHouseAppOpenUrl(app, {
        email: 'owner@theolive.co.za',
        house: 'The Olive',
        placeIds: ['co_olive'],
        houseRedeem: REDEEM
      });
      const parsed = new URL(href);
      expect(parsed.origin).toBe(origin);
      expect(parsed.pathname).toBe('/');
      expect(parsed.searchParams.get(HOUSE_REDEEM_QUERY)).toBe(REDEEM);
      expect(parsed.searchParams.get('emailHint')).toBe('owner@theolive.co.za');
      expect(handoffPresentsCredential(href)).toBe(false);
      expect(href).not.toMatch(/\/d\/hub/);
    }
  });

  it('leaves Chat on the host with no redeem', () => {
    expect(appUsesHouseRedeem('chat')).toBe(false);
    expect(buildChatOpenUrl()).toBe(CHAT_HOME);
    expect(buildChatOpenUrl()).not.toMatch(/[?#]/);
    expect(openHouse).toBeTypeOf('function');
  });

  it('does not ship a signing secret or a parent-domain cookie', () => {
    const dir = dirname(fileURLToPath(import.meta.url));
    const combined = [
      'houseOpen.ts',
      'house-session/seed.ts',
      'house-session/openUrl.ts',
      'house-session/hold.ts',
      'house-session/crypto.ts',
      'house-session/claims.ts',
      'house-session/index.ts'
    ].map(name => readFileSync(join(dir, name), 'utf8')).join('\n');
    expect(combined).not.toMatch(/HOUSE_SESSION_SECRET/);
    expect(combined).not.toMatch(/SESSION_SECRET/);
    expect(combined).not.toMatch(/VITE_HOUSE_SESSION/);
    expect(combined).not.toMatch(/Domain\s*=/);
    expect(combined).not.toContain('DAUP_SKIP_OTP');
    expect(combined).not.toContain('DAUP1');
    expect(combined).not.toContain('daup-hub-owner-arrival-v1');
    expect(hasBannedDoorCopy('Open with a code.')).toBe(false);
  });
});

describe('otp challenge then redeem', () => {
  beforeEach(() => {
    clearPlaceSessionHold();
  });

  it('asks for a number, then a code, then opens Finance with the issued redeem', async () => {
    const fetchImpl = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const body = JSON.parse(String(init?.body || '{}')) as Record<string, unknown>;
      expect(init?.credentials).toBe('include');
      expect(init?.method).toBe('POST');
      if (url.endsWith('/house/otp/challenge')) {
        expect(body).toEqual({ placeId: 'co_olive', phone: '+27820000000' });
        return jsonResponse({ ok: true, challengeId: 'ch_test', expiresAt: 1 });
      }
      if (url.endsWith('/house/session')) {
        expect(body).toEqual({
          placeId: 'co_olive',
          phone: '+27820000000',
          challengeId: 'ch_test',
          code: '424242'
        });
        return jsonResponse({
          ok: true,
          message: 'Place session ready',
          placeSession: 'sess-opaque',
          expiresAt: Date.now() + 60_000
        });
      }
      if (url.endsWith('/house/session/redeem/issue')) {
        expect(init?.headers).toMatchObject({ authorization: 'Bearer sess-opaque' });
        expect(body).toEqual({});
        return jsonResponse({ ok: true, message: 'issued', houseRedeem: REDEEM });
      }
      return jsonResponse({ error: 'Not found' }, 404);
    });

    const needPhone = await openHouse({
      appId: 'finance',
      placeId: 'co_olive',
      hints: { email: 'owner@theolive.co.za', house: 'The Olive', placeIds: ['co_olive'] },
      fetchImpl
    });
    expect(needPhone).toEqual({ status: 'phone', message: '' });
    expect(fetchImpl).not.toHaveBeenCalled();

    const needCode = await openHouse({
      appId: 'finance',
      placeId: 'co_olive',
      hints: { email: 'owner@theolive.co.za', house: 'The Olive' },
      phone: '+27820000000',
      fetchImpl
    });
    expect(needCode).toMatchObject({
      status: 'code',
      challengeId: 'ch_test',
      phone: '+27820000000',
      mockCode: ''
    });

    const opened = await openHouse({
      appId: 'finance',
      placeId: 'co_olive',
      hints: { email: 'owner@theolive.co.za', house: 'The Olive', placeIds: ['co_olive'] },
      phone: '+27820000000',
      challengeId: 'ch_test',
      code: '424242',
      fetchImpl
    });
    expect(opened.status).toBe('navigate');
    if (opened.status !== 'navigate') return;
    const parsed = new URL(opened.url);
    expect(parsed.origin).toBe(FINANCE_HOME);
    expect(parsed.searchParams.get(HOUSE_REDEEM_QUERY)).toBe(REDEEM);
    expect(parsed.searchParams.has('token')).toBe(false);
    expect(opened.url).not.toContain('sess-opaque');
    expect(readPlaceSession('co_olive')?.bearer).toBe('sess-opaque');
  });

  it('refuses Chat and a missing place before any fetch', async () => {
    const fetchImpl = vi.fn();
    const chat = await openHouse({ appId: 'chat', placeId: 'co_olive', fetchImpl });
    const missing = await openHouse({ appId: 'trade', placeId: ' ', fetchImpl });
    expect(chat.status).toBe('error');
    expect(missing.status).toBe('error');
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('rejects a short number without calling the seed', async () => {
    expect(phoneHasEnoughDigits('1234567')).toBe(false);
    expect(phoneHasEnoughDigits('+27821234567')).toBe(true);
    const fetchImpl = vi.fn();
    const result = await openHouse({
      appId: 'vault',
      placeId: 'co_olive',
      phone: '1234567',
      fetchImpl
    });
    expect(result).toMatchObject({ status: 'phone' });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('drops a role claim and still keeps the bearer off the URL', () => {
    const bearer = bearerFromSessionBody({
      placeSession: 'sess-opaque',
      claims: { role: 'owner', placeId: 'co_olive' }
    });
    expect(bearer).toBe('sess-opaque');
    const href = buildHouseAppOpenUrl('property', { houseRedeem: REDEEM, house: 'The Olive', email: 'a@b.co' });
    expect(href).not.toMatch(/role=/);
  });

  it('treats a bad code as a code-step failure and a dead session as a new number', async () => {
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith('/house/session')) return jsonResponse({ error: 'otp verification failed' }, 401);
      if (url.endsWith('/house/session/redeem/issue')) return jsonResponse({ error: 'place session required' }, 401);
      return jsonResponse({ error: 'Not found' }, 404);
    });
    const badCode = await openHouse({
      appId: 'project',
      placeId: 'co_olive',
      phone: '+27820000000',
      challengeId: 'ch_test',
      code: '000000',
      fetchImpl
    });
    expect(badCode).toMatchObject({ status: 'code', message: 'That code is not the one we sent.' });

    rememberPlaceSession({ placeId: 'co_olive', bearer: 'stale', expiresAt: null });
    const again = await openHouse({
      appId: 'project',
      placeId: 'co_olive',
      hints: { email: 'a@b.co', house: 'Olive' },
      fetchImpl
    });
    expect(again.status).toBe('phone');
    expect(readPlaceSession('co_olive')).toBeNull();
  });

  it('hashes with Web Crypto and recognises a seed redeem id', async () => {
    const digest = await sha256Base64Url('house');
    expect(digest.length).toBeGreaterThan(20);
    expect(readHouseRedeem({ houseRedeem: REDEEM })).toBe(REDEEM);
    expect(readHouseRedeem({ houseRedeem: 'abc' })).toBe('');
    expect(readHouseRedeem({ id: 'not-a-redeem', houseRedeem: { id: REDEEM } })).toBe(REDEEM);
    await expect(requestOtpChallenge({
      placeId: '',
      phone: '+27820000000',
      fetchImpl: vi.fn()
    })).rejects.toBeInstanceOf(HouseSeedError);
    expect(createPlaceSession).toBeTypeOf('function');
  });

  it('opens Vault when the code is valid, even if success JSON includes a message', async () => {
    const placeId = '80a48803-e2fb-492c-8fe3-431e22a1e2cb';
    const fetchImpl = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const body = JSON.parse(String(init?.body || '{}')) as Record<string, unknown>;
      if (url.endsWith('/house/otp/challenge')) {
        expect(body).toEqual({ placeId, phone: '0829261373' });
        return jsonResponse({
          ok: true,
          challengeId: 'ch_vault',
          expiresAt: 1_790_741_320_790,
          mockCode: '482913'
        });
      }
      if (url.endsWith('/house/session')) {
        expect(body).toEqual({
          placeId,
          phone: '0829261373',
          challengeId: 'ch_vault',
          code: '482913'
        });
        return jsonResponse({
          ok: true,
          message: 'Place session ready',
          session: { placeSession: 'sess-vault' },
          expiresAt: Math.floor(Date.now() / 1000) + 120
        });
      }
      if (url.endsWith('/house/session/redeem/issue')) {
        expect(init?.headers).toMatchObject({ authorization: 'Bearer sess-vault' });
        expect(body).toEqual({});
        return jsonResponse({ ok: true, message: 'issued', houseRedeem: REDEEM });
      }
      return jsonResponse({ error: 'Not found' }, 404);
    });

    const needCode = await openHouse({
      appId: 'vault',
      placeId,
      phone: '0829261373',
      hints: { email: 'owner@theolive.co.za', house: 'The Olive', placeIds: [placeId] },
      fetchImpl
    });
    expect(needCode).toMatchObject({ status: 'code', challengeId: 'ch_vault', mockCode: '482913' });

    const opened = await openHouse({
      appId: 'vault',
      placeId,
      phone: '0829261373',
      challengeId: 'ch_vault',
      code: '482 913',
      hints: { email: 'owner@theolive.co.za', house: 'The Olive', placeIds: [placeId] },
      fetchImpl
    });
    expect(opened.status).toBe('navigate');
    if (opened.status !== 'navigate') return;
    const parsed = new URL(opened.url);
    expect(parsed.origin).toBe('https://vault.daup.co.za');
    expect(parsed.pathname).toBe('/');
    expect(parsed.searchParams.get(HOUSE_REDEEM_QUERY)).toBe(REDEEM);
    expect(parsed.searchParams.has('token')).toBe(false);
    expect(opened.url).not.toContain('sess-vault');
    expect(readPlaceSession(placeId)?.bearer).toBe('sess-vault');
  });

  it('uses Mcp-Session-Id when the mint JSON has no bearer string', async () => {
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith('/house/session')) {
        return jsonResponse({ ok: true, message: 'ready' }, 200, { 'Mcp-Session-Id': 'sess-header' });
      }
      if (url.endsWith('/house/session/redeem/issue')) {
        return jsonResponse({ ok: true, houseRedeem: REDEEM });
      }
      return jsonResponse({ error: 'Not found' }, 404);
    });
    const opened = await openHouse({
      appId: 'vault',
      placeId: '80a48803-e2fb-492c-8fe3-431e22a1e2cb',
      phone: '0829261373',
      challengeId: 'ch_vault',
      code: '482913',
      fetchImpl
    });
    expect(opened.status).toBe('navigate');
    const redeemCall = fetchImpl.mock.calls.find(call => String(call[0]).endsWith('/house/session/redeem/issue'));
    expect(redeemCall?.[1]?.headers).toMatchObject({ authorization: 'Bearer sess-header' });
  });

  it('prefers a house place id over a company id', () => {
    expect(pickHousePlaceId([
      'co_olive',
      '80a48803-e2fb-492c-8fe3-431e22a1e2cb'
    ])).toBe('80a48803-e2fb-492c-8fe3-431e22a1e2cb');
    expect(pickHousePlaceId(['co_olive'])).toBe('co_olive');
  });

  it('keeps a session whose expiry arrived as unix seconds', () => {
    const placeId = '80a48803-e2fb-492c-8fe3-431e22a1e2cb';
    rememberPlaceSession({
      placeId,
      bearer: 'sess-seconds',
      expiresAt: Math.floor(Date.now() / 1000) + 120
    });
    expect(readPlaceSession(placeId)?.bearer).toBe('sess-seconds');
  });

  it('reuses a place-session hold when the challenge has no mock code', async () => {
    const fetchImpl = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const body = JSON.parse(String(init?.body || '{}')) as Record<string, unknown>;
      if (url.endsWith('/house/otp/challenge')) {
        return jsonResponse({ ok: true, challengeId: 'ch_real', expiresAt: 1 });
      }
      if (url.endsWith('/house/session')) {
        expect(body.code).toBe('424242');
        return jsonResponse({
          ok: true,
          placeSession: 'sess-real',
          expiresAt: Date.now() + 60_000
        });
      }
      if (url.endsWith('/house/session/redeem/issue')) {
        expect(init?.headers).toMatchObject({ authorization: 'Bearer sess-real' });
        return jsonResponse({ ok: true, houseRedeem: REDEEM });
      }
      return jsonResponse({ error: 'Not found' }, 404);
    });

    const needCode = await openHouse({
      appId: 'finance',
      placeId: 'co_olive',
      phone: '+27820000000',
      fetchImpl
    });
    expect(needCode).toMatchObject({ status: 'code', challengeId: 'ch_real', mockCode: '' });
    expect(houseOtpMockActive('co_olive')).toBe(false);

    const first = await openHouse({
      appId: 'finance',
      placeId: 'co_olive',
      phone: '+27820000000',
      challengeId: 'ch_real',
      code: '424242',
      hints: { email: 'owner@theolive.co.za', house: 'The Olive' },
      fetchImpl
    });
    expect(first.status).toBe('navigate');

    const callsAfterMint = fetchImpl.mock.calls.length;
    const second = await openHouse({
      appId: 'trade',
      placeId: 'co_olive',
      hints: { email: 'owner@theolive.co.za', house: 'The Olive' },
      fetchImpl
    });
    expect(second.status).toBe('navigate');
    if (second.status !== 'navigate') return;
    expect(new URL(second.url).origin).toBe(TRADE_HOME);
    expect(new URL(second.url).searchParams.get(HOUSE_REDEEM_QUERY)).toBe(REDEEM);
    const later = fetchImpl.mock.calls.slice(callsAfterMint).map(call => String(call[0]));
    expect(later.some(url => url.endsWith('/house/otp/challenge'))).toBe(false);
    expect(later.some(url => url.endsWith('/house/session'))).toBe(false);
    expect(later.some(url => url.endsWith('/house/session/redeem/issue'))).toBe(true);
  });

  it('still skips OTP for a hold remembered while mock mode is off', async () => {
    rememberPlaceSession({
      placeId: 'co_olive',
      bearer: 'sess-held',
      expiresAt: Date.now() + 60_000
    });
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith('/house/session/redeem/issue')) {
        return jsonResponse({ ok: true, houseRedeem: REDEEM });
      }
      return jsonResponse({ error: 'Not found' }, 404);
    });
    const opened = await openHouse({
      appId: 'property',
      placeId: 'co_olive',
      hints: { email: 'owner@theolive.co.za', house: 'The Olive' },
      fetchImpl
    });
    expect(opened.status).toBe('navigate');
    if (opened.status !== 'navigate') return;
    expect(new URL(opened.url).origin).toBe('https://property.daup.co.za');
    expect(fetchImpl.mock.calls.map(call => String(call[0])).some(url => url.includes('/house/otp/'))).toBe(false);
  });

  it('challenges again for every house app when the seed returns mockCode', async () => {
    let n = 0;
    const fetchImpl = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const body = JSON.parse(String(init?.body || '{}')) as Record<string, unknown>;
      if (url.endsWith('/house/otp/challenge')) {
        n += 1;
        return jsonResponse({
          ok: true,
          challengeId: `ch_${n}`,
          expiresAt: 1,
          mockCode: `10000${n}`
        });
      }
      if (url.endsWith('/house/session')) {
        return jsonResponse({
          ok: true,
          placeSession: `sess-${body.challengeId}`,
          expiresAt: Date.now() + 60_000
        });
      }
      if (url.endsWith('/house/session/redeem/issue')) {
        return jsonResponse({ ok: true, houseRedeem: REDEEM });
      }
      return jsonResponse({ error: 'Not found' }, 404);
    });

    const placeId = 'co_olive';
    const mint = async (appId: string) => {
      const door = await openHouse({
        appId,
        placeId,
        phone: '+27820000000',
        hints: { email: 'owner@theolive.co.za', house: 'The Olive', placeIds: [placeId] },
        fetchImpl
      });
      expect(door.status).toBe('code');
      if (door.status !== 'code') return;
      expect(door.mockCode).toMatch(/^10000/);
      expect(houseOtpMockActive(placeId)).toBe(true);
      const opened = await openHouse({
        appId,
        placeId,
        phone: '+27820000000',
        challengeId: door.challengeId,
        code: door.mockCode,
        hints: { email: 'owner@theolive.co.za', house: 'The Olive', placeIds: [placeId] },
        fetchImpl
      });
      expect(opened.status).toBe('navigate');
      if (opened.status !== 'navigate') return;
      expect(opened.url).not.toContain('sess-');
      expect(new URL(opened.url).searchParams.get(HOUSE_REDEEM_QUERY)).toBe(REDEEM);
    };

    await mint('vault');
    const held = readPlaceSession(placeId);
    expect(held?.bearer).toBe('sess-ch_1');

    const callsAfterVault = fetchImpl.mock.calls.length;
    const again = await openHouse({
      appId: 'finance',
      placeId,
      hints: { email: 'owner@theolive.co.za', house: 'The Olive' },
      fetchImpl
    });
    expect(again.status).toBe('code');
    if (again.status !== 'code') return;
    expect(again.mockCode).toMatch(/^10000/);
    expect(again.phone).toBe('+27820000000');
    const afterClick = fetchImpl.mock.calls.slice(callsAfterVault).map(call => String(call[0]));
    expect(afterClick.some(url => url.endsWith('/house/otp/challenge'))).toBe(true);
    expect(afterClick.some(url => url.endsWith('/house/session/redeem/issue'))).toBe(false);

    for (const appId of ['project', 'finance', 'trade', 'property', 'vault']) {
      await mint(appId);
    }
    expect(n).toBe(7);
    expect(houseOtpMockActive(placeId)).toBe(true);
  });

  it('re-challenges after a refresh when mock mode was already recorded', async () => {
    let n = 0;
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith('/house/otp/challenge')) {
        n += 1;
        return jsonResponse({
          ok: true,
          challengeId: `ch_${n}`,
          expiresAt: 1,
          mockCode: `20000${n}`
        });
      }
      if (url.endsWith('/house/session')) {
        return jsonResponse({ ok: true, placeSession: `sess-${n}`, expiresAt: Date.now() + 60_000 });
      }
      if (url.endsWith('/house/session/redeem/issue')) {
        return jsonResponse({ ok: true, houseRedeem: REDEEM });
      }
      return jsonResponse({ error: 'Not found' }, 404);
    });
    const placeId = 'co_olive';
    const door = await openHouse({
      appId: 'vault',
      placeId,
      phone: '+27820000000',
      fetchImpl
    });
    expect(door.status).toBe('code');
    const saved = sessionStorage.getItem(PLACE_SESSION_STORAGE_KEY);
    expect(saved).toContain('+27820000000');
    clearPlaceSessionHold();
    expect(houseOtpMockActive(placeId)).toBe(false);
    sessionStorage.setItem(PLACE_SESSION_STORAGE_KEY, saved || '');
    const refreshed = await openHouse({
      appId: 'project',
      placeId,
      hints: { email: 'owner@theolive.co.za', house: 'The Olive' },
      fetchImpl
    });
    expect(refreshed.status).toBe('code');
    if (refreshed.status !== 'code') return;
    expect(refreshed.mockCode).toBe('200002');
    expect(n).toBe(2);
  });

  it('does not redeem from a mock-mode hold when no phone is known', async () => {
    sessionStorage.setItem(PLACE_SESSION_STORAGE_KEY, JSON.stringify({
      v: 2,
      holds: {
        co_olive: {
          placeId: 'co_olive',
          bearer: 'sess-old',
          expiresAt: Date.now() + 60_000
        }
      },
      otpMock: { co_olive: true }
    }));
    const fetchImpl = vi.fn();
    const result = await openHouse({
      appId: 'trade',
      placeId: 'co_olive',
      fetchImpl
    });
    expect(result).toEqual({ status: 'phone', message: '' });
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(readPlaceSession('co_olive')?.bearer).toBe('sess-old');
  });

  it('drops a legacy tab hold that would skip the mock door', async () => {
    sessionStorage.setItem(PLACE_SESSION_STORAGE_KEY, JSON.stringify({
      co_olive: {
        placeId: 'co_olive',
        bearer: 'legacy-bearer',
        expiresAt: Date.now() + 60_000
      }
    }));
    const fetchImpl = vi.fn();
    const result = await openHouse({
      appId: 'project',
      placeId: 'co_olive',
      fetchImpl
    });
    expect(result).toEqual({ status: 'phone', message: '' });
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(readPlaceSession('co_olive')).toBeNull();
  });
});
