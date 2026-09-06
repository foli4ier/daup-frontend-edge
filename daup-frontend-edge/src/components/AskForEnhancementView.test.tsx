import { describe, expect, it, beforeEach } from 'vitest';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { Simulate } from 'react-dom/test-utils';
import { AskForEnhancementView } from './AskForEnhancementView';
import { UserProfileProvider } from '../context/UserProfileContext';
import {
  saveIdentityVault,
  resetIdentityVault,
  UserIdentityVault
} from '../stores/identityStore';
import { OWNER_SESSION_STORAGE_KEY } from '../hub/ownerSession';
import { ASK_STORAGE_KEY, clearAskRequests, raiseAskRequest } from '../hub/askStore';
import {
  ASK_BODY_LABEL,
  ASK_EMPTY,
  ASK_FOR_ENHANCEMENT_LABEL,
  ASK_KIND_HELP,
  ASK_KIND_WRONG,
  ASK_PICK_AN_APP,
  ASK_SEND_LABEL,
  ASK_WHICH_APP_LABEL,
  BANNED_DOOR_WORDS
} from '../hub/copy';

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

function typeInto(input: HTMLInputElement | HTMLTextAreaElement, value: string) {
  act(() => {
    input.focus();
    input.value = value;
    Simulate.change(input);
  });
}

function click(el: Element | null) {
  act(() => {
    (el as HTMLButtonElement | null)?.click();
  });
}

describe('Ask for an enhancement. page', () => {
  beforeEach(() => {
    resetIdentityVault();
    localStorage.clear();
    clearAskRequests();
    saveIdentityVault(houseVault);
    localStorage.setItem(OWNER_SESSION_STORAGE_KEY, JSON.stringify({
      email: 'owner@theolive.co.za',
      signedInAt: Date.now()
    }));
  });

  it('shows the empty cream page and refuses submit without Which app?', async () => {
    const { container, unmount } = render(
      <UserProfileProvider>
        <AskForEnhancementView onBack={() => {}} />
      </UserProfileProvider>
    );

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 40));
    });

    expect(container.querySelector('[data-testid="ask-page"]')).toBeTruthy();
    expect(container.textContent).toContain(ASK_FOR_ENHANCEMENT_LABEL);
    expect(container.querySelector('[data-testid="ask-which-app"] legend')?.textContent).toBe(ASK_WHICH_APP_LABEL);
    expect(container.querySelector('[data-testid="ask-empty"]')?.textContent).toBe(ASK_EMPTY);
    expect(container.querySelector('label[for="ask-body"]')?.textContent).toBe(ASK_BODY_LABEL);
    expect(container.querySelector('[data-testid="ask-send"]')?.textContent).toBe(ASK_SEND_LABEL);
    expect(container.textContent).toContain(ASK_KIND_WRONG);
    expect(container.textContent).toContain(ASK_KIND_HELP);
    expect(container.textContent).not.toMatch(/\b(Defect|Support|gossipsub|crdt|mesh|neon|hydrate)\b/i);
    for (const word of BANNED_DOOR_WORDS) {
      expect(new RegExp(`\\b${word}\\b`, 'i').test(container.textContent || ''), `banned "${word}"`).toBe(false);
    }

    typeInto(container.querySelector('[data-testid="ask-body"]') as HTMLTextAreaElement, 'Bigger Friday book');

    act(() => {
      Simulate.submit(container.querySelector('[data-testid="ask-raise-form"]') as HTMLFormElement);
    });

    expect(container.querySelector('[data-testid="ask-app-error"]')?.textContent).toBe(ASK_PICK_AN_APP);
    expect(container.querySelector('[data-testid="ask-request"]')).toBeNull();
    expect(localStorage.getItem(ASK_STORAGE_KEY)).toBeNull();
    unmount();
  });

  it('raises a request tagged to an app and filters the list', async () => {
    raiseAskRequest({
      app: 'farm',
      kind: 'Need help',
      title: 'Field list on the phone',
      now: 1
    });

    const { container, unmount } = render(
      <UserProfileProvider>
        <AskForEnhancementView onBack={() => {}} />
      </UserProfileProvider>
    );

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 40));
    });

    click(container.querySelector('[data-testid="ask-app-eatery"]'));
    typeInto(container.querySelector('[data-testid="ask-body"]') as HTMLTextAreaElement, 'Ticket printer stays quiet');

    act(() => {
      Simulate.submit(container.querySelector('[data-testid="ask-raise-form"]') as HTMLFormElement);
    });

    const rows = Array.from(container.querySelectorAll('[data-testid="ask-request"]'));
    expect(rows).toHaveLength(2);
    expect(rows[0].getAttribute('data-app')).toBe('eatery');
    expect(rows.some(row => row.getAttribute('data-app') === 'farm')).toBe(true);
    expect(container.textContent).not.toContain('Defect');
    expect(container.textContent).not.toContain('Support');

    click(container.querySelector('[data-testid="ask-filter-eatery"]'));
    const filtered = Array.from(container.querySelectorAll('[data-testid="ask-request"]'));
    expect(filtered).toHaveLength(1);
    expect(filtered[0].getAttribute('data-app')).toBe('eatery');
    expect(filtered[0].textContent).toContain('Eatery');
    expect(filtered[0].textContent).toContain('Ticket printer stays quiet');
    expect(container.querySelector('[data-testid="ask-empty"]')).toBeNull();
    unmount();
  });
});
