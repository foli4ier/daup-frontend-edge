import React, { useState, useCallback, createContext, useContext, useRef } from 'react';
import { runEdgePlatformTests } from '../tests/integration.test';

export interface McpTool {
  name: string;
  description: string;
  parameters: {
    type: string;
    properties: Record<string, { type: string; description: string }>;
    required?: string[];
  };
}

export interface McpConsoleLog {
  timestamp: number;
  type: 'request' | 'response' | 'system' | 'error';
  content: string;
}

// Simulated active MCP tools
const AVAILABLE_TOOLS: McpTool[] = [
  {
    name: 'edge_ipfs_pin',
    description: 'Registers or simulates pinning a CID (Content Identifier) locally to ensure content availability.',
    parameters: {
      type: 'object',
      properties: {
        cid: { type: 'string', description: 'The IPFS Content Identifier (CID)' },
        name: { type: 'string', description: 'An optional friendly nickname for the pinned file' }
      },
      required: ['cid']
    }
  },
  {
    name: 'edge_ipfs_unpin',
    description: 'Removes the local pin registration for a given IPFS Content Identifier.',
    parameters: {
      type: 'object',
      properties: {
        cid: { type: 'string', description: 'The Content Identifier (CID) to unpin' }
      },
      required: ['cid']
    }
  },
  {
    name: 'edge_ipfs_list_pins',
    description: 'Returns a list of all local pinned IPFS Content Identifiers.',
    parameters: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'edge_dcdn_set_route',
    description: 'Configures edge routing parameters for a Decentralized Content Delivery Network (dCDN).',
    parameters: {
      type: 'object',
      properties: {
        key: { type: 'string', description: 'The content addressing key or lookup route' },
        targetPeerId: { type: 'string', description: 'The libp2p PeerId to route requests to' },
        latencyMs: { type: 'number', description: 'Ping latency to the target peer in milliseconds' },
        ttl: { type: 'number', description: 'Time-To-Live duration of this route in seconds' }
      },
      required: ['key', 'targetPeerId', 'latencyMs', 'ttl']
    }
  },
  {
    name: 'edge_dcdn_get_route',
    description: 'Retrieves routing parameters for a specific dCDN key.',
    parameters: {
      type: 'object',
      properties: {
        key: { type: 'string', description: 'The content key to query routing for' }
      },
      required: ['key']
    }
  },
  {
    name: 'edge_get_health',
    description: 'Queries and returns the operational health and usage metrics of the current edge node.',
    parameters: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'identity_resolve_dht',
    description: 'Resolves a DID Document from the Kademlia DHT routing table.',
    parameters: {
      type: 'object',
      properties: {
        did: { type: 'string', description: 'The Decentralized Identifier to resolve (did:daup:<pubKey>)' }
      },
      required: ['did']
    }
  },
  {
    name: 'identity_resolve_contract',
    description: 'Resolves DID ownership, public key, and document URI from the DIDRegistry smart contract.',
    parameters: {
      type: 'object',
      properties: {
        did: { type: 'string', description: 'The Decentralized Identifier to resolve' }
      },
      required: ['did']
    }
  },
  {
    name: 'identity_verify_did',
    description: 'Verifies the validity of a DID by comparing Kademlia DHT and smart contract DID records.',
    parameters: {
      type: 'object',
      properties: {
        did: { type: 'string', description: 'The Decentralized Identifier to verify' }
      },
      required: ['did']
    }
  },
  {
    name: 'edge_run_diagnostics',
    description: 'Runs the local edge integration test suite evaluating cryptographic integrity and DHT XOR distance metrics.',
    parameters: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'verify_subscription_access',
    description: 'Queries the Subscription Gateway smart contract registry to verify active license status for a given DID and module name.',
    parameters: {
      type: 'object',
      properties: {
        did: { type: 'string', description: 'The Decentralized Identifier of the node' },
        module: { type: 'string', description: 'The vertical app name to check access for' }
      },
      required: ['did', 'module']
    }
  },
  {
    name: 'register_subscription',
    description: 'Renews or upgrades a license subscription for a given DID and module on the smart contract registry.',
    parameters: {
      type: 'object',
      properties: {
        did: { type: 'string', description: 'The Decentralized Identifier of the node' },
        module: { type: 'string', description: 'The vertical app name to register' },
        tier: { type: 'string', description: 'The target license tier (Pro, Enterprise, Developer)' },
        durationDays: { type: 'number', description: 'The subscription duration in days' }
      },
      required: ['did', 'module', 'tier', 'durationDays']
    }
  },
  {
    name: 'identity_register_profile',
    description: 'Registers or updates a user profile, contact info, location, and primary settlement wallet on the decentralized MCP identity ledger.',
    parameters: {
      type: 'object',
      properties: {
        did: { type: 'string', description: 'The Decentralized Identifier of the node/user' },
        profile: { type: 'object', description: 'User profile containing demographics, location, socials, and wallets' }
      },
      required: ['did', 'profile']
    }
  },
  {
    name: 'identity_get_profile',
    description: 'Retrieves the complete decentralized identity profile, location enrichment, and registered wallets for a given DID.',
    parameters: {
      type: 'object',
      properties: {
        did: { type: 'string', description: 'The Decentralized Identifier to query' }
      },
      required: ['did']
    }
  },
  {
    name: 'identity_start_trial',
    description: 'Activates the 30-day Free Trial subscription tier for a registered identity node across all vertical ecosystem modules.',
    parameters: {
      type: 'object',
      properties: {
        did: { type: 'string', description: 'The Decentralized Identifier of the node' }
      },
      required: ['did']
    }
  },
  {
    name: 'identity_list_wallets',
    description: 'Lists all registered payout/settlement endpoints (Bank Accounts and Crypto Wallets) for the given DID.',
    parameters: {
      type: 'object',
      properties: {
        did: { type: 'string', description: 'The Decentralized Identifier of the node' }
      },
      required: ['did']
    }
  },
  {
    name: 'instance_delete_from_network',
    description: 'Permanently deletes and decommissions a subscribed application or node instance from the decentralized Kademlia DHT, unpins storage CIDs, and revokes smart contract license leases.',
    parameters: {
      type: 'object',
      properties: {
        did: { type: 'string', description: 'The Decentralized Identifier of the node' },
        instanceName: { type: 'string', description: 'The exact name of the instance being deleted' },
        module: { type: 'string', description: 'Optional specific module key to delete' }
      },
      required: ['did', 'instanceName']
    }
  }
];

// Simulated DB States (persisted inside this module or localStorage)
let pinsDb: any[] = [
  { cid: 'QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco', name: 'daup-logo.svg', timestamp: Date.now() - 500000 },
  { cid: 'QmfX666Wp2tG3JpG8eWv7zFz5KjLz7f5q72e1r3e2fWcoA', name: 'eatery-license-v1.pdf', timestamp: Date.now() - 200000 }
];

let routesDb: Record<string, any> = {
  'assets:logo': {
    key: 'assets:logo',
    targetPeerId: '12D3KooWL5z7f5V8a6K7eL8y9dF4bS6gH2tX4c5w6',
    latencyMs: 14,
    ttl: 3600,
    updatedAt: Date.now() - 10000
  }
};

const LOCAL_STORAGE_SUB_KEY = 'daup_subscriptions_db';

export interface SubscriptionRecord {
  did: string;
  module: string;
  tier: 'Free' | 'Pro' | 'Enterprise' | 'Developer';
  expirationTimestamp: number;
}

export function getSubscriptions(): Record<string, Record<string, SubscriptionRecord>> {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_SUB_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return {};
}

export function saveSubscriptions(subs: Record<string, Record<string, SubscriptionRecord>>) {
  try {
    localStorage.setItem(LOCAL_STORAGE_SUB_KEY, JSON.stringify(subs));
  } catch (e) {}
}

export function getSubscriptionForDidAndModule(did: string, moduleName: string): SubscriptionRecord {
  const all = getSubscriptions();
  if (!all[did]) {
    all[did] = {};
  }
  
  if (!all[did][moduleName]) {
    const now = Date.now();
    if (moduleName === 'daup-farmer') {
      all[did][moduleName] = {
        did: did,
        module: moduleName,
        tier: 'Pro',
        expirationTimestamp: now + 30 * 24 * 60 * 60 * 1000 // 30 days
      };
    } else {
      all[did][moduleName] = {
        did: did,
        module: moduleName,
        tier: 'Free',
        expirationTimestamp: now - 24 * 60 * 60 * 1000 // expired 1 day ago
      };
    }
    saveSubscriptions(all);
  }
  
  return all[did][moduleName];
}

export function useMcpClient(wasmExports: any, activeDid: string | null) {
  const [logs, setLogs] = useState<McpConsoleLog[]>([
    { timestamp: Date.now(), type: 'system', content: 'DAUP MCP client initialized. Connected to local transport (Libp2pStreamTransport).' },
    { timestamp: Date.now(), type: 'system', content: 'Discovered modules: EdgeModule, IdentityModule, GovernanceModule.' }
  ]);
  const requestIdRef = useRef(1);

  const addLog = useCallback((type: 'request' | 'response' | 'system' | 'error', content: string) => {
    setLogs((prev) => [...prev, { timestamp: Date.now(), type, content }]);
  }, []);

  const sendRequest = useCallback(async (method: string, params: any) => {
    const id = requestIdRef.current;
    requestIdRef.current += 1;

    addLog('request', `--> JSON-RPC Request (id: ${id})\n{\n  "jsonrpc": "2.0",\n  "method": "${method}",\n  "params": ${JSON.stringify(params, null, 2)},\n  "id": ${id}\n}`);

    // Simulate Network latency
    await new Promise((resolve) => setTimeout(resolve, 250 + Math.random() * 200));

    // Find the tool schema
    const tool = AVAILABLE_TOOLS.find((t) => t.name === method);
    if (!tool) {
      const errResponse = {
        jsonrpc: '2.0',
        error: { code: -32601, message: `Method not found: ${method}` },
        id
      };
      addLog('error', `<-- JSON-RPC Error Response (id: ${id})\n${JSON.stringify(errResponse, null, 2)}`);
      return errResponse;
    }

    // Validate parameters
    const missing = tool.parameters.required?.filter((p) => params[p] === undefined || params[p] === '');
    if (missing && missing.length > 0) {
      const errResponse = {
        jsonrpc: '2.0',
        error: { code: -32602, message: `Invalid params. Missing required fields: ${missing.join(', ')}` },
        id
      };
      addLog('error', `<-- JSON-RPC Error Response (id: ${id})\n${JSON.stringify(errResponse, null, 2)}`);
      return errResponse;
    }

    // Execute simulated action
    let result: any = null;

    try {
      switch (method) {
        case 'edge_ipfs_pin': {
          const { cid, name = 'unnamed-pin' } = params;
          // Check if already pinned
          pinsDb = pinsDb.filter(p => p.cid !== cid);
          pinsDb.push({ cid, name, timestamp: Date.now() });
          result = { status: 'pinned', cid, name, timestamp: Date.now() };
          break;
        }

        case 'edge_ipfs_unpin': {
          const { cid } = params;
          const found = pinsDb.some(p => p.cid === cid);
          if (found) {
            pinsDb = pinsDb.filter(p => p.cid !== cid);
            result = { status: 'unpinned', cid };
          } else {
            throw new Error(`CID ${cid} is not pinned or registered.`);
          }
          break;
        }

        case 'edge_ipfs_list_pins': {
          result = pinsDb;
          break;
        }

        case 'edge_dcdn_set_route': {
          const { key, targetPeerId, latencyMs, ttl } = params;
          routesDb[key] = {
            key,
            targetPeerId,
            latencyMs: Number(latencyMs),
            ttl: Number(ttl),
            updatedAt: Date.now()
          };
          result = { status: 'route-updated', route: routesDb[key] };
          break;
        }

        case 'edge_dcdn_get_route': {
          const { key } = params;
          const route = routesDb[key];
          if (!route) {
            result = `No routing path configured for key "${key}".`;
          } else {
            const elapsed = (Date.now() - route.updatedAt) / 1000;
            if (elapsed > route.ttl) {
              delete routesDb[key];
              result = `Route for key "${key}" has expired (TTL exceeded).`;
            } else {
              result = route;
            }
          }
          break;
        }

        case 'edge_get_health': {
          result = {
            nodeId: activeDid || 'did:daup:unconnected-node-stub',
            uptimeSeconds: Math.floor(performance.now() / 1000) + 120, // simulate uptime
            memoryUsageMB: 48 + Math.floor(Math.random() * 12),
            cpuLoadAverage: [0.12 + Math.random() * 0.1, 0.15, 0.08],
            freeMemoryBytes: 8589934592 - Math.floor(Math.random() * 1000000),
            p2pConnections: activeDid ? 8 : 0,
            dhtActive: activeDid ? true : false,
            timestamp: Date.now()
          };
          break;
        }

        case 'identity_resolve_dht': {
          const { did } = params;
          result = {
            '@context': ['https://www.w3.org/ns/did/v1'],
            id: did,
            verificationMethod: [{
              id: `${did}#key-1`,
              type: 'JsonWebKey2020',
              controller: did,
              publicKeyHex: did.endsWith('-pub') ? did : `${did}-pub`
            }],
            authentication: [`${did}#key-1`],
            service: [{
              id: `${did}#mcp-endpoint`,
              type: 'MCPServerEndpoint',
              serviceEndpoint: 'libp2p://stream/mcp/identity'
            }]
          };
          break;
        }

        case 'identity_resolve_contract': {
          const { did } = params;
          const cleanDid = did.replace('did:daup:', '');
          result = {
            did,
            owner: `0x${cleanDid.slice(0, 10)}...${cleanDid.slice(-6)}`,
            publicKeyHex: `0x${cleanDid.slice(0, 32)}`,
            documentUri: `ipfs://QmResolverGatewayHashForDIDDocument`
          };
          break;
        }

        case 'identity_verify_did': {
          const { did } = params;
          result = {
            did,
            registeredOnDHT: true,
            registeredOnContract: true,
            publicKeyHexMatches: true,
            isValid: true
          };
          break;
        }

        case 'edge_run_diagnostics': {
          result = runEdgePlatformTests();
          break;
        }

        case 'verify_subscription_access': {
          const { did, module } = params;
          const sub = getSubscriptionForDidAndModule(did, module);
          const isValid = sub.expirationTimestamp > Date.now();
          
          let featureFlags: string[] = [];
          if (sub.tier === 'Pro') {
            featureFlags = ['telemetry', 'analytics', 'p2p-sync'];
          } else if (sub.tier === 'Enterprise') {
            featureFlags = ['telemetry', 'analytics', 'p2p-sync', 'multi-tenant', 'ha-mode'];
          } else if (sub.tier === 'Developer') {
            featureFlags = ['telemetry', 'analytics', 'p2p-sync', 'sandbox-mode', 'inspect-wasm'];
          } else {
            featureFlags = ['telemetry'];
          }

          result = {
            did,
            module,
            isValid,
            licenseTier: sub.tier,
            expirationTimestamp: sub.expirationTimestamp,
            featureFlags
          };
          break;
        }

        case 'register_subscription': {
          const { did, module, tier, durationDays } = params;
          const now = Date.now();
          const durationMs = Number(durationDays) * 24 * 60 * 60 * 1000;
          
          const all = getSubscriptions();
          if (!all[did]) {
            all[did] = {};
          }
          
          const currentExp = all[did][module]?.expirationTimestamp || 0;
          const baseTime = currentExp > now ? currentExp : now;
          const newExp = baseTime + durationMs;
          
          all[did][module] = {
            did: did,
            module: module,
            tier: tier as any,
            expirationTimestamp: newExp
          };
          saveSubscriptions(all);
          
          result = {
            status: 'success',
            transactionHash: '0x' + Array.from({length: 64}, () => Math.floor(Math.random()*16).toString(16)).join(''),
            did,
            module,
            licenseTier: tier,
            expirationTimestamp: newExp
          };
          break;
        }

        case 'identity_register_profile': {
          const { did, profile } = params;
          try {
            localStorage.setItem(`daup_mcp_profile_${did}`, JSON.stringify(profile));
          } catch (e) {}
          result = {
            status: 'success',
            did,
            registeredAt: Date.now(),
            profileHash: '0x' + Array.from({length: 64}, () => Math.floor(Math.random()*16).toString(16)).join(''),
            legalName: profile.wallets?.find((w: any) => w.isPrimary || w.id === profile.primaryWalletId)?.legalName || 'Anonymous Operator'
          };
          break;
        }

        case 'identity_get_profile': {
          const { did } = params;
          let profile = null;
          try {
            const raw = localStorage.getItem(`daup_mcp_profile_${did}`) || localStorage.getItem('daup_user_profile');
            if (raw) profile = JSON.parse(raw);
          } catch (e) {}
          result = {
            did,
            profile,
            found: !!profile
          };
          break;
        }

        case 'identity_start_trial': {
          const { did } = params;
          const now = Date.now();
          const durationDays = 30;
          const trialExpiresAt = now + durationDays * 24 * 60 * 60 * 1000;
          
          // Register trial for all modules
          const all = getSubscriptions();
          if (!all[did]) {
            all[did] = {};
          }
          
          ['daup-farmer', 'daup-reseller', 'daup-eatery', 'daup-manufacturing'].forEach((mod) => {
            all[did][mod] = {
              did,
              module: mod,
              tier: 'Pro',
              expirationTimestamp: trialExpiresAt
            };
          });
          saveSubscriptions(all);

          const trialState = {
            hasStartedTrial: true,
            trialStartedAt: now,
            trialExpiresAt,
            isTrialActive: true,
            tier: 'Pro',
            isSubscribed: true
          };
          try {
            localStorage.setItem('daup_trial_state', JSON.stringify(trialState));
          } catch (e) {}

          result = {
            status: 'trial_activated',
            did,
            trialStartedAt: now,
            trialExpiresAt,
            daysRemaining: 30,
            transactionHash: '0x' + Array.from({length: 64}, () => Math.floor(Math.random()*16).toString(16)).join('')
          };
          break;
        }

        case 'identity_list_wallets': {
          const { did } = params;
          let wallets = [];
          try {
            const raw = localStorage.getItem(`daup_mcp_profile_${did}`) || localStorage.getItem('daup_user_profile');
            if (raw) {
              const p = JSON.parse(raw);
              wallets = p.wallets || [];
            }
          } catch (e) {}
          result = {
            did,
            wallets,
            count: wallets.length
          };
          break;
        }

        case 'instance_delete_from_network': {
          const { did, instanceName, module } = params;
          const now = Date.now();
          
          // Expire subscription in memory / storage
          const all = getSubscriptions();
          if (all[did]) {
            if (module) {
              all[did][module] = {
                did,
                module,
                tier: 'Free',
                expirationTimestamp: 0
              };
            } else {
              Object.keys(all[did] || {}).forEach((mod) => {
                all[did][mod] = {
                  did,
                  module: mod,
                  tier: 'Free',
                  expirationTimestamp: 0
                };
              });
            }
            saveSubscriptions(all);
          }
          
          // Unpin matching CIDs
          pinsDb = pinsDb.filter(p => !module || !p.name.includes(module.replace('daup-', '')));

          result = {
            status: 'deleted_from_network',
            did,
            instanceName,
            module: module || 'all-instances',
            purgedAt: now,
            dhtUnregistered: true,
            routesPurged: 1,
            unpinnedCidsCount: 1,
            contractRevocationTx: '0x' + Array.from({length: 64}, () => Math.floor(Math.random()*16).toString(16)).join(''),
            message: `Instance "${instanceName}" has been successfully decommissioned and deleted from the DAUP decentralized network.`
          };
          break;
        }

        default:
          throw new Error(`Unimplemented simulated handler for ${method}`);
      }

      const successResponse = {
        jsonrpc: '2.0',
        result,
        id
      };
      addLog('response', `<-- JSON-RPC Response (id: ${id})\n${JSON.stringify(successResponse, null, 2)}`);
      return successResponse;

    } catch (err: any) {
      const errResponse = {
        jsonrpc: '2.0',
        error: { code: -32603, message: err.message || 'Internal server error' },
        id
      };
      addLog('error', `<-- JSON-RPC Error Response (id: ${id})\n${JSON.stringify(errResponse, null, 2)}`);
      return errResponse;
    }

  }, [addLog, activeDid]);

  const clearLogs = useCallback(() => {
    setLogs([{ timestamp: Date.now(), type: 'system', content: 'Console cleared.' }]);
  }, []);

  return {
    tools: AVAILABLE_TOOLS,
    logs,
    sendRequest,
    clearLogs
  };
}

export interface McpContextType {
  tools: McpTool[];
  logs: McpConsoleLog[];
  sendRequest: (method: string, params: any) => Promise<any>;
  clearLogs: () => void;
}

const McpContext = createContext<McpContextType | undefined>(undefined);

export const McpProvider: React.FC<{ children: React.ReactNode; wasmExports: any; activeDid: string | null }> = ({ children, wasmExports, activeDid }) => {
  const mcp = useMcpClient(wasmExports, activeDid);
  return React.createElement(McpContext.Provider, { value: mcp }, children);
};

export const useMcp = () => {
  const context = useContext(McpContext);
  if (context === undefined) {
    throw new Error('useMcp must be used within a McpProvider');
  }
  return context;
};
