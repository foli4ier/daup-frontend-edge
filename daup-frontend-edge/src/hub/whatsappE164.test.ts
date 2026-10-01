import { beforeEach, describe, expect, it } from 'vitest';
import {
  canonicalWhatsappField,
  toWhatsappE164,
  whatsappIdentityChanged
} from './whatsappE164';
import {
  clearHouseFromVault,
  loadIdentityVault,
  saveIdentityVault,
  type UserIdentityVault
} from '../stores/identityStore';

describe('WhatsApp E.164', () => {
  it('keeps Frans number and local South African forms as the same key', () => {
    expect(toWhatsappE164('+27829261373')).toBe('+27829261373');
    expect(toWhatsappE164('27829261373')).toBe('+27829261373');
    expect(toWhatsappE164('0829261373')).toBe('+27829261373');
    expect(toWhatsappE164('829261373')).toBe('+27829261373');
    expect(toWhatsappE164('+27 82 926 1373')).toBe('+27829261373');
    expect(toWhatsappE164('0027829261373')).toBe('+27829261373');
    expect(toWhatsappE164('(082) 926-1373')).toBe('+27829261373');
  });

  it('rejects empty, short, and ambiguous numbers', () => {
    expect(toWhatsappE164('')).toBe('');
    expect(toWhatsappE164('   ')).toBe('');
    expect(toWhatsappE164('1234567')).toBe('');
    expect(toWhatsappE164('12345678')).toBe('');
    expect(toWhatsappE164('4155552671')).toBe('');
    expect(canonicalWhatsappField('0829261373')).toBe('+27829261373');
    expect(canonicalWhatsappField('not-a-number')).toBe('not-a-number');
  });

  it('treats the first link as the same identity and a replacement as a change', () => {
    expect(whatsappIdentityChanged('', '+27829261373')).toBe(false);
    expect(whatsappIdentityChanged('0829261373', '+27829261373')).toBe(false);
    expect(whatsappIdentityChanged('+27829261373', '+27820000000')).toBe(true);
    expect(whatsappIdentityChanged('+27829261373', '')).toBe(true);
  });
});

describe('profile WhatsApp persistence', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('rewrites a local number to E.164 on save and keeps it when the house is cleared', () => {
    const vault = {
      version: 1 as const,
      hasCompletedOnboarding: true,
      registeredAt: 1,
      updatedAt: 1,
      profile: {
        demographics: {
          email: 'frans@example.co.za',
          contactNumber: '0829261373',
          whatsappNumber: '0829261373',
          language: 'en',
          sex: 'prefer_not_to_say' as const,
          birthdate: ''
        },
        location: {
          country: 'South Africa',
          provinceState: '',
          city: 'Kortrijk',
          address: ''
        },
        socials: { website: '', instagram: '', facebook: '' },
        wallets: [],
        primaryWalletId: null,
        isOnboarded: true,
        createdAt: 1,
        updatedAt: 1
      },
      registeredWallets: [],
      activeWallet: null,
      identityKeySeedNode: null,
      trialState: {
        hasStartedTrial: false,
        trialStartedAt: null,
        trialExpiresAt: null,
        isTrialActive: false,
        tier: 'Free' as const,
        isSubscribed: false
      }
    } satisfies UserIdentityVault;

    saveIdentityVault(vault);
    expect(loadIdentityVault().profile.demographics.whatsappNumber).toBe('+27829261373');
    expect(loadIdentityVault().profile.demographics.email).toBe('frans@example.co.za');

    const cleared = clearHouseFromVault('frans@example.co.za', '0829261373');
    expect(cleared.profile.demographics.email).toBe('frans@example.co.za');
    expect(cleared.profile.demographics.whatsappNumber).toBe('+27829261373');
    expect(cleared.hasCompletedOnboarding).toBe(false);
    expect(loadIdentityVault().profile.demographics.whatsappNumber).toBe('+27829261373');
  });
});
