import { beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { Simulate } from 'react-dom/test-utils';
import { SubscribedAppsView } from './SubscribedAppsView';
import { UserProfileProvider } from '../context/UserProfileContext';
import { loadIdentityVault, saveIdentityVault, resetIdentityVault, type UserIdentityVault } from '../stores/identityStore';
import { OWNER_SESSION_STORAGE_KEY } from '../hub/ownerSession';
import { PLACE_SESSION_STORAGE_KEY, clearPlaceSessionHold } from '../hub/house-session/hold';
import { hasBannedDoorCopy } from '../hub/copy';

const vault: UserIdentityVault = {
  version: 1,
  hasCompletedOnboarding: true,
  registeredAt: 1,
  updatedAt: 1,
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
    wallets: [],
    primaryWalletId: 'w-olive',
    isOnboarded: true,
    createdAt: 1,
    updatedAt: 1
  },
  registeredWallets: [{
    id: 'w-olive',
    type: 'bank',
    legalName: 'The Olive',
    bankName: '',
    accountNumber: '',
    routingCode: '',
    isPrimary: true,
    createdAt: 1
  }],
  activeWallet: {
    id: 'w-olive',
    type: 'bank',
    legalName: 'The Olive',
    bankName: '',
    accountNumber: '',
    routingCode: '',
    isPrimary: true,
    createdAt: 1
  },
  identityKeySeedNode: null,
  trialState: {
    hasStartedTrial: true,
    trialStartedAt: 1,
    trialExpiresAt: 2,
    isTrialActive: true,
    tier: 'Trial',
    isSubscribed: false
  },
  companyNode: {
    companyId: 'co_olive',
    enabledApps: ['eatery', 'finance', 'trade', 'chat'],
    billableLocations: 1
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

describe('House code door on Get apps', () => {
  beforeEach(() => {
    resetIdentityVault();
    localStorage.clear();
    clearPlaceSessionHold();
    localStorage.setItem(OWNER_SESSION_STORAGE_KEY, JSON.stringify({
      email: 'owner@theolive.co.za',
      signedInAt: 1
    }));
    saveIdentityVault(vault);
  });

  it('opens Finance with houseRedeem after the code, and leaves Chat without one', async () => {
    const redeem = 'hr_abcdefghijklmnopqrstuvwxyz012345';
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes('/house/otp/challenge')) {
        return new Response(JSON.stringify({ ok: true, challengeId: 'ch_ui', expiresAt: 1 }), { status: 200 });
      }
      if (url.endsWith('/house/session')) {
        return new Response(JSON.stringify({ ok: true, placeSession: 'sess-ui' }), { status: 200 });
      }
      if (url.includes('/house/session/redeem/issue')) {
        expect(init?.credentials).toBe('include');
        return new Response(JSON.stringify({ ok: true, houseRedeem: redeem }), { status: 200 });
      }
      throw new TypeError('Failed to fetch');
    });
    vi.stubGlobal('fetch', fetchMock);

    const assign = vi.fn();
    const location = window.location;
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...location, assign }
    });

    const { container, unmount } = render(
      <UserProfileProvider>
        <SubscribedAppsView pane="apps" />
      </UserProfileProvider>
    );
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 30));
    });

    const finance = container.querySelector('[data-testid="open-app-finance"]') as HTMLAnchorElement | null;
    const chat = container.querySelector('[data-testid="open-app-chat"]') as HTMLAnchorElement | null;
    const trade = container.querySelector('[data-testid="open-app-trade"]') as HTMLAnchorElement | null;
    expect(finance?.textContent).toBe('Open.');
    expect(finance?.getAttribute('href')).toBe('https://finance.daup.co.za');
    expect(trade?.getAttribute('href')).toBe('https://trade.daup.co.za');
    expect(chat?.getAttribute('href')).toBe('https://chat.daup.co.za');
    expect(chat?.getAttribute('href') || '').not.toMatch(/houseRedeem|token=/);

    await act(async () => {
      finance?.click();
    });
    expect(container.querySelector('[data-testid="house-otp-door"]')).toBeTruthy();
    const doorText = container.querySelector('[data-testid="house-otp-door"]')?.textContent || '';
    expect(hasBannedDoorCopy(doorText)).toBe(false);
    expect(doorText).not.toMatch(/\b(peer|node|DID|DHT|wallet|MCP|npm|hydrate|neon)\b/i);
    expect((container.querySelector('[data-testid="house-whatsapp"]') as HTMLInputElement).value).toBe('+27820000000');

    await act(async () => {
      (container.querySelector('[data-testid="house-otp-form"]') as HTMLFormElement).requestSubmit();
    });
    expect(container.querySelector('[data-testid="house-code"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="house-otp-mock"]')).toBeNull();

    const code = container.querySelector('[data-testid="house-code"]') as HTMLInputElement;
    await act(async () => {
      code.focus();
      code.value = '424242';
      Simulate.change(code);
    });
    await act(async () => {
      (container.querySelector('[data-testid="house-otp-form"]') as HTMLFormElement).requestSubmit();
    });

    expect(assign).toHaveBeenCalled();
    const href = String(assign.mock.calls.at(-1)?.[0] || '');
    const parsed = new URL(href);
    expect(parsed.origin).toBe('https://finance.daup.co.za');
    expect(parsed.searchParams.get('houseRedeem')).toBe(redeem);
    expect(parsed.searchParams.get('emailHint')).toBe('owner@theolive.co.za');
    expect(parsed.searchParams.get('houseHint')).toBe('The Olive');
    expect(parsed.searchParams.has('token')).toBe(false);
    expect(href).not.toContain('sess-ui');
    expect(chat?.getAttribute('href')).toBe('https://chat.daup.co.za');
    expect(loadIdentityVault().profile.demographics.whatsappNumber).toBe('+27820000000');

    unmount();
    Object.defineProperty(window, 'location', { configurable: true, value: location });
  });

  it('shows mockCode after Send code, then opens Vault once that code is used', async () => {
    const placeId = '80a48803-e2fb-492c-8fe3-431e22a1e2cb';
    const redeem = 'hr_abcdefghijklmnopqrstuvwxyz012345';
    saveIdentityVault({
      ...vault,
      activeWallet: { ...vault.activeWallet, id: `wallet_place_${placeId}` },
      registeredWallets: vault.registeredWallets.map(wallet => ({ ...wallet, id: `wallet_place_${placeId}` })),
      profile: {
        ...vault.profile,
        demographics: {
          ...vault.profile.demographics,
          contactNumber: '0829261373',
          whatsappNumber: '0829261373'
        }
      },
      companyNode: {
        companyId: 'co_olive',
        enabledApps: ['eatery', 'vault'],
        billableLocations: 1
      }
    });

    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const body = JSON.parse(String(init?.body || '{}')) as Record<string, unknown>;
      if (url.includes('/house/otp/challenge')) {
        expect(body).toEqual({ placeId, phone: '+27829261373' });
        return new Response(JSON.stringify({
          ok: true,
          challengeId: 'ch_vault',
          expiresAt: 1,
          mockCode: '482913'
        }), { status: 200 });
      }
      if (url.endsWith('/house/session')) {
        expect(body).toEqual({
          placeId,
          phone: '+27829261373',
          challengeId: 'ch_vault',
          code: '482913'
        });
        return new Response(JSON.stringify({
          ok: true,
          message: 'Place session ready',
          placeSession: 'sess-vault'
        }), { status: 200 });
      }
      if (url.includes('/house/session/redeem/issue')) {
        expect(init?.credentials).toBe('include');
        expect(init?.headers).toMatchObject({ authorization: 'Bearer sess-vault' });
        expect(body).toEqual({});
        return new Response(JSON.stringify({ ok: true, houseRedeem: redeem }), { status: 200 });
      }
      throw new TypeError('Failed to fetch');
    });
    vi.stubGlobal('fetch', fetchMock);

    const assign = vi.fn();
    const location = window.location;
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...location, assign }
    });

    const { container, unmount } = render(
      <UserProfileProvider>
        <SubscribedAppsView pane="apps" />
      </UserProfileProvider>
    );
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 30));
    });

    const vaultOpen = container.querySelector('[data-testid="open-app-vault"]') as HTMLAnchorElement | null;
    expect(vaultOpen?.textContent).toBe('Open.');
    await act(async () => {
      vaultOpen?.click();
    });
    expect(container.querySelector('[data-testid="house-otp-mock"]')).toBeNull();

    await act(async () => {
      (container.querySelector('[data-testid="house-otp-form"]') as HTMLFormElement).requestSubmit();
    });

    const popup = container.querySelector('[data-testid="house-otp-mock"]');
    expect(popup).toBeTruthy();
    expect(popup?.textContent).toContain('482913');
    expect(hasBannedDoorCopy(popup?.textContent || '')).toBe(false);
    expect((container.querySelector('[data-testid="house-code"]') as HTMLInputElement).value).toBe('');

    await act(async () => {
      (container.querySelector('[data-testid="house-otp-mock-fill"]') as HTMLButtonElement).click();
    });
    expect(container.querySelector('[data-testid="house-otp-mock"]')).toBeNull();
    expect((container.querySelector('[data-testid="house-code"]') as HTMLInputElement).value).toBe('482913');

    await act(async () => {
      (container.querySelector('[data-testid="house-otp-form"]') as HTMLFormElement).requestSubmit();
    });

    expect(assign).toHaveBeenCalled();
    const href = String(assign.mock.calls.at(-1)?.[0] || '');
    const parsed = new URL(href);
    expect(parsed.origin).toBe('https://vault.daup.co.za');
    expect(parsed.searchParams.get('houseRedeem')).toBe(redeem);
    expect(parsed.searchParams.has('token')).toBe(false);
    expect(href).not.toContain('sess-vault');

    unmount();
    Object.defineProperty(window, 'location', { configurable: true, value: location });
  });

  it('shows the mock popup for every house Open after a mint in the same tab', async () => {
    const redeem = 'hr_abcdefghijklmnopqrstuvwxyz012345';
    saveIdentityVault({
      ...vault,
      companyNode: {
        companyId: 'co_olive',
        enabledApps: ['eatery', 'project', 'finance', 'trade', 'vault', 'property'],
        billableLocations: 1
      }
    });

    let n = 0;
    let mockCode = '';
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const body = JSON.parse(String(init?.body || '{}')) as Record<string, unknown>;
      if (url.includes('/house/otp/challenge')) {
        expect(body).toEqual({ placeId: 'co_olive', phone: '+27820000000' });
        n += 1;
        mockCode = `61000${n}`;
        return new Response(JSON.stringify({
          ok: true,
          challengeId: `ch_${n}`,
          expiresAt: 1,
          mockCode
        }), { status: 200 });
      }
      if (url.endsWith('/house/session')) {
        expect(body).toMatchObject({
          placeId: 'co_olive',
          phone: '+27820000000',
          code: mockCode
        });
        return new Response(JSON.stringify({
          ok: true,
          message: 'Place session ready',
          placeSession: `sess-${body.challengeId}`
        }), { status: 200 });
      }
      if (url.includes('/house/session/redeem/issue')) {
        expect(init?.credentials).toBe('include');
        const authorization = (init?.headers as { authorization?: string } | undefined)?.authorization || '';
        expect(authorization).toMatch(/^Bearer sess-ch_/);
        expect(body).toEqual({});
        return new Response(JSON.stringify({ ok: true, houseRedeem: redeem }), { status: 200 });
      }
      throw new TypeError('Failed to fetch');
    });
    vi.stubGlobal('fetch', fetchMock);

    const assign = vi.fn();
    const location = window.location;
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...location, assign }
    });

    const { container, unmount } = render(
      <UserProfileProvider>
        <SubscribedAppsView pane="apps" />
      </UserProfileProvider>
    );
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 30));
    });

    const openApp = async (id: string, title: string, origin: string, phoneFirst = false) => {
      const control = container.querySelector(`[data-testid="open-app-${id}"]`) as HTMLAnchorElement | null;
      expect(control?.textContent).toBe('Open.');
      const assignsBefore = assign.mock.calls.length;
      await act(async () => {
        control?.click();
      });
      expect(assign.mock.calls.length).toBe(assignsBefore);
      if (phoneFirst) {
        expect(container.querySelector('[data-testid="house-otp-mock"]')).toBeNull();
        expect(container.querySelector('[data-testid="house-otp-target"]')?.textContent).toContain(title);
        expect(container.querySelector('[data-testid="house-whatsapp"]')).toBeTruthy();
        await act(async () => {
          (container.querySelector('[data-testid="house-otp-form"]') as HTMLFormElement).requestSubmit();
        });
      }

      const popup = container.querySelector('[data-testid="house-otp-mock"]');
      expect(popup).toBeTruthy();
      expect(container.querySelector('[data-testid="house-otp-mock-code"]')?.textContent).toBe(mockCode);
      expect(hasBannedDoorCopy(popup?.textContent || '')).toBe(false);
      expect((container.querySelector('[data-testid="house-code"]') as HTMLInputElement).value).toBe('');

      await act(async () => {
        (container.querySelector('[data-testid="house-otp-mock-fill"]') as HTMLButtonElement).click();
      });
      expect(container.querySelector('[data-testid="house-otp-mock"]')).toBeNull();
      expect((container.querySelector('[data-testid="house-code"]') as HTMLInputElement).value).toBe(mockCode);

      await act(async () => {
        (container.querySelector('[data-testid="house-otp-form"]') as HTMLFormElement).requestSubmit();
      });

      const href = String(assign.mock.calls.at(-1)?.[0] || '');
      const parsed = new URL(href);
      expect(parsed.origin).toBe(origin);
      expect(parsed.searchParams.get('houseRedeem')).toBe(redeem);
      expect(parsed.searchParams.has('token')).toBe(false);
      expect(href).not.toMatch(/sess-/);
      if (id === 'project' || id === 'eatery') expect(parsed.pathname).toBe('/d/hub');
      else expect(parsed.pathname).toBe('/');
    };

    await openApp('vault', 'Vault', 'https://vault.daup.co.za', true);
    await openApp('project', 'Project', 'https://project.daup.co.za');
    await openApp('finance', 'Finance', 'https://finance.daup.co.za');
    await openApp('trade', 'Trade', 'https://trade.daup.co.za');
    await openApp('property', 'Property', 'https://property.daup.co.za');
    await openApp('vault', 'Vault', 'https://vault.daup.co.za');
    await openApp('eatery', 'Eatery', 'https://eatery.daup.co.za');
    expect(n).toBe(7);

    unmount();
    Object.defineProperty(window, 'location', { configurable: true, value: location });
    vi.unstubAllGlobals();
  });

  it('shows the Hub mock popup for every house Open after refresh while a mock-mode hold exists', async () => {
    const redeem = 'hr_abcdefghijklmnopqrstuvwxyz012345';
    saveIdentityVault({
      ...vault,
      companyNode: {
        companyId: 'co_olive',
        enabledApps: ['eatery', 'project', 'finance', 'trade', 'vault', 'property'],
        billableLocations: 1
      }
    });
    // Shape written by the previous Hub: mock flag and bearer, no remembered phone.
    sessionStorage.setItem(PLACE_SESSION_STORAGE_KEY, JSON.stringify({
      v: 2,
      holds: {
        co_olive: {
          placeId: 'co_olive',
          bearer: 'sess-already',
          expiresAt: Date.now() + 60_000
        }
      },
      otpMock: { co_olive: true }
    }));

    let n = 0;
    let mockCode = '';
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const body = JSON.parse(String(init?.body || '{}')) as Record<string, unknown>;
      if (url.includes('/house/otp/challenge')) {
        expect(body).toEqual({ placeId: 'co_olive', phone: '+27820000000' });
        n += 1;
        mockCode = `71000${n}`;
        return new Response(JSON.stringify({
          ok: true,
          challengeId: `ch_${n}`,
          expiresAt: 1,
          mockCode
        }), { status: 200 });
      }
      if (url.endsWith('/house/session')) {
        return new Response(JSON.stringify({
          ok: true,
          placeSession: `sess-${body.challengeId}`
        }), { status: 200 });
      }
      if (url.includes('/house/session/redeem/issue')) {
        const authorization = (init?.headers as { authorization?: string } | undefined)?.authorization || '';
        expect(authorization).toBe(`Bearer sess-ch_${n}`);
        return new Response(JSON.stringify({ ok: true, houseRedeem: redeem }), { status: 200 });
      }
      throw new TypeError('Failed to fetch');
    });
    vi.stubGlobal('fetch', fetchMock);

    const assign = vi.fn();
    const location = window.location;
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...location, assign }
    });

    const { container, unmount } = render(
      <UserProfileProvider>
        <SubscribedAppsView pane="apps" />
      </UserProfileProvider>
    );
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 30));
    });

    const openApp = async (id: string, title: string, origin: string) => {
      const control = container.querySelector(`[data-testid="open-app-${id}"]`) as HTMLAnchorElement | null;
      expect(control?.textContent).toBe('Open.');
      const assignsBefore = assign.mock.calls.length;
      await act(async () => {
        control?.click();
      });
      expect(assign.mock.calls.length).toBe(assignsBefore);
      expect(container.querySelector('[data-testid="house-whatsapp"]')).toBeNull();
      const popup = container.querySelector('[data-testid="house-otp-mock"]');
      expect(popup).toBeTruthy();
      expect(container.querySelector('[data-testid="house-otp-target"]')?.textContent).toContain(title);
      expect(container.querySelector('[data-testid="house-otp-mock-code"]')?.textContent).toBe(mockCode);
      expect(hasBannedDoorCopy(popup?.textContent || '')).toBe(false);

      await act(async () => {
        (container.querySelector('[data-testid="house-otp-mock-fill"]') as HTMLButtonElement).click();
      });
      await act(async () => {
        (container.querySelector('[data-testid="house-otp-form"]') as HTMLFormElement).requestSubmit();
      });

      const href = String(assign.mock.calls.at(-1)?.[0] || '');
      const parsed = new URL(href);
      expect(parsed.origin).toBe(origin);
      expect(parsed.searchParams.get('houseRedeem')).toBe(redeem);
      expect(href).not.toContain('sess-already');
      expect(href).not.toMatch(/sess-ch_/);
      if (id === 'project' || id === 'eatery') expect(parsed.pathname).toBe('/d/hub');
      else expect(parsed.pathname).toBe('/');
    };

    await openApp('finance', 'Finance', 'https://finance.daup.co.za');
    await openApp('trade', 'Trade', 'https://trade.daup.co.za');
    await openApp('project', 'Project', 'https://project.daup.co.za');
    await openApp('property', 'Property', 'https://property.daup.co.za');
    await openApp('vault', 'Vault', 'https://vault.daup.co.za');
    await openApp('eatery', 'Eatery', 'https://eatery.daup.co.za');
    expect(n).toBe(6);

    unmount();
    Object.defineProperty(window, 'location', { configurable: true, value: location });
    vi.unstubAllGlobals();
  });
});
