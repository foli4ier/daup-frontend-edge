import { tsFallback, sha256 } from '../utils/cryptoFallback';

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

  return results;
}
export default runEdgePlatformTests;
