import { describe, expect, it, beforeEach } from 'vitest';
import {
  BANNED_DOOR_WORDS,
  DELETE_HOUSE_MODAL_COPY,
  DELETE_THE_HOUSE_LABEL,
  HUB_EMAIL_DOOR_COPY,
  HUB_HOME_COPY,
  LOG_OFF_LABEL,
  OPEN_THE_HOUSE_LABEL,
  OPEN_YOUR_HUB_LABEL,
  REGISTER_A_NEW_HOUSE_LABEL,
  SAME_CHAIN_CAPTION,
  YOUR_EMAIL_LABEL,
  WHERE_IS_THE_EATERY,
  hasBannedDoorCopy,
  houseNameMatchesConfirm
} from './copy';
import {
  buildExpireOwnerCookie,
  buildOpenTheHouseUrl,
  buildOwnerHubCookie,
  cookieSetsParentDomain,
  mintOwnerArrivalToken,
  OWNER_ARRIVAL_PEPPER,
  ownerArrivalExposesBannedQuery,
  persistOwnerCookie,
  readOwnerArrivalToken,
  readOwnerCookie
} from './ownerArrival';
import {
  clearOwnerSession,
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
    expect(LOG_OFF_LABEL).toBe('Log off.');
    expect(SAME_CHAIN_CAPTION).toBe('Same chain. Not live yet.');
    expect(DELETE_THE_HOUSE_LABEL).toBe('Delete the house.');
    expect(REGISTER_A_NEW_HOUSE_LABEL).toBe('Register a new house.');
    for (const line of DELETE_HOUSE_MODAL_COPY) {
      expect(hasBannedDoorCopy(line), `banned word in "${line}"`).toBe(false);
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
    expect(resolveHubSurface({
      session: signedIn.session,
      hasHouse: true,
      namingPlace: true
    })).toBe('wizard');
  });

  it('returns to naming a place when the house is gone but email stays', () => {
    const signedIn = signInWithEmail('owner@theolive.co.za');
    if (!signedIn.ok) return;
    expect(resolveHubSurface({ session: signedIn.session, hasHouse: false })).toBe('wizard');
    expect(resolveHubSurface({ session: signedIn.session, hasHouse: false })).not.toBe('email-door');
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
    expect(OWNER_ARRIVAL_PEPPER).toBe('daup-hub-owner-arrival-v1');
    const url = buildOpenTheHouseUrl({
      email: 'foli4ier@gmail.com',
      house: 'Kortrijk',
      origin: 'https://eatery.daup.co.za'
    });
    const parsed = new URL(url);
    expect(parsed.origin).toBe('https://eatery.daup.co.za');
    expect(parsed.pathname).toBe('/owner');
    expect([...parsed.searchParams.keys()]).toEqual(['token']);
    expect(ownerArrivalExposesBannedQuery(url)).toBe(false);

    const claims = readOwnerArrivalToken(parsed.searchParams.get('token') || '');
    expect(claims?.email).toBe('foli4ier@gmail.com');
    expect(claims?.house).toBe('Kortrijk');
    expect(claims?.role).toBe('owner');
  });

  it('never mints an arrival with an empty email or house', () => {
    expect(() => mintOwnerArrivalToken({ email: '', house: 'Kortrijk' })).toThrow();
    expect(() => mintOwnerArrivalToken({ email: 'foli4ier@gmail.com', house: '' })).toThrow();
    expect(buildOpenTheHouseUrl({
      email: '',
      house: 'Kortrijk',
      origin: 'https://eatery.daup.co.za'
    })).toBe('');
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

  it('writes a host-only hub cookie, never Domain=.daup.co.za', () => {
    const token = mintOwnerArrivalToken({ email: 'owner@theolive.co.za', house: 'The Olive' });
    persistOwnerCookie(token, 'localhost');
    expect(document.cookie).toContain('daup_owner=');
    expect(readOwnerCookie()).toBe(token);

    const live = buildOwnerHubCookie(token, 'app.daup.co.za');
    expect(live).toBeTruthy();
    expect(live).toContain('Secure');
    expect(cookieSetsParentDomain(live || '')).toBe(false);
    expect(live).not.toMatch(/Domain=/i);

    expect(buildOwnerHubCookie(token, 'www.daup.co.za')).toBeNull();
    expect(buildOwnerHubCookie(token, 'eatery.daup.co.za')).toBeNull();
    expect(cookieSetsParentDomain('daup_owner=x; Domain=.daup.co.za; Path=/')).toBe(true);
  });

  it('expires daup_owner with Max-Age=0, Path=/, and no Domain', () => {
    const header = buildExpireOwnerCookie('app.daup.co.za');
    expect(header).toContain('daup_owner=');
    expect(header).toContain('Max-Age=0');
    expect(header).toContain('Path=/');
    expect(header).not.toMatch(/Domain=/i);
    expect(cookieSetsParentDomain(header)).toBe(false);

    const writes: string[] = [];
    Object.defineProperty(document, 'cookie', {
      configurable: true,
      set(value: string) {
        writes.push(value);
      },
      get() {
        return '';
      }
    });
    localStorage.setItem(OWNER_SESSION_STORAGE_KEY, JSON.stringify({
      email: 'foli4ier@gmail.com',
      signedInAt: Date.now()
    }));
    clearOwnerSession();
    expect(localStorage.getItem(OWNER_SESSION_STORAGE_KEY)).toBeNull();
    expect(writes.some(write =>
      write.includes('Max-Age=0') && write.includes('Path=/') && write.startsWith('daup_owner=')
    )).toBe(true);
    expect(writes.every(write => !/Domain=/i.test(write))).toBe(true);
  });

  it('does not write a cookie to build Open the house; the token URL is the handoff', () => {
    const writes: string[] = [];
    Object.defineProperty(document, 'cookie', {
      configurable: true,
      set(value: string) {
        writes.push(value);
      },
      get() {
        return '';
      }
    });
    const url = buildOpenTheHouseUrl({
      email: 'owner@theolive.co.za',
      house: 'The Olive',
      origin: 'https://eatery.daup.co.za'
    });
    expect(writes).toEqual([]);
    const parsed = new URL(url);
    expect(parsed.origin).toBe('https://eatery.daup.co.za');
    expect(parsed.pathname).toBe('/owner');
    expect([...parsed.searchParams.keys()]).toEqual(['token']);
  });

  it('Open the house navigation does not persist a cookie', async () => {
    const { navigateToTheHouse: go } = await import('./ownerArrival');
    const src = go.toString();
    expect(src).not.toContain('persistOwnerCookie');
    expect(src).not.toContain('document.cookie');
    expect(src).not.toContain('Domain=');
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

describe('type-the-name delete confirm', () => {
  it('matches only the exact house name', () => {
    expect(houseNameMatchesConfirm('Kortrijk', 'Kortrijk')).toBe(true);
    expect(houseNameMatchesConfirm('kortrijk', 'Kortrijk')).toBe(false);
    expect(houseNameMatchesConfirm('Kortrijk ', 'Kortrijk')).toBe(false);
    expect(houseNameMatchesConfirm('The Olive', 'Kortrijk')).toBe(false);
    expect(houseNameMatchesConfirm('', 'Kortrijk')).toBe(false);
  });
});
