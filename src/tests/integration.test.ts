import { tsFallback, sha256 } from '../utils/cryptoFallback';
import { 
  deriveSeedNode, 
  deriveInstanceSlug,
  loadIdentityVault, 
  saveIdentityVault, 
  resetIdentityVault, 
  resolveActiveWallet,
  isLegalNameUniqueOnPlatform,
  registerLegalNameOnPlatform,
  unregisterLegalNameOnPlatform,
  deployAppInstance,
  getAppInstances,
  VAULT_STORAGE_KEY,
  LEGACY_PROFILE_KEY,
  LEGACY_TRIAL_KEY,
  SUBSCRIPTIONS_KEY,
  UserIdentityVault
} from '../stores/identityStore';
import { WalletEntry } from '../types/profile';
import { getSubscriptionForDidAndModule } from '../hooks/useMcpClient';
import { getModuleEndpoint, buildAppLaunchUrl } from '../utils/envResolver';

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

  // Test 7: Unique Mandatory Legal Name Validation on Platform
  try {
    const registeredWallets: WalletEntry[] = [
      {
        id: 'w-alpha',
        type: 'bank',
        legalName: 'Apex Hydroponics Ltd',
        bankName: 'Standard Bank',
        accountNumber: '111111',
        routingCode: '001',
        isPrimary: true,
        createdAt: Date.now()
      }
    ];

    registerLegalNameOnPlatform('Apex Hydroponics Ltd');
    registerLegalNameOnPlatform('Global Grain Silos Corp');

    // Duplicate in local wallets
    const dupLocal = isLegalNameUniqueOnPlatform('Apex Hydroponics Ltd', registeredWallets);
    assert(
      'Duplicate legal name in local wallets is rejected',
      !dupLocal.isUnique,
      `Rejection reason: ${dupLocal.reason}`
    );

    // Case-insensitive duplicate in platform registry
    const dupPlatform = isLegalNameUniqueOnPlatform('GLOBAL GRAIN SILOS CORP', registeredWallets);
    assert(
      'Case-insensitive duplicate legal name in platform registry is rejected',
      !dupPlatform.isUnique,
      `Rejection reason: ${dupPlatform.reason}`
    );

    // Unique name is accepted
    const uniqueCheck = isLegalNameUniqueOnPlatform('Cape Bio-Manufacturing Enterprise', registeredWallets);
    assert(
      'Unique legal name is accepted on DAUP platform',
      uniqueCheck.isUnique,
      'Unique name verified successfully.'
    );

    // Self-edit check (excluding current wallet ID)
    const selfCheck = isLegalNameUniqueOnPlatform('Apex Hydroponics Ltd', registeredWallets, 'w-alpha');
    assert(
      'Editing existing wallet with same legal name is permitted for the owner',
      selfCheck.isUnique,
      'Self-update permitted.'
    );

    unregisterLegalNameOnPlatform('Apex Hydroponics Ltd');
    unregisterLegalNameOnPlatform('Global Grain Silos Corp');
  } catch (e: any) {
    assert('Unique Mandatory Legal Name Validation', false, `Error: ${e.message}`);
  }

  // Test 8: Marketplace App Instance Deployment & Default 30-Day Active Trial
  try {
    const testDid = 'did:daup:test-node-eatery-pub';
    const testEntity = 'Bistro Decentral Ltd';

    const inst = deployAppInstance('daup-eatery', testEntity, testDid);
    assert(
      'Deploying app instance binds active wallet legal name as instance slug',
      inst.instanceName === 'bistro-decentral-ltd.daup' && inst.moduleKey === 'daup-eatery',
      `Deployed instance: ${inst.instanceName}`
    );
    assert(
      'Deploying app instance provisions a 30-day active trial by default',
      inst.trialExpiresAt > Date.now() + 29 * 24 * 60 * 60 * 1000,
      `Trial expires in: ${Math.round((inst.trialExpiresAt - Date.now()) / (1000 * 60 * 60 * 24))} days`
    );

    const sub = getSubscriptionForDidAndModule(testDid, 'daup-eatery');
    assert(
      'Newly queried/deployed app module is not expired and has active trial license',
      sub.expirationTimestamp > Date.now(),
      `Subscription expiration: ${new Date(sub.expirationTimestamp).toISOString()}`
    );

    // Cleanup
    const allInst = getAppInstances();
    delete allInst['daup-eatery'];
    localStorage.setItem('daup_app_instances_db', JSON.stringify(allInst));
  } catch (e: any) {
    assert('Marketplace App Instance Deployment & Default Trial', false, `Error: ${e.message}`);
  }

  // Test 9: Dynamic Environment URL Resolution & Handshake Launch URL
  try {
    const slug1 = deriveInstanceSlug('Cape Bistro Ltd');
    const slug2 = deriveInstanceSlug('The Eatery @ Stellenbosch!');
    assert(
      'Instance slug derives formatted lowercase .daup subdomain format',
      slug1 === 'cape-bistro-ltd.daup' && slug2 === 'the-eatery-stellenbosch.daup',
      `Derived slugs: "${slug1}", "${slug2}"`
    );

    const eateryUrl = getModuleEndpoint('daup-eatery');
    assert(
      'Eatery endpoint resolves to valid production or dev URL',
      eateryUrl.includes('eatery.daup.co.za') || eateryUrl.includes('localhost'),
      `Resolved endpoint: "${eateryUrl}"`
    );

    const launchUrl = buildAppLaunchUrl('daup-eatery', {
      legalName: 'Cape Bistro Ltd',
      did: 'did:daup:cape-bistro-seed-pub',
      token: 'test-license-token-123'
    });

    const parsedUrl = new URL(launchUrl);
    assert(
      'Launch URL includes instance, did, token, and walletName query parameters',
      parsedUrl.searchParams.get('instance') === 'cape-bistro-ltd.daup' &&
      parsedUrl.searchParams.get('did') === 'did:daup:cape-bistro-seed-pub' &&
      parsedUrl.searchParams.get('token') === 'test-license-token-123' &&
      parsedUrl.searchParams.get('walletName') === 'Cape Bistro Ltd',
      `Constructed URL: ${launchUrl}`
    );
  } catch (e: any) {
    assert('Dynamic Environment URL Resolution & Handshake', false, `Error: ${e.message}`);
  }

  return results;
}
export default runEdgePlatformTests;
