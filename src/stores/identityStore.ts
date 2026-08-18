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
