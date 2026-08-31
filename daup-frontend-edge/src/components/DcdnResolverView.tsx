import React, { useState, useEffect } from 'react';
import { Network, Search, HardDrive, RefreshCw, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { useDcdnResolver } from '../hooks/useDcdnResolver';

const SAMPLE_CIDS = [
  { cid: 'QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco', name: 'DAUP Hub Logo (svg)' },
  { cid: 'QmfX666Wp2tG3JpG8eWv7zFz5KjLz7f5q72e1r3e2fWcoA', name: 'Eatery Food Safety License (pdf)' },
  { cid: 'QmYwAPJzv5CZ1iaA4x34B2sL5q4r9t7y8e3e4fWco78a3c', name: 'Supply Chain Routing Schema (json)' }
];

export const DcdnResolverView: React.FC = () => {
  const { isResolving, hops, resolveCid } = useDcdnResolver();
  const [targetCid, setTargetCid] = useState(SAMPLE_CIDS[0].cid);
  const [resolvedResult, setResolvedResult] = useState<any | null>(null);

  const handleResolve = async (cid: string) => {
    setResolvedResult(null);
    const result = await resolveCid(cid);
    setResolvedResult(result);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Control panel */}
      <div className="glass-panel" style={{ padding: '20px' }}>
        <div style={{ fontSize: '18px', fontWeight: '600', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <HardDrive size={20} className="status-dot cyan" style={{ width: 'auto', height: 'auto', background: 'transparent' }} />
          dCDN content-addressed resolver & IPFS fallback gateway trace
        </div>

        <div style={{ display: 'flex', gap: '12px', marginBottom: '15px' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <Search size={18} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '12px' }} />
            <input
              type="text"
              className="glass-input"
              value={targetCid}
              onChange={(e) => setTargetCid(e.target.value)}
              placeholder="Enter IPFS Content Identifier (CID) to resolve..."
              style={{ width: '100%', paddingLeft: '40px' }}
              onKeyDown={(e) => e.key === 'Enter' && handleResolve(targetCid)}
            />
          </div>
          <button
            className="glass-button cyan"
            onClick={() => handleResolve(targetCid)}
            disabled={isResolving}
            style={{ minWidth: '130px' }}
          >
            <RefreshCw size={16} className={isResolving ? 'status-dot green' : ''} style={{ animation: isResolving ? 'pulse-green 1s infinite ease-in-out' : 'none', width: 'auto', height: 'auto', background: 'transparent' }} />
            {isResolving ? 'Resolving...' : 'Resolve CID'}
          </button>
        </div>

        {/* Quick select samples */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Quick Select Templates:</span>
          {SAMPLE_CIDS.map((sample) => (
            <button
              key={sample.cid}
              onClick={() => {
                setTargetCid(sample.cid);
                handleResolve(sample.cid);
              }}
              className="glass-button"
              style={{
                padding: '4px 10px',
                fontSize: '11px',
                borderRadius: '16px',
                borderColor: targetCid === sample.cid ? 'var(--neon-cyan)' : 'var(--border-glass)',
                background: targetCid === sample.cid ? 'rgba(6, 182, 212, 0.08)' : 'rgba(255,255,255,0.02)'
              }}
            >
              {sample.name}
            </button>
          ))}
        </div>
      </div>

      <div className="grid-container two-col">
        {/* Hop Tracing Visual Flow */}
        <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '15px' }}>
            Active Resolver Hops & Gateway Trace Logs
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', flex: 1, position: 'relative' }}>
            {hops.length === 0 ? (
              <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', height: '200px', color: 'var(--text-muted)', fontSize: '13px' }}>
                Query a CID above to trace dCDN fallback hops.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', position: 'relative', paddingLeft: '15px' }}>
                {/* Connecting line */}
                <div style={{
                  position: 'absolute',
                  top: '10px',
                  bottom: '10px',
                  left: '4px',
                  width: '2px',
                  background: 'rgba(255, 255, 255, 0.06)',
                  zIndex: 0
                }} />

                {hops.map((hop, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: '15px', position: 'relative', zIndex: 1 }}>
                    {/* Node indicator */}
                    <div style={{ marginTop: '4px' }}>
                      <span className={`status-dot ${
                        hop.status === 'success' ? 'green' : 
                        hop.status === 'fail' ? 'red' : 'cyan'
                      }`} style={{
                        width: '10px',
                        height: '10px',
                        display: 'block',
                        marginLeft: '-4px'
                      }} />
                    </div>

                    {/* Hop card info */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '13px', fontWeight: 'bold', fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                          {hop.gateway}
                        </span>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Clock size={12} />
                          {hop.latencyMs}ms
                        </span>
                      </div>
                      <div style={{
                        fontSize: '12px',
                        color: hop.status === 'success' ? '#34d399' : hop.status === 'fail' ? '#fb7185' : 'var(--text-muted)',
                        background: 'rgba(0,0,0,0.2)',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        border: '1px solid var(--border-glass)'
                      }}>
                        {hop.message}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Resolved Content Block View */}
        <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', minHeight: '300px' }}>
          <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '15px' }}>
            Resolved Content Data Block
          </div>
          
          {isResolving ? (
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, alignItems: 'center', justifyContent: 'center', gap: '15px' }}>
              <RefreshCw size={36} className="status-dot green" style={{ animation: 'spin 1.5s infinite linear', width: 'auto', height: 'auto', background: 'transparent' }} />
              <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Pulling blocks from caching endpoints...</div>
            </div>
          ) : resolvedResult ? (
            resolvedResult.success ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', flex: 1 }}>
                <div style={{ display: 'flex', gap: '20px', background: 'rgba(16, 185, 129, 0.05)', padding: '10px 15px', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.2)', alignItems: 'center' }}>
                  <CheckCircle size={20} color="#10b981" />
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#10b981' }}>RESOLVE COMPLETED</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      Fetched via <strong>{resolvedResult.finalGateway}</strong>. Total latency: <strong>{resolvedResult.totalLatency}ms</strong>.
                    </div>
                  </div>
                </div>

                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-dark)', marginBottom: '4px', fontFamily: 'var(--font-mono)' }}>IPFS_PAYLOAD_BODY</div>
                  <pre className="terminal-viewport" style={{ flex: 1, height: '240px', color: '#34d399', overflowY: 'auto' }}>
                    {resolvedResult.content}
                  </pre>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', flex: 1, alignItems: 'center', justifyContent: 'center', gap: '15px', color: '#f43f5e' }}>
                <AlertTriangle size={36} />
                <div style={{ fontSize: '14px', fontWeight: 'bold' }}>Resolution Failed</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', maxWidth: '300px' }}>
                  All IPFS gateways failed to resolve the requested block. The node has logged a DHT routing refresh query.
                </div>
              </div>
            )
          ) : (
            <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', color: 'var(--text-dark)', fontSize: '13px' }}>
              Data block is currently empty.
            </div>
          )}
        </div>
      </div>
      
      {/* Dynamic inline styles for rotating wheel */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};
