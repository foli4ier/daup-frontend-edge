import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { 
  UserProfile, 
  WalletEntry, 
  SubscriptionTrialState, 
  UserLocation, 
  UserDemographics, 
  SocialLinks, 
  BankWalletConfig, 
  CryptoWalletConfig 
} from '../types/profile';
import { getCurrencyForCountry, CurrencyInfo } from '../utils/currency';
import { 
  UserIdentityVault, 
  VAULT_STORAGE_KEY,
  loadIdentityVault, 
  saveIdentityVault, 
  resetIdentityVault, 
  deriveSeedNode, 
  resolveActiveWallet,
  DEFAULT_PROFILE,
  DEFAULT_TRIAL_STATE,
  DEFAULT_VAULT
} from '../stores/identityStore';

export interface UserProfileContextType {
  vault: UserIdentityVault;
  profile: UserProfile;
  trialState: SubscriptionTrialState;
  isOnboarded: boolean;
  hasCompletedOnboarding: boolean;
  isHydrating: boolean;
  primaryWallet: WalletEntry | null;
  activeWallet: WalletEntry | null;
  identityKeySeedNode: string | null;
  instanceName: string;
  currency: CurrencyInfo;
  formatCurrency: (amount: number) => string;
  isDetectingLocation: boolean;
  trialDaysRemaining: number;
  updateDemographics: (demographics: Partial<UserDemographics>) => void;
  updateLocation: (location: Partial<UserLocation>) => void;
  updateSocials: (socials: Partial<SocialLinks>) => void;
  addWallet: (walletData: Omit<BankWalletConfig, 'id' | 'createdAt'> | Omit<CryptoWalletConfig, 'id' | 'createdAt'>) => WalletEntry;
  updateWallet: (id: string, updates: Partial<WalletEntry>) => void;
  removeWallet: (id: string) => void;
  setPrimaryWallet: (id: string) => void;
  completeOnboarding: (finalProfileData?: Partial<UserProfile>) => void;
  startFreeTrial: (durationDays?: number) => void;
  detectLocation: () => Promise<UserLocation>;
  resetProfile: () => void;
  isProfileModalOpen: boolean;
  setIsProfileModalOpen: (open: boolean) => void;
}

const UserProfileContext = createContext<UserProfileContextType | undefined>(undefined);

export const UserProfileProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [vault, setVault] = useState<UserIdentityVault>(DEFAULT_VAULT);
  const [isHydrating, setIsHydrating] = useState<boolean>(true);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // Initial Vault Hydration on boot
  useEffect(() => {
    try {
      const initialVault = loadIdentityVault();
      setVault(initialVault);
    } catch (err) {
      console.error('[UserProfileProvider] Hydration error:', err);
    } finally {
      // Small tick to ensure smooth transition and allow microtasks to settle
      const timer = setTimeout(() => {
        setIsHydrating(false);
      }, 50);
      return () => clearTimeout(timer);
    }
  }, []);

  // Multi-Tab Storage Synchronization
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === VAULT_STORAGE_KEY || e.key === 'daup_user_profile' || e.key === 'daup_trial_state') {
        try {
          const freshVault = loadIdentityVault();
          setVault(freshVault);
        } catch (err) {
          console.warn('[UserProfileProvider] Cross-tab sync warning:', err);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Sync state mutation helper to keep persistent vault in sync
  const commitVault = useCallback((mutator: (prev: UserIdentityVault) => UserIdentityVault) => {
    setVault(prev => {
      const next = mutator(prev);
      saveIdentityVault(next);
      return next;
    });
  }, []);

  const profile = vault.profile;
  const trialState = vault.trialState;
  const hasCompletedOnboarding = vault.hasCompletedOnboarding;
  const isOnboarded = vault.hasCompletedOnboarding;
  const activeWallet = vault.activeWallet;
  const primaryWallet = vault.activeWallet;
  const identityKeySeedNode = vault.identityKeySeedNode;

  // Derive Currency from Country of Peer Profile
  const currency = useMemo(() => {
    return getCurrencyForCountry(profile.location.country);
  }, [profile.location.country]);

  const formatCurrency = useCallback((amount: number) => {
    return currency.format(amount);
  }, [currency]);

  // Derive Instance Branding Name (Inherits the name of the active wallet)
  const instanceName = useMemo(() => {
    if (activeWallet && activeWallet.legalName?.trim()) {
      return activeWallet.legalName.trim();
    }
    if (profile.wallets && profile.wallets.length > 0 && profile.wallets[0].legalName?.trim()) {
      return profile.wallets[0].legalName.trim();
    }
    if (profile.demographics.email) {
      const prefix = profile.demographics.email.split('@')[0];
      return prefix.charAt(0).toUpperCase() + prefix.slice(1) + ' Node';
    }
    return 'Decentralized Operator';
  }, [activeWallet, profile.wallets, profile.demographics.email]);

  // Compute trial days remaining
  const trialDaysRemaining = useMemo(() => {
    if (!trialState.hasStartedTrial || !trialState.trialExpiresAt) return 0;
    const diff = trialState.trialExpiresAt - Date.now();
    if (diff <= 0) return 0;
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }, [trialState]);

  // Update demographics
  const updateDemographics = useCallback((demographics: Partial<UserDemographics>) => {
    commitVault(prev => {
      const updatedProfile: UserProfile = {
        ...prev.profile,
        demographics: { ...prev.profile.demographics, ...demographics },
        updatedAt: Date.now()
      };
      return {
        ...prev,
        profile: updatedProfile,
        updatedAt: Date.now()
      };
    });
  }, [commitVault]);

  // Update location
  const updateLocation = useCallback((location: Partial<UserLocation>) => {
    commitVault(prev => {
      const updatedProfile: UserProfile = {
        ...prev.profile,
        location: { ...prev.profile.location, ...location },
        updatedAt: Date.now()
      };
      return {
        ...prev,
        profile: updatedProfile,
        updatedAt: Date.now()
      };
    });
  }, [commitVault]);

  // Update socials
  const updateSocials = useCallback((socials: Partial<SocialLinks>) => {
    commitVault(prev => {
      const updatedProfile: UserProfile = {
        ...prev.profile,
        socials: { ...prev.profile.socials, ...socials },
        updatedAt: Date.now()
      };
      return {
        ...prev,
        profile: updatedProfile,
        updatedAt: Date.now()
      };
    });
  }, [commitVault]);

  // Add wallet
  const addWallet = useCallback((walletData: Omit<BankWalletConfig, 'id' | 'createdAt'> | Omit<CryptoWalletConfig, 'id' | 'createdAt'>) => {
    const id = `wallet_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    let createdWallet: WalletEntry | null = null;

    commitVault(prev => {
      const isFirst = prev.registeredWallets.length === 0;
      const shouldBePrimary = walletData.isPrimary || isFirst;

      const newWallet: WalletEntry = {
        ...walletData,
        id,
        isPrimary: shouldBePrimary,
        createdAt: Date.now()
      } as WalletEntry;

      createdWallet = newWallet;

      const existingWallets = prev.registeredWallets.map(w => shouldBePrimary ? { ...w, isPrimary: false } : w);
      const updatedWallets = [...existingWallets, newWallet];
      const active = resolveActiveWallet(updatedWallets, shouldBePrimary ? id : (prev.activeWallet?.id || id));
      const seedNode = active ? deriveSeedNode(active.legalName) : prev.identityKeySeedNode;

      const updatedProfile: UserProfile = {
        ...prev.profile,
        wallets: updatedWallets,
        primaryWalletId: active ? active.id : null,
        updatedAt: Date.now()
      };

      return {
        ...prev,
        registeredWallets: updatedWallets,
        activeWallet: active,
        identityKeySeedNode: seedNode,
        profile: updatedProfile,
        updatedAt: Date.now()
      };
    });

    return createdWallet!;
  }, [commitVault]);

  // Update wallet
  const updateWallet = useCallback((id: string, updates: Partial<WalletEntry>) => {
    commitVault(prev => {
      const isMakingPrimary = updates.isPrimary === true;
      const updatedWallets = prev.registeredWallets.map(w => {
        if (w.id === id) {
          return { ...w, ...updates } as WalletEntry;
        }
        if (isMakingPrimary) {
          return { ...w, isPrimary: false } as WalletEntry;
        }
        return w;
      });

      const active = resolveActiveWallet(updatedWallets, isMakingPrimary ? id : (prev.activeWallet?.id || id));
      const seedNode = active ? deriveSeedNode(active.legalName) : prev.identityKeySeedNode;

      const updatedProfile: UserProfile = {
        ...prev.profile,
        wallets: updatedWallets,
        primaryWalletId: active ? active.id : null,
        updatedAt: Date.now()
      };

      return {
        ...prev,
        registeredWallets: updatedWallets,
        activeWallet: active,
        identityKeySeedNode: seedNode,
        profile: updatedProfile,
        updatedAt: Date.now()
      };
    });
  }, [commitVault]);

  // Remove wallet
  const removeWallet = useCallback((id: string) => {
    commitVault(prev => {
      const filtered = prev.registeredWallets.filter(w => w.id !== id);
      let newPrimaryId = prev.activeWallet?.id;
      if (newPrimaryId === id) {
        newPrimaryId = filtered.length > 0 ? filtered[0].id : null;
      }
      const updatedWallets = filtered.map(w => ({
        ...w,
        isPrimary: w.id === newPrimaryId
      }));

      const active = resolveActiveWallet(updatedWallets, newPrimaryId);
      const seedNode = active ? deriveSeedNode(active.legalName) : null;

      const updatedProfile: UserProfile = {
        ...prev.profile,
        wallets: updatedWallets,
        primaryWalletId: active ? active.id : null,
        updatedAt: Date.now()
      };

      return {
        ...prev,
        registeredWallets: updatedWallets,
        activeWallet: active,
        identityKeySeedNode: seedNode,
        profile: updatedProfile,
        updatedAt: Date.now()
      };
    });
  }, [commitVault]);

  // Set primary wallet
  const setPrimaryWallet = useCallback((id: string) => {
    commitVault(prev => {
      const updatedWallets = prev.registeredWallets.map(w => ({
        ...w,
        isPrimary: w.id === id
      }));

      const active = resolveActiveWallet(updatedWallets, id);
      const seedNode = active ? deriveSeedNode(active.legalName) : prev.identityKeySeedNode;

      const updatedProfile: UserProfile = {
        ...prev.profile,
        wallets: updatedWallets,
        primaryWalletId: id,
        updatedAt: Date.now()
      };

      return {
        ...prev,
        registeredWallets: updatedWallets,
        activeWallet: active,
        identityKeySeedNode: seedNode,
        profile: updatedProfile,
        updatedAt: Date.now()
      };
    });
  }, [commitVault]);

  // Start 30-day Free Trial
  const startFreeTrial = useCallback((durationDays = 30) => {
    const now = Date.now();
    const trialExpiresAt = now + durationDays * 24 * 60 * 60 * 1000;
    const newTrial: SubscriptionTrialState = {
      hasStartedTrial: true,
      trialStartedAt: now,
      trialExpiresAt,
      isTrialActive: true,
      tier: 'Trial',
      isSubscribed: true
    };

    commitVault(prev => ({
      ...prev,
      trialState: newTrial,
      updatedAt: Date.now()
    }));

    // Also update all MCP module subscriptions if any
    try {
      const rawSubs = localStorage.getItem('daup_subscriptions_db');
      const allSubs = rawSubs ? JSON.parse(rawSubs) : {};
      const targetDid = localStorage.getItem('daup_active_did') || 'did:daup:node-primary';
      if (!allSubs[targetDid]) allSubs[targetDid] = {};
      ['daup-farmer', 'daup-reseller', 'daup-eatery', 'daup-manufacturing'].forEach(mod => {
        allSubs[targetDid][mod] = {
          did: targetDid,
          module: mod,
          tier: 'Pro',
          expirationTimestamp: trialExpiresAt
        };
      });
      localStorage.setItem('daup_subscriptions_db', JSON.stringify(allSubs));
    } catch (e) {}
  }, [commitVault]);

  // Complete Onboarding
  const completeOnboarding = useCallback((finalProfileData?: Partial<UserProfile>) => {
    const now = Date.now();
    const trialDurationDays = 30;
    const trialExpiresAt = now + trialDurationDays * 24 * 60 * 60 * 1000;

    commitVault(prev => {
      const mergedWallets = finalProfileData?.wallets || prev.registeredWallets;
      const primaryId = finalProfileData?.primaryWalletId || (prev.activeWallet ? prev.activeWallet.id : (mergedWallets[0]?.id || null));
      const active = resolveActiveWallet(mergedWallets, primaryId);
      const seedNode = active ? deriveSeedNode(active.legalName) : (prev.identityKeySeedNode || deriveSeedNode());

      const updatedProfile: UserProfile = {
        ...prev.profile,
        ...(finalProfileData || {}),
        wallets: mergedWallets,
        primaryWalletId: active ? active.id : null,
        isOnboarded: true,
        updatedAt: now
      };

      const updatedTrial: SubscriptionTrialState = prev.trialState.hasStartedTrial ? prev.trialState : {
        hasStartedTrial: true,
        trialStartedAt: now,
        trialExpiresAt,
        isTrialActive: true,
        tier: 'Trial',
        isSubscribed: true
      };

      return {
        ...prev,
        hasCompletedOnboarding: true,
        registeredAt: prev.registeredAt || now,
        updatedAt: now,
        profile: updatedProfile,
        registeredWallets: mergedWallets,
        activeWallet: active,
        identityKeySeedNode: seedNode,
        trialState: updatedTrial
      };
    });

    // Auto-update MCP subscriptions database
    try {
      const rawSubs = localStorage.getItem('daup_subscriptions_db');
      const allSubs = rawSubs ? JSON.parse(rawSubs) : {};
      const targetDid = localStorage.getItem('daup_active_did') || 'did:daup:node-primary';
      if (!allSubs[targetDid]) allSubs[targetDid] = {};
      ['daup-farmer', 'daup-reseller', 'daup-eatery', 'daup-manufacturing'].forEach(mod => {
        allSubs[targetDid][mod] = {
          did: targetDid,
          module: mod,
          tier: 'Pro',
          expirationTimestamp: trialExpiresAt
        };
      });
      localStorage.setItem('daup_subscriptions_db', JSON.stringify(allSubs));
    } catch (e) {}
  }, [commitVault]);

  // Geolocation Auto-Enrichment
  const detectLocation = useCallback(async (): Promise<UserLocation> => {
    setIsDetectingLocation(true);
    
    const resolveFromCoords = async (lat: number, lon: number): Promise<UserLocation> => {
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`, {
          headers: { 'Accept': 'application/json' }
        });
        if (res.ok) {
          const data = await res.json();
          const addr = data.address || {};
          return {
            country: addr.country || 'United States',
            provinceState: addr.state || addr.region || addr.county || 'California',
            city: addr.city || addr.town || addr.village || addr.suburb || 'San Francisco',
            address: `${addr.house_number ? addr.house_number + ' ' : ''}${addr.road || addr.pedestrian || 'Market St'}`,
            latitude: lat,
            longitude: lon
          };
        }
      } catch (err) {
        console.warn('Reverse geocoding failed, using approximate coordinates', err);
      }
      return {
        country: 'United States',
        provinceState: 'California',
        city: 'San Francisco',
        address: '100 Howard Street, Suite 400',
        latitude: lat,
        longitude: lon
      };
    };

    return new Promise<UserLocation>((resolve) => {
      if (typeof window !== 'undefined' && 'geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const loc = await resolveFromCoords(position.coords.latitude, position.coords.longitude);
            setIsDetectingLocation(false);
            updateLocation(loc);
            resolve(loc);
          },
          async (_err) => {
            try {
              const ipRes = await fetch('https://ipapi.co/json/');
              if (ipRes.ok) {
                const ipData = await ipRes.json();
                const loc: UserLocation = {
                  country: ipData.country_name || 'United States',
                  provinceState: ipData.region || 'California',
                  city: ipData.city || 'San Francisco',
                  address: `${ipData.city || 'Downtown'} Regional Edge Center`,
                  latitude: ipData.latitude,
                  longitude: ipData.longitude
                };
                setIsDetectingLocation(false);
                updateLocation(loc);
                resolve(loc);
                return;
              }
            } catch (e) {}

            const fallbackLoc: UserLocation = {
              country: 'United States',
              provinceState: 'California',
              city: 'San Francisco',
              address: '500 Howard St, Financial District',
              latitude: 37.7891,
              longitude: -122.3993
            };
            setIsDetectingLocation(false);
            updateLocation(fallbackLoc);
            resolve(fallbackLoc);
          },
          { timeout: 8000, enableHighAccuracy: true }
        );
      } else {
        const fallbackLoc: UserLocation = {
          country: 'United States',
          provinceState: 'California',
          city: 'San Francisco',
          address: '500 Howard St, Financial District',
          latitude: 37.7891,
          longitude: -122.3993
        };
        setIsDetectingLocation(false);
        updateLocation(fallbackLoc);
        resolve(fallbackLoc);
      }
    });
  }, [updateLocation]);

  // Reset profile and purge vault
  const resetProfile = useCallback(() => {
    resetIdentityVault();
    setVault(DEFAULT_VAULT);
  }, []);

  return (
    <UserProfileContext.Provider
      value={{
        vault,
        profile,
        trialState,
        isOnboarded,
        hasCompletedOnboarding,
        isHydrating,
        primaryWallet,
        activeWallet,
        identityKeySeedNode,
        instanceName,
        currency,
        formatCurrency,
        isDetectingLocation,
        trialDaysRemaining,
        updateDemographics,
        updateLocation,
        updateSocials,
        addWallet,
        updateWallet,
        removeWallet,
        setPrimaryWallet,
        completeOnboarding,
        startFreeTrial,
        detectLocation,
        resetProfile,
        isProfileModalOpen,
        setIsProfileModalOpen
      }}
    >
      {children}
    </UserProfileContext.Provider>
  );
};

export const useUserProfile = () => {
  const context = useContext(UserProfileContext);
  if (!context) {
    throw new Error('useUserProfile must be used within a UserProfileProvider');
  }
  return context;
};
export default UserProfileContext;
