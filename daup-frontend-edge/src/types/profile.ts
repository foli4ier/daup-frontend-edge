// Types for DAUP User Profile, Multi-Wallet Registry, and Subscription State

export type WalletType = 'bank' | 'crypto';

export interface BaseWalletConfig {
  id: string;
  type: WalletType;
  legalName: string;
  isPrimary: boolean;
  createdAt: number;
}

export interface BankWalletConfig extends BaseWalletConfig {
  type: 'bank';
  bankName: string;
  accountNumber: string;
  routingCode: string;
}

export interface CryptoWalletConfig extends BaseWalletConfig {
  type: 'crypto';
  chainId: string;
  address: string;
}

export type WalletEntry = BankWalletConfig | CryptoWalletConfig;

export type SexType = 'male' | 'female' | 'other' | 'prefer_not_to_say';

export interface UserLocation {
  country: string;
  provinceState: string;
  city: string;
  address: string;
  latitude?: number;
  longitude?: number;
}

export interface SocialLinks {
  website: string;
  instagram: string;
  facebook: string;
}

export interface UserDemographics {
  email: string;
  contactNumber: string;
  whatsappNumber: string;
  language: string;
  sex: SexType;
  birthdate: string; // YYYY-MM-DD
}

export interface UserProfile {
  demographics: UserDemographics;
  location: UserLocation;
  socials: SocialLinks;
  wallets: WalletEntry[];
  primaryWalletId: string | null;
  isOnboarded: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface SubscriptionTrialState {
  hasStartedTrial: boolean;
  trialStartedAt: number | null;
  trialExpiresAt: number | null;
  isTrialActive: boolean;
  tier: 'Free' | 'Trial' | 'Pro' | 'Enterprise' | 'Developer';
  isSubscribed: boolean;
}
