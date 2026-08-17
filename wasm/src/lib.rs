use wasm_bindgen::prelude::*;
use sha2::{Sha256, Digest};
use serde::{Serialize, Deserialize};
use std::str::FromStr;

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Peer {
    pub peer_id: String,
    pub distance: Option<String>,
    pub latency_ms: u32,
    pub status: String,
}

// Fixed Keypair parameters for deterministic simulation
struct KeyParameters {
    n: u64,
    e: u64,
    d: u64,
}

fn get_key_parameters_by_seed(seed: &str) -> KeyParameters {
    // Generate a simple hash of the seed to choose a prime pair
    let mut hasher = Sha256::new();
    hasher.update(seed.as_bytes());
    let hash = hasher.finalize();
    let idx = (hash[0] as usize) % 3;

    match idx {
        0 => KeyParameters {
            n: 5000048128079,
            e: 65537,
            d: 1693721759633,
        },
        1 => KeyParameters {
            n: 7586548545529,
            e: 65537,
            d: 6271922335193,
        },
        _ => KeyParameters {
            n: 15212353344773,
            e: 65537,
            d: 12760677561817,
        },
    }
}

// Modular exponentiation: (base^exp) % modulus
fn power(mut base: u128, mut exp: u128, modulus: u128) -> u128 {
    let mut res = 1;
    base = base % modulus;
    while exp > 0 {
        if exp % 2 == 1 {
            res = (res * base) % modulus;
        }
        exp = exp >> 1;
        base = (base * base) % modulus;
    }
    res
}

// Helper to hash message to u64
fn hash_message_to_u64(message: &str) -> u64 {
    let mut hasher = Sha256::new();
    hasher.update(message.as_bytes());
    let result = hasher.finalize();
    // Take the first 8 bytes of the hash
    let mut bytes = [0u8; 8];
    bytes.copy_from_slice(&result[0..8]);
    u64::from_be_bytes(bytes)
}

#[wasm_bindgen]
pub fn sign_envelope(message: &str, private_key: &str) -> String {
    // Check if the key contains our suffix (e.g. "seed_text-prv")
    let seed = if private_key.ends_ok("-prv") {
        private_key.trim_end_matches("-prv")
    } else {
        private_key
    };

    let params = get_key_parameters_by_seed(seed);
    let msg_hash = hash_message_to_u64(message);
    
    // RSA sign: s = h^d mod n
    // Ensure msg_hash is strictly less than n
    let base = (msg_hash % params.n) as u128;
    let exp = params.d as u128;
    let mod_n = params.n as u128;
    
    let sig = power(base, exp, mod_n);
    format!("{:x}", sig)
}

// Helper trait to replace ends_with since we want to avoid extra typings
trait EndsOk {
    fn ends_ok(&self, suffix: &str) -> bool;
}

impl EndsOk for &str {
    fn ends_ok(&self, suffix: &str) -> bool {
        self.ends_with(suffix)
    }
}

#[wasm_bindgen]
pub fn verify_envelope(message: &str, signature: &str, public_key: &str) -> bool {
    let seed = if public_key.ends_ok("-pub") {
        public_key.trim_end_matches("-pub")
    } else {
        public_key
    };

    let params = get_key_parameters_by_seed(seed);
    let msg_hash = hash_message_to_u64(message);
    
    // Parse signature from hex
    let sig_val = match u128::from_str_radix(signature, 16) {
        Ok(val) => val,
        Err(_) => return false,
    };

    // RSA verify: h_prime = s^e mod n
    let exp = params.e as u128;
    let mod_n = params.n as u128;
    let h_prime = power(sig_val, exp, mod_n) as u64;

    h_prime == (msg_hash % params.n)
}

#[wasm_bindgen]
pub fn dht_lookup(key: &str, peer_list_json: &str) -> String {
    // Parse key hash
    let mut key_hasher = Sha256::new();
    key_hasher.update(key.as_bytes());
    let key_hash = key_hasher.finalize();

    // Parse peers
    let mut peers: Vec<Peer> = match serde_json::from_str(peer_list_json) {
        Ok(list) => list,
        Err(_) => return "[]".to_string(),
    };

    // Calculate XOR distance for each peer and assign distance field
    for peer in &mut peers {
        let mut peer_hasher = Sha256::new();
        peer_hasher.update(peer.peer_id.as_bytes());
        let peer_hash = peer_hasher.finalize();

        // XOR the hashes byte-by-byte
        let mut xor_dist = [0u8; 32];
        for i in 0..32 {
            xor_dist[i] = key_hash[i] ^ peer_hash[i];
        }

        // Convert XOR distance to hex representation
        peer.distance = Some(hex::encode(xor_dist));
    }

    // Sort peers by distance
    peers.sort_by(|a, b| {
        let dist_a = a.distance.as_ref().unwrap();
        let dist_b = b.distance.as_ref().unwrap();
        dist_a.cmp(dist_b)
    });

    serde_json::to_string(&peers).unwrap_or_else(|_| "[]".to_string())
}
