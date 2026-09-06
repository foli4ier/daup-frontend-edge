import { describe, expect, it, beforeEach } from 'vitest';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { Simulate } from 'react-dom/test-utils';
import { SubscribedAppsView } from './SubscribedAppsView';
import { UserProfileProvider } from '../context/UserProfileContext';
import {
  saveIdentityVault,
  resetIdentityVault,
  UserIdentityVault,
  registerPlaceOnPlatform,
  listRegisteredPlaces
} from '../stores/identityStore';
import { OWNER_SESSION_STORAGE_KEY } from '../hub/ownerSession';
import {
  ON_THE_CHAIN_EMPTY,
  ON_THE_CHAIN_KICKER,
  OPEN_THE_HOUSE_LABEL,
  SAME_CHAIN_CAPTION,
  WHERE_IS_THE_EATERY
} from '../hub/copy';
import { App } from '../App';
import { persistOwnerCookie, mintOwnerArrivalToken, readOwnerArrivalToken, buildOpenTheHouseUrl, cookieSetsParentDomain } from '../hub/ownerArrival';

const houseVault: UserIdentityVault = {
  version: 1,
  hasCompletedOnboarding: true,
  registeredAt: 1700000000000,
  updatedAt: 1700000000000,
  profile: {
    demographics: {
      email: 'owner@theolive.co.za',
      contactNumber: '+27820000000',
      whatsappNumber: '',
      language: 'en',
      sex: 'prefer_not_to_say',
      birthdate: ''
    },
    location: {
      country: 'South Africa',
      provinceState: 'Western Cape',
      city: 'Stellenbosch',
      address: '12 Church Street'
    },
    socials: { website: '', instagram: '', facebook: '' },
    wallets: [{
      id: 'w-olive',
      type: 'bank',
      legalName: 'The Olive',
      bankName: '',
      accountNumber: '',
      routingCode: '',
      isPrimary: true,
      createdAt: 1700000000000
    }],
    primaryWalletId: 'w-olive',
    isOnboarded: true,
    createdAt: 1700000000000,
    updatedAt: 1700000000000
  },
  registeredWallets: [{
    id: 'w-olive',
    type: 'bank',
    legalName: 'The Olive',
    bankName: '',
    accountNumber: '',
    routingCode: '',
    isPrimary: true,
    createdAt: 1700000000000
  }],
  activeWallet: {
    id: 'w-olive',
    type: 'bank',
    legalName: 'The Olive',
    bankName: '',
    accountNumber: '',
    routingCode: '',
    isPrimary: true,
    createdAt: 1700000000000
  },
  identityKeySeedNode: 'the-olive-seed',
  trialState: {
    hasStartedTrial: true,
    trialStartedAt: 1700000000000,
    trialExpiresAt: 1702592000000,
    isTrialActive: true,
    tier: 'Trial',
    isSubscribed: true
  }
};

function render(ui: React.ReactElement) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(ui);
  });
  return {
    container,
    unmount() {
      act(() => root.unmount());
      container.remove();
    }
  };
}

function typeInto(input: HTMLInputElement, value: string) {
  act(() => {
    input.focus();
    input.value = value;
    Simulate.change(input);
  });
}

describe('hub home after email', () => {
  beforeEach(() => {
    resetIdentityVault();
    localStorage.clear();
    window.history.replaceState({}, '', '/');
    saveIdentityVault(houseVault);
    localStorage.setItem(OWNER_SESSION_STORAGE_KEY, JSON.stringify({
      email: 'owner@theolive.co.za',
      signedInAt: Date.now()
    }));
  });

  it('shows the eatery row as the place name and Open the house to /owner', async () => {
    const { container, unmount } = render(
      <UserProfileProvider>
        <SubscribedAppsView />
      </UserProfileProvider>
    );

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 80));
    });

    const name = container.querySelector('[data-testid="eatery-place-name"]');
    const open = container.querySelector('[data-testid="open-the-house"]') as HTMLAnchorElement | null;
    expect(name?.textContent).toContain('The Olive');
    expect(name?.textContent).not.toContain('Eatery');
    expect(open?.textContent).toContain(OPEN_THE_HOUSE_LABEL);
    expect(open?.getAttribute('href') || '').toMatch(/\/owner\?token=/);

    const href = open?.getAttribute('href') || '';
    const token = new URL(href, 'https://eatery.daup.co.za').searchParams.get('token') || '';
    const claims = readOwnerArrivalToken(token);
    expect(claims?.house).toBe('The Olive');
    expect(claims?.email).toBe('owner@theolive.co.za');

    const other = container.querySelector('[data-testid="other-apps"]');
    expect(other?.textContent).toContain('Farm');
    expect(other?.textContent).toContain('Reseller');
    expect(other?.textContent).toContain('Maker');
    expect(other?.textContent).toContain('Coming');
    expect(other?.textContent).not.toMatch(/Subscribe/i);
    expect(container.querySelector('[data-testid="same-chain-caption"]')?.textContent).toBe(SAME_CHAIN_CAPTION);
    expect(container.textContent).not.toContain('Decentralized Edge App Registry');
    expect(container.querySelector('[data-testid="delete-the-house"]')?.textContent).toBe('Delete the house.');
    expect(container.querySelector('[data-testid="register-new-house"]')?.textContent).toBe('Register a new house.');
    expect(container.querySelector('[data-testid="on-the-chain"]')?.textContent).toContain(ON_THE_CHAIN_KICKER);
    expect(container.querySelector('[data-testid="on-the-chain-empty"]')?.textContent).toBe(ON_THE_CHAIN_EMPTY);
    const door = container.querySelector('[data-testid="ask-for-enhancement"]') as HTMLAnchorElement | null;
    expect(door?.textContent).toBe('Ask for an enhancement.');
    expect(door?.getAttribute('href')).toBe('/asks');
    expect(container.querySelector('.place-row-controls')?.contains(door)).toBe(true);
    expect(container.querySelector('[data-testid="ask-page"]')).toBeNull();
    expect(container.textContent).not.toMatch(/\b(peer|node|DID|DHT|wallet|MCP|npm)\b/i);
    unmount();
  });

  it('lists registered places grouped App → Country → Region → City → name', async () => {
    registerPlaceOnPlatform({
      placeName: 'Press',
      app: 'maker',
      country: 'United States',
      region: 'Texas',
      city: 'Austin'
    });
    registerPlaceOnPlatform({
      placeName: 'The Olive',
      app: 'eatery',
      country: 'South Africa',
      region: 'Western Cape',
      city: 'Stellenbosch'
    });
    registerPlaceOnPlatform({
      placeName: 'Green Field',
      app: 'farm',
      country: 'Kenya',
      region: 'Nairobi',
      city: 'Nairobi'
    });
    registerPlaceOnPlatform({
      placeName: 'Salt',
      app: 'eatery',
      country: 'South Africa',
      region: 'Western Cape',
      city: 'Cape Town'
    });

    const { container, unmount } = render(
      <UserProfileProvider>
        <SubscribedAppsView />
      </UserProfileProvider>
    );

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 80));
    });

    const chain = container.querySelector('[data-testid="on-the-chain"]');
    expect(chain?.querySelector('[data-testid="on-the-chain-empty"]')).toBeNull();
    const names = Array.from(chain?.querySelectorAll('[data-testid="on-the-chain-place"]') || [])
      .map(row => row.getAttribute('data-place-name'));
    expect(names).toEqual(['Salt', 'The Olive', 'Green Field', 'Press']);

    const text = chain?.textContent || '';
    expect(text.indexOf('Eatery')).toBeLessThan(text.indexOf('Farm'));
    expect(text.indexOf('Farm')).toBeLessThan(text.indexOf('Maker'));
    expect(text.indexOf('Cape Town')).toBeLessThan(text.indexOf('Stellenbosch'));
    expect(text).toContain('Stellenbosch, Western Cape, South Africa');
    expect(text).toContain('The Olive');
    expect(text).not.toMatch(/\b(peer|node|DID|DHT|wallet|MCP|npm)\b/i);
    expect(container.querySelector('[data-testid="hub-home"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="ask-for-enhancement"]')?.textContent).toBe('Ask for an enhancement.');
    unmount();
  });

  it('does not put Marketplace installs or Subscribe on Coming cards', async () => {
    localStorage.setItem('daup_installed_apps', JSON.stringify({ 'daup-farmer': true }));
    const { container, unmount } = render(<App />);

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 80));
    });

    const other = container.querySelector('[data-testid="other-apps"]');
    expect(other?.textContent).toContain('Farm');
    expect(other?.textContent).toContain('Coming');
    expect(other?.textContent).not.toMatch(/Subscribe/i);
    expect(container.textContent).not.toMatch(/Subscribed/i);
    unmount();
  });

  it('Log off. returns to the email door and expires the hub cookie', async () => {
    persistOwnerCookie(
      mintOwnerArrivalToken({ email: 'owner@theolive.co.za', house: 'The Olive' }),
      'localhost'
    );
    const { container, unmount } = render(<App />);

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 80));
    });

    expect(container.querySelector('[data-testid="hub-home"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="other-apps"]')?.textContent).toContain('Farm');
    const logOff = container.querySelector('[data-testid="hub-log-off"]') as HTMLButtonElement | null;
    expect(logOff?.textContent).toBe('Log off.');

    act(() => {
      logOff?.click();
    });

    expect(container.querySelector('[data-testid="hub-email-door"]')).toBeTruthy();
    expect(container.querySelector('label[for="hub-email"]')?.textContent).toBe('Your email.');
    expect(container.querySelector('[data-testid="open-your-hub"]')?.textContent).toContain('Open your hub.');
    expect(localStorage.getItem(OWNER_SESSION_STORAGE_KEY)).toBeNull();
    unmount();
  });

  it('opens Ask for an enhancement. as its own page, not a home section', async () => {
    const { container, unmount } = render(<App />);

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 80));
    });

    expect(container.querySelector('[data-testid="hub-home"]')).toBeTruthy();
    const door = container.querySelector('[data-testid="ask-for-enhancement"]') as HTMLAnchorElement;
    expect(door).toBeTruthy();
    expect(door.getAttribute('href')).toBe('/asks');

    act(() => {
      door.click();
    });

    expect(window.location.pathname).toBe('/asks');
    expect(container.querySelector('[data-testid="ask-page"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="ask-which-app"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="hub-home"]')).toBeNull();
    expect(container.querySelector('[data-testid="eatery-place-row"]')).toBeNull();
    expect(container.querySelector('[data-testid="other-apps"]')).toBeNull();
    expect(container.textContent).toContain('Ask for an enhancement.');
    expect(container.textContent).not.toMatch(/\b(peer|node|DID|DHT|wallet|MCP|npm|GossipSub|CRDT|mesh|hydrate|Defect|Support)\b/i);
    expect(container.textContent).toContain("Something's wrong");
    expect(container.textContent).toContain('Need help');
    expect(container.textContent).toContain('What do you need?');
    expect(container.textContent).toContain('Send.');
    expect(container.textContent).toContain('No asks yet.');

    act(() => {
      (container.querySelector('[data-testid="ask-back"]') as HTMLButtonElement).click();
    });

    expect(window.location.pathname).toBe('/');
    expect(container.querySelector('[data-testid="hub-home"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="ask-page"]')).toBeNull();
    expect(container.querySelector('[data-testid="ask-for-enhancement"]')).toBeTruthy();
    unmount();
  });
});

describe('ask door only on signed home', () => {
  beforeEach(() => {
    resetIdentityVault();
    localStorage.clear();
    window.history.replaceState({}, '', '/');
  });

  it('hides the ask door on the email door', async () => {
    const { container, unmount } = render(<App />);
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 80));
    });
    expect(container.querySelector('[data-testid="hub-email-door"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="ask-for-enhancement"]')).toBeNull();
    expect(container.querySelector('[data-testid="ask-page"]')).toBeNull();
    unmount();
  });

  it('hides the ask door while naming the house', async () => {
    localStorage.setItem(OWNER_SESSION_STORAGE_KEY, JSON.stringify({
      email: 'owner@theolive.co.za',
      signedInAt: Date.now()
    }));
    const { container, unmount } = render(<App />);
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 80));
    });
    expect(container.querySelector('[data-testid="hub-wizard"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="hub-home"]')).toBeNull();
    expect(container.querySelector('[data-testid="ask-for-enhancement"]')).toBeNull();
    expect(container.querySelector('[data-testid="ask-page"]')).toBeNull();
    unmount();
  });
});

describe('asks route', () => {
  beforeEach(() => {
    resetIdentityVault();
    localStorage.clear();
    saveIdentityVault(houseVault);
    localStorage.setItem(OWNER_SESSION_STORAGE_KEY, JSON.stringify({
      email: 'owner@theolive.co.za',
      signedInAt: Date.now()
    }));
    window.history.replaceState({}, '', '/asks');
  });

  it('opens the ask page from /asks when the house is signed in', async () => {
    const { container, unmount } = render(<App />);
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 80));
    });
    expect(window.location.pathname).toBe('/asks');
    expect(container.querySelector('[data-testid="ask-page"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="ask-back"]')?.getAttribute('href')).toBe('/');
    expect(container.querySelector('[data-testid="hub-home"]')).toBeNull();
    unmount();
  });
});

describe('delete and register a house from hub home', () => {
  beforeEach(() => {
    resetIdentityVault();
    localStorage.clear();
    window.history.replaceState({}, '', '/');
    saveIdentityVault(houseVault);
    localStorage.setItem(OWNER_SESSION_STORAGE_KEY, JSON.stringify({
      email: 'owner@theolive.co.za',
      signedInAt: Date.now()
    }));
  });

  it('keeps Delete quiet until the typed name matches, then clears the house', async () => {
    const cookieWrites: string[] = [];
    const cookieDesc = Object.getOwnPropertyDescriptor(Document.prototype, 'cookie')
      || Object.getOwnPropertyDescriptor(document, 'cookie');
    Object.defineProperty(document, 'cookie', {
      configurable: true,
      set(value: string) {
        cookieWrites.push(value);
      },
      get() {
        return '';
      }
    });

    persistOwnerCookie(
      mintOwnerArrivalToken({ email: 'owner@theolive.co.za', house: 'The Olive' }),
      'localhost'
    );

    const { container, unmount } = render(<App />);
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 80));
    });

    expect(container.querySelector('[data-testid="hub-home"]')).toBeTruthy();
    const openDelete = container.querySelector('[data-testid="delete-the-house"]') as HTMLButtonElement;
    act(() => {
      openDelete.click();
    });

    const confirm = container.querySelector('[data-testid="delete-house-confirm"]') as HTMLButtonElement;
    const nameInput = container.querySelector('[data-testid="delete-house-name"]') as HTMLInputElement;
    expect(confirm).toBeTruthy();
    expect(confirm.disabled).toBe(true);

    typeInto(nameInput, 'the olive');
    expect(confirm.disabled).toBe(true);

    typeInto(nameInput, 'The Olive');
    expect(confirm.disabled).toBe(false);

    act(() => {
      confirm.click();
    });

    expect(container.querySelector('[data-testid="hub-home"]')).toBeNull();
    expect(container.querySelector('[data-testid="eatery-place-row"]')).toBeNull();
    expect(container.querySelector('[data-testid="hub-email-door"]')).toBeNull();
    expect(container.querySelector('[data-testid="hub-wizard"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="hub-wizard"]')?.textContent).toContain(WHERE_IS_THE_EATERY);
    expect(container.textContent).not.toMatch(/\bLIVE\b/);
    expect(localStorage.getItem(OWNER_SESSION_STORAGE_KEY)).toContain('owner@theolive.co.za');
    expect(cookieWrites.some(write =>
      write.includes('Max-Age=0') && write.startsWith('daup_owner=') && !/Domain=/i.test(write)
    )).toBe(true);
    expect(cookieWrites.every(write => !cookieSetsParentDomain(write))).toBe(true);

    if (cookieDesc) Object.defineProperty(document, 'cookie', cookieDesc);
    unmount();
  });

  it('Register a new house opens the naming flow without Advanced', async () => {
    const { container, unmount } = render(<App />);
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 80));
    });

    expect(container.querySelector('[data-testid="hub-home"]')).toBeTruthy();
    const register = container.querySelector('[data-testid="register-new-house"]') as HTMLButtonElement;
    expect(register).toBeTruthy();

    act(() => {
      register.click();
    });

    expect(container.querySelector('[data-testid="hub-wizard"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="hub-wizard"]')?.textContent).toContain(WHERE_IS_THE_EATERY);
    expect(container.querySelector('#place-name')).toBeTruthy();
    expect(container.querySelector('[data-testid="stay-with-this-house"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="hub-home"]')).toBeNull();
    unmount();
  });

  it('Open the house still needs email and house', async () => {
    const { container, unmount } = render(<App />);
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 80));
    });

    const open = container.querySelector('[data-testid="open-the-house"]') as HTMLAnchorElement;
    const href = open?.getAttribute('href') || '';
    const token = new URL(href, 'https://eatery.daup.co.za').searchParams.get('token') || '';
    const claims = readOwnerArrivalToken(token);
    expect(claims?.email).toBe('owner@theolive.co.za');
    expect(claims?.house).toBe('The Olive');
    expect(buildOpenTheHouseUrl({
      email: 'owner@theolive.co.za',
      house: '',
      origin: 'https://eatery.daup.co.za'
    })).toBe('');
    expect(buildOpenTheHouseUrl({
      email: '',
      house: 'The Olive',
      origin: 'https://eatery.daup.co.za'
    })).toBe('');
    unmount();
  });
});

function clickContinue(container: HTMLElement) {
  const next = Array.from(container.querySelectorAll('button')).find(button =>
    (button.textContent || '').includes('Continue')
  );
  act(() => {
    next?.click();
  });
}

describe('On the chain. from register and delete', () => {
  beforeEach(() => {
    resetIdentityVault();
    localStorage.clear();
    window.history.replaceState({}, '', '/');
    localStorage.setItem(OWNER_SESSION_STORAGE_KEY, JSON.stringify({
      email: 'owner@theolive.co.za',
      signedInAt: Date.now()
    }));
  });

  it('writes the wizard location onto the chain after See your apps', async () => {
    const { container, unmount } = render(<App />);
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 80));
    });

    expect(container.querySelector('[data-testid="hub-wizard"]')).toBeTruthy();
    typeInto(container.querySelector('#place-name') as HTMLInputElement, 'The Olive');
    typeInto(container.querySelector('#country') as HTMLInputElement, 'South Africa');
    typeInto(container.querySelector('#province') as HTMLInputElement, 'Western Cape');
    typeInto(container.querySelector('#city') as HTMLInputElement, 'Stellenbosch');
    clickContinue(container);

    typeInto(container.querySelector('#phone') as HTMLInputElement, '+27820000000');
    clickContinue(container);
    clickContinue(container);

    act(() => {
      (container.querySelector('[data-testid="see-your-apps"]') as HTMLButtonElement | null)?.click();
    });

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 80));
    });

    expect(container.querySelector('[data-testid="hub-home"]')).toBeTruthy();
    const row = container.querySelector('[data-testid="on-the-chain-place"]');
    expect(row?.getAttribute('data-place-name')).toBe('The Olive');
    expect(row?.textContent).toContain('The Olive');
    expect(row?.textContent).toContain('Stellenbosch, Western Cape, South Africa');
    expect(row?.textContent).toContain('Eatery');
    expect(container.querySelector('[data-testid="on-the-chain-empty"]')).toBeNull();
    expect(listRegisteredPlaces()).toEqual([{
      placeName: 'The Olive',
      app: 'eatery',
      country: 'South Africa',
      region: 'Western Cape',
      city: 'Stellenbosch'
    }]);
    expect(container.textContent).not.toMatch(/\b(peer|node|DID|DHT|wallet|MCP|npm)\b/i);
    unmount();
  });

  it('takes the place off the chain when Delete the house. confirms', async () => {
    saveIdentityVault(houseVault);
    registerPlaceOnPlatform({
      placeName: 'The Olive',
      app: 'eatery',
      country: 'South Africa',
      region: 'Western Cape',
      city: 'Stellenbosch'
    });

    const { container, unmount } = render(<App />);
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 80));
    });

    expect(container.querySelector('[data-testid="on-the-chain-place"]')?.textContent).toContain('The Olive');
    expect(listRegisteredPlaces()).toHaveLength(1);

    act(() => {
      (container.querySelector('[data-testid="delete-the-house"]') as HTMLButtonElement).click();
    });
    typeInto(container.querySelector('[data-testid="delete-house-name"]') as HTMLInputElement, 'The Olive');
    act(() => {
      (container.querySelector('[data-testid="delete-house-confirm"]') as HTMLButtonElement).click();
    });

    expect(listRegisteredPlaces()).toEqual([]);
    expect(container.querySelector('[data-testid="hub-wizard"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="on-the-chain"]')).toBeNull();
    unmount();
  });
});
