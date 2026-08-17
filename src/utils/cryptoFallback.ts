// Pure TypeScript Cryptographic & DHT Fallback Utilities

export interface WasmExports {
  sign_envelope: (message: string, privateKey: string) => string;
  verify_envelope: (message: string, signature: string, publicKey: string) => boolean;
  dht_lookup: (key: string, peerListJson: string) => string;
}

// Pure JS/TS SHA-256 implementation
export function sha256(ascii: string): string {
  function rightRotate(value: number, amount: number) {
    return (value >>> amount) | (value << (32 - amount));
  }
  
  const words: number[] = [];
  const asciiLength = ascii.length;
  for (let i = 0; i < asciiLength; i++) {
    words[i >> 2] |= (ascii.charCodeAt(i) & 0xff) << (24 - (i % 4) * 8);
  }
  
  words[asciiLength >> 2] |= 0x80 << (24 - (asciiLength % 4) * 8);
  const wordsLength = ((asciiLength + 8) >> 6) * 16 + 14;
  while (words.length < wordsLength) {
    words.push(0);
  }
  words.push(0);
  words.push(asciiLength * 8);
  
  let h0 = 0x6a09e667, h1 = 0xbb67ae85, h2 = 0x3c6ef372, h3 = 0xa54ff53a,
      h4 = 0x510e527f, h5 = 0x9b05688c, h6 = 0x1f83d9ab, h7 = 0x5be0cd19;
      
  const k = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ];
  
  for (let j = 0; j < words.length; j += 16) {
    const w = words.slice(j, j + 16);
    for (let i = 16; i < 64; i++) {
      const s0 = rightRotate(w[i - 15], 7) ^ rightRotate(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = rightRotate(w[i - 2], 17) ^ rightRotate(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0;
    }
    
    let a = h0, b = h1, c = h2, d = h3, e = h4, f = h5, g = h6, h = h7;
    
    for (let i = 0; i < 64; i++) {
      const S1 = rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + S1 + ch + k[i] + w[i]) | 0;
      const S0 = rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) | 0;
      
      h = g;
      g = f;
      f = e;
      e = (d + temp1) | 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) | 0;
    }
    
    h0 = (h0 + a) | 0;
    h1 = (h1 + b) | 0;
    h2 = (h2 + c) | 0;
    h3 = (h3 + d) | 0;
    h4 = (h4 + e) | 0;
    h5 = (h5 + f) | 0;
    h6 = (h6 + g) | 0;
    h7 = (h7 + h) | 0;
  }
  
  const hex = (num: number) => {
    let s = '', v;
    for (let i = 7; i >= 0; i--) {
      v = (num >>> (i * 4)) & 0xf;
      s += v.toString(16);
    }
    return s;
  };
  return hex(h0) + hex(h1) + hex(h2) + hex(h3) + hex(h4) + hex(h5) + hex(h6) + hex(h7);
}

// BigInt modular exponentiation
export function power_bigint(base: bigint, exp: bigint, modulus: bigint): bigint {
  let res = 1n;
  base = base % modulus;
  while (exp > 0n) {
    if (exp % 2n === 1n) {
      res = (res * base) % modulus;
    }
    exp = exp / 2n;
    base = (base * base) % modulus;
  }
  return res;
}

interface KeyParameters {
  n: bigint;
  e: bigint;
  d: bigint;
}

function getKeyParametersBySeed(seed: string): KeyParameters {
  const hash = sha256(seed);
  const idx = parseInt(hash.slice(0, 2), 16) % 3;

  switch (idx) {
    case 0:
      return { n: 5000048128079n, e: 65537n, d: 1693721759633n };
    case 1:
      return { n: 7586548545529n, e: 65537n, d: 6271922335193n };
    default:
      return { n: 15212353344773n, e: 65537n, d: 12760677561817n };
  }
}

function hashMessageToBigint(message: string): bigint {
  const hash = sha256(message);
  const hexPart = hash.slice(0, 16);
  return BigInt('0x' + hexPart);
}

export const tsFallback: WasmExports = {
  sign_envelope: (message: string, privateKey: string): string => {
    const seed = privateKey.endsWith('-prv') ? privateKey.slice(0, -4) : privateKey;
    const params = getKeyParametersBySeed(seed);
    const msgHash = hashMessageToBigint(message);

    const base = msgHash % params.n;
    const exp = params.d;
    const sig = power_bigint(base, exp, params.n);
    return sig.toString(16);
  },

  verify_envelope: (message: string, signature: string, publicKey: string): boolean => {
    const seed = publicKey.endsWith('-pub') ? publicKey.slice(0, -4) : publicKey;
    const params = getKeyParametersBySeed(seed);
    const msgHash = hashMessageToBigint(message);

    let sigVal: bigint;
    try {
      sigVal = BigInt('0x' + signature);
    } catch {
      return false;
    }

    const hPrime = power_bigint(sigVal, params.e, params.n);
    return hPrime === (msgHash % params.n);
  },

  dht_lookup: (key: string, peerListJson: string): string => {
    const keyHash = sha256(key);
    let peers: any[] = [];
    try {
      peers = JSON.parse(peerListJson);
    } catch {
      return '[]';
    }

    const xorHex = (h1: string, h2: string): string => {
      let result = '';
      for (let i = 0; i < h1.length; i++) {
        const val = parseInt(h1[i], 16) ^ parseInt(h2[i], 16);
        result += val.toString(16);
      }
      return result;
    };

    const peersWithDist = peers.map((peer) => {
      const peerHash = sha256(peer.peer_id);
      const distance = xorHex(keyHash, peerHash);
      return { ...peer, distance };
    });

    peersWithDist.sort((a, b) => {
      if (a.distance! < b.distance!) return -1;
      if (a.distance! > b.distance!) return 1;
      return 0;
    });

    return JSON.stringify(peersWithDist);
  }
};
