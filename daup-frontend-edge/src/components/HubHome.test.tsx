import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { Simulate } from 'react-dom/test-utils';
import { SubscribedAppsView } from './SubscribedAppsView';
import { GetAppsSection } from './GetApps';
import { UserProfileProvider } from '../context/UserProfileContext';
import {
  saveIdentityVault,
  resetIdentityVault,
  UserIdentityVault,
  registerPlaceOnPlatform,
  listRegisteredPlaces,
  loadIdentityVault,
  VAULT_STORAGE_KEY,
  PLATFORM_ENTITIES_KEY
} from '../stores/identityStore';
import { OWNER_SESSION_STORAGE_KEY } from '../hub/ownerSession';
import { HUB_INSTALLED_APPS_KEY } from '../hub/hubStorage';
import { HOUSE_MCP_TOOLS } from '../hub/houseMcp';
import { bindCompanyId } from '../hub/companyNode';
import { PLACE_TRIAL_STARTED, TRIAL_MS, loadPlaceEntitlement, loadTrialEvent, saveNodeEntitlement } from '../hub/entitlements';
import {
  ADD_APPS_LABEL,
  ASK_FOR_ENHANCEMENT_LABEL,
  APPS_SHELF_LINE,
  APPS_SHELF_TITLE,
  DELETE_THE_HOUSE_LABEL,
  GET_APPS_KICKER,
  GET_LABEL,
  HUB_DOOR_BODY,
  NAV_OTHER_PLACES_LABEL,
  NAV_PLACES_LABEL,
  OPEN_LABEL,
  PLUS_REGISTER_LABEL,
  REGISTER_A_NEW_HOUSE_LABEL,
  RESERVE_A_TABLE_LABEL,
  SAME_CHAIN_CAPTION,
  SEE_THE_MENU_LABEL,
  SOON_LABEL,
  YOUR_PLACES_EMPTY,
  YOUR_PLACES_KICKER,
  WHERE_IS_THE_EATERY,
  PLACE_PAYMENT_DUE,
  PLACE_PAUSED,
  HOUSE_OTP_BAD_PHONE,
  COMING_DOT_LABEL,
  SAMPLE_SOURCE_LABEL,
  subscribedCountLabel
} from '../hub/copy';
import { App } from '../App';
import { HANDOFF_EMAIL_HINT, HANDOFF_HOUSE_HINT, buildOpenTheHouseUrl, cookieSetsParentDomain, expireOwnerCookie, handoffPresentsCredential } from '../hub/ownerArrival';
import { loadSeednodeForPlace } from '../hub/seednode';
import { readPlaceSession, rememberPlaceSession } from '../hub/house-session';

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

function clickTestId(container: HTMLElement, testId: string) {
  act(() => {
    (container.querySelector(`[data-testid="${testId}"]`) as HTMLButtonElement | HTMLAnchorElement | null)?.click();
  });
}

function openYou(container: HTMLElement) {
  clickTestId(container, 'hub-nav-you');
}

function openPlaces(container: HTMLElement) {
  clickTestId(container, 'hub-nav-places');
}

function openApps(container: HTMLElement) {
  clickTestId(container, 'hub-nav-apps');
}

function openOther(container: HTMLElement) {
  clickTestId(container, 'hub-nav-other');
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

  it('lands on My places: context, owned list, no On the chain, then thumb nav', async () => {
    const { container, unmount } = render(<App />);
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 80));
    });

    const context = container.querySelector('[data-testid="hub-context"]');
    const places = container.querySelector('[data-testid="hub-home"]');
    const thumb = container.querySelector('[data-testid="hub-thumb-nav"]');
    expect(context?.textContent).toContain('The Olive');
    expect(context?.textContent).toContain('Stellenbosch');
    expect(context?.textContent).toContain('owner@theolive.co.za');
    expect(places?.getAttribute('data-pane')).toBe('places');
    expect(places?.querySelector('[data-testid="hub-home-cta"]')).toBeNull();
    expect(places?.querySelector('[data-testid="hub-home-open"]')).toBeNull();
    expect(places?.querySelector('[data-testid="eatery-place-name"]')?.textContent).toContain('The Olive');
    expect(places?.querySelector('[data-testid="eatery-place-city"]')?.textContent).toBe('Stellenbosch');
    expect(places?.querySelector('[data-testid="open-the-house"]')?.textContent).toBe(OPEN_LABEL);
    expect(places?.querySelector('[data-testid="open-the-house"]')?.className).toContain('btn-primary');
    expect(places?.textContent).toContain(YOUR_PLACES_KICKER);
    expect(places?.textContent).not.toContain(REGISTER_A_NEW_HOUSE_LABEL);
    expect(places?.querySelector('[data-testid="get-apps"]')).toBeNull();
    expect(places?.textContent).not.toContain('On the chain.');
    expect(places?.querySelector('[data-testid="on-the-chain"]')).toBeNull();
    expect(places?.querySelector('[data-testid="other-places"]')).toBeNull();
    expect(thumb?.textContent).not.toContain('Home');
    expect(thumb?.querySelector('[data-testid="hub-nav-home"]')).toBeNull();
    const tabIds = Array.from(thumb?.querySelectorAll('[data-testid^="hub-nav-"]') || [])
      .map(tab => tab.getAttribute('data-testid'));
    expect(tabIds).toEqual(['hub-nav-places', 'hub-nav-apps', 'hub-nav-you', 'hub-nav-other']);
    expect(thumb?.textContent).toContain(NAV_PLACES_LABEL);
    expect(thumb?.textContent).toContain('Apps');
    expect(thumb?.textContent).toContain('You');
    expect(thumb?.textContent).toContain(NAV_OTHER_PLACES_LABEL);

    expect(context && places && context.compareDocumentPosition(places) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(places && thumb && places.compareDocumentPosition(thumb) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    expect(container.querySelector('[data-testid="owner-advanced-nav"]')).toBeNull();
    expect(container.querySelector('.protocol-console')).toBeNull();
    expect(container.textContent).not.toContain('Advanced');
    expect(container.textContent).not.toMatch(/\b(peer|node|DID|DHT|wallet|MCP|npm|hydrate|neon)\b/i);

    openApps(container);
    const apps = container.querySelector('[data-testid="hub-home"]');
    expect(apps?.getAttribute('data-pane')).toBe('apps');
    expect(apps?.textContent).toContain(APPS_SHELF_TITLE);
    expect(apps?.textContent).toContain(APPS_SHELF_LINE);
    expect(apps?.querySelector('[data-testid="open-app-eatery"]')?.className).toContain('shelf-tile');
    expect(apps?.querySelector('[data-testid="apps-social"]')).toBeNull();
    expect(apps?.querySelector('[data-testid="apps-paid"]')).toBeNull();
    expect(apps?.querySelector('[data-testid="eatery-place-row"]')).toBeNull();
    expect(apps?.querySelector('[data-testid="on-the-chain"]')).toBeNull();
    expect(apps?.querySelector('[data-testid="other-places"]')).toBeNull();

    openYou(container);
    const you = container.querySelector('[data-testid="hub-you"]');
    expect(you?.querySelector('[data-testid="hub-you-name"]')?.textContent).toBe('Add your name.');
    expect(you?.querySelector('[data-testid="hub-you-edit"]')?.textContent).toBe('Edit.');
    expect(you?.querySelector('[data-testid="hub-you-email"]')?.textContent).toBe('owner@theolive.co.za');
    expect(you?.querySelector('[data-testid="hub-you-whatsapp"]')?.textContent).toBe('Add your WhatsApp.');
    expect(you?.querySelector('[data-testid="hub-you-language"]')?.textContent).toBe('English');
    expect(you?.querySelector('[data-testid="hub-you-birthdate"]')?.textContent).toBe('Add your date of birth.');
    expect(you?.querySelector('[data-testid="hub-you-address"]')?.textContent).toBe('12 Church Street');
    expect(you?.querySelector('[data-testid="hub-settings"]')).toBeNull();
    expect(you?.querySelector('[data-testid="hub-you-money"]')).toBeNull();
    expect(you?.querySelector('[data-testid="hub-you-date"]')).toBeNull();
    expect(you?.textContent).not.toContain('Ask for an enhancement.');
    expect(you?.textContent).not.toContain('Settings.');
    expect(you?.textContent).not.toContain(DELETE_THE_HOUSE_LABEL);
    expect(you?.textContent).not.toContain(REGISTER_A_NEW_HOUSE_LABEL);
    expect(you?.textContent).not.toContain('Prices in R.');
    expect(you?.textContent).not.toContain('The Olive');
    expect(you?.textContent).not.toContain('Delete account');
    expect(you?.textContent).not.toContain('Theme');
    expect(you?.textContent).not.toContain('Notifications');
    expect(container.querySelector('[data-testid="hub-log-off"]')?.textContent).toBe('Log off.');
    expect(container.querySelector('[data-testid="hub-log-off"]')?.className).toContain('owner-quiet');
    expect(container.querySelector('[data-testid="hub-you-profile"]')).toBeNull();
    expect(container.textContent).not.toContain('Profile');
    expect(container.textContent).not.toContain('Account');
    expect(container.textContent).not.toContain('Admin');
    const lines = you?.querySelector('[data-testid="hub-you-address-line"]') as HTMLElement;
    const logOff = container.querySelector('[data-testid="hub-log-off"]') as HTMLElement;
    const advanced = container.querySelector('[data-testid="hub-advanced"]') as HTMLElement;
    expect(lines && lines.compareDocumentPosition(logOff) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(logOff.compareDocumentPosition(advanced) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(advanced?.getAttribute('aria-pressed')).not.toBe('true');

    openOther(container);
    const otherPane = container.querySelector('[data-testid="hub-home"]');
    expect(otherPane?.getAttribute('data-pane')).toBe('other');
    expect(otherPane?.querySelector('[data-testid="other-places"]')).toBeTruthy();
    expect(otherPane?.querySelector('[data-testid="other-app-eatery"]')?.textContent).toContain('Eatery');
    expect(otherPane?.querySelector('[data-testid="other-app-count-eatery"]')?.textContent).toBe(subscribedCountLabel(4));
    expect(otherPane?.querySelector('[data-testid="other-app-source-eatery"]')?.textContent).toBe(SAMPLE_SOURCE_LABEL);
    expect(otherPane?.querySelector('[data-testid="other-app-project"]')?.textContent).toContain(COMING_DOT_LABEL);
    expect(otherPane?.textContent).not.toContain('On the chain.');
    expect(otherPane?.textContent).not.toMatch(/\b(peer|node|DID|DHT|wallet|MCP|npm|hydrate|neon)\b/i);
    unmount();
  });

  it('keeps register and delete on My places, and Ask on the Apps tab', async () => {
    const { container, unmount } = render(<App />);
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 80));
    });

    const places = container.querySelector('[data-testid="hub-home"]');
    expect(places?.getAttribute('data-pane')).toBe('places');
    expect(places?.querySelector('[data-testid="register-another-place"]')?.textContent).toBe(PLUS_REGISTER_LABEL);
    expect(places?.querySelector('[data-testid="delete-the-house"]')?.textContent).toBe(DELETE_THE_HOUSE_LABEL);
    expect(places?.textContent).not.toContain(ASK_FOR_ENHANCEMENT_LABEL);
    expect(places?.textContent).not.toContain('Settings.');
    expect(places?.querySelector('[data-testid="eatery-place-name"]')?.textContent).toContain('The Olive');

    openApps(container);
    const apps = container.querySelector('[data-testid="hub-home"]');
    expect(apps?.getAttribute('data-pane')).toBe('apps');
    expect(apps?.querySelector('[data-testid="apps-tab-shelf"]')?.textContent).toBe(APPS_SHELF_TITLE);
    expect(apps?.querySelector('[data-testid="apps-tab-ask"]')?.textContent).toBe(ASK_FOR_ENHANCEMENT_LABEL);
    expect(apps?.querySelector('[data-testid="get-apps"]')).toBeTruthy();
    expect(apps?.querySelector('[data-testid="delete-the-house"]')).toBeNull();
    expect(apps?.querySelector('[data-testid="register-new-house"]')).toBeNull();
    expect(apps?.textContent).not.toContain(DELETE_THE_HOUSE_LABEL);

    openOther(container);
    const other = container.querySelector('[data-testid="hub-home"]');
    expect(other?.getAttribute('data-pane')).toBe('other');
    expect(other?.querySelector('[data-testid="delete-the-house"]')).toBeNull();
    expect(other?.querySelector('[data-testid="apps-tab-ask"]')).toBeNull();
    expect(other?.textContent).not.toContain(ASK_FOR_ENHANCEMENT_LABEL);
    expect(other?.textContent).not.toContain(DELETE_THE_HOUSE_LABEL);

    openYou(container);
    const you = container.querySelector('[data-testid="hub-you"]');
    expect(you).toBeTruthy();
    expect(container.querySelector('[data-testid="hub-advanced"]')?.getAttribute('aria-pressed')).not.toBe('true');
    expect(you?.querySelector('[data-testid="hub-settings"]')).toBeNull();
    expect(you?.querySelector('[data-testid="delete-the-house"]')).toBeNull();
    expect(you?.querySelector('[data-testid="apps-tab-ask"]')).toBeNull();
    expect(you?.textContent).not.toContain(ASK_FOR_ENHANCEMENT_LABEL);
    expect(you?.textContent).not.toContain(DELETE_THE_HOUSE_LABEL);
    expect(you?.textContent).not.toMatch(/\b(peer|DID|MCP|node|co_)\b/i);
    unmount();
  });

  it('You. uses kitchen English when payment is due or the place is paused', async () => {
    const day = 24 * 60 * 60 * 1000;
    saveIdentityVault({
      ...houseVault,
      companyNode: {
        companyId: 'co_olive',
        enabledApps: ['eatery'],
        billableLocations: 1
      },
      trialState: {
        ...houseVault.trialState,
        isTrialActive: false
      }
    });
    saveNodeEntitlement({
      companyId: 'co_olive',
      node_subscription_status: 'past_due',
      trial_started_at: Date.now() - 40 * day,
      trial_ends_at: Date.now() - 2 * day,
      enabled_apps: ['eatery'],
      billable_locations: 1,
      payment_method_ok: false
    });

    const { container, unmount } = render(<App />);
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 80));
    });
    expect(container.querySelector('[data-testid="eatery-place-name"]')?.textContent).toContain('The Olive');
    expect(container.querySelector('[data-testid="eatery-place-status"]')?.textContent).toBe('Payment due.');
    openYou(container);
    const you = container.querySelector('[data-testid="hub-you"]');
    expect(you?.querySelector('[data-testid="hub-you-place-status"]')).toBeNull();
    expect(you?.querySelector('[data-testid="hub-you-date"]')).toBeNull();
    expect(you?.textContent).not.toContain(PLACE_PAYMENT_DUE);
    expect(you?.textContent).not.toContain('Prices in R.');
    expect(container.textContent).not.toMatch(/\b(peer|node|DID|DHT|wallet|MCP|npm|hydrate|neon)\b/i);
    expect(container.textContent).not.toContain('co_');
    unmount();

    saveNodeEntitlement({
      companyId: 'co_olive',
      node_subscription_status: 'suspended',
      trial_started_at: Date.now() - 50 * day,
      trial_ends_at: Date.now() - 10 * day,
      enabled_apps: ['eatery'],
      billable_locations: 1,
      payment_method_ok: false
    });
    const second = render(<App />);
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 80));
    });
    expect(second.container.querySelector('[data-testid="eatery-place-status"]')?.textContent).toBe('Payment due.');
    openYou(second.container);
    expect(second.container.querySelector('[data-testid="hub-you"]')?.textContent).not.toContain(PLACE_PAUSED);
    expect(second.container.textContent).not.toMatch(/\b(peer|node|DID|DHT|wallet|MCP|npm|hydrate|neon)\b/i);
    expect(second.container.textContent).not.toContain('co_');
    second.unmount();
  });

  it('edits You on one page and confirms email or WhatsApp before it sticks', async () => {
    const { container, unmount } = render(<App />);
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 80));
    });
    openYou(container);

    const email = container.querySelector('[data-testid="hub-you-email"]');
    expect(email?.textContent).toBe('owner@theolive.co.za');
    expect(container.querySelector('[data-testid="hub-you-whatsapp"]')?.textContent).toBe('Add your WhatsApp.');
    expect(container.querySelector('[data-testid="hub-you-whatsapp-input"]')).toBeNull();

    clickTestId(container, 'hub-you-edit');
    const input = container.querySelector('[data-testid="hub-you-whatsapp-input"]') as HTMLInputElement;
    const save = container.querySelector('[data-testid="hub-you-save"]') as HTMLButtonElement;
    const cancel = container.querySelector('[data-testid="hub-you-cancel"]') as HTMLButtonElement;
    expect(input.value).toBe('');
    expect(input.getAttribute('placeholder')).toBe('Add your WhatsApp.');
    expect(save?.textContent).toBe('Save.');
    expect(cancel?.textContent).toBe('Cancel.');
    expect(save.className).toContain('btn-primary');
    expect(cancel.className).toContain('btn-outline');
    expect(cancel.className).not.toContain('btn-primary');
    expect(email && input && (email.compareDocumentPosition(input) & Node.DOCUMENT_POSITION_FOLLOWING)).toBeTruthy();
    expect(input && save && (input.compareDocumentPosition(save) & Node.DOCUMENT_POSITION_FOLLOWING)).toBeTruthy();

    typeInto(input, '123');
    await act(async () => {
      (container.querySelector('[data-testid="hub-you-form"]') as HTMLFormElement).requestSubmit();
    });
    expect(container.querySelector('[data-testid="hub-you-error"]')?.textContent).toBe(HOUSE_OTP_BAD_PHONE);
    expect(loadIdentityVault().profile.demographics.whatsappNumber).toBe('');
    expect(container.querySelector('[data-testid="hub-you-confirm"]')).toBeNull();

    rememberPlaceSession({ placeId: 'co_olive', bearer: 'sess-you', expiresAt: null });
    typeInto(container.querySelector('[data-testid="hub-you-whatsapp-input"]') as HTMLInputElement, '0829261373');
    await act(async () => {
      (container.querySelector('[data-testid="hub-you-form"]') as HTMLFormElement).requestSubmit();
    });
    expect(container.querySelector('[data-testid="hub-you-confirm-whatsapp"]')?.textContent).toBe('Use this WhatsApp number?');
    expect(loadIdentityVault().profile.demographics.whatsappNumber).toBe('');
    expect(readPlaceSession('co_olive')?.bearer).toBe('sess-you');
    await act(async () => {
      (container.querySelector('[data-testid="hub-you-form"]') as HTMLFormElement).requestSubmit();
    });
    const shown = container.querySelector('[data-testid="hub-you-whatsapp"]');
    expect(shown?.textContent).toBe('+27829261373');
    expect(email && shown && (email.compareDocumentPosition(shown) & Node.DOCUMENT_POSITION_FOLLOWING)).toBeTruthy();
    expect(loadIdentityVault().profile.demographics.whatsappNumber).toBe('+27829261373');
    expect(readPlaceSession('co_olive')?.bearer).toBe('sess-you');

    clickTestId(container, 'hub-you-edit');
    const edit = container.querySelector('[data-testid="hub-you-whatsapp-input"]') as HTMLInputElement;
    expect(edit.value).toBe('+27829261373');
    typeInto(edit, '+27820000000');
    await act(async () => {
      (container.querySelector('[data-testid="hub-you-form"]') as HTMLFormElement).requestSubmit();
    });
    expect(loadIdentityVault().profile.demographics.whatsappNumber).toBe('+27829261373');
    await act(async () => {
      (container.querySelector('[data-testid="hub-you-form"]') as HTMLFormElement).requestSubmit();
    });
    expect(container.querySelector('[data-testid="hub-you-whatsapp"]')?.textContent).toBe('+27820000000');
    expect(loadIdentityVault().profile.demographics.whatsappNumber).toBe('+27820000000');
    expect(readPlaceSession('co_olive')).toBeNull();

    clickTestId(container, 'hub-you-edit');
    const emailInput = container.querySelector('[data-testid="hub-you-email-input"]') as HTMLInputElement;
    typeInto(emailInput, 'frans@theolive.co.za');
    await act(async () => {
      (container.querySelector('[data-testid="hub-you-form"]') as HTMLFormElement).requestSubmit();
    });
    expect(container.querySelector('[data-testid="hub-you-confirm-email"]')?.textContent).toBe('Use this email?');
    expect(JSON.parse(localStorage.getItem(OWNER_SESSION_STORAGE_KEY) || '{}').email).toBe('owner@theolive.co.za');
    await act(async () => {
      (container.querySelector('[data-testid="hub-you-form"]') as HTMLFormElement).requestSubmit();
    });
    expect(container.querySelector('[data-testid="hub-you-email"]')?.textContent).toBe('frans@theolive.co.za');
    expect(JSON.parse(localStorage.getItem(OWNER_SESSION_STORAGE_KEY) || '{}').email).toBe('frans@theolive.co.za');

    clickTestId(container, 'hub-you-edit');
    const lang = container.querySelector('[data-testid="hub-you-language-input"]') as HTMLSelectElement;
    expect(lang.tagName).toBe('SELECT');
    act(() => {
      lang.value = 'af';
      Simulate.change(lang);
    });
    await act(async () => {
      (container.querySelector('[data-testid="hub-you-form"]') as HTMLFormElement).requestSubmit();
    });
    expect(container.querySelector('[data-testid="hub-you-confirm"]')).toBeNull();
    expect(container.querySelector('[data-testid="hub-you-language"]')?.textContent).toBe('Afrikaans');
    expect(loadIdentityVault().profile.demographics.language).toBe('af');
    expect(container.textContent).not.toMatch(/\b(peer|node|DID|DHT|wallet|MCP|npm|hydrate|neon)\b/i);
    unmount();
  });

  it('shows the eatery row as the place name and Open the house to /d/hub', async () => {
    const { container, unmount } = render(
      <UserProfileProvider>
        <SubscribedAppsView />
      </UserProfileProvider>
    );

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 80));
    });

    expect(container.querySelector('[data-testid="hub-home"]')?.getAttribute('data-pane')).toBe('places');
    expect(container.querySelector('[data-testid="hub-home-cta"]')).toBeNull();
    expect(container.querySelector('[data-testid="hub-home-open"]')).toBeNull();
    expect(container.textContent).toContain(YOUR_PLACES_KICKER);

    const name = container.querySelector('[data-testid="eatery-place-name"]');
    const open = container.querySelector('[data-testid="open-the-house"]') as HTMLAnchorElement | null;
    expect(name?.textContent).toContain('The Olive');
    expect(name?.textContent).not.toContain('Eatery');
    expect(container.querySelector('[data-testid="eatery-place-city"]')?.textContent).toBe('Stellenbosch');
    expect(container.querySelector('[data-testid="eatery-place-status"]')?.textContent).toBe('Payment due.');
    expect(container.querySelector('[data-testid="eatery-place-row"]')?.textContent).not.toContain('LIVE');
    expect(container.querySelector('[data-testid="eatery-place-row"]')?.textContent).not.toMatch(/R\d/);
    expect(container.querySelector('[data-testid="open-place-subscription"]')?.textContent).toBe('Subscription.');
    expect(open?.textContent).toBe(OPEN_LABEL);
    expect(open?.className).toContain('btn-primary');
    expect(open?.tagName).toBe('BUTTON');
    expect(container.textContent).not.toContain('Tables, tickets, kitchen, stock.');
    expect(container.textContent).not.toContain('Walk me through');

    act(() => {
      open?.click();
    });
    expect(container.querySelector('[data-testid="place-detail"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="place-detail-name"]')?.textContent).toContain('The Olive');
    expect(Array.from(container.querySelectorAll('[role="tab"]')).map(tab => tab.textContent)).toEqual([
      'Apps',
      'Subscription',
      'Location'
    ]);
    expect(container.querySelector('[data-testid="place-tab-apps"]')?.getAttribute('aria-selected')).toBe('true');
    expect(container.querySelector('[data-testid="place-apps"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="place-seed"]')).toBeNull();
    expect(container.querySelector('[data-testid="place-subscription"]')).toBeNull();
    expect(container.querySelector('[data-testid="place-location"]')).toBeNull();
    const eateryOpen = container.querySelector('[data-testid="open-place-app-eatery"]') as HTMLAnchorElement | null;
    const href = eateryOpen?.getAttribute('href') || '';
    const hints = new URL(href, 'https://eatery.daup.co.za');
    expect(hints.origin).toBe('https://eatery.daup.co.za');
    expect(hints.pathname).toBe('/d/hub');
    expect(hints.searchParams.get(HANDOFF_EMAIL_HINT)).toBe('owner@theolive.co.za');
    expect(hints.searchParams.get(HANDOFF_HOUSE_HINT)).toBe('The Olive');
    expect(hints.searchParams.has('houseRedeem')).toBe(false);
    expect(hints.searchParams.has('token')).toBe(false);
    expect(handoffPresentsCredential(href)).toBe(false);
    expect(container.textContent).not.toMatch(/\b(peer|node|DID|DHT|wallet|MCP|npm|hydrate|neon)\b/i);
    expect(container.textContent).not.toMatch(/seednode/i);
    expect(container.textContent).not.toContain('co_');
    act(() => {
      (container.querySelector('[data-testid="back-to-places"]') as HTMLButtonElement | null)?.click();
    });
    expect(container.querySelector('[data-testid="place-detail"]')).toBeNull();
    expect(container.querySelector('[data-testid="eatery-place-name"]')?.textContent).toContain('The Olive');

    const { container: appsContainer, unmount: unmountApps } = render(
      <UserProfileProvider>
        <SubscribedAppsView pane="apps" />
      </UserProfileProvider>
    );
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 80));
    });
    const shop = appsContainer.querySelector('[data-testid="get-apps"]');
    expect(shop?.textContent).toContain(APPS_SHELF_TITLE);
    expect(shop?.textContent).toContain(APPS_SHELF_LINE);
    expect(shop?.textContent).not.toContain(OPEN_LABEL);
    expect(shop?.querySelector('[data-testid="apps-shelf"]')).toBeTruthy();
    expect(shop?.querySelector('[data-testid="apps-social"]')).toBeNull();
    expect(shop?.querySelector('[data-testid="apps-paid"]')).toBeNull();
    expect(shop?.querySelector('.kicker')).toBeNull();
    expect(shop?.textContent).not.toContain('Social.');
    expect(shop?.textContent).not.toContain('Paid.');
    expect(shop?.textContent).not.toContain('LIVE');
    expect(shop?.querySelector('.btn-wide')).toBeNull();
    expect(shop?.querySelector('[data-testid="get-app-chat"]')?.textContent).toContain('Chat');
    expect(shop?.querySelector('[data-testid="get-app-chat"]')?.textContent).toContain(GET_LABEL);
    expect(shop?.querySelector('[data-testid="coming-app-chat"]')).toBeNull();
    const shelfEatery = shop?.querySelector('[data-testid="open-app-eatery"]') as HTMLAnchorElement | null;
    expect(shelfEatery?.textContent).toContain('Eatery');
    expect(shelfEatery?.textContent).not.toContain(GET_LABEL);
    expect(shelfEatery?.textContent).not.toContain(OPEN_LABEL);
    expect(shelfEatery?.tagName).toBe('A');
    expect(shelfEatery?.className).toContain('shelf-tile');
    expect(shelfEatery?.className).not.toContain('btn-primary');
    expect(shop?.querySelector('[data-testid="get-app-eatery"]')).toBeNull();
    expect(shop?.querySelector('[data-testid="subscribe-app-eatery"]')).toBeNull();
    const eatIn = shop?.querySelector('[data-testid="coming-app-eatin"]');
    expect(eatIn?.textContent).toContain('Eat In');
    expect(eatIn?.textContent).toContain(SOON_LABEL);
    expect(eatIn?.tagName).not.toBe('A');
    expect(eatIn?.getAttribute('href')).toBeNull();
    const eatout = shop?.querySelector('[data-testid="get-app-eatout"]');
    expect(eatout?.textContent).toContain('Eat Out');
    expect(eatout?.textContent).not.toContain('EatOut');
    expect(eatout?.textContent).toContain(GET_LABEL);
    expect(eatout?.tagName).toBe('BUTTON');
    expect(eatout?.className).not.toContain('btn-primary');
    expect(shop?.querySelector('[data-testid="open-app-eatout"]')).toBeNull();
    expect(shop?.querySelector('[data-testid="subscribe-app-eatout"]')).toBeNull();
    const project = shop?.querySelector('[data-testid="get-app-project"]');
    expect(project?.textContent).toContain('Project');
    expect(project?.textContent).toContain(GET_LABEL);
    expect(project?.tagName).toBe('BUTTON');
    expect(project?.className).not.toContain('btn-primary');
    expect(shop?.querySelector('[data-testid="open-app-project"]')).toBeNull();
    expect(shop?.querySelector('[data-testid="subscribe-app-project"]')).toBeNull();
    expect(shop?.textContent).not.toMatch(/Subscribe/i);
    expect(shop?.textContent).not.toMatch(/Subscribed/i);
    expect(shop?.textContent).not.toContain('Marketplace');
    expect(shop?.textContent).toContain('Farm');
    expect(shop?.textContent).toContain('Reseller');
    expect(shop?.textContent).toContain('Maker');
    expect(shop?.querySelector('[data-testid="coming-app-farm"]')?.textContent).toContain(SOON_LABEL);
    expect(shop?.querySelector('[data-testid="get-app-vault"]')?.textContent).toContain('Vault');
    expect(shop?.querySelector('[data-testid="get-app-vault"]')?.textContent).toContain(GET_LABEL);
    expect(shop?.querySelector('[data-testid="coming-app-vault"]')).toBeNull();
    expect(shop?.querySelector('[data-testid="get-app-property"]')?.textContent).toContain('Property');
    expect(shop?.querySelector('[data-testid="get-app-property"]')?.textContent).toContain(GET_LABEL);
    expect(shop?.querySelector('[data-testid="coming-app-property"]')).toBeNull();
    expect(shop?.textContent).not.toMatch(/rental/i);
    expect(Array.from(shop?.querySelectorAll('[data-testid^="open-app-"], [data-testid^="get-app-"], [data-testid^="coming-app-"]') || [])
      .map(el => el.getAttribute('data-testid'))).toEqual([
      'open-app-eatery',
      'coming-app-eatin',
      'get-app-eatout',
      'get-app-project',
      'get-app-finance',
      'get-app-trade',
      'get-app-vault',
      'get-app-chat',
      'get-app-property',
      'coming-app-farm',
      'coming-app-reseller',
      'coming-app-maker'
    ]);
    expect(shop?.querySelector('[data-testid="coming-app-eatout"]')).toBeNull();
    expect(shop?.querySelector('[data-testid="coming-app-project"]')).toBeNull();
    expect(appsContainer.querySelector('[data-testid="same-chain-caption"]')).toBeNull();
    expect(appsContainer.textContent).not.toContain('Decentralized Edge App Registry');
    expect(appsContainer.textContent).not.toContain('Marketplace');
    expect(container.querySelector('[data-testid="delete-the-house"]')?.textContent).toBe(DELETE_THE_HOUSE_LABEL);
    expect(appsContainer.querySelector('[data-testid="delete-the-house"]')).toBeNull();
    expect(appsContainer.querySelector('[data-testid="ask-page"]')).toBeNull();
    expect(container.querySelector('[data-testid="register-new-house"]')).toBeNull();
    expect(container.querySelector('[data-testid="ask-for-enhancement"]')).toBeNull();
    expect(container.querySelector('[data-testid="on-the-chain"]')).toBeNull();
    expect(container.textContent).not.toContain('On the chain.');
    expect(container.querySelector('[data-testid="ask-page"]')).toBeNull();
    expect(container.textContent).not.toMatch(/\b(peer|node|DID|DHT|wallet|MCP|npm|hydrate|neon)\b/i);
    unmountApps();
    unmount();
  });

  it('Other places: app cards, Country · Region · Town filters, Eatery public open', async () => {
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
      city: 'Cape Town',
      ownerEmail: 'other@example.com'
    });
    registerPlaceOnPlatform({
      placeName: 'Kortrijk',
      app: 'eatery',
      country: 'South Africa',
      region: 'Western Cape',
      city: 'Stellenbosch',
      ownerEmail: 'other@example.com'
    });

    const { container, unmount } = render(
      <UserProfileProvider>
        <SubscribedAppsView />
      </UserProfileProvider>
    );

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 80));
    });

    expect(container.querySelector('[data-testid="on-the-chain"]')).toBeNull();
    expect(container.textContent).not.toContain('On the chain.');
    expect(container.querySelector('[data-testid="eatery-place-name"]')?.textContent).toContain('The Olive');

    const { container: otherContainer, unmount: unmountOther } = render(
      <UserProfileProvider>
        <SubscribedAppsView pane="other" />
      </UserProfileProvider>
    );
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 80));
    });

    const other = otherContainer.querySelector('[data-testid="other-places"]');
    expect(otherContainer.querySelector('[data-testid="hub-home"]')?.getAttribute('data-pane')).toBe('other');
    expect(other?.querySelector('[data-testid="other-app-eatery"]')?.textContent).toContain('Eatery');
    expect(other?.querySelector('[data-testid="other-app-count-eatery"]')?.textContent).toBe(subscribedCountLabel(5));
    expect(other?.querySelector('[data-testid="other-app-source-eatery"]')?.textContent).toBe('2 on this hub. 3 sample.');
    expect(other?.querySelector('[data-testid="other-app-project"]')?.textContent).toContain(COMING_DOT_LABEL);
    expect(other?.querySelector('[data-testid="other-app-farm"]')?.textContent).toContain(COMING_DOT_LABEL);
    expect(other?.textContent).not.toMatch(/\b(peer|node|DID|DHT|wallet|MCP|npm|hydrate|neon)\b/i);

    act(() => {
      (other?.querySelector('[data-testid="other-app-eatery"]') as HTMLButtonElement).click();
    });
    expect(otherContainer.querySelector('[data-testid="other-places-filters"]')).toBeTruthy();
    expect(otherContainer.querySelector('[data-testid="filter-country"]')).toBeTruthy();
    expect(otherContainer.querySelector('[data-testid="filter-region"]')).toBeTruthy();
    expect(otherContainer.querySelector('[data-testid="filter-town"]')).toBeTruthy();
    const names = Array.from(otherContainer.querySelectorAll('[data-testid="other-places-place"]'))
      .map(row => row.getAttribute('data-place-name'));
    expect(names).toEqual(['Genesis Bistro', 'Kortrijk', 'Noop Restaurant', 'Salt', 'The Press Café']);
    expect(names).not.toContain('The Olive');

    const country = otherContainer.querySelector('[data-testid="filter-country"]') as HTMLSelectElement;
    act(() => {
      country.value = 'South Africa';
      Simulate.change(country);
    });
    const region = otherContainer.querySelector('[data-testid="filter-region"]') as HTMLSelectElement;
    act(() => {
      region.value = 'Western Cape';
      Simulate.change(region);
    });
    const town = otherContainer.querySelector('[data-testid="filter-town"]') as HTMLSelectElement;
    act(() => {
      town.value = 'Cape Town';
      Simulate.change(town);
    });
    const filtered = Array.from(otherContainer.querySelectorAll('[data-testid="other-places-place"]'))
      .map(row => row.getAttribute('data-place-name'));
    expect(filtered).toEqual(['Genesis Bistro', 'Salt']);

    act(() => {
      town.value = '';
      Simulate.change(town);
    });
    const kortrijkRow = Array.from(otherContainer.querySelectorAll('[data-testid="other-places-place"]'))
      .find(row => row.getAttribute('data-place-name') === 'Kortrijk')
      ?.querySelector('button') as HTMLButtonElement;
    act(() => {
      kortrijkRow.click();
    });
    const card = otherContainer.querySelector('[data-testid="place-public-card"]');
    const menu = otherContainer.querySelector('[data-testid="see-the-menu"]') as HTMLAnchorElement | null;
    const reserve = otherContainer.querySelector('[data-testid="reserve-a-table"]') as HTMLAnchorElement | null;
    expect(card?.textContent).toContain('Kortrijk');
    expect(card?.textContent).toContain('Stellenbosch, Western Cape, South Africa · Eatery');
    expect(card?.textContent).toContain('Back.');
    expect(card?.textContent).toContain(COMING_DOT_LABEL);
    expect(otherContainer.querySelector('[data-testid="place-chat-coming"]')?.textContent).toBe('Chat');
    expect((otherContainer.querySelector('[data-testid="place-chat-coming"]') as HTMLButtonElement).disabled).toBe(true);
    expect(menu?.textContent).toBe(SEE_THE_MENU_LABEL);
    expect(reserve?.textContent).toBe(RESERVE_A_TABLE_LABEL);
    expect(menu?.className).toContain('btn-primary');
    expect(menu?.getAttribute('href')).toBe('https://eatout.daup.co.za/place/kortrijk#menu');
    expect(reserve?.getAttribute('href')).toBe('https://eatout.daup.co.za/place/kortrijk#book');
    expect(menu?.getAttribute('data-eatout-id')).toBe('kortrijk');
    expect(menu?.getAttribute('href') || '').not.toMatch(/eatery\.daup\.co\.za/);
    expect(menu?.getAttribute('href') || '').not.toMatch(/\/owner/);
    expect(reserve?.getAttribute('href') || '').not.toMatch(/eatery\.daup\.co\.za|#reserve/);
    expect(otherContainer.querySelector('[data-testid="get-apps"]')).toBeNull();
    unmountOther();
    unmount();
  });

  it('does not put Marketplace installs or Subscribe on Coming cards', async () => {
    localStorage.setItem('daup_installed_apps', JSON.stringify({ 'daup-farmer': true }));
    const { container, unmount } = render(<App />);

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 80));
    });

    openApps(container);
    const shelf = container.querySelector('[data-testid="get-apps"]');
    expect(shelf?.textContent).toContain('Farm');
    expect(shelf?.textContent).toContain('Chat');
    expect(shelf?.textContent).not.toContain('Social.');
    expect(shelf?.textContent).not.toContain('Paid.');
    expect(shelf?.textContent).not.toContain('LIVE');
    expect(shelf?.querySelector('[data-testid="get-app-chat"]')?.textContent).toContain(GET_LABEL);
    expect(shelf?.querySelector('[data-testid="coming-app-chat"]')).toBeNull();
    expect(shelf?.querySelector('[data-testid="get-app-vault"]')?.textContent).toContain('Vault');
    expect(shelf?.querySelector('[data-testid="get-app-vault"]')?.textContent).toContain(GET_LABEL);
    expect(shelf?.querySelector('[data-testid="get-app-property"]')?.textContent).toContain('Property');
    expect(shelf?.querySelector('[data-testid="get-app-property"]')?.textContent).toContain(GET_LABEL);
    expect(shelf?.textContent).not.toMatch(/rental/i);
    expect(shelf?.querySelector('[data-testid="coming-app-farm"]')?.textContent).toContain(SOON_LABEL);
    expect(shelf?.textContent).not.toMatch(/Subscribe/i);
    expect(shelf?.textContent).not.toMatch(/Subscribed/i);
    expect(container.querySelector('[data-testid="coming-app-farm"]')?.textContent).not.toMatch(/Subscribe/i);
    expect(container.querySelector('[data-testid="coming-app-farm"]')?.textContent).not.toContain(SAME_CHAIN_CAPTION);
    expect(container.querySelector('[data-testid="open-app-eatery"]')?.textContent).toContain('Eatery');
    expect(container.querySelector('[data-testid="open-app-eatery"]')?.textContent).not.toContain(GET_LABEL);
    expect(container.querySelector('[data-testid="open-app-eatery"]')?.textContent).not.toContain(OPEN_LABEL);
    expect(container.querySelector('[data-testid="get-app-eatery"]')).toBeNull();
    expect(container.querySelector('[data-testid="subscribe-app-eatery"]')).toBeNull();
    expect(container.querySelector('[data-testid="coming-app-eatout"]')).toBeNull();
    expect(container.querySelector('[data-testid="coming-app-project"]')).toBeNull();
    expect(container.querySelector('[data-testid="get-app-eatout"]')?.textContent).toContain('Eat Out');
    expect(container.querySelector('[data-testid="get-app-eatout"]')?.textContent).toContain(GET_LABEL);
    expect(container.querySelector('[data-testid="get-app-eatout"]')?.className).not.toContain('btn-wide');
    expect(container.querySelector('[data-testid="open-app-eatout"]')).toBeNull();
    expect(container.querySelector('[data-testid="subscribe-app-eatout"]')).toBeNull();
    expect(container.querySelector('[data-testid="get-app-project"]')?.textContent).toContain('Project');
    expect(container.querySelector('[data-testid="get-app-project"]')?.textContent).toContain(GET_LABEL);
    expect(container.querySelector('[data-testid="get-app-project"]')?.className).not.toContain('btn-wide');
    expect(container.querySelector('[data-testid="open-app-project"]')).toBeNull();
    expect(container.querySelector('[data-testid="subscribe-app-project"]')).toBeNull();
    expect(container.querySelector('[data-testid="get-apps"]')?.textContent).not.toMatch(/Subscribe/i);
    expect(container.textContent).not.toMatch(/Subscribed/i);
    expect(container.textContent).not.toContain('Marketplace');
    expect(container.querySelectorAll('[data-testid="same-chain-caption"]').length).toBe(0);
    unmount();
  });

  it('shows one Get. primary when a live app is not held, never dual Get.+Open.', () => {
    const { container, unmount } = render(
      <GetAppsSection
        hasHouse={false}
        installedApps={{}}
        onGet={() => undefined}
        onOpen={() => undefined}
      />
    );
    const eateryGet = container.querySelector('[data-testid="get-app-eatery"]');
    expect(eateryGet?.textContent).toContain('Eatery');
    expect(eateryGet?.textContent).toContain(GET_LABEL);
    expect(eateryGet?.className).toContain('shelf-tile');
    expect(eateryGet?.className).not.toContain('btn-wide');
    expect(container.querySelector('[data-testid="open-app-eatery"]')).toBeNull();
    expect(container.querySelector('[data-testid="subscribe-app-eatery"]')).toBeNull();
    const eatoutGet = container.querySelector('[data-testid="get-app-eatout"]');
    expect(eatoutGet?.textContent).toContain('Eat Out');
    expect(eatoutGet?.textContent).not.toContain('EatOut');
    expect(eatoutGet?.textContent).toContain(GET_LABEL);
    expect(eatoutGet?.className).not.toContain('btn-wide');
    expect(container.querySelector('[data-testid="open-app-eatout"]')).toBeNull();
    expect(container.querySelector('[data-testid="subscribe-app-eatout"]')).toBeNull();
    const projectGet = container.querySelector('[data-testid="get-app-project"]');
    expect(projectGet?.textContent).toContain('Project');
    expect(projectGet?.textContent).toContain(GET_LABEL);
    expect(projectGet?.textContent).not.toContain('LIVE');
    expect(projectGet?.className).not.toContain('btn-wide');
    expect(container.querySelector('[data-testid="open-app-project"]')).toBeNull();
    expect(container.querySelector('[data-testid="subscribe-app-project"]')).toBeNull();
    expect(container.querySelector('[data-testid="get-apps"]')?.textContent).not.toMatch(/Subscribe/i);
    expect(container.querySelector('[data-testid="get-apps"]')?.textContent).not.toContain('Marketplace');
    expect(container.querySelector('[data-testid="get-apps"]')?.textContent).not.toContain('Social.');
    expect(container.querySelector('[data-testid="get-apps"]')?.textContent).not.toContain('Paid.');
    expect(container.querySelector('[data-testid="coming-app-eatin"]')?.textContent).toContain(SOON_LABEL);
    expect(container.querySelector('[data-testid="coming-app-eatout"]')).toBeNull();
    expect(container.querySelector('[data-testid="coming-app-project"]')).toBeNull();
    expect(container.querySelector('[data-testid="coming-app-chat"]')).toBeNull();
    expect(container.querySelector('[data-testid="coming-app-vault"]')).toBeNull();
    expect(container.querySelector('[data-testid="coming-app-property"]')).toBeNull();
    expect(container.querySelector('[data-testid="get-app-chat"]')?.textContent).toContain(GET_LABEL);
    expect(container.querySelector('[data-testid="get-app-vault"]')?.textContent).toContain(GET_LABEL);
    expect(container.querySelector('[data-testid="get-app-property"]')?.textContent).toContain(GET_LABEL);
    expect(container.querySelector('[data-testid="open-app-chat"]')).toBeNull();
    expect(container.querySelector('[data-testid="open-app-vault"]')).toBeNull();
    expect(container.querySelector('[data-testid="open-app-property"]')).toBeNull();
    expect(container.querySelector('[data-testid="same-chain-caption"]')).toBeNull();
    unmount();
  });

  it('held EatOut shows Open. only to diner home, never eatery /owner', () => {
    const { container, unmount } = render(
      <GetAppsSection
        hasHouse={true}
        installedApps={{ 'daup-eatout': true }}
        onGet={() => undefined}
        onOpen={() => undefined}
      />
    );
    const open = container.querySelector('[data-testid="open-app-eatout"]') as HTMLAnchorElement | null;
    expect(open?.textContent).toContain('Eat Out');
    expect(open?.textContent).not.toContain(OPEN_LABEL);
    expect(open?.textContent).not.toContain(GET_LABEL);
    expect(open?.textContent).not.toContain('LIVE');
    expect(open?.tagName).toBe('A');
    expect(open?.getAttribute('href')).toBe('https://eatout.daup.co.za/');
    expect(open?.getAttribute('target')).toBe('_self');
    expect(open?.getAttribute('href') || '').not.toMatch(/\/place\/|#menu|#book|eatery\.daup\.co\.za|\/owner|\/floor/i);
    expect(container.querySelector('[data-testid="get-app-eatout"]')).toBeNull();
    expect(container.querySelector('[data-testid="subscribe-app-eatout"]')).toBeNull();
    expect(open?.className).toContain('shelf-tile');
    expect(container.querySelector('[data-testid="open-app-eatery"]')?.textContent).toContain('Eatery');
    expect(container.querySelector('[data-testid="open-app-eatery"]')?.textContent).not.toContain(OPEN_LABEL);
    expect(container.querySelector('[data-testid="open-app-eatery"]')?.className).toContain('shelf-tile');
    expect(container.querySelector('[data-testid="get-app-eatery"]')).toBeNull();
    expect(container.querySelector('[data-testid="coming-app-eatout"]')).toBeNull();
    expect(container.querySelector('[data-testid="coming-app-eatin"]')?.getAttribute('href')).toBeNull();
    unmount();
  });

  it('held Chat, Vault, and Property show Open. to their house hosts', () => {
    const { container, unmount } = render(
      <GetAppsSection
        hasHouse={true}
        installedApps={{ 'daup-chat': true, 'daup-vault': true, 'daup-property': true }}
        onGet={() => undefined}
        onOpen={() => undefined}
      />
    );
    const chatOpen = container.querySelector('[data-testid="open-app-chat"]') as HTMLAnchorElement | null;
    const vaultOpen = container.querySelector('[data-testid="open-app-vault"]') as HTMLAnchorElement | null;
    const propertyOpen = container.querySelector('[data-testid="open-app-property"]') as HTMLAnchorElement | null;
    expect(chatOpen?.textContent).toContain('Chat');
    expect(chatOpen?.textContent).not.toContain(OPEN_LABEL);
    expect(vaultOpen?.textContent).toContain('Vault');
    expect(vaultOpen?.textContent).not.toContain(OPEN_LABEL);
    expect(propertyOpen?.textContent).toContain('Property');
    expect(propertyOpen?.textContent).not.toContain(OPEN_LABEL);
    expect(chatOpen?.tagName).toBe('A');
    expect(vaultOpen?.tagName).toBe('A');
    expect(propertyOpen?.tagName).toBe('A');
    expect(chatOpen?.getAttribute('href')).toBe('https://chat.daup.co.za');
    expect(vaultOpen?.getAttribute('href')).toBe('https://vault.daup.co.za');
    expect(propertyOpen?.getAttribute('href')).toBe('https://property.daup.co.za');
    expect(chatOpen?.getAttribute('target')).toBe('_self');
    expect(vaultOpen?.getAttribute('target')).toBe('_self');
    expect(propertyOpen?.getAttribute('target')).toBe('_self');
    expect(chatOpen?.getAttribute('href') || '').not.toMatch(/[?#]|eatery\.daup\.co\.za|\/owner|app\.daup\.co\.za/i);
    expect(vaultOpen?.getAttribute('href') || '').not.toMatch(/[?#]|eatery\.daup\.co\.za|\/owner|app\.daup\.co\.za/i);
    expect(propertyOpen?.getAttribute('href') || '').not.toMatch(/[?#]|eatery\.daup\.co\.za|\/owner|app\.daup\.co\.za|rental/i);
    expect(container.querySelector('[data-testid="get-app-chat"]')).toBeNull();
    expect(container.querySelector('[data-testid="get-app-vault"]')).toBeNull();
    expect(container.querySelector('[data-testid="get-app-property"]')).toBeNull();
    expect(container.querySelector('[data-testid="apps-paid"]')).toBeNull();
    expect(container.querySelector('[data-testid="apps-social"]')).toBeNull();
    expect(container.querySelector('[data-testid="get-apps"]')?.textContent).toContain('Property');
    unmount();
  });

  it('held Project shows Open. only to project.daup.co.za, never eatery /owner', () => {
    const { container, unmount } = render(
      <GetAppsSection
        hasHouse={true}
        installedApps={{ 'daup-project': true }}
        onGet={() => undefined}
        onOpen={() => undefined}
      />
    );
    const open = container.querySelector('[data-testid="open-app-project"]') as HTMLAnchorElement | null;
    expect(open?.textContent).toContain('Project');
    expect(open?.textContent).not.toContain('LIVE');
    expect(open?.textContent).not.toContain(OPEN_LABEL);
    expect(open?.tagName).toBe('A');
    expect(open?.getAttribute('href')).toBe('https://project.daup.co.za');
    expect(open?.getAttribute('target')).toBe('_self');
    expect(open?.getAttribute('href') || '').not.toMatch(/eatery\.daup\.co\.za|\/owner|\/floor|app\.daup\.co\.za/i);
    expect(container.querySelector('[data-testid="get-app-project"]')).toBeNull();
    expect(container.querySelector('[data-testid="subscribe-app-project"]')).toBeNull();
    expect(open?.className).toContain('shelf-tile');
    expect(container.querySelector('[data-testid="coming-app-project"]')).toBeNull();
    unmount();
  });

  it('Get. holds EatOut then Open. only points at diner home', async () => {
    const { container, unmount } = render(<App />);
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 80));
    });
    openApps(container);
    const beforeGet = container.querySelector('[data-testid="get-app-eatout"]');
    expect(beforeGet?.textContent).toContain('Eat Out');
    expect(beforeGet?.textContent).toContain(GET_LABEL);
    expect(beforeGet?.className).toContain('shelf-tile');
    expect(container.querySelector('[data-testid="open-app-eatout"]')).toBeNull();
    expect(container.querySelector('[data-testid="subscribe-app-eatout"]')).toBeNull();
    act(() => {
      (container.querySelector('[data-testid="get-app-eatout"]') as HTMLButtonElement).click();
    });
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 40));
    });
    expect(container.querySelector('[data-testid="get-app-eatout"]')).toBeNull();
    expect(container.querySelector('[data-testid="subscribe-app-eatout"]')).toBeNull();
    const open = container.querySelector('[data-testid="open-app-eatout"]') as HTMLAnchorElement | null;
    expect(open?.textContent).toContain('Eat Out');
    expect(open?.textContent).not.toContain(OPEN_LABEL);
    expect(open?.textContent).not.toContain(GET_LABEL);
    expect(open?.tagName).toBe('A');
    expect(open?.getAttribute('href')).toBe('https://eatout.daup.co.za/');
    expect(open?.getAttribute('target')).toBe('_self');
    expect(open?.getAttribute('href') || '').not.toMatch(/\/place\/|#menu|#book|eatery\.daup\.co\.za|\/owner/i);
    expect(open?.className).toContain('shelf-tile');
    expect(container.querySelector('[data-testid="hub-home-open"]')).toBeNull();
    expect(JSON.parse(localStorage.getItem('daup_installed_apps') || '{}')['daup-eatout']).toBe(true);
    expect(container.querySelector('[data-testid="open-app-eatery"]')?.textContent).toContain('Eatery');
    expect(container.querySelector('[data-testid="open-app-eatery"]')?.className).toContain('shelf-tile');
    expect(container.querySelector('[data-testid="coming-app-eatout"]')).toBeNull();
    unmount();
  });

  it('Get. holds Project then Open. points at project.daup.co.za with hub first-run query', async () => {
    const { container, unmount } = render(<App />);
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 80));
    });
    openApps(container);
    const beforeGet = container.querySelector('[data-testid="get-app-project"]');
    expect(beforeGet?.textContent).toContain('Project');
    expect(beforeGet?.textContent).toContain(GET_LABEL);
    expect(beforeGet?.className).toContain('shelf-tile');
    expect(container.querySelector('[data-testid="open-app-project"]')).toBeNull();
    expect(container.querySelector('[data-testid="subscribe-app-project"]')).toBeNull();
    act(() => {
      (container.querySelector('[data-testid="get-app-project"]') as HTMLButtonElement).click();
    });
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 40));
    });
    expect(container.querySelector('[data-testid="get-app-project"]')).toBeNull();
    expect(container.querySelector('[data-testid="subscribe-app-project"]')).toBeNull();
    const open = container.querySelector('[data-testid="open-app-project"]') as HTMLAnchorElement | null;
    expect(open?.textContent).toContain('Project');
    expect(open?.textContent).not.toContain(OPEN_LABEL);
    expect(open?.tagName).toBe('A');
    const href = open?.getAttribute('href') || '';
    const parsed = new URL(href);
    expect(parsed.origin).toBe('https://project.daup.co.za');
    expect(parsed.pathname).toBe('/d/hub');
    expect(parsed.searchParams.get(HANDOFF_EMAIL_HINT)).toBe('owner@theolive.co.za');
    expect(parsed.searchParams.get(HANDOFF_HOUSE_HINT)).toBe('The Olive');
    expect(parsed.searchParams.has('token')).toBe(false);
    expect(handoffPresentsCredential(href)).toBe(false);
    expect(href).not.toMatch(/[?&](did|walletName|instance|mcp|email|house|token)=/i);
    expect(href).not.toMatch(/eatery\.daup\.co\.za|\/owner|app\.daup\.co\.za/i);
    expect(open?.getAttribute('target')).toBe('_self');
    expect(open?.className).toContain('shelf-tile');
    expect(container.querySelector('[data-testid="hub-home-open"]')).toBeNull();
    expect(JSON.parse(localStorage.getItem('daup_installed_apps') || '{}')['daup-project']).toBe(true);
    expect(container.querySelector('[data-testid="coming-app-project"]')).toBeNull();
    unmount();
  });

  it('Get. holds Chat and Vault on the place and Open. goes to the host', async () => {
    const day = 24 * 60 * 60 * 1000;
    saveIdentityVault({
      ...houseVault,
      companyNode: {
        companyId: 'co_olive',
        enabledApps: ['eatery'],
        billableLocations: 1
      }
    });
    saveNodeEntitlement({
      companyId: 'co_olive',
      node_subscription_status: 'trial',
      trial_started_at: Date.now() - day,
      trial_ends_at: Date.now() + 29 * day,
      enabled_apps: ['eatery'],
      billable_locations: 1,
      payment_method_ok: false
    });
    registerPlaceOnPlatform({
      placeName: 'The Olive',
      app: 'eatery',
      country: 'South Africa',
      region: 'Western Cape',
      city: 'Stellenbosch',
      companyId: 'co_olive',
      enabledApps: ['eatery'],
      ownerEmail: 'owner@theolive.co.za'
    });

    const { container, unmount } = render(<App />);
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 80));
    });
    openApps(container);
    expect(container.querySelector('[data-testid="apps-social"]')).toBeNull();
    expect(container.querySelector('[data-testid="apps-paid"]')).toBeNull();
    expect(container.querySelector('[data-testid="get-app-chat"]')?.textContent).toContain('Chat');
    expect(container.querySelector('[data-testid="get-app-chat"]')?.textContent).toContain(GET_LABEL);
    expect(container.querySelector('[data-testid="get-app-vault"]')?.textContent).toContain('Vault');
    expect(container.querySelector('[data-testid="get-app-vault"]')?.textContent).toContain(GET_LABEL);
    expect(container.querySelector('[data-testid="get-apps"]')?.textContent).not.toContain('LIVE');
    expect(container.querySelector('[data-testid="coming-app-chat"]')).toBeNull();
    expect(container.querySelector('[data-testid="coming-app-vault"]')).toBeNull();

    act(() => {
      (container.querySelector('[data-testid="get-app-chat"]') as HTMLButtonElement).click();
    });
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 40));
    });
    act(() => {
      (container.querySelector('[data-testid="get-app-vault"]') as HTMLButtonElement).click();
    });
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 40));
    });

    const chatOpen = container.querySelector('[data-testid="open-app-chat"]') as HTMLAnchorElement | null;
    const vaultOpen = container.querySelector('[data-testid="open-app-vault"]') as HTMLAnchorElement | null;
    expect(chatOpen?.textContent).toContain('Chat');
    expect(chatOpen?.textContent).not.toContain(GET_LABEL);
    expect(chatOpen?.textContent).not.toContain(OPEN_LABEL);
    expect(vaultOpen?.textContent).toContain('Vault');
    expect(vaultOpen?.textContent).not.toContain(OPEN_LABEL);
    expect(chatOpen?.tagName).toBe('A');
    expect(vaultOpen?.tagName).toBe('A');
    expect(chatOpen?.getAttribute('href')).toBe('https://chat.daup.co.za');
    expect(vaultOpen?.getAttribute('href')).toBe('https://vault.daup.co.za');
    expect(chatOpen?.getAttribute('target')).toBe('_self');
    expect(vaultOpen?.getAttribute('target')).toBe('_self');
    expect(container.querySelector('[data-testid="get-app-chat"]')).toBeNull();
    expect(container.querySelector('[data-testid="get-app-vault"]')).toBeNull();
    expect(loadPlaceEntitlement('co_olive')?.enabled_apps).toEqual(['eatery', 'vault', 'chat']);
    expect(loadIdentityVault().companyNode?.enabledApps).toEqual(['eatery', 'vault', 'chat']);
    const installed = JSON.parse(localStorage.getItem('daup_installed_apps') || '{}');
    expect(installed['daup-chat']).toBe(true);
    expect(installed['daup-vault']).toBe(true);
    expect(container.textContent).not.toMatch(/\b(peer|node|DID|DHT|wallet|MCP|npm|hydrate|neon)\b/i);
    expect(container.textContent).not.toMatch(/statement/i);
    unmount();
  });

  it('Get. holds Property on the place and Open. goes to property.daup.co.za', async () => {
    const day = 24 * 60 * 60 * 1000;
    saveIdentityVault({
      ...houseVault,
      companyNode: {
        companyId: 'co_olive',
        enabledApps: ['eatery'],
        billableLocations: 1
      }
    });
    saveNodeEntitlement({
      companyId: 'co_olive',
      node_subscription_status: 'trial',
      trial_started_at: Date.now() - day,
      trial_ends_at: Date.now() + 29 * day,
      enabled_apps: ['eatery'],
      billable_locations: 1,
      payment_method_ok: false
    });
    registerPlaceOnPlatform({
      placeName: 'The Olive',
      app: 'eatery',
      country: 'South Africa',
      region: 'Western Cape',
      city: 'Stellenbosch',
      companyId: 'co_olive',
      enabledApps: ['eatery'],
      ownerEmail: 'owner@theolive.co.za'
    });

    const { container, unmount } = render(<App />);
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 80));
    });
    openApps(container);
    expect(container.querySelector('[data-testid="get-app-property"]')?.textContent).toContain('Property');
    expect(container.querySelector('[data-testid="get-app-property"]')?.textContent).toContain(GET_LABEL);
    expect(container.querySelector('[data-testid="get-apps"]')?.textContent).not.toMatch(/rental/i);
    expect(container.querySelector('[data-testid="get-apps"]')?.textContent).not.toContain('LIVE');
    expect(container.querySelector('[data-testid="coming-app-property"]')).toBeNull();
    expect(container.querySelector('[data-testid="open-app-property"]')).toBeNull();

    act(() => {
      (container.querySelector('[data-testid="get-app-property"]') as HTMLButtonElement).click();
    });
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 40));
    });

    const propertyOpen = container.querySelector('[data-testid="open-app-property"]') as HTMLAnchorElement | null;
    expect(propertyOpen?.textContent).toContain('Property');
    expect(propertyOpen?.textContent).not.toContain(OPEN_LABEL);
    expect(propertyOpen?.textContent).not.toContain(GET_LABEL);
    expect(propertyOpen?.tagName).toBe('A');
    expect(propertyOpen?.getAttribute('href')).toBe('https://property.daup.co.za');
    expect(propertyOpen?.getAttribute('target')).toBe('_self');
    expect(propertyOpen?.getAttribute('href') || '').not.toMatch(/[?#]|rental/i);
    expect(container.querySelector('[data-testid="get-app-property"]')).toBeNull();
    expect(loadPlaceEntitlement('co_olive')?.enabled_apps).toEqual(['eatery', 'property']);
    expect(loadIdentityVault().companyNode?.enabledApps).toEqual(['eatery', 'property']);
    expect(JSON.parse(localStorage.getItem('daup_installed_apps') || '{}')['daup-property']).toBe(true);
    expect(container.textContent).not.toMatch(/\b(peer|node|DID|DHT|wallet|MCP|npm|hydrate|neon)\b/i);
    expect(container.textContent).not.toMatch(/rental/i);
    unmount();
  });

  it('Log off. returns to the email door and expires the hub cookie', async () => {
    registerPlaceOnPlatform({
      placeName: 'The Olive',
      app: 'eatery',
      country: 'South Africa',
      region: 'Western Cape',
      city: 'Stellenbosch',
      placeId: 'place-olive'
    });
    localStorage.setItem(HUB_INSTALLED_APPS_KEY, JSON.stringify({ 'daup-eatout': true }));
    sessionStorage.setItem('daup:hub:scratch', '1');
    document.cookie = 'daup_owner=legacy-owner-token; Path=/';
    const { container, unmount } = render(<App />);

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 80));
    });

    expect(container.querySelector('[data-testid="hub-home"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="hub-home"]')?.getAttribute('data-pane')).toBe('places');
    openApps(container);
    expect(container.querySelector('[data-testid="coming-app-farm"]')?.textContent).toContain('Farm');
    expect(container.querySelector('[data-testid="hub-log-off"]')).toBeNull();
    openYou(container);
    const logOff = container.querySelector('[data-testid="hub-log-off"]') as HTMLButtonElement | null;
    expect(logOff?.textContent).toBe('Log off.');

    act(() => {
      logOff?.click();
    });

    expect(container.querySelector('[data-testid="hub-email-door"]')).toBeTruthy();
    expect(container.querySelector('label[for="hub-email"]')?.textContent).toBe('Your email.');
    expect(container.querySelector('[data-testid="open-your-hub"]')?.textContent).toContain('Open your hub.');
    expect(localStorage.getItem(OWNER_SESSION_STORAGE_KEY)).toBeNull();
    expect(localStorage.getItem(VAULT_STORAGE_KEY)).toBeNull();
    expect(localStorage.getItem(PLATFORM_ENTITIES_KEY)).toBeNull();
    expect(localStorage.getItem(HUB_INSTALLED_APPS_KEY)).toBeNull();
    expect(sessionStorage.getItem('daup:hub:scratch')).toBeNull();
    expect(listRegisteredPlaces()).toEqual([]);
    expect(container.querySelector('[data-testid="eatery-place-row"]')).toBeNull();
    expect(container.textContent).not.toContain('The Olive');
    unmount();
  });

  it('opens Ask for an enhancement. as a tab beside the Apps shelf', async () => {
    const { container, unmount } = render(<App />);

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 80));
    });

    expect(container.querySelector('[data-testid="hub-home"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="apps-tab-ask"]')).toBeNull();
    openYou(container);
    expect(container.querySelector('[data-testid="apps-tab-ask"]')).toBeNull();
    openApps(container);
    const shelf = container.querySelector('[data-testid="apps-tab-shelf"]') as HTMLButtonElement;
    const askTab = container.querySelector('[data-testid="apps-tab-ask"]') as HTMLButtonElement;
    expect(shelf?.textContent).toBe(APPS_SHELF_TITLE);
    expect(askTab?.textContent).toBe('Ask for an enhancement.');
    expect(container.querySelector('[data-testid="get-apps"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="ask-page"]')).toBeNull();

    act(() => {
      askTab.click();
    });

    expect(window.location.pathname).toBe('/asks');
    expect(container.querySelector('[data-testid="hub-home"]')?.getAttribute('data-pane')).toBe('apps');
    expect(container.querySelector('[data-testid="hub-nav-apps"]')?.getAttribute('aria-current')).toBe('page');
    expect(container.querySelector('[data-testid="ask-page"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="get-apps"]')).toBeNull();
    expect(container.querySelector('[data-testid="ask-app-eatery"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="ask-app-grid"]')?.textContent).not.toContain(GET_LABEL);
    expect(container.querySelector('[data-testid="ask-app-grid"]')?.textContent).not.toContain(SOON_LABEL);
    expect(container.querySelector('[data-testid="eatery-place-row"]')).toBeNull();
    expect(container.textContent).not.toMatch(/\b(peer|node|DID|DHT|wallet|MCP|npm|GossipSub|CRDT|mesh|hydrate|neon|Defect|Support)\b/i);
    expect(container.textContent).not.toContain("Something's wrong");
    expect(container.querySelector('input[type="file"]')).toBeNull();

    act(() => {
      (container.querySelector('[data-testid="ask-app-eatery"]') as HTMLButtonElement).click();
    });
    expect(container.querySelector('[data-testid="ask-choice-roster"]')).toBeNull();
    expect(container.querySelector('[data-testid="ask-choice-services"]')?.textContent).toBe('Services');
    act(() => {
      (container.querySelector('[data-testid="ask-choice-services"]') as HTMLButtonElement).click();
    });
    expect(container.querySelector('[data-testid="ask-choice-tables"]')).toBeNull();
    expect(container.querySelector('[data-testid="ask-choice-roster"]')?.textContent).toBe('Roster');
    act(() => {
      (container.querySelector('[data-testid="ask-choice-roster"]') as HTMLButtonElement).click();
    });
    expect(container.querySelector('[data-testid="ask-still"]')).toBeNull();
    expect(container.querySelector('[data-testid="ask-body"]')?.tagName).toBe('INPUT');
    expect(container.querySelector('[data-testid="ask-ask"]')?.textContent).toBe('Ask.');
    typeInto(container.querySelector('[data-testid="ask-body"]') as HTMLInputElement, 'A quieter Friday close');
    await act(async () => {
      (container.querySelector('[data-testid="ask-raise-form"]') as HTMLFormElement).requestSubmit();
    });
    expect(container.querySelector('[data-testid="ask-asked"]')?.textContent).toBe('Asked.');
    const stored = JSON.parse(localStorage.getItem('daup:hub:ask_requests') || '[]');
    expect(stored[0].app).toBe('eatery');
    expect(stored[0].pageId).toBe('roster');
    expect(stored[0].houseName).toBeUndefined();

    act(() => {
      (container.querySelector('[data-testid="apps-tab-shelf"]') as HTMLButtonElement).click();
    });
    expect(window.location.pathname).toBe('/');
    expect(container.querySelector('[data-testid="get-apps"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="ask-page"]')).toBeNull();
    expect(container.querySelector('[data-testid="hub-home"]')?.getAttribute('data-pane')).toBe('apps');
    unmount();
  });
});

describe('signed-in hub does not assume eatery', () => {
  beforeEach(() => {
    resetIdentityVault();
    localStorage.clear();
    window.history.replaceState({}, '', '/');
  });

  it('signed-in with no house lands on empty Places, not the wizard', async () => {
    localStorage.setItem(OWNER_SESSION_STORAGE_KEY, JSON.stringify({
      email: 'owner@theolive.co.za',
      signedInAt: Date.now()
    }));
    const { container, unmount } = render(<App />);
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 80));
    });

    expect(container.querySelector('[data-testid="hub-home"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="hub-home"]')?.getAttribute('data-pane')).toBe('places');
    expect(container.querySelector('[data-testid="hub-wizard"]')).toBeNull();
    expect(container.querySelector('[data-testid="eatery-place-row"]')).toBeNull();
    expect(container.querySelector('[data-testid="open-the-house"]')).toBeNull();
    expect(container.textContent).toContain(YOUR_PLACES_KICKER);
    expect(container.querySelector('[data-testid="your-places-empty-copy"]')?.textContent).toBe(YOUR_PLACES_EMPTY);
    expect(container.querySelector('[data-testid="register-new-house"]')?.textContent).toBe(PLUS_REGISTER_LABEL);
    expect(container.textContent).not.toContain(REGISTER_A_NEW_HOUSE_LABEL);
    expect(container.querySelector('[data-testid="on-the-chain"]')).toBeNull();
    expect(container.textContent).not.toContain('On the chain.');
    openApps(container);
    expect(container.querySelector('[data-testid="hub-home"]')?.getAttribute('data-pane')).toBe('apps');
    expect(container.querySelector('[data-testid="get-apps"]')?.textContent).toContain(APPS_SHELF_TITLE);
    expect(container.querySelector('[data-testid="get-app-eatery"]')?.textContent).toContain('Eatery');
    expect(container.querySelector('[data-testid="get-app-eatery"]')?.textContent).toContain(GET_LABEL);
    expect(container.querySelector('[data-testid="get-app-eatout"]')?.textContent).toContain('Eat Out');
    expect(container.querySelector('[data-testid="get-app-eatout"]')?.textContent).toContain(GET_LABEL);
    expect(container.querySelector('[data-testid="coming-app-eatin"]')?.textContent).toContain(SOON_LABEL);
    expect(container.querySelector('[data-testid="get-app-project"]')?.textContent).toContain('Project');
    expect(container.querySelector('[data-testid="get-app-project"]')?.textContent).toContain(GET_LABEL);
    expect(container.querySelector('[data-testid="get-app-chat"]')?.textContent).toContain('Chat');
    expect(container.querySelector('[data-testid="get-app-chat"]')?.textContent).toContain(GET_LABEL);
    expect(container.querySelector('[data-testid="get-app-vault"]')?.textContent).toContain('Vault');
    expect(container.querySelector('[data-testid="get-app-vault"]')?.textContent).toContain(GET_LABEL);
    expect(container.querySelector('[data-testid="get-app-property"]')?.textContent).toContain('Property');
    expect(container.querySelector('[data-testid="get-app-property"]')?.textContent).toContain(GET_LABEL);
    expect(container.querySelector('[data-testid="get-apps"]')?.textContent).not.toContain('LIVE');
    expect(container.querySelector('[data-testid="get-apps"]')?.textContent).not.toContain('Social.');
    expect(container.querySelector('[data-testid="get-apps"]')?.textContent).not.toContain('Paid.');
    expect(container.textContent).not.toMatch(/rental/i);
    expect(container.querySelector('[data-testid="on-the-chain"]')).toBeNull();
    expect(container.querySelector('[data-testid="ask-for-enhancement"]')).toBeNull();
    expect(container.querySelector('[data-testid="delete-the-house"]')).toBeNull();
    expect(container.querySelector('[data-testid="apps-tab-ask"]')?.textContent).toBe('Ask for an enhancement.');
    openYou(container);
    expect(container.querySelector('[data-testid="apps-tab-ask"]')).toBeNull();
    expect(container.querySelector('[data-testid="delete-the-house"]')).toBeNull();
    expect(container.textContent).not.toContain(WHERE_IS_THE_EATERY);
    expect(container.textContent).not.toMatch(/\b(peer|node|DID|DHT|wallet|MCP|npm|hydrate|neon)\b/i);
    expect(container.textContent).not.toContain('Marketplace');
    expect(HUB_DOOR_BODY).toBe('For South African food-business owners. You run the business. Staff join on WhatsApp.');
    unmount();
  });

  it('Register a new house. opens Create your company / place', async () => {
    localStorage.setItem(OWNER_SESSION_STORAGE_KEY, JSON.stringify({
      email: 'owner@theolive.co.za',
      signedInAt: Date.now()
    }));
    const { container, unmount } = render(<App />);
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 80));
    });

    expect(container.querySelector('[data-testid="hub-home"]')).toBeTruthy();
    act(() => {
      (container.querySelector('[data-testid="register-new-house"]') as HTMLButtonElement).click();
    });

    expect(container.querySelector('[data-testid="hub-wizard"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="hub-wizard"]')?.textContent).toContain(WHERE_IS_THE_EATERY);
    expect(container.querySelector('#place-name')).toBeTruthy();
    expect(container.querySelector('[data-testid="back-to-your-hub"]')?.textContent).toBe('Back to your hub.');
    expect(container.querySelector('[data-testid="hub-home"]')).toBeNull();

    act(() => {
      (container.querySelector('[data-testid="back-to-your-hub"]') as HTMLButtonElement).click();
    });
    expect(container.querySelector('[data-testid="hub-home"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="hub-wizard"]')).toBeNull();
    unmount();
  });

  it('returning owner with a house stays on Places', async () => {
    saveIdentityVault(houseVault);
    localStorage.setItem(OWNER_SESSION_STORAGE_KEY, JSON.stringify({
      email: 'owner@theolive.co.za',
      signedInAt: Date.now()
    }));
    const { container, unmount } = render(<App />);
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 80));
    });

    expect(container.querySelector('[data-testid="hub-home"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="hub-home"]')?.getAttribute('data-pane')).toBe('places');
    expect(container.querySelector('[data-testid="hub-wizard"]')).toBeNull();
    expect(container.querySelector('[data-testid="hub-context-place"]')?.textContent).toContain('The Olive');
    expect(container.querySelector('[data-testid="hub-home-open"]')).toBeNull();
    expect(container.querySelector('[data-testid="register-new-house"]')).toBeNull();
    expect(container.querySelector('[data-testid="delete-the-house"]')?.textContent).toBe(DELETE_THE_HOUSE_LABEL);
    expect(container.querySelector('[data-testid="eatery-place-name"]')?.textContent).toContain('The Olive');
    expect(container.querySelector('[data-testid="eatery-place-city"]')?.textContent).toBe('Stellenbosch');
    expect(container.querySelector('[data-testid="open-the-house"]')?.textContent).toBe(OPEN_LABEL);
    openYou(container);
    expect(container.querySelector('[data-testid="hub-settings"]')).toBeNull();
    expect(container.querySelector('[data-testid="hub-you"]')?.textContent).not.toContain(DELETE_THE_HOUSE_LABEL);
    expect(container.querySelector('[data-testid="delete-the-house"]')).toBeNull();
    expect(container.textContent).not.toContain(WHERE_IS_THE_EATERY);
    expect(container.textContent).not.toMatch(/\b(peer|node|DID|DHT|wallet|MCP|npm|hydrate|neon)\b/i);
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
    expect(container.querySelector('[data-testid="hub-home"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="apps-tab-ask"]')).toBeNull();
    act(() => {
      (container.querySelector('[data-testid="register-new-house"]') as HTMLButtonElement).click();
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
    expect(container.querySelector('[data-testid="hub-home"]')?.getAttribute('data-pane')).toBe('apps');
    expect(container.querySelector('[data-testid="apps-tab-ask"]')?.getAttribute('aria-selected')).toBe('true');
    expect(container.querySelector('[data-testid="ask-page"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="get-apps"]')).toBeNull();
    expect(container.querySelector('[data-testid="ask-app-eatery"]')).toBeTruthy();
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

    document.cookie = 'daup_owner=legacy-owner-token; Path=/';

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

    expect(container.querySelector('[data-testid="hub-home"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="eatery-place-row"]')).toBeNull();
    expect(container.querySelector('[data-testid="hub-email-door"]')).toBeNull();
    expect(container.querySelector('[data-testid="hub-wizard"]')).toBeNull();
    expect(container.querySelector('[data-testid="your-places-empty"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="your-places-empty-copy"]')?.textContent).toBe(YOUR_PLACES_EMPTY);
    expect(container.querySelector('[data-testid="register-new-house"]')?.textContent).toBe(PLUS_REGISTER_LABEL);
    expect(container.querySelector('[data-testid="eatery-place-status"]')).toBeNull();
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
    const register = container.querySelector('[data-testid="register-another-place"]') as HTMLButtonElement;
    expect(register).toBeTruthy();
    expect(register.textContent).toBe(PLUS_REGISTER_LABEL);

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

    const open = container.querySelector('[data-testid="open-the-house"]') as HTMLButtonElement;
    act(() => {
      open?.click();
    });
    const eateryOpen = container.querySelector('[data-testid="open-place-app-eatery"]') as HTMLAnchorElement;
    const href = eateryOpen?.getAttribute('href') || '';
    const hints = new URL(href, 'https://eatery.daup.co.za');
    expect(hints.origin).toBe('https://eatery.daup.co.za');
    expect(hints.pathname).toBe('/d/hub');
    expect(hints.searchParams.get(HANDOFF_EMAIL_HINT)).toBe('owner@theolive.co.za');
    expect(hints.searchParams.get(HANDOFF_HOUSE_HINT)).toBe('The Olive');
    expect(hints.searchParams.has('houseRedeem')).toBe(false);
    expect(hints.searchParams.has('token')).toBe(false);
    expect(handoffPresentsCredential(href)).toBe(false);
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

describe('My places stays owned-only after register and delete', () => {
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

    expect(container.querySelector('[data-testid="hub-home"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="hub-wizard"]')).toBeNull();
    act(() => {
      (container.querySelector('[data-testid="register-new-house"]') as HTMLButtonElement).click();
    });
    expect(container.querySelector('[data-testid="hub-wizard"]')).toBeTruthy();
    typeInto(container.querySelector('#place-name') as HTMLInputElement, 'The Olive');
    typeInto(container.querySelector('#country') as HTMLInputElement, 'South Africa');
    typeInto(container.querySelector('#province') as HTMLInputElement, 'Western Cape');
    typeInto(container.querySelector('#city') as HTMLInputElement, 'Stellenbosch');
    clickContinue(container);

    expect(container.querySelector('[data-testid="enable-apps"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="enable-app-chat"]')?.textContent).toContain('Chat');
    expect(container.querySelector('[data-testid="enable-app-chat"]')?.textContent).toContain('LIVE');
    expect(container.querySelector('[data-testid="enable-app-vault"]')?.textContent).toContain('Vault');
    expect(container.querySelector('[data-testid="enable-app-vault"]')?.textContent).toContain('LIVE');
    expect(container.querySelector('[data-testid="enable-app-property"]')?.textContent).toContain('Property');
    expect(container.querySelector('[data-testid="enable-app-property"]')?.textContent).toContain('LIVE');
    expect(container.querySelector('[data-testid="enable-app-property"]')?.textContent).not.toMatch(/rental/i);
    expect(Array.from(container.querySelectorAll('[data-testid^="enable-app-"]'))
      .map(el => el.getAttribute('data-testid'))).toEqual([
      'enable-app-eatery',
      'enable-app-project',
      'enable-app-finance',
      'enable-app-trade',
      'enable-app-vault',
      'enable-app-property',
      'enable-app-farm',
      'enable-app-reseller',
      'enable-app-maker',
      'enable-app-chat'
    ]);
    expect(container.querySelector('[data-testid="enable-app-farm"]')?.textContent).toContain('Coming');
    expect(container.querySelector('[data-testid="enable-app-eatout"]')).toBeNull();
    act(() => {
      (container.querySelector('[data-testid="enable-app-eatery"]') as HTMLButtonElement).click();
    });
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
    expect(container.querySelector('[data-testid="eatery-place-name"]')?.textContent).toContain('The Olive');
    expect(container.querySelector('[data-testid="on-the-chain"]')).toBeNull();
    expect(container.textContent).not.toContain('On the chain.');
    const registered = listRegisteredPlaces()[0];
    expect(registered).toMatchObject({
      placeName: 'The Olive',
      app: 'eatery',
      country: 'South Africa',
      region: 'Western Cape',
      city: 'Stellenbosch',
      enabledApps: ['eatery']
    });
    expect(registered.companyId).toMatch(/^co_/);
    expect(bindCompanyId(registered.companyId).minted).toBe(false);
    expect(bindCompanyId(registered.companyId).companyId).toBe(registered.companyId);
    expect(loadTrialEvent(registered.companyId || '')?.event).toBe(PLACE_TRIAL_STARTED);
    expect(loadIdentityVault().companyNode?.companyId).toBe(registered.companyId);
    expect(loadIdentityVault().seednode).toMatchObject({
      endpoint: 'https://mcp.daup.co.za',
      mode: 'hosted',
      companyId: registered.companyId
    });
    expect(container.textContent).not.toMatch(/\b(peer|node|DID|DHT|wallet|MCP|npm|hydrate|neon)\b/i);
    unmount();
  });

  it('registers a non-eatery place and persists enabled_apps', async () => {
    const { container, unmount } = render(<App />);
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 80));
    });

    act(() => {
      (container.querySelector('[data-testid="register-new-house"]') as HTMLButtonElement).click();
    });
    typeInto(container.querySelector('#place-name') as HTMLInputElement, 'Green Field');
    typeInto(container.querySelector('#country') as HTMLInputElement, 'Kenya');
    typeInto(container.querySelector('#province') as HTMLInputElement, 'Nairobi');
    typeInto(container.querySelector('#city') as HTMLInputElement, 'Nairobi');
    clickContinue(container);
    act(() => {
      (container.querySelector('[data-testid="enable-app-farm"]') as HTMLButtonElement).click();
    });
    clickContinue(container);
    typeInto(container.querySelector('#phone') as HTMLInputElement, '+254700000000');
    clickContinue(container);
    clickContinue(container);
    act(() => {
      (container.querySelector('[data-testid="see-your-apps"]') as HTMLButtonElement | null)?.click();
    });
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 80));
    });

    const registered = listRegisteredPlaces()[0];
    expect(registered).toMatchObject({
      placeName: 'Green Field',
      app: 'farm',
      country: 'Kenya',
      region: 'Nairobi',
      city: 'Nairobi',
      enabledApps: ['farm']
    });
    expect(registered.companyId).toMatch(/^co_/);
    expect(container.querySelector('[data-testid="eatery-place-name"]')?.textContent).toContain('Green Field');
    expect(container.querySelector('[data-testid="on-the-chain"]')).toBeNull();
    expect(container.querySelector('[data-testid="hub-home-open"]')).toBeNull();
    openApps(container);
    expect(container.querySelector('[data-testid="get-app-eatery"]')?.textContent).toContain('Eatery');
    expect(container.querySelector('[data-testid="get-app-eatery"]')?.textContent).toContain(GET_LABEL);
    expect(container.querySelector('[data-testid="open-app-eatery"]')).toBeNull();
    expect(loadIdentityVault().companyNode?.enabledApps).toEqual(['farm']);
    expect(container.textContent).not.toMatch(/\b(peer|node|DID|DHT|wallet|MCP|npm|hydrate|neon)\b/i);
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

    expect(container.querySelector('[data-testid="eatery-place-name"]')?.textContent).toContain('The Olive');
    expect(container.querySelector('[data-testid="on-the-chain"]')).toBeNull();
    expect(listRegisteredPlaces()).toHaveLength(1);

    act(() => {
      (container.querySelector('[data-testid="delete-the-house"]') as HTMLButtonElement).click();
    });
    typeInto(container.querySelector('[data-testid="delete-house-name"]') as HTMLInputElement, 'The Olive');
    act(() => {
      (container.querySelector('[data-testid="delete-house-confirm"]') as HTMLButtonElement).click();
    });

    expect(listRegisteredPlaces()).toEqual([]);
    expect(container.querySelector('[data-testid="hub-home"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="hub-wizard"]')).toBeNull();
    expect(container.querySelector('[data-testid="on-the-chain"]')).toBeNull();
    expect(container.querySelector('[data-testid="your-places-empty"]')).toBeTruthy();
    unmount();
  });
});

describe('Advanced is protocol only', () => {
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

  it('keeps Marketplace and app subscribe off Advanced', async () => {
    const { container, unmount } = render(<App />);
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 80));
    });

    expect(container.querySelector('[data-testid="hub-home"]')?.getAttribute('data-pane')).toBe('places');
    expect(container.querySelector('[data-testid="get-apps"]')).toBeNull();
    openApps(container);
    expect(container.querySelector('[data-testid="get-apps"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="owner-advanced-nav"]')).toBeNull();
    expect(Array.from(container.querySelectorAll('button')).some(button =>
      (button.textContent || '').trim() === 'Advanced'
    )).toBe(false);

    openYou(container);
    const advanced = container.querySelector('[data-testid="hub-advanced"]') as HTMLButtonElement | null;
    expect(advanced?.textContent).toBe('Advanced');
    act(() => {
      advanced?.click();
    });

    const nav = container.querySelector('[data-testid="owner-advanced-nav"]');
    expect(nav).toBeTruthy();
    expect(nav?.textContent).toContain('Licenses');
    expect(nav?.textContent).toContain('MCP');
    expect(nav?.textContent).not.toContain('Marketplace');
    expect(nav?.textContent).not.toContain('Other apps');
    expect(nav?.textContent).not.toContain(GET_APPS_KICKER);
    expect(nav?.textContent).not.toMatch(/Subscribe/i);
    expect(container.querySelector('[data-testid="get-apps"]')).toBeNull();

    const licenses = Array.from(nav?.querySelectorAll('button') || []).find(button =>
      (button.textContent || '').includes('Licenses')
    );
    act(() => {
      licenses?.click();
    });
    expect(container.querySelector('[data-testid="hub-home"]')).toBeNull();
    expect(container.querySelector('[data-testid="get-apps"]')).toBeNull();
    expect(container.querySelector('[data-testid="on-the-chain"]')).toBeNull();
    expect(container.textContent).not.toContain('Marketplace');
    expect(container.textContent).not.toContain('Get apps.');
    expect(container.textContent).not.toContain('On the chain.');
    unmount();
  });
});

describe('Your places. from the house node', () => {
  function mockHouseList(places: unknown[]) {
    vi.stubGlobal('fetch', vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body || '{}'));
      expect(body.params.name).toBe('places_list_by_email');
      expect(body.params.arguments.ownerEmail).toBe('you@gmail.com');
      return new Response(JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        result: {
          content: [{
            type: 'text',
            text: JSON.stringify({ email: 'you@gmail.com', places })
          }]
        }
      }), { status: 200, headers: { 'content-type': 'application/json' } });
    }));
  }

  beforeEach(() => {
    resetIdentityVault();
    localStorage.clear();
    expireOwnerCookie();
    window.history.replaceState({}, '', '/');
  });

  afterEach(() => {
    vi.stubGlobal('fetch', vi.fn(async () => {
      throw new TypeError('Failed to fetch');
    }));
  });

  it('restores Kortrijk on Your places. after email when the house list returns it', async () => {
    mockHouseList([{
      placeId: 'place-kortrijk',
      ownerEmail: 'you@gmail.com',
      placeName: 'Kortrijk',
      app: 'eatery',
      country: 'South Africa',
      region: 'Western Cape',
      city: 'Stellenbosch'
    }]);

    const { container, unmount } = render(<App />);
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 80));
    });

    expect(container.querySelector('[data-testid="hub-email-door"]')).toBeTruthy();
    typeInto(container.querySelector('#hub-email') as HTMLInputElement, 'you@gmail.com');
    await act(async () => {
      Simulate.submit(container.querySelector('[data-testid="hub-email-form"]') as HTMLFormElement);
      await new Promise(resolve => setTimeout(resolve, 40));
    });

    expect(container.querySelector('[data-testid="hub-home"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="hub-home"]')?.getAttribute('data-pane')).toBe('places');
    expect(container.querySelector('[data-testid="hub-context-place"]')?.textContent).toContain('Kortrijk');
    expect(container.querySelector('[data-testid="your-places-empty"]')).toBeNull();
    expect(container.querySelector('[data-testid="eatery-place-name"]')?.textContent).toContain('Kortrijk');
    expect(listRegisteredPlaces()[0]).toMatchObject({
      placeName: 'Kortrijk',
      placeId: 'place-kortrijk',
      ownerEmail: 'you@gmail.com'
    });
    expect(container.textContent).not.toMatch(/\b(peer|node|DID|DHT|wallet|MCP|npm|hydrate|neon)\b/i);
    unmount();
  });

  it('keeps No house on this hub yet. when the house list is unreachable', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => {
      throw new TypeError('Failed to fetch');
    }));

    const { container, unmount } = render(<App />);
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 80));
    });

    typeInto(container.querySelector('#hub-email') as HTMLInputElement, 'you@gmail.com');
    await act(async () => {
      Simulate.submit(container.querySelector('[data-testid="hub-email-form"]') as HTMLFormElement);
      await new Promise(resolve => setTimeout(resolve, 40));
    });

    expect(container.querySelector('[data-testid="hub-home"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="eatery-place-row"]')).toBeNull();
    expect(container.querySelector('[data-testid="your-places-empty-copy"]')?.textContent).toBe(YOUR_PLACES_EMPTY);
    expect(container.querySelector('[data-testid="your-places-unreachable"]')).toBeNull();
    expect(container.textContent).not.toMatch(/\b(peer|node|DID|DHT|wallet|MCP|npm|hydrate|neon)\b/i);
    unmount();
  });

  it('Log off. wipes local Hub data so the next email sign-in asks the house list again', async () => {
    saveIdentityVault(houseVault);
    localStorage.setItem(OWNER_SESSION_STORAGE_KEY, JSON.stringify({
      email: 'you@gmail.com',
      signedInAt: Date.now()
    }));
    registerPlaceOnPlatform({
      placeName: 'The Olive',
      app: 'eatery',
      country: 'South Africa',
      region: 'Western Cape',
      city: 'Stellenbosch',
      placeId: 'place-olive',
      ownerEmail: 'you@gmail.com'
    });
    mockHouseList([{
      placeId: 'place-kortrijk',
      ownerEmail: 'you@gmail.com',
      placeName: 'Kortrijk',
      app: 'eatery',
      country: 'South Africa',
      region: 'Western Cape',
      city: 'Stellenbosch'
    }]);

    const { container, unmount } = render(<App />);
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 80));
    });

    expect(container.querySelector('[data-testid="hub-context-place"]')?.textContent).toContain('The Olive');
    openYou(container);
    act(() => {
      (container.querySelector('[data-testid="hub-log-off"]') as HTMLButtonElement).click();
    });

    expect(container.querySelector('[data-testid="hub-email-door"]')).toBeTruthy();
    expect(listRegisteredPlaces()).toEqual([]);

    typeInto(container.querySelector('#hub-email') as HTMLInputElement, 'you@gmail.com');
    await act(async () => {
      Simulate.submit(container.querySelector('[data-testid="hub-email-form"]') as HTMLFormElement);
      await new Promise(resolve => setTimeout(resolve, 40));
    });

    expect(container.querySelector('[data-testid="hub-context-place"]')?.textContent).toContain('Kortrijk');
    openPlaces(container);
    expect(container.querySelector('[data-testid="eatery-place-name"]')?.textContent).toContain('Kortrijk');
    expect(listRegisteredPlaces()[0]).toMatchObject({
      placeName: 'Kortrijk',
      placeId: 'place-kortrijk'
    });
    expect((fetch as unknown as { mock: { calls: unknown[] } }).mock.calls.length).toBeGreaterThan(0);
    unmount();
  });

  it('Delete the house. unregisters and deletes house state, then clears local', async () => {
    saveIdentityVault(houseVault);
    localStorage.setItem(OWNER_SESSION_STORAGE_KEY, JSON.stringify({
      email: 'you@gmail.com',
      signedInAt: Date.now()
    }));
    registerPlaceOnPlatform({
      placeName: 'The Olive',
      app: 'eatery',
      country: 'South Africa',
      region: 'Western Cape',
      city: 'Stellenbosch',
      placeId: 'place-reseed-now',
      ownerEmail: 'you@gmail.com'
    });

    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body || '{}'));
      return new Response(JSON.stringify({
        jsonrpc: '2.0',
        id: body.id || 1,
        result: { content: [{ type: 'text', text: JSON.stringify({ ok: true }) }] }
      }), { status: 200, headers: { 'content-type': 'application/json' } });
    });
    vi.stubGlobal('fetch', fetchMock);

    const { container, unmount } = render(<App />);
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 80));
    });

    act(() => {
      (container.querySelector('[data-testid="delete-the-house"]') as HTMLButtonElement).click();
    });
    typeInto(container.querySelector('[data-testid="delete-house-name"]') as HTMLInputElement, 'The Olive');
    await act(async () => {
      (container.querySelector('[data-testid="delete-house-confirm"]') as HTMLButtonElement).click();
      await new Promise(resolve => setTimeout(resolve, 40));
    });

    const calls = fetchMock.mock.calls.map(call => JSON.parse(String(call[1]?.body || '{}')));
    const names = calls.map(body => body.params.name);
    expect(names).toContain(HOUSE_MCP_TOOLS.unregister);
    expect(names).toContain(HOUSE_MCP_TOOLS.deleteState);
    const held = { ownerEmail: 'you@gmail.com', placeId: 'place-reseed-now' };
    const unregisterCall = calls.find(body => body.params?.name === HOUSE_MCP_TOOLS.unregister);
    expect(unregisterCall?.params.arguments).toEqual(held);
    expect(unregisterCall?.params.arguments).not.toHaveProperty('placeName');
    const stateCall = calls.find(body => body.params?.name === HOUSE_MCP_TOOLS.deleteState);
    expect(stateCall?.params.arguments).toEqual(held);
    expect(held.placeId).not.toBe('3b2ee9b8-8c92-4cda-a862-66fe10fc6f59');
    expect(listRegisteredPlaces()).toEqual([]);
    expect(container.querySelector('[data-testid="your-places-empty-copy"]')?.textContent).toBe(YOUR_PLACES_EMPTY);
    expect(container.textContent).not.toMatch(/\b(peer|node|DID|DHT|wallet|MCP|npm|hydrate|neon)\b/i);
    unmount();
  });
});

async function finishPlaceWizard(
  container: HTMLElement,
  place: { name: string; country: string; province: string; city: string; phone: string; app: string }
) {
  typeInto(container.querySelector('#place-name') as HTMLInputElement, place.name);
  typeInto(container.querySelector('#country') as HTMLInputElement, place.country);
  typeInto(container.querySelector('#province') as HTMLInputElement, place.province);
  typeInto(container.querySelector('#city') as HTMLInputElement, place.city);
  clickContinue(container);
  act(() => {
    (container.querySelector(`[data-testid="enable-app-${place.app}"]`) as HTMLButtonElement).click();
  });
  clickContinue(container);
  typeInto(container.querySelector('#phone') as HTMLInputElement, place.phone);
  clickContinue(container);
  clickContinue(container);
  act(() => {
    (container.querySelector('[data-testid="see-your-apps"]') as HTMLButtonElement | null)?.click();
  });
  await act(async () => {
    await new Promise(resolve => setTimeout(resolve, 80));
  });
}

describe('P0/P1 place list and control plane', () => {
  beforeEach(() => {
    resetIdentityVault();
    localStorage.clear();
    window.history.replaceState({}, '', '/');
    localStorage.setItem(OWNER_SESSION_STORAGE_KEY, JSON.stringify({
      email: 'owner@theolive.co.za',
      signedInAt: Date.now()
    }));
  });

  it('creates a second place without wiping the first, then opens the control plane', async () => {
    const { container, unmount } = render(<App />);
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 80));
    });

    expect(container.querySelector('[data-testid="your-places-empty"]')).toBeTruthy();
    act(() => {
      (container.querySelector('[data-testid="register-new-house"]') as HTMLButtonElement).click();
    });
    await finishPlaceWizard(container, {
      name: 'The Olive',
      country: 'South Africa',
      province: 'Western Cape',
      city: 'Stellenbosch',
      phone: '+27820000000',
      app: 'eatery'
    });

    const first = listRegisteredPlaces().find(place => place.placeName === 'The Olive');
    const firstId = first?.companyId || '';
    expect(firstId).toMatch(/^co_/);
    expect(loadTrialEvent(firstId)?.event).toBe(PLACE_TRIAL_STARTED);
    expect(loadIdentityVault().companyNode?.companyId).toBe(firstId);

    expect(container.querySelector('[data-testid="eatery-place-name"]')?.textContent).toContain('The Olive');
    expect(container.querySelector('[data-testid="eatery-place-status"]')?.textContent)
      .toBe('30 days left on trial.');
    expect(container.querySelector('[data-testid="eatery-place-row"]')?.textContent)
      .not.toContain('No charge for 30 days.');
    expect(container.querySelector('[data-testid="eatery-place-row"]')?.textContent).not.toMatch(/R\d/);
    expect(container.querySelector('[data-testid="register-another-place"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="eatery-place-row"] [data-testid="register-another-place"]')).toBeNull();
    act(() => {
      (container.querySelector('[data-testid="register-another-place"]') as HTMLButtonElement).click();
    });
    expect(container.querySelector('[data-testid="hub-wizard"]')).toBeTruthy();
    await finishPlaceWizard(container, {
      name: 'Salt',
      country: 'South Africa',
      province: 'Western Cape',
      city: 'Cape Town',
      phone: '+27821111111',
      app: 'project'
    });

    const names = Array.from(container.querySelectorAll('[data-place-name]'))
      .map(row => row.getAttribute('data-place-name'));
    expect(names).toContain('The Olive');
    expect(names).toContain('Salt');
    const olive = listRegisteredPlaces().find(place => place.placeName === 'The Olive');
    const salt = listRegisteredPlaces().find(place => place.placeName === 'Salt');
    expect(olive?.companyId).toBe(firstId);
    expect(salt?.companyId).toMatch(/^co_/);
    expect(salt?.companyId).not.toBe(firstId);
    expect(loadIdentityVault().companyNode?.companyId).toBe(firstId);
    expect(loadTrialEvent(firstId)?.event).toBe(PLACE_TRIAL_STARTED);
    expect(loadTrialEvent(salt?.companyId || '')?.event).toBe(PLACE_TRIAL_STARTED);
    expect(loadTrialEvent(firstId)?.trial_started_at).not.toBe(loadTrialEvent(salt?.companyId || '')?.trial_started_at);

    const saltRow = Array.from(container.querySelectorAll('[data-place-name]'))
      .find(row => row.getAttribute('data-place-name') === 'Salt');
    act(() => {
      (saltRow?.querySelector('[data-testid="open-place"], [data-testid="open-the-house"]') as HTMLButtonElement | null)?.click();
    });
    expect(container.querySelector('[data-testid="place-detail"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="place-detail-name"]')?.textContent).toContain('Salt');
    expect(container.querySelector('[data-testid="place-tab-apps"]')?.getAttribute('aria-selected')).toBe('true');
    expect(container.querySelector('[data-testid="place-seed"]')).toBeNull();
    expect(container.querySelector('[data-testid="place-subscription"]')).toBeNull();
    expect(container.querySelector('[data-testid="open-place-app-project"]')?.className).toContain('shelf-tile');
    expect(container.querySelector('[data-testid="place-apps-shelf"]')?.className).toContain('apps-shelf');
    expect(container.querySelector('[data-testid="place-app-project"]')?.textContent).toContain('Project');
    expect(container.querySelector('[data-testid="place-app-project"]')?.textContent).not.toContain('LIVE');
    expect(container.querySelector('[data-testid="place-app-eatery"]')).toBeNull();
    expect(container.querySelector('[data-testid="on-the-chain"]')).toBeNull();

    act(() => {
      (container.querySelector('[data-testid="place-tab-subscription"]') as HTMLButtonElement).click();
    });
    expect(container.querySelector('[data-testid="place-tab-subscription"]')?.getAttribute('aria-selected')).toBe('true');
    expect(container.querySelector('[data-testid="place-apps"]')).toBeNull();
    expect(container.querySelector('[data-testid="place-seed"]')?.textContent).toContain('Seed.');
    expect(container.querySelector('[data-testid="seed-mode-hosted"]')).toBeNull();
    expect(container.querySelector('[data-testid="seed-mode-on-prem"]')).toBeNull();
    expect(container.querySelector('[data-testid="place-seed-host"]')?.textContent).toBe('Hosted.');
    expect(container.querySelector('[data-testid="place-seed-status"]')?.textContent).toBe('Status not checked yet.');
    expect(container.querySelector('[data-testid="check-seed"]')?.textContent).toBe('Check seed.');
    expect(container.querySelector('[data-testid="manage-seed"]')).toBeNull();
    expect(container.querySelector('[data-testid="place-detail"]')?.textContent).not.toMatch(/seednode/i);
    expect(container.querySelector('[data-testid="place-detail"]')?.textContent).not.toMatch(/\bnode\b/i);
    expect(container.querySelector('[data-testid="place-sub-status"]')?.textContent)
      .toBe('30 days left on trial.');
    expect(container.querySelector('[data-testid="place-sub-date"]')?.textContent).toMatch(/^Ends /);
    expect(container.querySelector('[data-testid="place-sub-trial"]')?.textContent).toBe('No charge for 30 days.');
    expect(container.querySelector('[data-testid="plan-place"]')?.textContent).toBe('This place. R199 a month.');
    expect(container.querySelector('[data-testid="plan-hosted-seed"]')?.textContent).toBe('Hosted seed. R299 a month.');
    expect(container.querySelector('[data-testid="plan-both"]')?.textContent).toBe('Both. R498 a month.');
    expect(container.querySelector('[data-testid="place-sub-meters"]')).toBeNull();
    expect(container.textContent).not.toMatch(/\b(peer|DID|DHT|wallet|MCP|npm|hydrate|neon)\b/i);
    expect(container.textContent).not.toContain('co_');

    expect(container.querySelector('[data-testid="place-seed-host"]')?.textContent).toBe('Hosted.');
    expect(container.querySelector('[data-testid="download-seed-setup"]')).toBeNull();
    expect(container.querySelector('[data-testid="plan-hosted-seed"]')?.textContent).toBe('Hosted seed. R299 a month.');
    expect(loadSeednodeForPlace(salt?.companyId || '')?.mode).toBe('hosted');

    act(() => {
      (container.querySelector('[data-testid="back-to-places"]') as HTMLButtonElement).click();
    });
    expect(container.querySelector('[data-testid="place-detail"]')).toBeNull();
    expect(Array.from(container.querySelectorAll('[data-place-name]')).map(row => row.getAttribute('data-place-name')))
      .toEqual(expect.arrayContaining(['The Olive', 'Salt']));

    act(() => {
      (container.querySelector('[data-testid="open-the-house"]') as HTMLButtonElement).click();
    });
    expect(container.querySelector('[data-testid="place-detail-name"]')?.textContent).toContain('The Olive');
    expect(container.querySelector('[data-testid="place-app-eatery"]')?.textContent).toContain('Eatery');
    expect(loadIdentityVault().companyNode?.companyId).toBe(firstId);
    unmount();
  });
});

describe('My places subscription display and Add apps.', () => {
  const day = 24 * 60 * 60 * 1000;

  beforeEach(() => {
    resetIdentityVault();
    localStorage.clear();
    window.history.replaceState({}, '', '/');
    saveIdentityVault({
      ...houseVault,
      companyNode: {
        companyId: 'co_olive',
        enabledApps: ['eatery'],
        billableLocations: 1
      }
    });
    localStorage.setItem(OWNER_SESSION_STORAGE_KEY, JSON.stringify({
      email: 'owner@theolive.co.za',
      signedInAt: Date.now()
    }));
    registerPlaceOnPlatform({
      placeName: 'The Olive',
      app: 'eatery',
      country: 'South Africa',
      region: 'Western Cape',
      city: 'Stellenbosch',
      companyId: 'co_olive',
      enabledApps: ['eatery'],
      ownerEmail: 'owner@theolive.co.za'
    });
    saveNodeEntitlement({
      companyId: 'co_olive',
      node_subscription_status: 'trial',
      trial_started_at: Date.now() - 18 * day,
      trial_ends_at: Date.now() + 12 * day,
      enabled_apps: ['eatery'],
      billable_locations: 1,
      payment_method_ok: false
    });
  });

  it('shows days left on the My places card and keeps the price off it', async () => {
    const { container, unmount } = render(<App />);
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 80));
    });

    const card = container.querySelector('[data-testid="eatery-place-row"]');
    expect(card?.textContent).not.toMatch(/R\d/);
    expect(card?.textContent).not.toContain('No charge for 30 days.');
    expect(card?.textContent).not.toContain('LIVE');
    expect(card?.textContent).not.toContain('Paystack');
    expect(container.querySelector('[data-testid="eatery-place-status"]')?.textContent)
      .toMatch(/\d+ days left on trial\./);
    expect(container.querySelector('[data-testid="eatery-place-city"]')?.textContent).toBe('Stellenbosch');
    expect(container.textContent).not.toMatch(/\b(peer|DID|DHT|wallet|MCP|npm|hydrate|neon|node|co_)\b/i);
    unmount();
  });

  it('renames the place on the tile', async () => {
    const { container, unmount } = render(<App />);
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 80));
    });

    act(() => {
      (container.querySelector('[data-testid="edit-place-name"]') as HTMLButtonElement).click();
    });
    const input = container.querySelector('[data-testid="edit-place-name-input"]') as HTMLInputElement;
    expect(input.value).toBe('The Olive');
    typeInto(input, 'The Grove');
    act(() => {
      (container.querySelector('[data-testid="cancel-place-name"]') as HTMLButtonElement).click();
    });
    expect(container.querySelector('[data-testid="eatery-place-name"]')?.textContent).toContain('The Olive');

    act(() => {
      (container.querySelector('[data-testid="edit-place-name"]') as HTMLButtonElement).click();
    });
    typeInto(container.querySelector('[data-testid="edit-place-name-input"]') as HTMLInputElement, 'The Grove');
    act(() => {
      (container.querySelector('[data-testid="save-place-name"]') as HTMLButtonElement).click();
    });
    expect(container.querySelector('[data-testid="eatery-place-name"]')?.textContent).toContain('The Grove');
    expect(listRegisteredPlaces().some(place => place.placeName === 'The Grove')).toBe(true);
    expect(container.querySelector('[data-testid="place-detail"]')).toBeNull();
    unmount();
  });

  it('edits the place location on the Location tab', async () => {
    const { container, unmount } = render(<App />);
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 80));
    });

    act(() => {
      (container.querySelector('[data-testid="open-the-house"]') as HTMLButtonElement).click();
    });
    act(() => {
      (container.querySelector('[data-testid="place-tab-location"]') as HTMLButtonElement).click();
    });
    expect(container.querySelector('[data-testid="place-location-line"]')?.textContent).toContain('Stellenbosch');
    expect(container.querySelector('[data-testid="place-location"] input')).toBeNull();
    expect(container.querySelector('[data-testid="place-location"]')?.textContent).not.toMatch(/R\d/);
    expect(container.querySelector('[data-testid="pay-with-paystack"]')).toBeNull();
    act(() => {
      (container.querySelector('[data-testid="edit-place-location"]') as HTMLButtonElement).click();
    });
    typeInto(container.querySelector('[data-testid="place-location-city"]') as HTMLInputElement, 'Franschhoek');
    act(() => {
      (container.querySelector('[data-testid="save-place-location"]') as HTMLButtonElement).click();
    });
    expect(container.querySelector('[data-testid="place-location-line"]')?.textContent).toContain('Franschhoek');
    act(() => {
      (container.querySelector('[data-testid="back-to-places"]') as HTMLButtonElement).click();
    });
    expect(container.querySelector('[data-testid="eatery-place-city"]')?.textContent).toBe('Franschhoek');
    unmount();
  });

  it('adds a missing app from place detail and blocks a second instance', async () => {
    const { container, unmount } = render(<App />);
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 80));
    });

    act(() => {
      (container.querySelector('[data-testid="open-the-house"]') as HTMLButtonElement).click();
    });
    expect(container.querySelector('[data-testid="place-tab-apps"]')?.getAttribute('aria-selected')).toBe('true');
    expect(container.querySelector('[data-testid="show-add-apps"]')?.textContent).toBe(ADD_APPS_LABEL);
    expect(container.querySelector('[data-testid="place-add-apps"]')).toBeNull();
    expect(container.querySelector('[data-testid="place-seed"]')).toBeNull();
    expect(container.querySelector('[data-testid="place-app-project"]')).toBeNull();
    act(() => {
      (container.querySelector('[data-testid="show-add-apps"]') as HTMLButtonElement).click();
    });
    expect(container.querySelector('[data-testid="place-add-apps"]')?.textContent).toContain(ADD_APPS_LABEL);
    expect(container.querySelector('[data-testid="add-app-chat"]')?.textContent).toContain('Chat');
    expect(container.querySelector('[data-testid="add-app-chat"]')?.textContent).not.toContain('LIVE');
    expect((container.querySelector('[data-testid="add-app-chat"]') as HTMLButtonElement).disabled).toBe(false);
    expect(container.querySelector('[data-testid="add-app-vault"]')?.textContent).toContain('Vault');
    expect(container.querySelector('[data-testid="add-app-vault"]')?.textContent).not.toContain('LIVE');
    expect(container.querySelector('[data-testid="add-app-property"]')?.textContent).toContain('Property');
    expect(container.querySelector('[data-testid="add-app-property"]')?.textContent).not.toContain('LIVE');
    expect(container.querySelector('[data-testid="add-app-property"]')?.textContent).not.toMatch(/rental/i);
    expect(container.querySelector('[data-testid="add-app-eatout"]')).toBeNull();
    expect(container.querySelector('[data-testid="add-app-eatery"]')).toBeNull();
    expect(container.querySelector('[data-testid="already-on-place-eatery"]')).toBeNull();

    act(() => {
      (container.querySelector('[data-testid="add-app-project"]') as HTMLButtonElement).click();
    });
    act(() => {
      (container.querySelector('[data-testid="confirm-add-apps"]') as HTMLButtonElement).click();
    });

    expect(container.querySelector('[data-testid="place-app-eatery"]')?.textContent).toContain('Eatery');
    expect(container.querySelector('[data-testid="place-app-project"]')?.textContent).toContain('Project');
    expect(container.querySelector('[data-testid="add-app-project"]')).toBeNull();
    expect(loadPlaceEntitlement('co_olive')?.enabled_apps).toEqual(['eatery', 'project']);
    expect(listRegisteredPlaces().find(place => place.companyId === 'co_olive')?.enabledApps)
      .toEqual(['eatery', 'project']);
    expect(loadIdentityVault().companyNode?.enabledApps).toEqual(['eatery', 'project']);

    act(() => {
      (container.querySelector('[data-testid="show-add-apps"]') as HTMLButtonElement).click();
    });
    expect(container.querySelector('[data-testid="add-app-project"]')).toBeNull();
    expect(loadPlaceEntitlement('co_olive')?.enabled_apps).toEqual(['eatery', 'project']);
    expect(container.querySelectorAll('[data-testid="place-app-project"]').length).toBe(1);
    expect(container.textContent).not.toMatch(/\b(peer|DID|DHT|wallet|MCP|npm|hydrate|neon|node|co_)\b/i);
    unmount();
  });

  it('shows N days left. on the tile after trial when payment is stubbed ok', async () => {
    saveNodeEntitlement({
      companyId: 'co_olive',
      node_subscription_status: 'active',
      trial_started_at: Date.now() - 40 * day,
      trial_ends_at: Date.now() - 10 * day,
      enabled_apps: ['eatery'],
      billable_locations: 1,
      payment_method_ok: true
    });
    const { container, unmount } = render(<App />);
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 80));
    });
    expect(container.querySelector('[data-testid="eatery-place-status"]')?.textContent)
      .toMatch(/^\d+ days left\.$/);
    expect(container.querySelector('[data-testid="eatery-place-row"]')?.textContent).not.toMatch(/Renews in /);
    expect(TRIAL_MS).toBe(30 * day);
    unmount();
  });

  it('lets the owner choose a plan and open Paystack without marking the place paid', async () => {
    let checkoutBody = '';
    const { container, unmount } = render(<App />);
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 80));
    });

    act(() => {
      (container.querySelector('[data-testid="open-place-subscription"]') as HTMLButtonElement).click();
    });

    expect(container.querySelector('[data-testid="place-tab-subscription"]')?.getAttribute('aria-selected')).toBe('true');
    expect(container.querySelector('[data-testid="place-apps"]')).toBeNull();
    expect(container.querySelector('[data-testid="place-sub-status"]')?.textContent)
      .toMatch(/\d+ days left on trial\./);
    expect(container.querySelector('[data-testid="place-sub-date"]')?.textContent).toMatch(/^Ends /);
    expect(container.querySelector('[data-testid="place-sub-quote"]')).toBeNull();
    expect(container.querySelector('[data-testid="place-sub-then"]')).toBeNull();
    expect(container.querySelector('[data-testid="place-sub-trial"]')?.textContent).toBe('No charge for 30 days.');
    expect(container.querySelector('[data-testid="paystack-note"]')).toBeNull();
    expect(container.querySelector('[data-testid="paystack-channels"]')?.textContent)
      .toBe('Card, Ozow, or Capitec Pay.');
    expect(container.querySelector('[data-testid="pay-with-paystack"]')?.textContent).toBe('Pay with Paystack.');
    expect(container.textContent).not.toContain('2606460754');
    expect(container.textContent).not.toContain('Pay by EFT.');

    act(() => {
      (container.querySelector('[data-testid="plan-place"]') as HTMLButtonElement).click();
    });
    expect(container.querySelector('[data-testid="plan-place"]')?.getAttribute('aria-pressed')).toBe('true');
    expect(container.querySelector('[data-testid="place-sub-quote"]')).toBeNull();

    act(() => {
      (container.querySelector('[data-testid="plan-hosted-seed"]') as HTMLButtonElement).click();
    });
    expect(container.querySelector('[data-testid="plan-hosted-seed"]')?.textContent).toBe('Hosted seed. R299 a month.');
    expect(container.querySelector('[data-testid="place-sub-quote"]')).toBeNull();

    act(() => {
      (container.querySelector('[data-testid="plan-both"]') as HTMLButtonElement).click();
      (container.querySelector('[data-testid="cadence-annual"]') as HTMLButtonElement).click();
    });
    expect(container.querySelector('[data-testid="place-sub-annual-off"]')?.textContent)
      .toBe('10% off twelve months.');
    expect(container.querySelector('[data-testid="place-sub-quote"]')?.textContent)
      .toBe('R5378.40 a year.');
    expect(container.textContent).not.toContain('10% off R5976.');
    expect(container.textContent).not.toContain('The trial is 30 days. Then');

    vi.mocked(fetch).mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes('/api/paystack/checkout')) {
        checkoutBody = String(init?.body || '');
        return new Response(JSON.stringify({
          paid: true,
          authorizationUrl: 'https://checkout.paystack.com/test'
        }), { status: 200, headers: { 'content-type': 'application/json' } });
      }
      throw new TypeError('Failed to fetch');
    });

    await act(async () => {
      (container.querySelector('[data-testid="pay-with-paystack"]') as HTMLButtonElement).click();
      await new Promise(resolve => setTimeout(resolve, 20));
    });
    expect(container.querySelector('[data-testid="pay-with-paystack"]')?.textContent).toBe('Pay with Paystack.');
    expect(checkoutBody).toContain('"bundle":"both"');
    expect(checkoutBody).toContain('"cadence":"annual"');
    expect(checkoutBody).not.toContain('2606460754');
    expect(checkoutBody).not.toMatch(/"amount"/);
    expect(container.textContent).not.toContain('2606460754');
    expect(container.textContent).not.toContain('MR FRANS OLIVIER');
    expect(container.textContent).not.toContain('470010');
    expect(container.querySelector('[data-testid="place-subscription"] input')).toBeNull();
    expect(loadPlaceEntitlement('co_olive')?.payment_method_ok).toBe(false);
    expect(container.textContent).not.toMatch(/\b(peer|DID|DHT|wallet|MCP|npm|hydrate|neon|node|co_)\b/i);
    vi.mocked(fetch).mockImplementation(async () => {
      throw new TypeError('Failed to fetch');
    });
    unmount();
  });

  it('shows payment due without bank details when the period has ended', async () => {
    saveNodeEntitlement({
      companyId: 'co_olive',
      node_subscription_status: 'past_due',
      trial_started_at: Date.now() - 40 * day,
      trial_ends_at: Date.now() - 2 * day,
      enabled_apps: ['eatery'],
      billable_locations: 1,
      payment_method_ok: false
    });
    const { container, unmount } = render(<App />);
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 80));
    });
    expect(container.querySelector('[data-testid="eatery-place-status"]')?.textContent)
      .toBe('Payment due.');
    expect(container.querySelector('[data-testid="eatery-place-row"]')?.textContent).not.toContain('This period has ended.');
    expect(container.querySelector('[data-testid="eatery-place-row"]')?.textContent).not.toContain('Payment is due.');
    expect(container.querySelector('[data-testid="eatery-place-eft"]')).toBeNull();
    expect(container.textContent).not.toContain('2606460754');
    expect(container.textContent).not.toContain('MR FRANS OLIVIER');
    expect(container.querySelector('[data-testid="open-the-house"]')).toBeTruthy();
    expect(loadPlaceEntitlement('co_olive')?.payment_method_ok).toBe(false);

    act(() => {
      (container.querySelector('[data-testid="open-place-subscription"]') as HTMLButtonElement).click();
    });
    expect(container.querySelector('[data-testid="place-sub-status"]')?.textContent).toBe('Payment due.');
    expect(container.querySelector('[data-testid="place-sub-date"]')).toBeNull();
    expect(container.querySelector('[data-testid="paystack-note"]')).toBeNull();
    expect(container.querySelector('[data-testid="pay-with-paystack"]')?.textContent).toBe('Pay with Paystack.');
    expect(container.querySelector('[data-testid="paystack-channels"]')?.textContent)
      .toBe('Card, Ozow, or Capitec Pay.');
    expect(container.textContent).not.toContain('MR FRANS OLIVIER');
    expect(container.textContent).not.toContain('2606460754');
    expect(container.querySelector('[data-testid="place-subscription"] input')).toBeNull();
    expect(loadPlaceEntitlement('co_olive')?.payment_method_ok).toBe(false);
    expect(listRegisteredPlaces().some(place => place.placeName === 'The Olive')).toBe(true);
    unmount();
  });
});

