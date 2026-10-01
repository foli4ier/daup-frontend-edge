/**
 * In-tab hold for a seed-issued place session.
 * The browser may also keep the seed's host-only cookie when the fetch
 * uses credentials. This hold is the JSON/body bearer for cross-site calls
 * from the Hub origin. It is not a client-signed credential.
 *
 * `otpMock` records that the last challenge for this place returned a
 * mock code. The code itself is not stored. While that flag is set, Open
 * must not reuse the hold to skip the door. `otpPhone` is the number that
 * challenge used, so the next Open can ask for a fresh mock code without
 * stopping on the WhatsApp step. The durable copy of that number is the
 * profile WhatsApp in E.164, not a second phone.
 */

import { expiryToMs } from './seed';

export interface PlaceSessionHold {
  placeId: string;
  bearer: string;
  expiresAt: number | null;
}

export const PLACE_SESSION_STORAGE_KEY = 'daup:hub:place_session';

interface PersistedHold {
  v: 2;
  holds: Record<string, PlaceSessionHold>;
  otpMock: Record<string, boolean>;
  otpPhone: Record<string, string>;
}

let memory: PersistedHold = emptyPersisted();

function emptyPersisted(): PersistedHold {
  return { v: 2, holds: {}, otpMock: {}, otpPhone: {} };
}

function canUseStorage(): boolean {
  return typeof sessionStorage !== 'undefined';
}

function isPersistedHold(value: unknown): value is PersistedHold {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const record = value as PersistedHold;
  return record.v === 2 && !!record.holds && typeof record.holds === 'object' && !Array.isArray(record.holds);
}

function readFlagMap(value: unknown): Record<string, boolean> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as Record<string, boolean>;
}

function readPhoneMap(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const phones: Record<string, string> = {};
  for (const [placeId, phone] of Object.entries(value as Record<string, unknown>)) {
    if (typeof phone === 'string' && phone.trim()) phones[placeId] = phone.trim();
  }
  return phones;
}

function readPersisted(): PersistedHold {
  if (!canUseStorage()) return memory;
  try {
    const raw = sessionStorage.getItem(PLACE_SESSION_STORAGE_KEY);
    if (!raw) return memory;
    const parsed = JSON.parse(raw) as unknown;
    if (!isPersistedHold(parsed)) {
      // Older builds stored the hold map with no version and no mock flag.
      // Those holds skipped the OTP door. Drop them so a live mock code
      // can still show on the next Open.
      memory = emptyPersisted();
      try {
        sessionStorage.removeItem(PLACE_SESSION_STORAGE_KEY);
      } catch {
        // ignore
      }
      return memory;
    }
    memory = {
      v: 2,
      holds: parsed.holds,
      otpMock: readFlagMap(parsed.otpMock),
      otpPhone: readPhoneMap((parsed as PersistedHold).otpPhone)
    };
    return memory;
  } catch {
    return memory;
  }
}

function writePersisted(next: PersistedHold): void {
  memory = {
    v: 2,
    holds: { ...next.holds },
    otpMock: { ...next.otpMock },
    otpPhone: { ...next.otpPhone }
  };
  if (!canUseStorage()) return;
  try {
    const empty = !Object.keys(memory.holds).length
      && !Object.keys(memory.otpMock).length
      && !Object.keys(memory.otpPhone).length;
    if (empty) sessionStorage.removeItem(PLACE_SESSION_STORAGE_KEY);
    else sessionStorage.setItem(PLACE_SESSION_STORAGE_KEY, JSON.stringify(memory));
  } catch {
    // ignore quota
  }
}

export function rememberPlaceSession(hold: PlaceSessionHold): void {
  const placeId = (hold.placeId || '').trim();
  if (!placeId) return;
  const store = readPersisted();
  const expiresAt = typeof hold.expiresAt === 'number' ? expiryToMs(hold.expiresAt) : null;
  writePersisted({
    v: 2,
    holds: {
      ...store.holds,
      [placeId]: {
        placeId,
        bearer: (hold.bearer || '').trim(),
        expiresAt
      }
    },
    otpMock: store.otpMock,
    otpPhone: store.otpPhone
  });
}

/**
 * Last challenge for this place included mockCode / mock_code.
 * When `active` is set, `phone` is the number to challenge next time.
 * The mock digits themselves are not stored.
 */
export function rememberHouseOtpMock(placeId: string, active: boolean, phone?: string): void {
  const id = (placeId || '').trim();
  if (!id) return;
  const store = readPersisted();
  const otpPhone = { ...store.otpPhone };
  const nextPhone = (phone || '').trim();
  if (!active) delete otpPhone[id];
  else if (nextPhone) otpPhone[id] = nextPhone;
  writePersisted({
    v: 2,
    holds: store.holds,
    otpMock: { ...store.otpMock, [id]: active },
    otpPhone
  });
}

export function houseOtpMockActive(placeId: string): boolean {
  const id = (placeId || '').trim();
  if (!id) return false;
  return readPersisted().otpMock[id] === true;
}

/** Number used for the last mock challenge. Empty when mock mode is off. */
export function rememberedHouseOtpPhone(placeId: string): string {
  const id = (placeId || '').trim();
  if (!id) return '';
  if (!houseOtpMockActive(id)) return '';
  return readPersisted().otpPhone[id] || '';
}

export function readPlaceSession(placeId: string, now = Date.now()): PlaceSessionHold | null {
  const id = (placeId || '').trim();
  if (!id) return null;
  const hold = readPersisted().holds[id];
  if (!hold) return null;
  if (typeof hold.expiresAt === 'number' && hold.expiresAt <= now) {
    forgetPlaceSession(id);
    return null;
  }
  return hold;
}

export function forgetPlaceSession(placeId: string): void {
  const id = (placeId || '').trim();
  if (!id) return;
  const store = readPersisted();
  if (!store.holds[id]) return;
  const holds = { ...store.holds };
  delete holds[id];
  writePersisted({ v: 2, holds, otpMock: store.otpMock, otpPhone: store.otpPhone });
}

export function clearPlaceSessionHold(): void {
  memory = emptyPersisted();
  if (!canUseStorage()) return;
  try {
    sessionStorage.removeItem(PLACE_SESSION_STORAGE_KEY);
  } catch {
    // ignore
  }
}
