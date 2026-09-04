import { 
  UserProfile, 
  WalletEntry, 
  SubscriptionTrialState, 
  UserDemographics, 
  UserLocation, 
  SocialLinks 
} from '../types/profile';

export const VAULT_STORAGE_KEY = 'daup_user_vault_v1';
export const LEGACY_PROFILE_KEY = 'daup_user_profile';
export const LEGACY_TRIAL_KEY = 'daup_trial_state';
export const PLATFORM_ENTITIES_KEY = 'daup_platform_registered_entities';
export const APP_INSTANCES_KEY = 'daup_app_instances_db';
export const SUBSCRIPTIONS_KEY = 'daup_subscriptions_db';

export interface UserIdentityVault {
  version: 1;
  hasCompletedOnboarding: boolean;
  registeredAt: number | null;
  updatedAt: number;
  profile: UserProfile;
  registeredWallets: WalletEntry[];
  activeWallet: WalletEntry | null;
  identityKeySeedNode: string | null;
  trialState: SubscriptionTrialState;
}

export interface AppInstanceRecord {
  id: string;
  moduleKey: string;
  instanceName: string;
  legalName: string;
  did: string;
  token: string;
  createdAt: number;
  trialExpiresAt: number;
  status: 'active' | 'inactive';
}

/**
 * Format legal name to DAUP instance slug: [name].daup
 * e.g., "Cape Bistro Ltd" -> "cape-bistro-ltd.daup"
 */
export function deriveInstanceSlug(legalName?: string): string {
  if (!legalName || !legalName.trim()) return 'node.daup';
  const clean = legalName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return clean ? `${clean}.daup` : 'node.daup';
}

/**
 * Deploy & register a new instance of an app with the active wallet's legal name
 * Automatically provisions a 30-day active trial and token
 */
export function deployAppInstance(
  moduleKey: string, 
  legalName: string, 
  did: string,
  token?: string
): AppInstanceRecord {
  const now = Date.now();
  const trialExpiresAt = now + 30 * 24 * 60 * 60 * 1000; // 30-Day Active Trial
  const instanceSlug = deriveInstanceSlug(legalName);
  const sessionToken = token || `daup-token-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  const instanceRecord: AppInstanceRecord = {
    id: `inst_${moduleKey}_${Date.now()}`,
    moduleKey,
    instanceName: instanceSlug,
    legalName: legalName.trim() || 'Decentralized Operator',
    did: did || 'did:daup:node-primary',
    token: sessionToken,
    createdAt: now,
    trialExpiresAt,
    status: 'active'
  };

  if (typeof window !== 'undefined') {
    try {
      // 1. Save instance to instances database
      const instances = getAppInstances();
      instances[moduleKey] = instanceRecord;
      localStorage.setItem(APP_INSTANCES_KEY, JSON.stringify(instances));

      // 2. Automatically grant 30-day Pro/Trial license in subscriptions database
      const rawSubs = localStorage.getItem(SUBSCRIPTIONS_KEY);
      const allSubs = rawSubs ? JSON.parse(rawSubs) : {};
      const targetDid = did || 'did:daup:node-primary';
      if (!allSubs[targetDid]) allSubs[targetDid] = {};
      allSubs[targetDid][moduleKey] = {
        did: targetDid,
        module: moduleKey,
        tier: 'Trial',
        token: sessionToken,
        expirationTimestamp: trialExpiresAt
      };
      localStorage.setItem(SUBSCRIPTIONS_KEY, JSON.stringify(allSubs));

      // 3. Mark app installed
      const rawInstalled = localStorage.getItem('daup_installed_apps');
      const installed = rawInstalled ? JSON.parse(rawInstalled) : {};
      installed[moduleKey] = true;
      localStorage.setItem('daup_installed_apps', JSON.stringify(installed));
    } catch (e) {
      console.error('[identityStore] Failed to deploy app instance:', e);
    }
  }

  return instanceRecord;
}

export const DEFAULT_DEMOGRAPHICS: UserDemographics = {
  email: '',
  contactNumber: '',
  whatsappNumber: '',
  language: 'en',
  sex: 'prefer_not_to_say',
  birthdate: ''
};

export const DEFAULT_LOCATION: UserLocation = {
  country: '',
  provinceState: '',
  city: '',
  address: '',
  latitude: undefined,
  longitude: undefined
};

export const DEFAULT_SOCIALS: SocialLinks = {
  website: '',
  instagram: '',
  facebook: ''
};

export const DEFAULT_PROFILE: UserProfile = {
  demographics: DEFAULT_DEMOGRAPHICS,
  location: DEFAULT_LOCATION,
  socials: DEFAULT_SOCIALS,
  wallets: [],
  primaryWalletId: null,
  isOnboarded: false,
  createdAt: Date.now(),
  updatedAt: Date.now()
};

export const DEFAULT_TRIAL_STATE: SubscriptionTrialState = {
  hasStartedTrial: false,
  trialStartedAt: null,
  trialExpiresAt: null,
  isTrialActive: false,
  tier: 'Free',
  isSubscribed: false
};

export const DEFAULT_VAULT: UserIdentityVault = {
  version: 1,
  hasCompletedOnboarding: false,
  registeredAt: null,
  updatedAt: Date.now(),
  profile: DEFAULT_PROFILE,
  registeredWallets: [],
  activeWallet: null,
  identityKeySeedNode: null,
  trialState: DEFAULT_TRIAL_STATE
};

/**
 * Normalize legal name for case-insensitive exact comparison
 */
export function normalizeLegalName(legalName?: string): string {
  return (legalName || '').trim().toLowerCase();
}

/**
 * Deterministic seed derivation pipeline: activeWallet.legalName -> IdentityKeySeedNode
 */
export function deriveSeedNode(legalName?: string): string {
  if (!legalName || !legalName.trim()) {
    return 'farmer-wallet-seed-1';
  }
  const clean = legalName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return clean ? `${clean}-seed` : 'farmer-wallet-seed-1';
}

/**
 * Resolve the primary/active wallet from wallet entries and primaryWalletId
 */
export function resolveActiveWallet(wallets: WalletEntry[], primaryWalletId?: string | null): WalletEntry | null {
  if (!wallets || wallets.length === 0) return null;
  if (primaryWalletId) {
    const found = wallets.find(w => w.id === primaryWalletId);
    if (found) return found;
  }
  const markedPrimary = wallets.find(w => w.isPrimary);
  if (markedPrimary) return markedPrimary;
  return wallets[0];
}

/**
 * Get all registered legal names across the platform
 */
export function getRegisteredLegalNames(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(PLATFORM_ENTITIES_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {}
  return [];
}

/**
 * Check if a legal name is already taken on the DAUP platform.
 * Two instances / wallets cannot have the same legal name.
 */
export function isLegalNameUniqueOnPlatform(
  name: string, 
  currentWallets: WalletEntry[] = [],
  excludeWalletId?: string | null
): { isUnique: boolean; reason?: string } {
  const norm = normalizeLegalName(name);
  if (!norm) {
    return { isUnique: false, reason: 'Legal Name is required.' };
  }

  // 1. Check in currently loaded user wallets
  const localDuplicate = currentWallets.find(
    w => w.id !== excludeWalletId && normalizeLegalName(w.legalName) === norm
  );
  if (localDuplicate) {
    return { 
      isUnique: false, 
      reason: `A settlement wallet with Legal Name "${name.trim()}" is already registered in your profile.` 
    };
  }

  // 2. Check platform global entities registry
  const platformEntities = getRegisteredLegalNames();
  const platformDuplicate = platformEntities.some(
    e => normalizeLegalName(e) === norm
  );

  // If duplicate in platform registry, check if it belongs to this user's current wallet (being updated)
  if (platformDuplicate) {
    const isCurrentWalletOwner = currentWallets.some(
      w => w.id === excludeWalletId && normalizeLegalName(w.legalName) === norm
    );
    if (!isCurrentWalletOwner) {
      return { 
        isUnique: false, 
        reason: `The Legal Name "${name.trim()}" is already in use by another instance on the DAUP platform. Legal names must be unique.` 
      };
    }
  }

  return { isUnique: true };
}

/**
 * Register a legal name into the platform registry
 */
export function registerLegalNameOnPlatform(name: string): void {
  if (typeof window === 'undefined' || !name.trim()) return;
  try {
    const norm = normalizeLegalName(name);
    const existing = getRegisteredLegalNames();
    if (!existing.some(e => normalizeLegalName(e) === norm)) {
      existing.push(name.trim());
      localStorage.setItem(PLATFORM_ENTITIES_KEY, JSON.stringify(existing));
    }
  } catch (e) {}
}

/**
 * Unregister a legal name from the platform registry
 */
export function unregisterLegalNameOnPlatform(name: string): void {
  if (typeof window === 'undefined' || !name.trim()) return;
  try {
    const norm = normalizeLegalName(name);
    const existing = getRegisteredLegalNames();
    const updated = existing.filter(e => normalizeLegalName(e) !== norm);
    localStorage.setItem(PLATFORM_ENTITIES_KEY, JSON.stringify(updated));
  } catch (e) {}
}

/**
 * Get all installed app instance records
 */
export function getAppInstances(): Record<string, AppInstanceRecord> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(APP_INSTANCES_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return {};
}

/**
 * Load user identity vault from persistent storage (localStorage)
 * Automatically migrates legacy storage entries if found
 */
export function loadIdentityVault(): UserIdentityVault {
  if (typeof window === 'undefined') {
    return DEFAULT_VAULT;
  }

  try {
    // 1. Check primary unified storage key
    const rawVault = localStorage.getItem(VAULT_STORAGE_KEY);
    if (rawVault) {
      const parsed = JSON.parse(rawVault) as Partial<UserIdentityVault>;
      const wallets = parsed.registeredWallets || parsed.profile?.wallets || [];
      const primaryId = parsed.profile?.primaryWalletId || (parsed.activeWallet ? parsed.activeWallet.id : null);
      const active = resolveActiveWallet(wallets, primaryId);
      const seedNode = parsed.identityKeySeedNode || (active ? deriveSeedNode(active.legalName) : null);

      const hasOnboarded = Boolean(
        parsed.hasCompletedOnboarding ??
        parsed.profile?.isOnboarded ??
        (wallets.length > 0 && !!active?.legalName)
      );

      // Register active wallet in platform entities registry
      if (active?.legalName) {
        registerLegalNameOnPlatform(active.legalName);
      }

      return {
        version: 1,
        hasCompletedOnboarding: hasOnboarded,
        registeredAt: parsed.registeredAt || (hasOnboarded ? (parsed.profile?.createdAt || Date.now()) : null),
        updatedAt: parsed.updatedAt || Date.now(),
        profile: {
          ...DEFAULT_PROFILE,
          ...(parsed.profile || {}),
          demographics: { ...DEFAULT_DEMOGRAPHICS, ...(parsed.profile?.demographics || {}) },
          location: { ...DEFAULT_LOCATION, ...(parsed.profile?.location || {}) },
          socials: { ...DEFAULT_SOCIALS, ...(parsed.profile?.socials || {}) },
          wallets,
          primaryWalletId: active ? active.id : null,
          isOnboarded: hasOnboarded
        },
        registeredWallets: wallets,
        activeWallet: active,
        identityKeySeedNode: seedNode,
        trialState: {
          ...DEFAULT_TRIAL_STATE,
          ...(parsed.trialState || {})
        }
      };
    }

    // 2. Legacy Migration Check: load from legacy profile & trial keys
    const rawLegacyProfile = localStorage.getItem(LEGACY_PROFILE_KEY);
    const rawLegacyTrial = localStorage.getItem(LEGACY_TRIAL_KEY);

    if (rawLegacyProfile) {
      const legacyProfile: Partial<UserProfile> = JSON.parse(rawLegacyProfile);
      const wallets: WalletEntry[] = legacyProfile.wallets || [];
      const active = resolveActiveWallet(wallets, legacyProfile.primaryWalletId);
      const hasOnboarded = Boolean(legacyProfile.isOnboarded || (wallets.length > 0 && active?.legalName));
      const seedNode = active ? deriveSeedNode(active.legalName) : null;

      let trial: SubscriptionTrialState = DEFAULT_TRIAL_STATE;
      if (rawLegacyTrial) {
        try {
          const parsedTrial = JSON.parse(rawLegacyTrial);
          const isActive = parsedTrial.hasStartedTrial && parsedTrial.trialExpiresAt !== null && parsedTrial.trialExpiresAt > Date.now();
          trial = { ...parsedTrial, isTrialActive: isActive };
        } catch {}
      }

      const migratedVault: UserIdentityVault = {
        version: 1,
        hasCompletedOnboarding: hasOnboarded,
        registeredAt: hasOnboarded ? (legacyProfile.createdAt || Date.now()) : null,
        updatedAt: Date.now(),
        profile: {
          ...DEFAULT_PROFILE,
          ...legacyProfile,
          demographics: { ...DEFAULT_DEMOGRAPHICS, ...(legacyProfile.demographics || {}) },
          location: { ...DEFAULT_LOCATION, ...(legacyProfile.location || {}) },
          socials: { ...DEFAULT_SOCIALS, ...(legacyProfile.socials || {}) },
          wallets,
          primaryWalletId: active ? active.id : null,
          isOnboarded: hasOnboarded
        },
        registeredWallets: wallets,
        activeWallet: active,
        identityKeySeedNode: seedNode,
        trialState: trial
      };

      // Register active wallet in platform entities registry
      if (active?.legalName) {
        registerLegalNameOnPlatform(active.legalName);
      }

      // Persist migrated vault to unified key
      saveIdentityVault(migratedVault);
      return migratedVault;
    }
  } catch (err) {
    console.error('[identityStore] Failed to load/hydrate identity vault:', err);
  }

  return DEFAULT_VAULT;
}

/**
 * Save user identity vault to persistent storage
 */
export function saveIdentityVault(vault: UserIdentityVault): void {
  if (typeof window === 'undefined') return;

  try {
    const raw = JSON.stringify(vault);
    localStorage.setItem(VAULT_STORAGE_KEY, raw);

    // Keep backwards compatibility keys synchronized
    localStorage.setItem(LEGACY_PROFILE_KEY, JSON.stringify(vault.profile));
    localStorage.setItem(LEGACY_TRIAL_KEY, JSON.stringify(vault.trialState));
    if (vault.activeWallet?.legalName) {
      registerLegalNameOnPlatform(vault.activeWallet.legalName);
      localStorage.setItem('daup_active_did', `did:daup:${deriveSeedNode(vault.activeWallet.legalName)}-pub`);
    }
  } catch (err) {
    console.error('[identityStore] Failed to save identity vault:', err);
  }
}

/**
 * Reset all persistent identity vaults & profile storage
 */
export function resetIdentityVault(): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem(VAULT_STORAGE_KEY);
    localStorage.removeItem(LEGACY_PROFILE_KEY);
    localStorage.removeItem(LEGACY_TRIAL_KEY);
  } catch (err) {
    console.error('[identityStore] Failed to reset identity vault:', err);
  }
}

/**
 * Clear the named house so they can register again.
 * Keeps the owner's email. Does not touch the hub email session.
 */
export function clearHouseFromVault(keepEmail = ''): UserIdentityVault {
  const now = Date.now();
  const email = (keepEmail || '').trim().toLowerCase();
  const next: UserIdentityVault = {
    version: 1,
    hasCompletedOnboarding: false,
    registeredAt: null,
    updatedAt: now,
    profile: {
      ...DEFAULT_PROFILE,
      demographics: {
        ...DEFAULT_DEMOGRAPHICS,
        email
      },
      createdAt: now,
      updatedAt: now
    },
    registeredWallets: [],
    activeWallet: null,
    identityKeySeedNode: null,
    trialState: { ...DEFAULT_TRIAL_STATE }
  };

  saveIdentityVault(next);

  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(APP_INSTANCES_KEY);
      localStorage.removeItem('daup_installed_apps');
    } catch {
      // ignore quota
    }
  }

  return next;
}
