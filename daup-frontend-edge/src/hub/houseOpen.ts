/**
 * OTP → seed place session → one-time houseRedeem → Open URL.
 * Chat never enters this path. The Hub does not sign the session.
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
  issueHouseRedeem,
  phoneHasEnoughDigits,
  readPlaceSession,
  rememberPlaceSession,
  requestOtpChallenge,
  type HouseFetchOptions,
  type HouseRedeemAppId
} from './house-session';
import type { AppHandoffHints } from './ownerArrival';

export type HouseOpenResult =
  | { status: 'navigate'; url: string }
  | { status: 'phone'; message: string }
  | { status: 'code'; challengeId: string; phone: string; message: string }
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
  let hold = readPlaceSession(placeId, args.now);

  if (!hold) {
    const phone = (args.phone || '').trim();
    if (!phone) return { status: 'phone', message: '' };
    if (!phoneHasEnoughDigits(phone)) return { status: 'phone', message: HOUSE_OTP_BAD_PHONE };
    let challengeId = (args.challengeId || '').trim();
    const code = (args.code || '').trim();
    if (!challengeId) {
      try {
        const challenge = await requestOtpChallenge({
          placeId,
          phone,
          seed: args.seed,
          fetchImpl: args.fetchImpl
        });
        challengeId = challenge.challengeId;
      } catch (error) {
        return { status: 'phone', message: kitchenMessage(error) };
      }
      if (!code) return { status: 'code', challengeId, phone, message: '' };
    }
    if (!code) return { status: 'code', challengeId, phone, message: '' };
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
      return { status: 'code', challengeId, phone, message: kitchenMessage(error) };
    }
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
