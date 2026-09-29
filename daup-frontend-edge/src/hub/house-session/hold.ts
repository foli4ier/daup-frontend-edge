/**
 * In-tab hold for a seed-issued place session.
 * The browser may also keep the seed's host-only cookie when the fetch
 * uses credentials. This hold is the JSON/body bearer for cross-site calls
 * from the Hub origin. It is not a client-signed credential.
 */

export interface PlaceSessionHold {
  placeId: string;
  bearer: string;
  expiresAt: number | null;
}

const STORAGE_KEY = 'daup:hub:place_session';

let memory: Record<string, PlaceSessionHold> = {};

function canUseStorage(): boolean {
  return typeof sessionStorage !== 'undefined';
}

function readStore(): Record<string, PlaceSessionHold> {
  if (!canUseStorage()) return memory;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return memory;
    const parsed = JSON.parse(raw) as Record<string, PlaceSessionHold>;
    if (!parsed || typeof parsed !== 'object') return memory;
    memory = parsed;
    return memory;
  } catch {
    return memory;
  }
}

function writeStore(next: Record<string, PlaceSessionHold>): void {
  memory = next;
  if (!canUseStorage()) return;
  try {
    if (!Object.keys(next).length) sessionStorage.removeItem(STORAGE_KEY);
    else sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // ignore quota
  }
}

export function rememberPlaceSession(hold: PlaceSessionHold): void {
  const placeId = (hold.placeId || '').trim();
  if (!placeId) return;
  const store = { ...readStore() };
  store[placeId] = {
    placeId,
    bearer: (hold.bearer || '').trim(),
    expiresAt: typeof hold.expiresAt === 'number' ? hold.expiresAt : null
  };
  writeStore(store);
}

export function readPlaceSession(placeId: string, now = Date.now()): PlaceSessionHold | null {
  const id = (placeId || '').trim();
  if (!id) return null;
  const hold = readStore()[id];
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
  const store = { ...readStore() };
  delete store[id];
  writeStore(store);
}

export function clearPlaceSessionHold(): void {
  memory = {};
  if (!canUseStorage()) return;
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
