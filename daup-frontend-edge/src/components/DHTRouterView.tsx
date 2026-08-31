import React, { useState, useEffect, useMemo } from 'react';
import { Network, Search, Cpu, ListFilter, Play, Compass } from 'lucide-react';
import { useWasmLoader } from '../hooks/useWasmLoader';
import { useDIDWallet } from './DIDWalletProvider';

interface Peer {
  peer_id: string;
  distance?: string;
  latency_ms: number;
  status: string;
}

const DEFAULT_PEERS: Peer[] = [
  { peer_id: '12D3KooWL5z7f5V8a6K7eL8y9dF4bS6gH2tX4c5w6', latency_ms: 12, status: 'Active' },
  { peer_id: '12D3KooWF5z7f5V8a6K7eL8y9dF4bS6gH2tX4c5w7', latency_ms: 88, status: 'Active' },
  { peer_id: '12D3KooWJpG8eWv7zFz5KjLz7f5q72e1r3e2fWcoA', latency_ms: 22, status: 'Active' },
  { peer_id: '12D3KooWTf5Qg8eWv7zFz5KjLz7f5q72e1r3e2f78', latency_ms: 140, status: 'Active' },
  { peer_id: '12D3KooWNf8aA8B8C8D8E8F8a7b6c5d4e3f2a1b9', latency_ms: 45, status: 'Standby' },
  { peer_id: '12D3KooWP2q3r4s5t6u7v8w9x0y1z2a3b4c5d6e7', latency_ms: 210, status: 'Active' }
];

export const DHTRouterView: React.FC = () => {
  const { exports: cryptoEngine, wasmLoaded } = useWasmLoader();
  const { isConnected } = useDIDWallet();
  const [queryKey, setQueryKey] = useState('assets:logo');
  const [isRouting, setIsRouting] = useState(false);
  const [peers, setPeers] = useState<Peer[]>([]);
  const [selectedPeer, setSelectedPeer] = useState<Peer | null>(null);
  const [radarRadius, setRadarRadius] = useState(0);

  const handleLookup = async (key: string, instant = false) => {
    if (!key.trim()) return;
    setIsRouting(true);
    setSelectedPeer(null);

    // If not instant, animate radar waves and delay results
    if (!instant) {
      setRadarRadius(0);
      const interval = setInterval(() => {
        setRadarRadius((prev) => (prev >= 200 ? 0 : prev + 15));
      }, 50);

      await new Promise((resolve) => setTimeout(resolve, 1000));
      clearInterval(interval);
    }

    try {
      const peerListJson = JSON.stringify(DEFAULT_PEERS);
      const resultJson = cryptoEngine.dht_lookup(key, peerListJson);
      const sortedPeers: Peer[] = JSON.parse(resultJson);
      setPeers(sortedPeers);
    } catch (e) {
      console.error("DHT Lookup error:", e);
      // Fallback manual assignment if wasm/loader fails
      setPeers(DEFAULT_PEERS);
    } finally {
      setIsRouting(false);
      setRadarRadius(0);
    }
  };

  useEffect(() => {
    handleLookup(queryKey, true);
  }, [cryptoEngine]);

  // Compute node coordinate positions relative to XOR distance metric
  const graphNodes = useMemo(() => {
    const cx = 200;
    const cy = 200;
    
    return peers.map((peer, index) => {
      const angle = (index * (2 * Math.PI)) / peers.length;
      
      // Convert first 4 hex chars of XOR distance (16 bits) to determine radius distance from target key
      let radius = 120; // default fallback
      if (peer.distance) {
        const hexVal = parseInt(peer.distance.slice(0, 4), 16);
        // Map 0-65535 value to 60px - 170px radius range
        radius = 60 + (hexVal / 65535) * 110;
      }

      const x = cx + radius * Math.cos(angle);
      const y = cy + radius * Math.sin(angle);

      return {
        ...peer,
        x,
        y,
        radius
      };
    });
  }, [peers]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Control Panel */}
      <div className="glass-panel" style={{ padding: '20px' }}>
        <div style={{ fontSize: '18px', fontWeight: '600', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Compass size={20} className="status-dot cyan" style={{ width: 'auto', height: 'auto', background: 'transparent' }} />
          Kademlia DHT Routing Table lookup (XOR Distance Resolver)
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={18} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '12px' }} />
            <input
              type="text"
              className="glass-input"
              value={queryKey}
              onChange={(e) => setQueryKey(e.target.value)}
              placeholder="Enter lookup key (e.g. content hash, peer key, or asset tag)..."
              style={{ width: '100%', paddingLeft: '40px' }}
              onKeyDown={(e) => e.key === 'Enter' && handleLookup(queryKey)}
            />
          </div>
          <button
            className="glass-button cyan"
            onClick={() => handleLookup(queryKey)}
            disabled={isRouting}
            style={{ minWidth: '130px' }}
          >
            <Play size={16} />
            {isRouting ? 'Routing...' : 'Route Query'}
          </button>
        </div>
        <div style={{ marginTop: '10px', fontSize: '12px', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
          <span>Lookup method: <strong>Kademlia XOR routing</strong></span>
          <span style={{ color: wasmLoaded ? '#10b981' : '#f59e0b' }}>
            Crypto execution mode: <strong>{wasmLoaded ? 'WebAssembly (WASM Crate)' : 'TypeScript Fallback'}</strong>
          </span>
        </div>
      </div>

      <div className="grid-container two-col">
        {/* SVG Network Graph Visualizer */}
        <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ alignSelf: 'flex-start', fontSize: '14px', fontWeight: '500', color: 'var(--text-muted)', marginBottom: '10px' }}>
            DHT Distance Map (Visual Proximity)
          </div>
          
          <div style={{ position: 'relative', width: '100%', maxWidth: '400px', aspectRatio: '1/1' }}>
            <svg
              viewBox="0 0 400 400"
              style={{
                width: '100%',
                height: '100%',
                background: 'rgba(5, 7, 14, 0.6)',
                borderRadius: '8px',
                border: '1px solid var(--border-glass)'
              }}
            >
              {/* Concentric distance ring helpers */}
              <circle cx="200" cy="200" r="60" fill="none" stroke="rgba(6, 182, 212, 0.08)" strokeDasharray="3,3" />
              <circle cx="200" cy="200" r="115" fill="none" stroke="rgba(6, 182, 212, 0.05)" strokeDasharray="3,3" />
              <circle cx="200" cy="200" r="170" fill="none" stroke="rgba(6, 182, 212, 0.03)" strokeDasharray="3,3" />

              {/* Animating Radar signal wave */}
              {isRouting && radarRadius > 0 && (
                <circle
                  cx="200"
                  cy="200"
                  r={radarRadius}
                  fill="none"
                  stroke="var(--neon-cyan)"
                  strokeWidth="2"
                  opacity={1 - radarRadius / 200}
                  style={{ transition: 'r 0.05s linear' }}
                />
              )}

              {/* Connecting lines from target node to active peers */}
              {graphNodes.map((node) => (
                <line
                  key={node.peer_id}
                  x1="200"
                  y1="200"
                  x2={node.x}
                  y2={node.y}
                  stroke={selectedPeer?.peer_id === node.peer_id ? 'var(--neon-cyan)' : 'rgba(255, 255, 255, 0.05)'}
                  strokeWidth={selectedPeer?.peer_id === node.peer_id ? '2' : '1'}
                  strokeDasharray={selectedPeer?.peer_id === node.peer_id ? 'none' : '4,4'}
                />
              ))}

              {/* Target Key Node (Center) */}
              <g transform="translate(200, 200)">
                <circle
                  r="14"
                  fill="rgba(6, 182, 212, 0.2)"
                  stroke="var(--neon-cyan)"
                  strokeWidth="2"
                  style={{ animation: isRouting ? 'pulse-glow 1s infinite ease-in-out' : 'none' }}
                />
                <circle r="6" fill="var(--neon-cyan)" />
              </g>

              {/* Peer Nodes */}
              {graphNodes.map((node) => (
                <g
                  key={node.peer_id}
                  transform={`translate(${node.x}, ${node.y})`}
                  style={{ cursor: 'pointer' }}
                  onClick={() => setSelectedPeer(node)}
                >
                  <circle
                    r="10"
                    fill={selectedPeer?.peer_id === node.peer_id ? 'var(--neon-cyan)' : 'rgba(139, 92, 246, 0.2)'}
                    stroke={selectedPeer?.peer_id === node.peer_id ? '#fff' : 'var(--neon-purple)'}
                    strokeWidth="1.5"
                    style={{ transition: 'all 0.2s' }}
                  />
                  <circle
                    r="4"
                    fill={node.status === 'Active' ? 'var(--neon-green)' : 'var(--neon-amber)'}
                  />
                </g>
              ))}
            </svg>

            {/* Labels overlay */}
            <div style={{ position: 'absolute', top: '15px', left: '15px', fontSize: '10px', color: 'var(--text-dark)' }}>
              OUTER LIMITS (d_XOR ≈ 1.0)
            </div>
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', pointerEvents: 'none' }}>
              <div style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--neon-cyan)',
                borderRadius: '4px',
                padding: '2px 6px',
                fontSize: '9px',
                color: 'var(--neon-cyan)',
                marginTop: '45px',
                fontWeight: 'bold',
                letterSpacing: '0.05em'
              }}>
                TARGET: {queryKey.toUpperCase()}
              </div>
            </div>
          </div>
        </div>

        {/* Peer Routing table & Detail View */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Peer details overlay */}
          <div className="glass-panel" style={{ padding: '20px', minHeight: '140px' }}>
            <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '10px' }}>
              Selected DHT Target Peer Details
            </div>
            {selectedPeer ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ fontSize: '16px', fontWeight: 'bold', fontFamily: 'var(--font-mono)', wordBreak: 'break-all', color: 'var(--neon-cyan)' }}>
                  {selectedPeer.peer_id}
                </div>
                <div style={{ display: 'flex', gap: '15px', marginTop: '5px' }}>
                  <div>
                    <span style={{ fontSize: '11px', color: 'var(--text-dark)' }}>DHT STATUS</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '600' }}>
                      <span className={`status-dot ${selectedPeer.status === 'Active' ? 'green' : 'amber'}`}></span>
                      {selectedPeer.status}
                    </div>
                  </div>
                  <div>
                    <span style={{ fontSize: '11px', color: 'var(--text-dark)' }}>LATENCY</span>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: selectedPeer.latency_ms < 50 ? 'var(--neon-green)' : selectedPeer.latency_ms < 150 ? 'var(--neon-amber)' : 'var(--neon-red)' }}>
                      {selectedPeer.latency_ms} ms
                    </div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-dark)' }}>XOR PROXIMITY DISTANCE (HEX)</span>
                    <div style={{ fontSize: '12px', fontFamily: 'var(--font-mono)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {selectedPeer.distance || 'Not resolved'}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80px', color: 'var(--text-muted)', fontSize: '13px' }}>
                Click a peer node in the map or list to inspect DHT properties.
              </div>
            )}
          </div>

          {/* Sorted list of peers */}
          <div className="glass-panel" style={{ flex: 1, overflowY: 'auto', maxHeight: '240px' }}>
            <div style={{ padding: '12px 18px', fontSize: '13px', fontWeight: '600', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-glass)', display: 'flex', justifyContent: 'space-between' }}>
              <span>RESOLVED PEERS (NEAREST FIRST)</span>
              <span>COUNT: {peers.length}</span>
            </div>
            {peers.map((peer, idx) => (
              <div
                key={peer.peer_id}
                onClick={() => setSelectedPeer(peer)}
                style={{
                  padding: '12px 18px',
                  borderBottom: '1px solid var(--border-glass)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  background: selectedPeer?.peer_id === peer.peer_id ? 'rgba(6, 182, 212, 0.08)' : 'transparent',
                  transition: 'background var(--transition-fast)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-dark)', fontWeight: 'bold' }}>#{idx + 1}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: selectedPeer?.peer_id === peer.peer_id ? 'var(--neon-cyan)' : 'var(--text-primary)' }}>
                    {peer.peer_id.slice(0, 10)}...{peer.peer_id.slice(-6)}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                  <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-dark)' }}>
                    {peer.distance ? `${peer.distance.slice(0, 8)}` : '-'}
                  </span>
                  <span style={{
                    fontSize: '12px',
                    fontWeight: '500',
                    color: peer.latency_ms < 50 ? 'var(--neon-green)' : peer.latency_ms < 150 ? 'var(--neon-amber)' : 'var(--neon-red)'
                  }}>
                    {peer.latency_ms}ms
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
