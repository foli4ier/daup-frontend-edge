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

export const PLATFORM_APP_IDS = ['eatery', 'farm', 'reseller', 'maker'] as const;
export type PlatformAppId = (typeof PLATFORM_APP_IDS)[number];

/** A registered place the hub can list. placeId comes from the house MCP when minted. */
export interface PlatformPlaceRecord {
  placeName: string;
  app: PlatformAppId;
  country: string;
  region: string;
  city: string;
  placeId?: string;
  ownerEmail?: string;
}

export type PlatformEntityEntry = string | PlatformPlaceRecord;

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

export function isPlatformAppId(value: unknown): value is PlatformAppId {
  return typeof value === 'string' && (PLATFORM_APP_IDS as readonly string[]).includes(value);
}

export function isPlatformPlaceRecord(value: unknown): value is PlatformPlaceRecord {
  if (!value || typeof value !== 'object') return false;
  const rec = value as Partial<PlatformPlaceRecord>;
  return typeof rec.placeName === 'string' && rec.placeName.trim().length > 0;
}

export function platformEntityName(entry: unknown): string {
  if (typeof entry === 'string') return entry;
  if (isPlatformPlaceRecord(entry)) return entry.placeName;
  return '';
}

function readPlatformEntities(): PlatformEntityEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(PLATFORM_ENTITIES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((entry): entry is PlatformEntityEntry =>
      typeof entry === 'string' || isPlatformPlaceRecord(entry)
    );
  } catch (e) {}
  return [];
}

function writePlatformEntities(entries: PlatformEntityEntry[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(PLATFORM_ENTITIES_KEY, JSON.stringify(entries));
}

export function asPlatformPlaceRecord(value: unknown): PlatformPlaceRecord | null {
  if (!isPlatformPlaceRecord(value)) return null;
  const rec = value as PlatformPlaceRecord;
  const record: PlatformPlaceRecord = {
    placeName: rec.placeName.trim(),
    app: isPlatformAppId(rec.app) ? rec.app : 'eatery',
    country: (rec.country || '').trim(),
    region: (rec.region || '').trim(),
    city: (rec.city || '').trim()
  };
  const placeId = typeof rec.placeId === 'string' ? rec.placeId.trim() : '';
  const ownerEmail = typeof rec.ownerEmail === 'string' ? rec.ownerEmail.trim().toLowerCase() : '';
  if (placeId) record.placeId = placeId;
  if (ownerEmail) record.ownerEmail = ownerEmail;
  return record;
}

/**
 * Get all registered legal names across the platform
 */
export function getRegisteredLegalNames(): string[] {
  return readPlatformEntities().map(platformEntityName).filter(Boolean);
}

/**
 * Places the hub can show on the chain. Legacy name-only strings stay off this list.
 */
export function listRegisteredPlaces(): PlatformPlaceRecord[] {
  return readPlatformEntities()
    .map(asPlatformPlaceRecord)
    .filter((place): place is PlatformPlaceRecord => Boolean(place));
}

/**
 * Write or replace a rich place record (place, app, country, region, city).
 */
export function registerPlaceOnPlatform(place: {
  placeName: string;
  app?: PlatformAppId | string;
  country?: string;
  region?: string;
  city?: string;
  placeId?: string;
  ownerEmail?: string;
}): PlatformPlaceRecord | null {
  if (typeof window === 'undefined') return null;
  const record = asPlatformPlaceRecord({
    placeName: place.placeName,
    app: isPlatformAppId(place.app) ? place.app : 'eatery',
    country: place.country,
    region: place.region,
    city: place.city,
    placeId: place.placeId,
    ownerEmail: place.ownerEmail
  });
  if (!record) return null;
  try {
    const norm = normalizeLegalName(record.placeName);
    const existing = readPlatformEntities();
    const idx = existing.findIndex(entry => {
      const current = asPlatformPlaceRecord(entry);
      if (record.placeId && current?.placeId && current.placeId === record.placeId) return true;
      return normalizeLegalName(platformEntityName(entry)) === norm;
    });
    if (idx >= 0) {
      const previous = asPlatformPlaceRecord(existing[idx]);
      const merged: PlatformPlaceRecord = {
        ...record,
        ...(previous?.placeId && !record.placeId ? { placeId: previous.placeId } : {}),
        ...(previous?.ownerEmail && !record.ownerEmail ? { ownerEmail: previous.ownerEmail } : {})
      };
      existing[idx] = merged;
      writePlatformEntities(existing);
      return merged;
    }
    existing.push(record);
    writePlatformEntities(existing);
    return record;
  } catch (e) {}
  return null;
}

/** Merge house-node places into the local Your places. / On the chain. store. */
export function mergeHousePlacesIntoPlatform(places: PlatformPlaceRecord[]): PlatformPlaceRecord[] {
  for (const place of places) {
    registerPlaceOnPlatform(place);
  }
  return listRegisteredPlaces();
}

/**
 * When the vault has no named house, take the first house-node place as Your places.
 * Existing local house stays; MCP places still merge via mergeHousePlacesIntoPlatform.
 */
export function applyHousePlacesToVault(
  prev: UserIdentityVault,
  email: string,
  places: PlatformPlaceRecord[]
): UserIdentityVault {
  const now = Date.now();
  const nextEmail = (email || '').trim().toLowerCase();
  const alreadyHasHouse = Boolean(prev.activeWallet?.legalName?.trim()) && prev.hasCompletedOnboarding;
  if (alreadyHasHouse || places.length === 0) {
    if (!nextEmail || prev.profile.demographics.email === nextEmail) return prev;
    return {
      ...prev,
      profile: {
        ...prev.profile,
        demographics: { ...prev.profile.demographics, email: nextEmail },
        updatedAt: now
      },
      updatedAt: now
    };
  }

  const primary = places[0];
  const wallet: WalletEntry = {
    id: primary.placeId ? `wallet_place_${primary.placeId}` : `wallet_house_${now}`,
    type: 'bank',
    legalName: primary.placeName,
    bankName: '',
    accountNumber: '',
    routingCode: '',
    isPrimary: true,
    createdAt: now
  };

  return {
    ...prev,
    hasCompletedOnboarding: true,
    registeredAt: prev.registeredAt || now,
    updatedAt: now,
    profile: {
      ...prev.profile,
      demographics: {
        ...prev.profile.demographics,
        email: nextEmail || prev.profile.demographics.email
      },
      location: {
        ...prev.profile.location,
        country: primary.country || prev.profile.location.country,
        provinceState: primary.region || prev.profile.location.provinceState,
        city: primary.city || prev.profile.location.city
      },
      wallets: [wallet],
      primaryWalletId: wallet.id,
      isOnboarded: true,
      updatedAt: now
    },
    registeredWallets: [wallet],
    activeWallet: wallet,
    identityKeySeedNode: deriveSeedNode(primary.placeName)
  };
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
    const existing = readPlatformEntities();
    if (existing.some(entry => normalizeLegalName(platformEntityName(entry)) === norm)) {
      return;
    }
    existing.push(name.trim());
    writePlatformEntities(existing);
  } catch (e) {}
}

/**
 * Unregister a legal name from the platform registry
 */
export function unregisterLegalNameOnPlatform(name: string): void {
  if (typeof window === 'undefined' || !name.trim()) return;
  try {
    const norm = normalizeLegalName(name);
    const existing = readPlatformEntities();
    const updated = existing.filter(entry => normalizeLegalName(platformEntityName(entry)) !== norm);
    writePlatformEntities(updated);
  } catch (e) {}
}

export function unregisterPlaceOnPlatform(name: string): void {
  unregisterLegalNameOnPlatform(name);
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
