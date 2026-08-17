import { useState, useCallback } from 'react';

export interface ResolveHop {
  timestamp: number;
  message: string;
  gateway: string;
  status: 'attempt' | 'success' | 'fail';
  latencyMs: number;
}

const GATEWAYS = [
  { name: 'cloudflare-ipfs.com', baseLatency: 180, successChance: 0.4 },
  { name: 'ipfs.io', baseLatency: 350, successChance: 0.7 },
  { name: 'gateway.pinata.cloud', baseLatency: 120, successChance: 0.95 }
];

export function useDcdnResolver() {
  const [isResolving, setIsResolving] = useState(false);
  const [hops, setHops] = useState<ResolveHop[]>([]);

  const resolveCid = useCallback(async (cid: string) => {
    setIsResolving(true);
    setHops([]);

    const startTime = Date.now();
    let currentHopLogs: ResolveHop[] = [];

    const addHopLog = (gateway: string, message: string, status: 'attempt' | 'success' | 'fail', latencyMs: number) => {
      const hop: ResolveHop = {
        timestamp: Date.now(),
        message,
        gateway,
        status,
        latencyMs
      };
      currentHopLogs = [...currentHopLogs, hop];
      setHops(currentHopLogs);
    };

    // Simulate DHT query first to find provider locations
    addHopLog('DHT', `Querying Kademlia DHT for providers hosting CID ${cid.slice(0, 10)}...`, 'attempt', 50);
    await new Promise((resolve) => setTimeout(resolve, 300));
    addHopLog('DHT', `DHT DHTRouter: Found 3 routing paths. Initiating parallel dCDN resolver fetches...`, 'success', 80);
    await new Promise((resolve) => setTimeout(resolve, 200));

    let success = false;
    let resolvedContent = '';
    let finalGateway = '';
    let totalLatency = 0;

    for (let i = 0; i < GATEWAYS.length; i++) {
      const gw = GATEWAYS[i];
      const latency = Math.floor(gw.baseLatency + Math.random() * 80);
      totalLatency += latency;

      addHopLog(gw.name, `[${gw.name}] Attempting connection & GET request for block data...`, 'attempt', latency);
      
      // Wait simulated connection time
      await new Promise((resolve) => setTimeout(resolve, latency));

      const roll = Math.random();
      if (roll <= gw.successChance) {
        // Success
        success = true;
        finalGateway = gw.name;
        resolvedContent = JSON.stringify({
          cid,
          mimeType: cid.startsWith('Qm') ? 'application/octet-stream' : 'application/json',
          sizeBytes: 1024 * (Math.floor(Math.random() * 50) + 12),
          contentUrl: `https://${gw.name}/ipfs/${cid}`,
          payload: {
            title: `Decentralized Resource: ${cid.slice(0, 8)}`,
            author: 'did:daup:12D3KooWL5z7f5V8a6K7eL8y9dF4bS6gH2tX4c5w6',
            timestamp: Date.now() - 3600000,
            verifiedSignature: '8a2d1f8902c4b5e6f3a2c1d0'
          }
        }, null, 2);

        addHopLog(gw.name, `[${gw.name}] Successfully fetched block data in ${latency}ms (Status 200 OK).`, 'success', latency);
        break;
      } else {
        // Failure
        const errorCodes = [504, 502, 408];
        const randomErr = errorCodes[Math.floor(Math.random() * errorCodes.length)];
        const errMsg = randomErr === 504 
          ? 'Gateway Timeout' 
          : randomErr === 502 
          ? 'Bad Gateway' 
          : 'Request Timeout';
        
        addHopLog(gw.name, `[${gw.name}] Connection failed with HTTP ${randomErr} (${errMsg}) after ${latency}ms.`, 'fail', latency);
        await new Promise((resolve) => setTimeout(resolve, 150));
      }
    }

    setIsResolving(false);
    return {
      success,
      content: resolvedContent,
      finalGateway,
      totalLatency,
      timestamp: Date.now()
    };
  }, []);

  return {
    isResolving,
    hops,
    resolveCid
  };
}
