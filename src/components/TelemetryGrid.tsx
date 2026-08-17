import React, { useState, useEffect, useMemo } from 'react';
import { Activity, ShieldAlert, Cpu, Network, Search, ArrowUpDown, Filter } from 'lucide-react';
import { useDIDWallet } from './DIDWalletProvider';

interface TelemetryEvent {
  id: string;
  timestamp: number;
  source: 'DHT' | 'dCDN' | 'MCP' | 'CONTRACT' | 'NODE';
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
  peerId: string;
}

const INITIAL_EVENTS: TelemetryEvent[] = [
  {
    id: 'evt-1',
    timestamp: Date.now() - 30000,
    source: 'NODE',
    type: 'success',
    message: 'Local Edge Client node daemon initialized successfully.',
    peerId: '12D3KooWS5z7f5V8a6K7eL8y9dF4bS6gH2tX4c5w6'
  },
  {
    id: 'evt-2',
    timestamp: Date.now() - 25000,
    source: 'DHT',
    type: 'info',
    message: 'Established connection to bootstrap seednode: libp2p://dns4/seednode.daup.net',
    peerId: '12D3KooWF5z7f5V8a6K7eL8y9dF4bS6gH2tX4c5w6'
  },
  {
    id: 'evt-3',
    timestamp: Date.now() - 20000,
    source: 'MCP',
    type: 'info',
    message: 'Libp2pStreamTransport binding negotiated for protocol /mcp/v1.',
    peerId: '12D3KooWS5z7f5V8a6K7eL8y9dF4bS6gH2tX4c5w6'
  },
  {
    id: 'evt-4',
    timestamp: Date.now() - 15000,
    source: 'dCDN',
    type: 'success',
    message: 'Pinned CID QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco cache validated.',
    peerId: '12D3KooWS5z7f5V8a6K7eL8y9dF4bS6gH2tX4c5w6'
  },
  {
    id: 'evt-5',
    timestamp: Date.now() - 10000,
    source: 'CONTRACT',
    type: 'warning',
    message: 'Slow response resolving owner address for DID registry contract on HNS.',
    peerId: '0x2213e89a...b23d'
  }
];

const MOCK_MESSAGES = [
  { source: 'DHT' as const, type: 'info' as const, message: 'DHT peer distance recalculated for key: assets:logo.', peer: '12D3KooWJpG8eWv7zFz5KjLz7f5q72e1r3e2f' },
  { source: 'dCDN' as const, type: 'success' as const, message: 'Successfully pre-fetched block: QmfX666Wp2tG (Status 200 OK).', peer: '12D3KooWL5z7f5V8a6K7eL8y9dF4bS6gH2tX4c5w6' },
  { source: 'NODE' as const, type: 'info' as const, message: 'Garbage collection completed. Liberated 14.8 MB.', peer: '12D3KooWS5z7f5V8a6K7eL8y9dF4bS6gH2tX4c5w6' },
  { source: 'MCP' as const, type: 'success' as const, message: 'JSON-RPC response sent: edge_get_health successfully resolved.', peer: '12D3KooWS5z7f5V8a6K7eL8y9dF4bS6gH2tX4c5w6' },
  { source: 'CONTRACT' as const, type: 'success' as const, message: 'DID registry contract verified status match for did:daup:seed.', peer: '0x61da8e...1bc2' },
  { source: 'NODE' as const, type: 'warning' as const, message: 'Edge node resource consumption exceeding warning limit (CPU: 88%).', peer: '12D3KooWS5z7f5V8a6K7eL8y9dF4bS6gH2tX4c5w6' },
  { source: 'DHT' as const, type: 'error' as const, message: 'Failed to dial peer 12D3KooWTf5Q: connection refused.', peer: '12D3KooWTf5Qg8eWv7zFz5KjLz7f5q72e1r3e2f' }
];

export const TelemetryGrid: React.FC = () => {
  const { isConnected } = useDIDWallet();
  const [events, setEvents] = useState<TelemetryEvent[]>(INITIAL_EVENTS);
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [sortField, setSortField] = useState<'timestamp' | 'source' | 'type'>('timestamp');
  const [sortAsc, setSortAsc] = useState(false);

  // Generate periodic telemetry events to make dashboard look alive
  useEffect(() => {
    const interval = setInterval(() => {
      const msg = MOCK_MESSAGES[Math.floor(Math.random() * MOCK_MESSAGES.length)];
      const newEvent: TelemetryEvent = {
        id: `evt-${Date.now()}`,
        timestamp: Date.now(),
        source: msg.source,
        type: msg.type,
        message: msg.message,
        peerId: msg.peer
      };
      setEvents((prev) => [newEvent, ...prev.slice(0, 49)]); // Keep last 50 events
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  const handleSort = (field: 'timestamp' | 'source' | 'type') => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  const filteredEvents = useMemo(() => {
    return events
      .filter((evt) => {
        const matchesSearch = evt.message.toLowerCase().includes(search.toLowerCase()) || 
                              evt.peerId.toLowerCase().includes(search.toLowerCase());
        const matchesSource = sourceFilter === 'ALL' || evt.source === sourceFilter;
        const matchesType = typeFilter === 'ALL' || evt.type === typeFilter;
        return matchesSearch && matchesSource && matchesType;
      })
      .sort((a, b) => {
        let comparison = 0;
        if (sortField === 'timestamp') {
          comparison = a.timestamp - b.timestamp;
        } else if (sortField === 'source') {
          comparison = a.source.localeCompare(b.source);
        } else if (sortField === 'type') {
          comparison = a.type.localeCompare(b.type);
        }
        return sortAsc ? comparison : -comparison;
      });
  }, [events, search, sourceFilter, typeFilter, sortField, sortAsc]);

  // Compute stats metrics
  const stats = useMemo(() => {
    const errorCount = events.filter((e) => e.type === 'error').length;
    const warningCount = events.filter((e) => e.type === 'warning').length;
    return {
      errors: errorCount,
      warnings: warningCount,
      nodeStatus: isConnected ? 'ACTIVE' : 'STANDBY',
      connCount: isConnected ? 8 : 1
    };
  }, [events, isConnected]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Live System Metrics Cards */}
      <div className="grid-container three-col">
        <div className="glass-panel" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div style={{ background: stats.nodeStatus === 'ACTIVE' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)', padding: '12px', borderRadius: '10px' }}>
            <Cpu size={24} color={stats.nodeStatus === 'ACTIVE' ? '#10b981' : '#f59e0b'} />
          </div>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Node Operational Mode</div>
            <div style={{ fontSize: '20px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className={`status-dot ${stats.nodeStatus === 'ACTIVE' ? 'green' : 'amber'}`}></span>
              {stats.nodeStatus}
            </div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div style={{ background: 'rgba(6, 182, 212, 0.1)', padding: '12px', borderRadius: '10px' }}>
            <Network size={24} color="#06b6d4" />
          </div>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>P2P Peer Connections</div>
            <div style={{ fontSize: '20px', fontWeight: 'bold' }}>{stats.connCount} Peers</div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div style={{ background: stats.errors > 0 ? 'rgba(244, 63, 94, 0.1)' : 'rgba(16, 185, 129, 0.1)', padding: '12px', borderRadius: '10px' }}>
            <ShieldAlert size={24} color={stats.errors > 0 ? '#f43f5e' : '#10b981'} />
          </div>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Security/Health Status</div>
            <div style={{ fontSize: '20px', fontWeight: 'bold' }}>
              {stats.errors > 0 ? `${stats.errors} Alerts` : 'Optimal'}
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="glass-panel" style={{ padding: '15px 20px', display: 'flex', flexWrap: 'wrap', gap: '15px', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: '260px' }}>
          <Search size={18} color="var(--text-muted)" />
          <input
            type="text"
            className="glass-input"
            placeholder="Filter telemetry logs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: '100%' }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Filter size={14} color="var(--text-muted)" />
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Source:</span>
            <select
              className="glass-select"
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              style={{ padding: '6px 12px', fontSize: '12px' }}
            >
              <option value="ALL">All Sources</option>
              <option value="DHT">Kademlia DHT</option>
              <option value="dCDN">dCDN caching</option>
              <option value="MCP">MCP Server</option>
              <option value="CONTRACT">Contracts</option>
              <option value="NODE">Node Health</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Severity:</span>
            <select
              className="glass-select"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              style={{ padding: '6px 12px', fontSize: '12px' }}
            >
              <option value="ALL">All Severities</option>
              <option value="info">Info</option>
              <option value="success">Success</option>
              <option value="warning">Warning</option>
              <option value="error">Error</option>
            </select>
          </div>
        </div>
      </div>

      {/* Telemetry Grid Table */}
      <div className="glass-panel" style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '600px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-glass)', background: 'rgba(255, 255, 255, 0.02)' }}>
              <th onClick={() => handleSort('timestamp')} style={{ padding: '12px 18px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', color: 'var(--text-muted)' }}>
                Time <ArrowUpDown size={12} style={{ marginLeft: '4px', display: 'inline' }} />
              </th>
              <th onClick={() => handleSort('source')} style={{ padding: '12px 18px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', color: 'var(--text-muted)' }}>
                Component <ArrowUpDown size={12} style={{ marginLeft: '4px', display: 'inline' }} />
              </th>
              <th onClick={() => handleSort('type')} style={{ padding: '12px 18px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', color: 'var(--text-muted)' }}>
                Severity <ArrowUpDown size={12} style={{ marginLeft: '4px', display: 'inline' }} />
              </th>
              <th style={{ padding: '12px 18px', fontSize: '13px', fontWeight: '600', color: 'var(--text-muted)' }}>Message</th>
              <th style={{ padding: '12px 18px', fontSize: '13px', fontWeight: '600', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>Actor/Peer Address</th>
            </tr>
          </thead>
          <tbody>
            {filteredEvents.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: '30px 18px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No telemetry matching current filters.
                </td>
              </tr>
            ) : (
              filteredEvents.map((evt) => (
                <tr
                  key={evt.id}
                  style={{
                    borderBottom: '1px solid var(--border-glass)',
                    transition: 'background var(--transition-fast)',
                    cursor: 'default'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.01)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={{ padding: '12px 18px', fontSize: '13px', color: 'var(--text-muted)', width: '120px' }}>
                    {new Date(evt.timestamp).toLocaleTimeString()}
                  </td>
                  <td style={{ padding: '12px 18px', fontSize: '13px', fontWeight: 'bold' }}>
                    <span style={{
                      color: evt.source === 'DHT' ? '#06b6d4' :
                             evt.source === 'dCDN' ? '#38bdf8' :
                             evt.source === 'MCP' ? '#a78bfa' :
                             evt.source === 'CONTRACT' ? '#fbbf24' : '#f43f5e'
                    }}>
                      {evt.source}
                    </span>
                  </td>
                  <td style={{ padding: '12px 18px', fontSize: '13px' }}>
                    <span className={`badge ${
                      evt.type === 'success' ? 'green' : 
                      evt.type === 'error' ? 'red' : 
                      evt.type === 'warning' ? 'amber' : 'cyan'
                    }`}>
                      {evt.type}
                    </span>
                  </td>
                  <td style={{ padding: '12px 18px', fontSize: '13px', color: 'var(--text-primary)', maxWidth: '400px' }}>
                    {evt.message}
                  </td>
                  <td style={{ padding: '12px 18px', fontSize: '12px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                    {evt.peerId.length > 20 ? `${evt.peerId.slice(0, 10)}...${evt.peerId.slice(-8)}` : evt.peerId}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
