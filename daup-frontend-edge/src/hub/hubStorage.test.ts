import { beforeEach, describe, expect, it } from 'vitest';
import {
  PLATFORM_ENTITIES_KEY,
  VAULT_STORAGE_KEY,
  saveIdentityVault,
  DEFAULT_VAULT
} from '../stores/identityStore';
import { ASK_STORAGE_KEY } from './askStore';
import {
  HUB_INSTALLED_APPS_KEY,
  clearHubBrowserStorage,
  isHubStorageKey
} from './hubStorage';
import { OWNER_SESSION_STORAGE_KEY } from './ownerSession';

describe('Hub browser storage', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('treats vault, places, and session keys as Hub data', () => {
    expect(isHubStorageKey(VAULT_STORAGE_KEY)).toBe(true);
    expect(isHubStorageKey(PLATFORM_ENTITIES_KEY)).toBe(true);
    expect(isHubStorageKey(OWNER_SESSION_STORAGE_KEY)).toBe(true);
    expect(isHubStorageKey(ASK_STORAGE_KEY)).toBe(true);
    expect(isHubStorageKey('daup_mcp_profile_did:daup:x')).toBe(true);
    expect(isHubStorageKey('unrelated_site_key')).toBe(false);
  });

  it('wipes Hub local and session keys on this origin only', () => {
    saveIdentityVault({
      ...DEFAULT_VAULT,
      hasCompletedOnboarding: true
    });
    localStorage.setItem(OWNER_SESSION_STORAGE_KEY, JSON.stringify({
      email: 'you@gmail.com',
      signedInAt: 1
    }));
    localStorage.setItem(PLATFORM_ENTITIES_KEY, JSON.stringify([{ placeName: 'Kortrijk' }]));
    localStorage.setItem(HUB_INSTALLED_APPS_KEY, JSON.stringify({ 'daup-eatout': true }));
    localStorage.setItem(ASK_STORAGE_KEY, JSON.stringify([]));
    localStorage.setItem('unrelated_site_key', 'keep');
    sessionStorage.setItem('daup:hub:scratch', '1');
    sessionStorage.setItem('other_tab_key', 'keep');

    clearHubBrowserStorage();

    expect(localStorage.getItem(VAULT_STORAGE_KEY)).toBeNull();
    expect(localStorage.getItem(OWNER_SESSION_STORAGE_KEY)).toBeNull();
    expect(localStorage.getItem(PLATFORM_ENTITIES_KEY)).toBeNull();
    expect(localStorage.getItem(HUB_INSTALLED_APPS_KEY)).toBeNull();
    expect(localStorage.getItem(ASK_STORAGE_KEY)).toBeNull();
    expect(sessionStorage.getItem('daup:hub:scratch')).toBeNull();
    expect(localStorage.getItem('unrelated_site_key')).toBe('keep');
    expect(sessionStorage.getItem('other_tab_key')).toBe('keep');
  });
});
