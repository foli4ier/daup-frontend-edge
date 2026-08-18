import { tsFallback, sha256 } from '../utils/cryptoFallback';
import { 
  deriveSeedNode, 
  loadIdentityVault, 
  saveIdentityVault, 
  resetIdentityVault, 
  resolveActiveWallet,
  VAULT_STORAGE_KEY,
  LEGACY_PROFILE_KEY,
  LEGACY_TRIAL_KEY,
  UserIdentityVault
} from '../stores/identityStore';
import { WalletEntry } from '../types/profile';

export interface TestResult {
  name: string;
  passed: boolean;
  message?: string;
}

export function runEdgePlatformTests(): TestResult[] {
  const results: TestResult[] = [];

  function assert(name: string, condition: boolean, message?: string) {
    results.push({
      name,
      passed: condition,
      message: message || (condition ? 'Test passed successfully.' : 'Assertion failed.')
    });
  }

  // Test 1: SHA256 consistency
  try {
    const hash = sha256('daup-platform');
    assert(
      'SHA256 consistency check', 
      hash.length === 64, 
      `Hash length: ${hash.length} chars (expected 64)`
    );
  } catch (e: any) {
    assert('SHA256 consistency check', false, `Error: ${e.message}`);
  }

  // Test 2: RSA signing & verification consistency
  try {
    const key = 'farmer-seed-test';
    const pub = `${key}-pub`;
    const prv = `${key}-prv`;
    const message = 'Sensor telemetry log: temp=24.2C, humidity=60%';

    const sig = tsFallback.sign_envelope(message, prv);
    const isValid = tsFallback.verify_envelope(message, sig, pub);
    assert(
      'Verify signature matches successfully generated envelope', 
      isValid,
      `Signature hex: ${sig.slice(0, 10)}...`
    );

    const isInvalid = tsFallback.verify_envelope(message + ' tampered data', sig, pub);
    assert(
      'Tampered message results in invalid signature verification', 
      !isInvalid,
      'Verified that tampering was correctly detected.'
    );
  } catch (e: any) {
    assert('Asymmetric signing & verification consistency', false, `Error: ${e.message}`);
  }

  // Test 3: Kademlia XOR routing table peer lookup
  try {
    const key = 'assets:logo';
    const testPeers = [
      { peer_id: 'peer-far', latency_ms: 10, status: 'Active' },
      { peer_id: 'peer-close', latency_ms: 20, status: 'Active' }
    ];
    
    const resultJson = tsFallback.dht_lookup(key, JSON.stringify(testPeers));
    const sorted = JSON.parse(resultJson);
    
    assert(
      'DHT XOR resolver returned correct peer count', 
      sorted.length === 2,
      `Returned ${sorted.length} peers (expected 2)`
    );
    assert(
      'DHT XOR resolver populated distance metrics', 
      !!sorted[0].distance,
      `First peer distance: ${sorted[0].distance?.slice(0, 10)}...`
    );
    assert(
      'DHT XOR resolver sorted peer list by distance', 
      sorted[0].distance <= sorted[1].distance,
      'Verified closer XOR distance is sorted first.'
    );
  } catch (e: any) {
    assert('Kademlia XOR peer lookup test', false, `Error: ${e.message}`);
  }

  // Test 4: Identity Vault Seed Node Derivation
  try {
    const seed1 = deriveSeedNode('Apex Holdings LLC');
    const seed2 = deriveSeedNode('Apex Holdings LLC');
    const seedFallback = deriveSeedNode('');
    
    assert(
      'Deterministic seed node derivation is consistent',
      seed1 === 'apex-holdings-llc-seed' && seed1 === seed2,
      `Derived seed: "${seed1}"`
    );
    assert(
      'Fallback seed node derivation provides default node',
      seedFallback === 'farmer-wallet-seed-1',
      `Fallback seed: "${seedFallback}"`
    );
  } catch (e: any) {
    assert('Identity Vault Seed Node Derivation', false, `Error: ${e.message}`);
  }

  // Test 5: Identity Vault Active Wallet Resolution
  try {
    const wallets: WalletEntry[] = [
      {
        id: 'wallet-1',
        type: 'bank',
        legalName: 'Secondary Corp',
        bankName: 'Test Bank',
        accountNumber: '123',
        routingCode: '456',
        isPrimary: false,
        createdAt: 1000
      },
      {
        id: 'wallet-2',
        type: 'bank',
        legalName: 'Primary Enterprise',
        bankName: 'Test Bank 2',
        accountNumber: '789',
        routingCode: '012',
        isPrimary: true,
        createdAt: 2000
      }
    ];

    const active = resolveActiveWallet(wallets, 'wallet-2');
    assert(
      'Active wallet resolution selects primary wallet correctly',
      active?.id === 'wallet-2' && active.legalName === 'Primary Enterprise',
      `Resolved active wallet: ${active?.legalName}`
    );
  } catch (e: any) {
    assert('Identity Vault Active Wallet Resolution', false, `Error: ${e.message}`);
  }

  // Test 6: Vault Persistence & Legacy Migration
  try {
    // Test unified vault round-trip
    const testVault: UserIdentityVault = {
      version: 1,
      hasCompletedOnboarding: true,
      registeredAt: 1700000000000,
      updatedAt: 1700000000000,
      profile: {
        demographics: {
          email: 'test@daup.co.za',
          contactNumber: '+27123456789',
          whatsappNumber: '',
          language: 'en',
          sex: 'prefer_not_to_say',
          birthdate: '1990-01-01'
        },
        location: {
          country: 'South Africa',
          provinceState: 'Gauteng',
          city: 'Johannesburg',
          address: '1 Fox Street'
        },
        socials: { website: '', instagram: '', facebook: '' },
        wallets: [{
          id: 'w-test',
          type: 'bank',
          legalName: 'Gauteng Agrico',
          bankName: 'FNB',
          accountNumber: '628000000',
          routingCode: '250655',
          isPrimary: true,
          createdAt: 1700000000000
        }],
        primaryWalletId: 'w-test',
        isOnboarded: true,
        createdAt: 1700000000000,
        updatedAt: 1700000000000
      },
      registeredWallets: [{
        id: 'w-test',
        type: 'bank',
        legalName: 'Gauteng Agrico',
        bankName: 'FNB',
        accountNumber: '628000000',
        routingCode: '250655',
        isPrimary: true,
        createdAt: 1700000000000
      }],
      activeWallet: {
        id: 'w-test',
        type: 'bank',
        legalName: 'Gauteng Agrico',
        bankName: 'FNB',
        accountNumber: '628000000',
        routingCode: '250655',
        isPrimary: true,
        createdAt: 1700000000000
      },
      identityKeySeedNode: 'gauteng-agrico-seed',
      trialState: {
        hasStartedTrial: true,
        trialStartedAt: 1700000000000,
        trialExpiresAt: 1702592000000,
        isTrialActive: true,
        tier: 'Trial',
        isSubscribed: true
      }
    };

    saveIdentityVault(testVault);
    const loaded = loadIdentityVault();

    assert(
      'Unified Identity Vault saves and hydrates hasCompletedOnboarding correctly',
      loaded.hasCompletedOnboarding === true,
      `Hydrated hasCompletedOnboarding: ${loaded.hasCompletedOnboarding}`
    );
    assert(
      'Unified Identity Vault hydrates activeWallet and legalName accurately',
      loaded.activeWallet?.legalName === 'Gauteng Agrico',
      `Hydrated active legalName: "${loaded.activeWallet?.legalName}"`
    );
    assert(
      'Unified Identity Vault hydrates derived identityKeySeedNode',
      loaded.identityKeySeedNode === 'gauteng-agrico-seed',
      `Hydrated seed node: "${loaded.identityKeySeedNode}"`
    );

    // Test Legacy Migration: simulate legacy storage
    resetIdentityVault();
    localStorage.setItem(LEGACY_PROFILE_KEY, JSON.stringify({
      demographics: { email: 'legacy@daup.co.za' },
      location: { country: 'South Africa', city: 'Cape Town' },
      wallets: [{
        id: 'legacy-w1',
        type: 'crypto',
        legalName: 'Legacy Node Operator',
        chainId: '1',
        address: '0x1234567890',
        isPrimary: true,
        createdAt: 1690000000000
      }],
      primaryWalletId: 'legacy-w1',
      isOnboarded: true
    }));

    const migrated = loadIdentityVault();
    assert(
      'Legacy profile automatically migrates to unified vault with hasCompletedOnboarding: true',
      migrated.hasCompletedOnboarding === true && migrated.activeWallet?.legalName === 'Legacy Node Operator',
      `Migrated operator: "${migrated.activeWallet?.legalName}", onboarded: ${migrated.hasCompletedOnboarding}`
    );

    // Cleanup test vault
    resetIdentityVault();
  } catch (e: any) {
    assert('Vault Persistence & Legacy Migration', false, `Error: ${e.message}`);
  }

  return results;
}
export default runEdgePlatformTests;
