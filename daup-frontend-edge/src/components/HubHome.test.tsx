import { describe, expect, it, beforeEach } from 'vitest';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { SubscribedAppsView } from './SubscribedAppsView';
import { UserProfileProvider } from '../context/UserProfileContext';
import { saveIdentityVault, resetIdentityVault, UserIdentityVault } from '../stores/identityStore';
import { OWNER_SESSION_STORAGE_KEY } from '../hub/ownerSession';
import { OPEN_THE_HOUSE_LABEL, SAME_CHAIN_CAPTION } from '../hub/copy';
import { App } from '../App';
import { persistOwnerCookie, mintOwnerArrivalToken, readOwnerArrivalToken } from '../hub/ownerArrival';

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

describe('hub home after email', () => {
  beforeEach(() => {
    resetIdentityVault();
    localStorage.clear();
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
    expect(container.querySelector('[data-testid="same-chain-caption"]')?.textContent).toBe(SAME_CHAIN_CAPTION);
    expect(container.textContent).not.toContain('Decentralized Edge App Registry');
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
});
