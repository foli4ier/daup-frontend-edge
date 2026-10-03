import { describe, expect, it, vi } from 'vitest';
import { CHAIN_APP_CHAT, CHAIN_APP_EATOUT, CHAIN_APP_PROJECT, CHAIN_APP_PROPERTY, CHAIN_APP_VAULT, GET_LABEL, OPEN_LABEL, hasBannedDoorCopy } from './copy';
import {
  EATOUT_SEARCH_HOME,
  eatoutHomeUrl,
  eatoutOpenHitsPlaceOrHub,
  isEatOutSearchHome,
  publicPlaceUrlHitsOwnerFloor
} from './eatoutUrls';
import {
  CHAT_HOME,
  CHAT_MODULE_KEY,
  COMING_SHOP_APPS,
  EATOUT_MODULE_KEY,
  ENABLEABLE_SHOP_APPS,
  LIVE_SHOP_APPS,
  PAID_SHOP_APPS,
  PROJECT_MODULE_KEY,
  PROPERTY_HOME,
  PROPERTY_MODULE_KEY,
  SHOP_APPS,
  SHELF_SHOP_APPS,
  SOCIAL_SHOP_APPS,
  VAULT_HOME,
  VAULT_MODULE_KEY,
  launchHeldModule,
  navigateSameTab,
  navigateToChatHome,
  navigateToPropertyHome,
  navigateToVaultHome,
  shopAppIsHeld,
  shopAppOpenHref
} from './places';
import { PROJECT_HOME, buildProjectOpenUrl, projectOpenHandshakeFromHub } from './projectUrls';
import { HANDOFF_EMAIL_HINT, HANDOFF_HOUSE_HINT, HANDOFF_PLACE_ID_HINT, handoffPresentsCredential } from './ownerArrival';

describe('Get apps. shop catalog', () => {
  it('lists EatOut, Chat, Project, Vault, and Property as LIVE and keeps Coming to Farm / Reseller / Maker', () => {
    expect(LIVE_SHOP_APPS.map(app => app.id)).toEqual([
      'eatery', 'eatout', 'project', 'finance', 'trade', 'vault', 'chat', 'property'
    ]);
    const eatout = LIVE_SHOP_APPS.find(app => app.id === 'eatout');
    expect(eatout?.title).toBe(CHAIN_APP_EATOUT);
    expect(eatout?.title).toBe('Eat Out');
    expect(eatout?.live).toBe(true);
    expect(eatout?.moduleKey).toBe(EATOUT_MODULE_KEY);
    const project = LIVE_SHOP_APPS.find(app => app.id === 'project');
    expect(project?.title).toBe(CHAIN_APP_PROJECT);
    expect(project?.title).toBe('Project');
    expect(project?.live).toBe(true);
    expect(project?.moduleKey).toBe(PROJECT_MODULE_KEY);
    const chat = LIVE_SHOP_APPS.find(app => app.id === 'chat');
    expect(chat?.title).toBe(CHAIN_APP_CHAT);
    expect(chat?.title).toBe('Chat');
    expect(chat?.live).toBe(true);
    expect(chat?.moduleKey).toBe(CHAT_MODULE_KEY);
    const vault = LIVE_SHOP_APPS.find(app => app.id === 'vault');
    expect(vault?.title).toBe(CHAIN_APP_VAULT);
    expect(vault?.title).toBe('Vault');
    expect(vault?.live).toBe(true);
    expect(vault?.moduleKey).toBe(VAULT_MODULE_KEY);
    const property = LIVE_SHOP_APPS.find(app => app.id === 'property');
    expect(property?.title).toBe(CHAIN_APP_PROPERTY);
    expect(property?.title).toBe('Property');
    expect(property?.title).not.toMatch(/rental/i);
    expect(property?.live).toBe(true);
    expect(property?.moduleKey).toBe(PROPERTY_MODULE_KEY);
    expect(COMING_SHOP_APPS.map(app => app.id)).toEqual(['eatin', 'farm', 'reseller', 'maker']);
    expect(COMING_SHOP_APPS.find(app => app.id === 'eatin')?.title).toBe('Eat In');
    expect(COMING_SHOP_APPS.find(app => app.id === 'eatin')?.live).toBe(false);
    expect(SOCIAL_SHOP_APPS.map(app => app.id)).toEqual(['eatout', 'chat']);
    expect(PAID_SHOP_APPS.map(app => app.id)).toEqual([
      'eatery', 'project', 'finance', 'trade', 'vault', 'property', 'farm', 'reseller', 'maker'
    ]);
    expect(PAID_SHOP_APPS.findIndex(app => app.id === 'property'))
      .toBe(PAID_SHOP_APPS.findIndex(app => app.id === 'vault') + 1);
    expect(PAID_SHOP_APPS.findIndex(app => app.id === 'farm'))
      .toBe(PAID_SHOP_APPS.findIndex(app => app.id === 'property') + 1);
    expect(ENABLEABLE_SHOP_APPS.map(app => app.id)).toEqual([
      'eatery', 'project', 'finance', 'trade', 'vault', 'property', 'farm', 'reseller', 'maker', 'chat'
    ]);
    expect(ENABLEABLE_SHOP_APPS.some(app => app.id === 'eatout')).toBe(false);
    expect(ENABLEABLE_SHOP_APPS.some(app => app.id === 'eatin')).toBe(false);
    expect(SHELF_SHOP_APPS.map(app => app.id)).toEqual([
      'eatery', 'eatin', 'eatout', 'project', 'finance', 'trade', 'vault', 'chat', 'property', 'farm', 'reseller', 'maker'
    ]);
    expect(SHELF_SHOP_APPS.slice(0, 3).map(app => app.title)).toEqual(['Eatery', 'Eat In', 'Eat Out']);
    expect(shopAppOpenHref(SHOP_APPS.find(app => app.id === 'eatin')!)).toBeUndefined();
    expect(COMING_SHOP_APPS.some(app => (
      app.id === 'eatout' || app.id === 'project' || app.id === 'chat' || app.id === 'vault' || app.id === 'property'
    ))).toBe(false);
    expect(SHOP_APPS.find(app => app.id === 'eatout')?.live).toBe(true);
    expect(SHOP_APPS.find(app => app.id === 'project')?.live).toBe(true);
    expect(SHOP_APPS.find(app => app.id === 'chat')?.live).toBe(true);
    expect(SHOP_APPS.find(app => app.id === 'vault')?.live).toBe(true);
    expect(SHOP_APPS.find(app => app.id === 'property')?.live).toBe(true);
    expect(hasBannedDoorCopy(CHAIN_APP_EATOUT)).toBe(false);
    expect(hasBannedDoorCopy(CHAIN_APP_PROJECT)).toBe(false);
    expect(hasBannedDoorCopy(CHAIN_APP_CHAT)).toBe(false);
    expect(hasBannedDoorCopy(CHAIN_APP_VAULT)).toBe(false);
    expect(hasBannedDoorCopy(CHAIN_APP_PROPERTY)).toBe(false);
    expect(CHAIN_APP_VAULT).not.toMatch(/statement/i);
    expect(CHAIN_APP_PROPERTY).not.toMatch(/rental/i);
  });

  it('holds EatOut by daup-eatout, never hasHouse', () => {
    const eatout = SHOP_APPS.find(app => app.id === 'eatout')!;
    expect(shopAppIsHeld(eatout, { hasHouse: true, installed: {} })).toBe(false);
    expect(shopAppIsHeld(eatout, { hasHouse: false, installed: { 'daup-eatout': true } })).toBe(true);
    expect(shopAppIsHeld(eatout, { hasHouse: true, installed: { 'daup-eatery': true } })).toBe(false);
    expect(shopAppIsHeld(eatout, { hasHouse: true, installed: { [EATOUT_MODULE_KEY]: true } })).toBe(true);
  });

  it('holds Project by daup-project, never hasHouse', () => {
    const project = SHOP_APPS.find(app => app.id === 'project')!;
    expect(shopAppIsHeld(project, { hasHouse: true, installed: {} })).toBe(false);
    expect(shopAppIsHeld(project, { hasHouse: false, installed: { 'daup-project': true } })).toBe(true);
    expect(shopAppIsHeld(project, { hasHouse: true, installed: { 'daup-eatout': true } })).toBe(false);
    expect(shopAppIsHeld(project, { hasHouse: true, installed: { [PROJECT_MODULE_KEY]: true } })).toBe(true);
  });

  it('still holds Eatery by hasHouse only', () => {
    const eatery = SHOP_APPS.find(app => app.id === 'eatery')!;
    expect(shopAppIsHeld(eatery, { hasHouse: true, installed: {} })).toBe(true);
    expect(shopAppIsHeld(eatery, { hasHouse: false, installed: { 'daup-eatery': true } })).toBe(false);
    expect(shopAppOpenHref(eatery)).toBe('https://eatery.daup.co.za');
  });

  it('holds Chat and Vault from enabled_apps or their module', () => {
    const chat = SHOP_APPS.find(app => app.id === 'chat')!;
    const vault = SHOP_APPS.find(app => app.id === 'vault')!;
    expect(shopAppIsHeld(chat, { hasHouse: true, installed: {} })).toBe(false);
    expect(shopAppIsHeld(vault, { hasHouse: true, installed: {} })).toBe(false);
    expect(shopAppIsHeld(chat, { hasHouse: false, installed: { [CHAT_MODULE_KEY]: true } })).toBe(true);
    expect(shopAppIsHeld(vault, { hasHouse: false, installed: { [VAULT_MODULE_KEY]: true } })).toBe(true);
    expect(shopAppIsHeld(chat, { hasHouse: true, installed: {}, enabledApps: ['chat'] })).toBe(true);
    expect(shopAppIsHeld(vault, { hasHouse: true, installed: {}, enabledApps: ['vault'] })).toBe(true);
    expect(shopAppIsHeld(chat, { hasHouse: true, installed: { [CHAT_MODULE_KEY]: true }, enabledApps: ['eatery'] })).toBe(false);
    expect(shopAppIsHeld(vault, { hasHouse: true, installed: { [VAULT_MODULE_KEY]: true }, enabledApps: ['eatery'] })).toBe(false);
    const property = SHOP_APPS.find(app => app.id === 'property')!;
    expect(shopAppIsHeld(property, { hasHouse: true, installed: {} })).toBe(false);
    expect(shopAppIsHeld(property, { hasHouse: false, installed: { [PROPERTY_MODULE_KEY]: true } })).toBe(true);
    expect(shopAppIsHeld(property, { hasHouse: true, installed: {}, enabledApps: ['property'] })).toBe(true);
    expect(shopAppIsHeld(property, { hasHouse: true, installed: { [PROPERTY_MODULE_KEY]: true }, enabledApps: ['eatery'] })).toBe(false);
  });

  it('Open. for Chat and Vault is the host home, same tab, and does not ping', () => {
    const chat = SHOP_APPS.find(app => app.id === 'chat')!;
    const vault = SHOP_APPS.find(app => app.id === 'vault')!;
    expect(CHAT_MODULE_KEY).toBe('daup-chat');
    expect(VAULT_MODULE_KEY).toBe('daup-vault');
    expect(CHAT_HOME).toBe('https://chat.daup.co.za');
    expect(VAULT_HOME).toBe('https://vault.daup.co.za');
    expect(shopAppOpenHref(chat)).toBe(CHAT_HOME);
    expect(shopAppOpenHref(vault)).toBe(VAULT_HOME);
    expect(shopAppOpenHref(chat)).toBe('https://chat.daup.co.za');
    expect(shopAppOpenHref(vault)).toBe('https://vault.daup.co.za');
    expect(shopAppOpenHref(chat)).not.toMatch(/[?#]|eatery\.daup\.co\.za|\/owner|app\.daup\.co\.za/i);
    expect(shopAppOpenHref(vault)).not.toMatch(/[?#]|eatery\.daup\.co\.za|\/owner|app\.daup\.co\.za/i);
    expect(navigateSameTab.toString()).toContain('location.assign');
    expect(navigateSameTab.toString()).not.toContain('fetch');
    expect(launchHeldModule.toString()).toContain('navigateToChatHome');
    expect(launchHeldModule.toString()).toContain('navigateToVaultHome');
    expect(launchHeldModule.toString()).toContain('navigateToPropertyHome');
    const property = SHOP_APPS.find(app => app.id === 'property')!;
    expect(PROPERTY_MODULE_KEY).toBe('daup-property');
    expect(PROPERTY_HOME).toBe('https://property.daup.co.za');
    expect(shopAppOpenHref(property)).toBe(PROPERTY_HOME);
    expect(shopAppOpenHref(property)).toBe('https://property.daup.co.za');
    expect(shopAppOpenHref(property)).not.toMatch(/[?#]|eatery\.daup\.co\.za|\/owner|app\.daup\.co\.za|rental/i);

    const fetchSpy = vi.mocked(globalThis.fetch);
    fetchSpy.mockClear();
    const assign = vi.fn();
    const location = window.location;
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...location, assign }
    });
    try {
      expect(navigateToChatHome()).toBe('https://chat.daup.co.za');
      expect(navigateToVaultHome()).toBe('https://vault.daup.co.za');
      expect(navigateToPropertyHome()).toBe('https://property.daup.co.za');
      expect(launchHeldModule(CHAT_MODULE_KEY)).toBe('https://chat.daup.co.za');
      expect(launchHeldModule(VAULT_MODULE_KEY)).toBe('https://vault.daup.co.za');
      expect(launchHeldModule(PROPERTY_MODULE_KEY)).toBe('https://property.daup.co.za');
      expect(launchHeldModule('daup-eatery')).toBeUndefined();
      expect(launchHeldModule('daup-project')).toBeUndefined();
      expect(assign.mock.calls.map(call => call[0])).toEqual([
        'https://chat.daup.co.za',
        'https://vault.daup.co.za',
        'https://property.daup.co.za',
        'https://chat.daup.co.za',
        'https://vault.daup.co.za',
        'https://property.daup.co.za'
      ]);
      expect(fetchSpy).not.toHaveBeenCalled();
    } finally {
      Object.defineProperty(window, 'location', {
        configurable: true,
        value: location
      });
    }
  });

  it('holds operator apps from enabled_apps when the company node has them', () => {
    const eatery = SHOP_APPS.find(app => app.id === 'eatery')!;
    const project = SHOP_APPS.find(app => app.id === 'project')!;
    expect(shopAppIsHeld(eatery, { hasHouse: true, enabledApps: ['farm'] })).toBe(false);
    expect(shopAppIsHeld(eatery, { hasHouse: true, enabledApps: ['eatery', 'farm'] })).toBe(true);
    expect(shopAppIsHeld(project, { hasHouse: true, installed: {}, enabledApps: ['project'] })).toBe(true);
    expect(shopAppIsHeld(project, { hasHouse: true, installed: { 'daup-project': true }, enabledApps: ['farm'] })).toBe(false);
  });

  it('Open. for EatOut is search home, never a place page or the hub', () => {
    const eatout = SHOP_APPS.find(app => app.id === 'eatout')!;
    const href = shopAppOpenHref(eatout);
    expect(href).toBe('https://eatout.daup.co.za/');
    expect(href).toBe(EATOUT_SEARCH_HOME);
    expect(href).toBe(eatoutHomeUrl());
    expect(isEatOutSearchHome(href || '')).toBe(true);
    expect(href).not.toMatch(/\/place\/|#menu|#book|eatery\.daup\.co\.za|\/owner|app\.daup\.co\.za/i);
    expect(eatoutOpenHitsPlaceOrHub(href || '')).toBe(false);
    expect(eatoutOpenHitsPlaceOrHub('https://eatout.daup.co.za/place/kortrijk#menu')).toBe(true);
    expect(publicPlaceUrlHitsOwnerFloor(href || '')).toBe(false);
    expect(GET_LABEL).toBe('Get.');
    expect(OPEN_LABEL).toBe('Open.');
  });

  it('Open. for Project is project.daup.co.za, never the hub or eatery /owner', () => {
    const project = SHOP_APPS.find(app => app.id === 'project')!;
    const href = shopAppOpenHref(project);
    expect(href).toBe('https://project.daup.co.za');
    expect(href).toBe(PROJECT_HOME);
    expect(href).not.toMatch(/eatery\.daup\.co\.za|\/owner|app\.daup\.co\.za/i);
    const withHub = shopAppOpenHref(project, projectOpenHandshakeFromHub({
      email: 'owner@theolive.co.za',
      house: 'The Olive',
      placeIds: ['place-olive']
    }));
    const parsed = new URL(withHub || '');
    expect(parsed.origin).toBe('https://project.daup.co.za');
    expect(parsed.pathname).toBe('/d/hub');
    expect([...parsed.searchParams.keys()]).toEqual([
      HANDOFF_EMAIL_HINT,
      HANDOFF_HOUSE_HINT,
      HANDOFF_PLACE_ID_HINT
    ]);
    expect(parsed.searchParams.get(HANDOFF_PLACE_ID_HINT)).toBe('place-olive');
    expect(buildProjectOpenUrl({
      email: 'owner@theolive.co.za',
      house: 'The Olive'
    })).toMatch(/^https:\/\/project\.daup\.co\.za\/d\/hub\?emailHint=/);
    expect(parsed.searchParams.get(HANDOFF_EMAIL_HINT)).toBe('owner@theolive.co.za');
    expect(parsed.searchParams.get(HANDOFF_HOUSE_HINT)).toBe('The Olive');
    expect(handoffPresentsCredential(withHub || '')).toBe(false);
    expect(withHub).not.toMatch(/[?&](did|walletName|instance|mcp|email|house|place|token)=/i);
  });

  it('Open. for Eatery is eatery.daup.co.za/d/hub with hints, never /owner or houseRedeem', () => {
    const eatery = SHOP_APPS.find(app => app.id === 'eatery')!;
    expect(shopAppOpenHref(eatery)).toBe('https://eatery.daup.co.za');
    const withHub = shopAppOpenHref(eatery, projectOpenHandshakeFromHub({
      email: 'owner@theolive.co.za',
      house: 'The Olive',
      placeIds: ['place-olive']
    }));
    const parsed = new URL(withHub || '');
    expect(parsed.origin).toBe('https://eatery.daup.co.za');
    expect(parsed.pathname).toBe('/d/hub');
    expect([...parsed.searchParams.keys()]).toEqual([
      HANDOFF_EMAIL_HINT,
      HANDOFF_HOUSE_HINT,
      HANDOFF_PLACE_ID_HINT
    ]);
    expect(parsed.searchParams.get(HANDOFF_EMAIL_HINT)).toBe('owner@theolive.co.za');
    expect(parsed.searchParams.get(HANDOFF_HOUSE_HINT)).toBe('The Olive');
    expect(parsed.searchParams.get(HANDOFF_PLACE_ID_HINT)).toBe('place-olive');
    expect(parsed.searchParams.has('houseRedeem')).toBe(false);
    expect(handoffPresentsCredential(withHub || '')).toBe(false);
    expect(withHub).not.toMatch(/\/owner/);
  });
});
