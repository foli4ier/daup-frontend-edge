import { tsFallback } from '../utils/cryptoFallback';

export default async function init() {
  // Mock WASM initialization
  return Promise.resolve();
}

export const sign_envelope = tsFallback.sign_envelope;
export const verify_envelope = tsFallback.verify_envelope;
export const dht_lookup = tsFallback.dht_lookup;
