import { describe, expect, it, beforeEach } from 'vitest';
import {
  BANNED_DOOR_WORDS,
  HUB_EMAIL_DOOR_COPY,
  HUB_HOME_COPY,
  OPEN_THE_HOUSE_LABEL,
  OPEN_YOUR_HUB_LABEL,
  YOUR_EMAIL_LABEL,
  WHERE_IS_THE_EATERY,
  hasBannedDoorCopy
} from './copy';
import {
  buildOpenTheHouseUrl,
  mintOwnerArrivalToken,
  ownerArrivalExposesBannedQuery,
  persistOwnerCookie,
  readOwnerArrivalToken,
  readOwnerCookie
} from './ownerArrival';
import {
  isRegisteredOwnerEmail,
  resolveHubSurface,
  signInWithEmail,
  OWNER_SESSION_STORAGE_KEY
} from './ownerSession';
import { eateryRowTitle, listOwnerPlaces } from './places';

describe('hub email door copy', () => {
  it('uses sentence-case Your email. and Open your hub.', () => {
    expect(YOUR_EMAIL_LABEL).toBe('Your email.');
    expect(OPEN_YOUR_HUB_LABEL).toBe('Open your hub.');
  });

  it('keeps banned protocol words off the email door', () => {
    const door = HUB_EMAIL_DOOR_COPY.join('\n');
    for (const word of BANNED_DOOR_WORDS) {
      expect(hasBannedDoorCopy(door), `banned "${word}" on email door`).toBe(false);
    }
  });

  it('keeps banned protocol words off hub home place rows', () => {
    const home = HUB_HOME_COPY.join('\n');
    for (const word of BANNED_DOOR_WORDS) {
      expect(hasBannedDoorCopy(home), `banned "${word}" on hub home`).toBe(false);
    }
  });
});

describe('hub surface', () => {
  beforeEach(() => {
    localStorage.clear();
    document.cookie = `${OWNER_SESSION_STORAGE_KEY}=; Max-Age=0; Path=/`;
  });

  it('is an email door when nobody is signed in', () => {
    expect(resolveHubSurface({ session: null, hasHouse: false })).toBe('email-door');
    expect(resolveHubSurface({ session: null, hasHouse: true })).toBe('email-door');
  });

  it('keeps Where is the eatery? on the hub wizard after email', () => {
    const signedIn = signInWithEmail('owner@theolive.co.za');
    expect(signedIn.ok).toBe(true);
    if (!signedIn.ok) return;
    expect(resolveHubSurface({ session: signedIn.session, hasHouse: false })).toBe('wizard');
    expect(WHERE_IS_THE_EATERY).toBe('Where is the eatery?');
  });

  it('shows hub home only after email and a named house', () => {
    const signedIn = signInWithEmail('owner@theolive.co.za');
    if (!signedIn.ok) return;
    expect(resolveHubSurface({ session: signedIn.session, hasHouse: true })).toBe('home');
  });

  it('rejects a blank email in kitchen English', () => {
    const result = signInWithEmail('not-an-email');
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('Add the email we can reach.');
    expect(hasBannedDoorCopy(result.reason)).toBe(false);
  });

  it('accepts a real email', () => {
    expect(isRegisteredOwnerEmail('You@TheOlive.co.za')).toBe(true);
    const result = signInWithEmail('You@TheOlive.co.za');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.session.email).toBe('you@theolive.co.za');
    expect(localStorage.getItem(OWNER_SESSION_STORAGE_KEY)).toContain('you@theolive.co.za');
  });
});

describe('Open the house arrival', () => {
  it('navigates to eatery.daup.co.za/owner with a signed token', () => {
    const url = buildOpenTheHouseUrl({
      email: 'owner@theolive.co.za',
      house: 'The Olive',
      origin: 'https://eatery.daup.co.za'
    });
    const parsed = new URL(url);
    expect(parsed.origin).toBe('https://eatery.daup.co.za');
    expect(parsed.pathname).toBe('/owner');
    expect([...parsed.searchParams.keys()]).toEqual(['token']);
    expect(ownerArrivalExposesBannedQuery(url)).toBe(false);

    const claims = readOwnerArrivalToken(parsed.searchParams.get('token') || '');
    expect(claims?.email).toBe('owner@theolive.co.za');
    expect(claims?.house).toBe('The Olive');
    expect(claims?.role).toBe('owner');
  });

  it('rejects a tampered or expired arrival', () => {
    const token = mintOwnerArrivalToken({
      email: 'owner@theolive.co.za',
      house: 'The Olive',
      now: new Date('2026-01-01T00:00:00Z'),
      ttlMs: 1000
    });
    expect(readOwnerArrivalToken(token, new Date('2026-01-01T00:00:02Z'))).toBeNull();
    expect(readOwnerArrivalToken(token.slice(0, -2) + 'xx')).toBeNull();
  });

  it('writes a companion cookie the eatery origin can read', () => {
    const token = mintOwnerArrivalToken({ email: 'owner@theolive.co.za', house: 'The Olive' });
    persistOwnerCookie(token, 'localhost');
    expect(document.cookie).toContain('daup_owner=');
    expect(readOwnerCookie()).toBe(token);
  });

  it('scopes the companion cookie to .daup.co.za on the live hub', () => {
    const token = mintOwnerArrivalToken({ email: 'owner@theolive.co.za', house: 'The Olive' });
    const writes: string[] = [];
    Object.defineProperty(document, 'cookie', {
      configurable: true,
      set(value: string) {
        writes.push(value);
      },
      get() {
        return writes[writes.length - 1] || '';
      }
    });
    persistOwnerCookie(token, 'app.daup.co.za');
    expect(writes[0]).toContain('Domain=.daup.co.za');
    expect(writes[0]).toContain('Secure');
    expect(writes[0]).toContain(`daup_owner=${encodeURIComponent(token)}`);
  });
});

describe('eatery row on hub home', () => {
  it('uses the place name, not Eatery', () => {
    expect(eateryRowTitle('The Olive')).toBe('The Olive');
    const rows = listOwnerPlaces({
      email: 'owner@theolive.co.za',
      placeName: 'The Olive',
      origin: 'https://eatery.daup.co.za'
    });
    expect(rows[0].title).toBe('The Olive');
    expect(rows[0].title).not.toBe('Eatery');
    expect(rows[0].actionLabel).toBe(OPEN_THE_HOUSE_LABEL);
    expect(rows[0].href).toMatch(/^https:\/\/eatery\.daup\.co\.za\/owner\?token=/);
    expect(hasBannedDoorCopy(rows[0].title + rows[0].body + (rows[0].actionLabel || ''))).toBe(false);
  });
});
