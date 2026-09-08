/**
 * Hub browser storage on this origin only (app.daup.co.za).
 * Log off wipes vault, places cache, and session keys here — never other sites.
 */

import {
  APP_INSTANCES_KEY,
  LEGACY_PROFILE_KEY,
  LEGACY_TRIAL_KEY,
  PLATFORM_ENTITIES_KEY,
  SUBSCRIPTIONS_KEY,
  VAULT_STORAGE_KEY
} from '../stores/identityStore';
import { ASK_STORAGE_KEY } from './askStore';
import { expireOwnerCookie } from './ownerArrival';
import { OWNER_SESSION_STORAGE_KEY } from './ownerSession';

export const HUB_INSTALLED_APPS_KEY = 'daup_installed_apps';
export const HUB_ACTIVE_DID_KEY = 'daup_active_did';

export const HUB_KNOWN_STORAGE_KEYS = [
  VAULT_STORAGE_KEY,
  LEGACY_PROFILE_KEY,
  LEGACY_TRIAL_KEY,
  PLATFORM_ENTITIES_KEY,
  APP_INSTANCES_KEY,
  SUBSCRIPTIONS_KEY,
  OWNER_SESSION_STORAGE_KEY,
  ASK_STORAGE_KEY,
  HUB_INSTALLED_APPS_KEY,
  HUB_ACTIVE_DID_KEY
] as const;

export function isHubStorageKey(key: string): boolean {
  if ((HUB_KNOWN_STORAGE_KEYS as readonly string[]).includes(key)) return true;
  return /^daup([:_\-]|$)/.test(key);
}

function sweepStorage(storage: Storage | undefined): void {
  if (!storage) return;
  const keys: string[] = [];
  for (let i = 0; i < storage.length; i += 1) {
    const key = storage.key(i);
    if (key && isHubStorageKey(key)) keys.push(key);
  }
  for (const key of keys) {
    try {
      storage.removeItem(key);
    } catch {
      // ignore quota / private mode
    }
  }
}

/** Clear Hub local + session keys on this origin. Host-only cookie only. */
export function clearHubBrowserStorage(): void {
  if (typeof window === 'undefined') return;
  try {
    sweepStorage(window.localStorage);
  } catch {
    // ignore
  }
  try {
    sweepStorage(window.sessionStorage);
  } catch {
    // ignore
  }
  expireOwnerCookie();
}
