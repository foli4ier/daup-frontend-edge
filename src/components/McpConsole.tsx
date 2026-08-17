import React, { useState, useEffect, useRef } from 'react';
import { Terminal, Send, Trash2, Cpu, FileJson } from 'lucide-react';
import { useDIDWallet } from './DIDWalletProvider';
import { useMcp } from '../hooks/useMcpClient';

export const McpConsole: React.FC = () => {
  const { did } = useDIDWallet();
  const { tools, logs, sendRequest, clearLogs } = useMcp();
  const [selectedToolName, setSelectedToolName] = useState<string>(tools[0].name);
  const [formParams, setFormParams] = useState<Record<string, string>>({});
  const [rawJsonMode, setRawJsonMode] = useState(false);
  const [rawJsonText, setRawJsonText] = useState('{}');
  
  const terminalEndRef = useRef<HTMLDivElement>(null);

  const selectedTool = tools.find((t) => t.name === selectedToolName) || tools[0];

  // Auto-scroll terminal logs to bottom on update
  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // Set default form params when tool changes
  useEffect(() => {
    const defaults: Record<string, string> = {};
    Object.keys(selectedTool.parameters.properties).forEach((key) => {
      defaults[key] = '';
    });
    // Set some sensible defaults
    if (selectedTool.name === 'edge_ipfs_pin') {
      defaults.cid = 'QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco';
      defaults.name = 'asset-package.zip';
    } else if (selectedTool.name === 'edge_ipfs_unpin') {
      defaults.cid = 'QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco';
    } else if (selectedTool.name === 'edge_dcdn_set_route') {
      defaults.key = 'assets:logo';
      defaults.targetPeerId = '12D3KooWL5z7f5V8a6K7eL8y9dF4bS6gH2tX4c5w6';
      defaults.latencyMs = '14';
      defaults.ttl = '3600';
    } else if (selectedTool.name === 'edge_dcdn_get_route') {
      defaults.key = 'assets:logo';
    } else if (selectedTool.name === 'identity_resolve_dht' || selectedTool.name === 'identity_resolve_contract' || selectedTool.name === 'identity_verify_did') {
      defaults.did = did || 'did:daup:12D3KooWL5z7f5V8a6K7eL8y9dF4bS6gH2tX4c5w6';
    }

    setFormParams(defaults);
    setRawJsonText(JSON.stringify(defaults, null, 2));
  }, [selectedToolName, did]);

  const handleParamChange = (key: string, val: string) => {
    const updated = { ...formParams, [key]: val };
    setFormParams(updated);
    setRawJsonText(JSON.stringify(updated, null, 2));
  };

  const handleExecute = async () => {
    let params: any = {};
    if (rawJsonMode) {
      try {
        params = JSON.parse(rawJsonText);
      } catch (err: any) {
        alert(`JSON parse error: ${err.message}`);
        return;
      }
    } else {
      // Build parameters object and cast numbers if schema requests them
      Object.keys(selectedTool.parameters.properties).forEach((key) => {
        const schemaProp = selectedTool.parameters.properties[key];
        const val = formParams[key];
        if (schemaProp.type === 'number') {
          params[key] = val !== '' ? Number(val) : undefined;
        } else {
          params[key] = val !== '' ? val : undefined;
        }
      });
    }

    await sendRequest(selectedTool.name, params);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div className="grid-container sidebar-layout">
        {/* Tool Selector & Form Parameters Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* List of tools */}
          <div className="glass-panel" style={{ padding: '15px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text-muted)' }}>
                MCP JSON-RPC TOOLS
              </span>
              <span className="badge cyan" style={{ fontSize: '9px', padding: '1px 5px', fontFamily: 'var(--font-mono)' }}>
                {import.meta.env.VITE_APP_MCP_URL || 'http://localhost:8080'}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '200px', overflowY: 'auto' }}>
              {tools.map((tool) => (
                <button
                  key={tool.name}
                  onClick={() => setSelectedToolName(tool.name)}
                  className="glass-button"
                  style={{
                    padding: '8px 12px',
                    fontSize: '12px',
                    textAlign: 'left',
                    justifyContent: 'flex-start',
                    borderRadius: '6px',
                    borderColor: selectedToolName === tool.name ? 'var(--neon-purple)' : 'var(--border-glass)',
                    background: selectedToolName === tool.name ? 'rgba(139, 92, 246, 0.08)' : 'rgba(255,255,255,0.01)',
                    width: '100%',
                    color: selectedToolName === tool.name ? '#c084fc' : 'var(--text-primary)'
                  }}
                >
                  <Cpu size={14} style={{ flexShrink: 0 }} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {tool.name}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Dynamic parameter form */}
          <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div>
              <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#c084fc', marginBottom: '4px' }}>
                {selectedTool.name}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                {selectedTool.description}
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--border-glass)', paddingTop: '15px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-muted)' }}>PARAMETERS</span>
                <button
                  className="glass-button"
                  onClick={() => setRawJsonMode(!rawJsonMode)}
                  style={{ padding: '2px 8px', fontSize: '10px', borderRadius: '4px', gap: '4px' }}
                >
                  <FileJson size={10} />
                  {rawJsonMode ? 'Form UI' : 'Raw JSON'}
                </button>
              </div>

              {rawJsonMode ? (
                <textarea
                  className="glass-input"
                  value={rawJsonText}
                  onChange={(e) => setRawJsonText(e.target.value)}
                  style={{ width: '100%', height: '140px', fontFamily: 'var(--font-mono)', fontSize: '12px', resize: 'none' }}
                />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {Object.keys(selectedTool.parameters.properties).length === 0 ? (
                    <div style={{ fontSize: '12px', color: 'var(--text-dark)', fontStyle: 'italic', textAlign: 'center', padding: '10px' }}>
                      No parameters required.
                    </div>
                  ) : (
                    Object.keys(selectedTool.parameters.properties).map((key) => {
                      const prop = selectedTool.parameters.properties[key];
                      const isRequired = selectedTool.parameters.required?.includes(key);
                      return (
                        <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <label style={{ fontSize: '12px', fontWeight: '500', color: 'var(--text-primary)' }}>
                            {key} {isRequired && <span style={{ color: 'var(--neon-red)' }}>*</span>}
                          </label>
                          <input
                            type="text"
                            className="glass-input"
                            value={formParams[key] || ''}
                            onChange={(e) => handleParamChange(key, e.target.value)}
                            placeholder={prop.description}
                            style={{ padding: '8px 12px', fontSize: '12px' }}
                          />
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>

            <button
              className="glass-button purple"
              onClick={handleExecute}
              style={{ width: '100%', padding: '10px 14px', marginTop: '5px' }}
            >
              <Send size={14} />
              Execute JSON-RPC
            </button>
          </div>
        </div>

        {/* Real-time JSON-RPC terminal console log */}
        <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', height: '495px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Terminal size={18} />
              JSON-RPC Log Console Output
            </div>
            <button
              onClick={clearLogs}
              className="glass-button red"
              style={{ padding: '4px 10px', fontSize: '11px', borderRadius: '6px' }}
            >
              <Trash2 size={12} />
              Clear Console
            </button>
          </div>

          <div className="terminal-viewport" style={{ flex: 1, height: 'auto', background: '#03060f' }}>
            {logs.map((log, idx) => (
              <div
                key={idx}
                className={`terminal-line ${
                  log.type === 'request' ? 'rpc-out' : 
                  log.type === 'response' ? 'success' : 
                  log.type === 'error' ? 'error' : 'info'
                }`}
                style={{
                  borderBottom: '1px solid rgba(255,255,255,0.02)',
                  paddingBottom: '8px',
                  marginBottom: '8px',
                  whiteSpace: 'pre-wrap',
                  fontFamily: 'var(--font-mono)'
                }}
              >
                <span className="terminal-time">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                <span>{log.content}</span>
              </div>
            ))}
            <div ref={terminalEndRef} />
          </div>
        </div>
      </div>
    </div>
  );
};
