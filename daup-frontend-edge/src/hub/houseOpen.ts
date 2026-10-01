/**
 * OTP → seed place session → one-time houseRedeem → Open URL.
 * Chat never enters this path. The Hub does not sign the session.
 * While the seed returns mockCode, every Open challenges again.
 * Without mockCode, a live tab hold still opens the next app.
 */

import {
  HOUSE_OTP_BAD_CODE,
  HOUSE_OTP_BAD_PHONE,
  HOUSE_OTP_FAILED,
  HOUSE_OTP_NEED_PLACE
} from './copy';
import {
  HouseSeedError,
  appUsesHouseRedeem,
  buildHouseAppOpenUrl,
  createPlaceSession,
  forgetPlaceSession,
  houseOtpMockActive,
  issueHouseRedeem,
  phoneHasEnoughDigits,
  readPlaceSession,
  rememberHouseOtpMock,
  rememberPlaceSession,
  requestOtpChallenge,
  type HouseFetchOptions,
  type HouseRedeemAppId
} from './house-session';
import type { AppHandoffHints } from './ownerArrival';

const PLACE_UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** House network place id when we have one. Company ids stay as a last resort. */
export function pickHousePlaceId(candidates: Array<string | null | undefined>): string {
  const ids = candidates.map(id => (id || '').trim()).filter(Boolean);
  return ids.find(id => PLACE_UUID_RE.test(id)) || ids[0] || '';
}

export type HouseOpenResult =
  | { status: 'navigate'; url: string }
  | { status: 'phone'; message: string }
  | { status: 'code'; challengeId: string; phone: string; message: string; mockCode: string }
  | { status: 'error'; message: string };

function kitchenMessage(error: unknown): string {
  const code = error instanceof HouseSeedError ? error.code : '';
  const text = (code || '').toLowerCase();
  if (text.includes('otp') || text.includes('verification') || text.includes('code')) return HOUSE_OTP_BAD_CODE;
  if (text.includes('phone') || text.includes('peer')) return HOUSE_OTP_BAD_PHONE;
  return HOUSE_OTP_FAILED;
}

function isUnauthorized(error: unknown): boolean {
  return error instanceof HouseSeedError && (error.status === 401 || error.status === 403);
}

export async function continueHouseOpen(args: {
  appId: string;
  placeId: string;
  hints?: AppHandoffHints;
  phone?: string;
  code?: string;
  challengeId?: string;
  now?: number;
} & HouseFetchOptions): Promise<HouseOpenResult> {
  if (!appUsesHouseRedeem(args.appId)) return { status: 'error', message: HOUSE_OTP_FAILED };
  const appId: HouseRedeemAppId = args.appId;
  const placeId = (args.placeId || '').trim();
  if (!placeId) return { status: 'error', message: HOUSE_OTP_NEED_PLACE };

  const hints = args.hints || {};
  const stored = readPlaceSession(placeId, args.now);
  // A hold skips a second WhatsApp OTP. It must not skip the door while the
  // seed is returning mockCode — that is the only signal the popup can show.
  let hold = stored && !houseOtpMockActive(placeId) ? stored : null;

  if (!hold) {
    const phone = (args.phone || '').trim();
    if (!phone) return { status: 'phone', message: '' };
    if (!phoneHasEnoughDigits(phone)) return { status: 'phone', message: HOUSE_OTP_BAD_PHONE };
    let challengeId = (args.challengeId || '').trim();
    const code = (args.code || '').replace(/\s+/g, '').trim();
    let mockCode = '';
    if (!challengeId) {
      try {
        const challenge = await requestOtpChallenge({
          placeId,
          phone,
          seed: args.seed,
          fetchImpl: args.fetchImpl
        });
        challengeId = challenge.challengeId;
        mockCode = challenge.mockCode;
        rememberHouseOtpMock(placeId, Boolean(mockCode));
      } catch (error) {
        return { status: 'phone', message: kitchenMessage(error) };
      }
      if (!code) return { status: 'code', challengeId, phone, message: '', mockCode };
    }
    if (!code) return { status: 'code', challengeId, phone, message: '', mockCode };
    try {
      const issued = await createPlaceSession({
        placeId,
        phone,
        challengeId,
        code,
        seed: args.seed,
        fetchImpl: args.fetchImpl
      });
      hold = { placeId, bearer: issued.bearer, expiresAt: issued.expiresAt };
      rememberPlaceSession(hold);
    } catch (error) {
      return { status: 'code', challengeId, phone, message: kitchenMessage(error), mockCode: '' };
    }
  }

  if (!hold.bearer) {
    forgetPlaceSession(placeId);
    return { status: 'phone', message: HOUSE_OTP_FAILED };
  }

  try {
    const houseRedeem = await issueHouseRedeem({
      seed: args.seed,
      fetchImpl: args.fetchImpl,
      bearer: hold.bearer
    });
    const url = buildHouseAppOpenUrl(appId, {
      email: hints.email,
      house: hints.house,
      placeIds: hints.placeIds,
      houseRedeem
    });
    return { status: 'navigate', url };
  } catch (error) {
    if (isUnauthorized(error)) {
      forgetPlaceSession(placeId);
      return { status: 'phone', message: HOUSE_OTP_FAILED };
    }
    return { status: 'error', message: kitchenMessage(error) };
  }
}
