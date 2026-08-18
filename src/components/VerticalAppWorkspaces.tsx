import React, { useState, useEffect, useCallback } from 'react';
import { 
  Wheat, TrendingUp, Utensils, Cpu, ArrowLeft, 
  RefreshCw, ExternalLink, Terminal, 
  Copy, Check, Eye, ShieldAlert, Radio
} from 'lucide-react';
import { withLicenseCheck, MODULE_METADATA } from './withLicenseCheck';
import { useUserProfile } from '../context/UserProfileContext';

interface WorkspaceHeaderProps {
  title: string;
  icon: React.ReactNode;
  moduleName: string;
  isLiveMode?: boolean;
  onToggleMode?: () => void;
  onExit: () => void;
}

const WorkspaceHeader: React.FC<WorkspaceHeaderProps> = ({ 
  title, icon, moduleName, isLiveMode, onToggleMode, onExit 
}) => {
  const { instanceName, primaryWallet, currency } = useUserProfile();

  return (
    <div className="glass-panel" style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', borderColor: 'var(--neon-purple)', background: 'rgba(13, 20, 38, 0.85)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
        <button 
          onClick={onExit}
          className="glass-button"
          style={{ padding: '6px 12px', fontSize: '12px', borderColor: 'var(--border-glass)' }}
          title="Return to Edge Shell Dashboard"
        >
          <ArrowLeft size={14} /> Exit Workspace
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ background: 'rgba(139, 92, 246, 0.12)', padding: '8px', borderRadius: '8px', border: '1px solid rgba(139, 92, 246, 0.25)' }}>
            {icon}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 'bold', color: '#fff' }}>{title}</h2>
              <span className="badge cyan" style={{ fontSize: '9px', padding: '1px 6px' }}>
                {instanceName}
              </span>
              <span className="badge green" style={{ fontSize: '9px', padding: '1px 6px' }}>
                {currency.code} ({currency.symbol})
              </span>
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
              Ecosystem Node // {moduleName} &bull; Entity: <span style={{ color: 'var(--neon-purple)' }}>{primaryWallet?.legalName || 'Verified Node Operator'}</span> &bull; Currency: <strong style={{ color: 'var(--neon-green)' }}>{currency.name}</strong>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {onToggleMode && (
          <button
            onClick={onToggleMode}
            className={`glass-button ${isLiveMode ? 'cyan' : 'purple'}`}
            style={{ padding: '5px 10px', fontSize: '11px', gap: '6px' }}
            title={isLiveMode ? "Switch to Local Simulation View" : "Switch to Live Dev Server Iframe"}
          >
            {isLiveMode ? <Eye size={12} /> : <Radio size={12} />}
            {isLiveMode ? 'Live Server View' : 'Simulation Mode'}
          </button>
        )}
        <span className="badge purple" style={{ fontSize: '9px' }}>Instance: {instanceName}</span>
        <span className={`status-dot ${isLiveMode ? 'green' : 'cyan'}`} />
      </div>
    </div>
  );
};

// =========================================================================
// Generic Workspace Container with Health Check Guard & Degraded Banner
// =========================================================================
interface WorkspaceContainerProps {
  moduleName: string;
  title: string;
  icon: React.ReactNode;
  fallbackContent: React.ReactNode;
  devCommand: string;
  onExit: () => void;
}

export const WorkspaceContainer: React.FC<WorkspaceContainerProps> = ({
  moduleName,
  title,
  icon,
  fallbackContent,
  devCommand,
  onExit
}) => {
  const metadata = MODULE_METADATA[moduleName];
  const endpoint = metadata?.endpoint || '';

  const [healthStatus, setHealthStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [copiedCmd, setCopiedCmd] = useState(false);
  const [viewMode, setViewMode] = useState<'live' | 'simulation'>('live');
  const [autoRetryCountdown, setAutoRetryCountdown] = useState<number>(10);
  const [autoRetryEnabled] = useState<boolean>(true);
  const [iframeKey, setIframeKey] = useState<number>(0);
  const [isSpawning, setIsSpawning] = useState<boolean>(false);

  const triggerLaunch = useCallback(async () => {
    setIsSpawning(true);
    try {
      await fetch(`/api/launch-app?module=${encodeURIComponent(moduleName)}`);
    } catch (e) {
      console.warn('On-demand launch API request failed:', e);
    }
    // Perform rapid checks
    setTimeout(() => {
      checkHealth();
      setIsSpawning(false);
    }, 2500);
  }, [moduleName]);

  const checkHealth = useCallback(async () => {
    setHealthStatus('checking');
    const startTime = performance.now();

    try {
      // Abort controller to enforce strict 2500ms timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);

      // Perform cross-origin ping against root or health endpoint
      await fetch(endpoint, {
        method: 'GET',
        mode: 'no-cors',
        cache: 'no-store',
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      const elapsed = Math.round(performance.now() - startTime);
      setLatencyMs(elapsed);
      setHealthStatus('online');
      setAutoRetryCountdown(15);
    } catch (err) {
      setHealthStatus('offline');
      setLatencyMs(null);
      setAutoRetryCountdown(10);
    }
  }, [endpoint]);

  // Initial check and on-demand trigger on mount
  useEffect(() => {
    checkHealth();
    triggerLaunch();
  }, [checkHealth, triggerLaunch]);

  // Auto retry countdown timer when offline
  useEffect(() => {
    if (healthStatus !== 'offline' || !autoRetryEnabled || viewMode === 'simulation') return;

    const timer = setInterval(() => {
      setAutoRetryCountdown((prev) => {
        if (prev <= 1) {
          checkHealth();
          return 10;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [healthStatus, autoRetryEnabled, viewMode, checkHealth]);

  const handleCopyCommand = () => {
    navigator.clipboard.writeText(devCommand);
    setCopiedCmd(true);
    setTimeout(() => setCopiedCmd(false), 2000);
  };

  const handleReloadFrame = () => {
    setIframeKey((prev) => prev + 1);
    checkHealth();
  };

  const toggleViewMode = () => {
    setViewMode((prev) => (prev === 'live' ? 'simulation' : 'live'));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', minHeight: '800px' }}>
      <WorkspaceHeader 
        title={title} 
        icon={icon} 
        moduleName={moduleName} 
        endpoint={endpoint}
        isLiveMode={viewMode === 'live'}
        onToggleMode={toggleViewMode}
        onExit={onExit} 
      />

      {viewMode === 'simulation' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <div className="glass-panel" style={{ padding: '12px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(139, 92, 246, 0.08)', borderColor: 'rgba(139, 92, 246, 0.3)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12px', color: '#c084fc' }}>
              <Terminal size={16} />
              <span><strong>Offline Simulation Mode Active:</strong> Displaying local mock telemetry & state. Switch to Live Server View to bind to the active dev container.</span>
            </div>
            <button 
              onClick={() => { setViewMode('live'); checkHealth(); }}
              className="glass-button purple"
              style={{ padding: '4px 10px', fontSize: '11px' }}
            >
              Switch to Live ({endpoint})
            </button>
          </div>
          {fallbackContent}
        </div>
      ) : (
        <div className="glass-panel" style={{ flex: 1, padding: '0', background: 'rgba(5, 7, 19, 0.7)', border: '1px solid var(--border-glass)', borderRadius: '12px', display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: '720px' }}>
          {/* Top Address & Diagnostic Bar */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            background: 'rgba(10, 14, 28, 0.95)', 
            padding: '10px 16px', 
            borderBottom: '1px solid var(--border-glass)', 
            fontSize: '12px', 
            fontFamily: 'var(--font-mono)',
            flexWrap: 'wrap',
            gap: '10px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: '280px' }}>
              <span style={{ 
                color: healthStatus === 'online' ? 'var(--neon-green)' : healthStatus === 'checking' ? 'var(--neon-cyan)' : 'var(--neon-red)',
                animation: healthStatus === 'checking' ? 'pulse-glow 1s infinite' : 'none'
              }}>
                ●
              </span>
              <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>CONTAINER ROUTE:</span>
              <span style={{ 
                color: 'var(--neon-cyan)', 
                background: 'rgba(6, 182, 212, 0.08)', 
                padding: '3px 8px', 
                borderRadius: '4px',
                border: '1px solid rgba(6, 182, 212, 0.2)',
                letterSpacing: '0.04em' 
              }}>
                {endpoint}
              </span>
              {latencyMs !== null && (
                <span style={{ fontSize: '10px', color: 'var(--text-dark)' }}>
                  ({latencyMs}ms)
                </span>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span className={`badge ${healthStatus === 'online' ? 'green' : healthStatus === 'checking' ? 'cyan' : 'red'}`} style={{ fontSize: '9px', padding: '2px 8px', textTransform: 'uppercase' }}>
                {healthStatus === 'online' ? 'Active / Connected' : healthStatus === 'checking' ? 'Pinging Node...' : 'ERR_CONNECTION_REFUSED'}
              </span>

              <button 
                onClick={handleReloadFrame}
                className="glass-button"
                style={{ padding: '4px 8px', fontSize: '11px' }}
                title="Refresh Container Connection"
              >
                <RefreshCw size={12} style={{ animation: healthStatus === 'checking' ? 'spin 1s linear infinite' : 'none' }} />
              </button>

              <a 
                href={endpoint} 
                target="_blank" 
                rel="noreferrer"
                className="glass-button"
                style={{ padding: '4px 8px', fontSize: '11px', textDecoration: 'none', color: 'var(--text-primary)' }}
                title="Open Standalone in New Window"
              >
                <ExternalLink size={12} />
              </a>
            </div>
          </div>

          {/* Body: Live Iframe OR Graceful Degraded Banner */}
          {healthStatus === 'offline' ? (
            <div style={{ 
              flex: 1, 
              padding: '40px 24px', 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              justifyContent: 'center', 
              textAlign: 'center',
              background: 'radial-gradient(ellipse at center, rgba(244, 63, 94, 0.06) 0%, rgba(5, 7, 19, 0.95) 75%)',
              gap: '20px'
            }}>
              <div style={{ 
                background: 'rgba(244, 63, 94, 0.12)', 
                padding: '16px', 
                borderRadius: '16px', 
                border: '1px solid rgba(244, 63, 94, 0.3)',
                boxShadow: '0 0 20px rgba(244, 63, 94, 0.2)' 
              }}>
                <ShieldAlert size={48} color="var(--neon-red)" />
              </div>

              <div style={{ maxWidth: '640px' }}>
                <span className="badge red" style={{ marginBottom: '10px', fontSize: '10px' }}>
                  CONTAINER DEV SERVER NOT RUNNING
                </span>
                <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: '#fff', marginBottom: '8px' }}>
                  Target Workspace ({moduleName}) is Unreachable on {endpoint}
                </h3>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.6' }}>
                  The parent Edge Hub shell cannot connect to the child application process. This typically occurs when the local dev server is stopped, binding to a mismatched port, or blocked by local firewall policies.
                </p>
              </div>

              {/* Actionable Terminal Command Helper Box */}
              <div className="glass-panel" style={{ 
                maxWidth: '560px', 
                width: '100%', 
                padding: '16px', 
                background: 'rgba(0, 0, 0, 0.6)', 
                borderColor: 'rgba(244, 63, 94, 0.25)', 
                textAlign: 'left' 
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
                    QUICK FIX // RUN BOOT COMMAND
                  </span>
                  <span style={{ fontSize: '10px', color: 'var(--neon-cyan)', fontFamily: 'var(--font-mono)' }}>
                    Port: {endpoint.split(':').pop()?.replace('/', '') || '3005'}
                  </span>
                </div>

                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between', 
                  background: 'rgba(15, 23, 42, 0.8)', 
                  border: '1px solid var(--border-glass)', 
                  borderRadius: '6px', 
                  padding: '10px 14px',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '13px',
                  color: 'var(--neon-green)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    <span style={{ color: 'var(--neon-purple)', userSelect: 'none' }}>$</span>
                    <span>{devCommand}</span>
                  </div>
                  <button 
                    onClick={handleCopyCommand}
                    className="glass-button"
                    style={{ padding: '4px 10px', fontSize: '11px', borderColor: copiedCmd ? 'var(--neon-green)' : 'var(--border-glass)', gap: '4px' }}
                  >
                    {copiedCmd ? <Check size={12} color="var(--neon-green)" /> : <Copy size={12} />}
                    {copiedCmd ? 'Copied' : 'Copy'}
                  </button>
                </div>

                <div style={{ fontSize: '11px', color: 'var(--text-dark)', marginTop: '8px', lineHeight: '1.4' }}>
                  Tip: Alternatively start all services simultaneously with <code style={{ color: 'var(--neon-cyan)' }}>npm run dev:all</code> from the edge shell.
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'center', marginTop: '5px' }}>
                <button 
                  onClick={triggerLaunch}
                  disabled={isSpawning}
                  className="glass-button cyan"
                  style={{ padding: '8px 18px', fontSize: '13px', gap: '8px', fontWeight: 'bold' }}
                >
                  <RefreshCw size={14} style={{ animation: isSpawning ? 'spin 1s linear infinite' : 'none' }} />
                  {isSpawning ? 'Booting Container...' : '🚀 Boot Server Process'}
                </button>

                <button 
                  onClick={checkHealth}
                  className="glass-button"
                  style={{ padding: '8px 18px', fontSize: '13px', gap: '8px' }}
                >
                  <RefreshCw size={14} />
                  Retry Connection {autoRetryEnabled && `(${autoRetryCountdown}s)`}
                </button>

                <button 
                  onClick={() => setViewMode('simulation')}
                  className="glass-button purple"
                  style={{ padding: '8px 18px', fontSize: '13px', gap: '8px' }}
                >
                  <Eye size={14} />
                  Switch to Offline Simulation
                </button>

                <a 
                  href={endpoint} 
                  target="_blank" 
                  rel="noreferrer"
                  className="glass-button"
                  style={{ padding: '8px 18px', fontSize: '13px', gap: '8px', textDecoration: 'none', color: '#fff' }}
                >
                  <ExternalLink size={14} />
                  Open Direct Link
                </a>
              </div>
            </div>
          ) : (
            <div style={{ flex: 1, position: 'relative', minHeight: '680px', width: '100%' }}>
              {healthStatus === 'checking' && (
                <div style={{ 
                  position: 'absolute', 
                  top: 0, 
                  left: 0, 
                  right: 0, 
                  bottom: 0, 
                  background: 'rgba(5, 7, 19, 0.85)', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  gap: '15px',
                  zIndex: 10
                }}>
                  <RefreshCw size={36} color="var(--neon-cyan)" style={{ animation: 'spin 1.5s linear infinite' }} />
                  <span style={{ fontSize: '13px', color: 'var(--neon-cyan)', fontFamily: 'var(--font-mono)' }}>
                    Connecting to container endpoint {endpoint}...
                  </span>
                </div>
              )}

              <iframe 
                key={iframeKey}
                src={endpoint} 
                title={`DAUP ${title} App Container`}
                style={{ 
                  width: '100%', 
                  height: '100%', 
                  minHeight: '680px', 
                  border: 'none', 
                  background: 'transparent'
                }}
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals allow-downloads"
                onError={() => setHealthStatus('offline')}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ==========================================
// 1. Farmer Portal Workspace
// ==========================================
const FarmerWorkspaceContent: React.FC<{ onExit: () => void }> = ({ onExit }) => {
  const [telemetry, setTelemetry] = useState({ temp: 21.4, moisture: 58.2, ph: 6.4 });
  
  useEffect(() => {
    const interval = setInterval(() => {
      setTelemetry({
        temp: +(21.0 + Math.random() * 1.5).toFixed(1),
        moisture: +(57.0 + Math.random() * 2.5).toFixed(1),
        ph: +(6.2 + Math.random() * 0.4).toFixed(1)
      });
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const fallbackView = (
    <div className="grid-container sidebar-layout">
      {/* Left pane: Field details */}
      <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <h3 style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase' }}>FIELD AGRO-TELEMETRY</h3>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ padding: '12px', background: 'rgba(6, 182, 212, 0.03)', border: '1px solid var(--border-glass)', borderRadius: '8px' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>AMB. TEMPERATURE</div>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--neon-cyan)', fontFamily: 'var(--font-mono)', marginTop: '4px' }}>
              {telemetry.temp} °C
            </div>
          </div>
          <div style={{ padding: '12px', background: 'rgba(16, 185, 129, 0.03)', border: '1px solid var(--border-glass)', borderRadius: '8px' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>SOIL MOISTURE CONTENT</div>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--neon-green)', fontFamily: 'var(--font-mono)', marginTop: '4px' }}>
              {telemetry.moisture} %
            </div>
          </div>
          <div style={{ padding: '12px', background: 'rgba(245, 158, 11, 0.03)', border: '1px solid var(--border-glass)', borderRadius: '8px' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>PH LEVEL INDICATION</div>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--neon-amber)', fontFamily: 'var(--font-mono)', marginTop: '4px' }}>
              {telemetry.ph} PH
            </div>
          </div>
        </div>
      </div>

      {/* Right pane: Fields and CSA */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div className="glass-panel" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 'bold', color: '#fff', marginBottom: '15px' }}>Field Sector Dispatch</h3>
          <div className="grid-container three-col" style={{ gap: '12px' }}>
            {[
              { name: 'Sector A - Hydro Maize', health: 'Optimal', yield: '85%' },
              { name: 'Sector B - Bio-Carrots', health: 'Irrigating', yield: '92%' },
              { name: 'Sector C - Eco-Wheat', health: 'Optimal', yield: '97%' }
            ].map((sector, idx) => (
              <div key={idx} style={{ padding: '12px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-glass)', borderRadius: '8px' }}>
                <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#fff' }}>{sector.name}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
                  <span className="badge green" style={{ padding: '1px 6px', fontSize: '9px' }}>{sector.health}</span>
                  <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>Yield: {sector.yield}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 'bold', color: '#fff', marginBottom: '12px' }}>Active CSA Smart Escrows</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[
              { consumer: 'did:daup:eatery-nyc-pub', rate: '0.04 ETH/mo', status: 'Locked', expiry: '18 Days' },
              { consumer: 'did:daup:reseller-euro-pub', rate: '0.08 ETH/mo', status: 'Disbursed', expiry: '2 Days' }
            ].map((csa, idx) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-glass)', borderRadius: '6px' }}>
                <div>
                  <div style={{ fontSize: '12px', fontFamily: 'var(--font-mono)', color: 'var(--neon-cyan)' }}>{csa.consumer.slice(0, 22)}...</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>Rate: {csa.rate}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span className="badge cyan" style={{ fontSize: '9px', padding: '1px 6px' }}>{csa.status}</span>
                  <div style={{ fontSize: '10px', color: 'var(--text-dark)', marginTop: '4px' }}>Expiry: {csa.expiry}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <WorkspaceContainer
      moduleName="daup-farmer"
      title="Farmer Operations Console"
      icon={<Wheat size={20} color="var(--neon-cyan)" />}
      fallbackContent={fallbackView}
      devCommand="npm run dev:farmer"
      onExit={onExit}
    />
  );
};

// ==========================================
// 2. Reseller Workspace
// ==========================================
const ResellerWorkspaceContent: React.FC<{ onExit: () => void }> = ({ onExit }) => {
  const fallbackView = (
    <div className="grid-container sidebar-layout">
      {/* Left: Financial summaries */}
      <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <h3 style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase' }}>B2B REVENUE LEDGER</h3>
        <div style={{ padding: '15px', background: 'rgba(139, 92, 246, 0.03)', border: '1px solid var(--border-glass)', borderRadius: '8px', textAlign: 'center' }}>
          <Coins size={32} color="var(--neon-purple)" style={{ marginBottom: '8px' }} />
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>ACCUMULATED WALLET ESCROW</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#c084fc', fontFamily: 'var(--font-mono)', marginTop: '4px' }}>
            4.18 ETH
          </div>
        </div>
        <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
          Total revenue locked in multi-sig supply-chain escrows awaiting decentralized provenance delivery signatures.
        </div>
      </div>

      {/* Right: Order list and Catalog */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div className="glass-panel" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 'bold', color: '#fff', marginBottom: '15px' }}>Purchase Order Pipeline</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {[
              { orderId: 'PO-2884-A', origin: 'did:daup:farm-ohio-pub', item: 'Fresh Organic Wheat x500kg', status: 'Pending Delivery' },
              { orderId: 'PO-2712-B', origin: 'did:daup:eatery-dallas-pub', item: 'Hydroponic Greens x100kg', status: 'Signed & Closed' }
            ].map((po, idx) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 15px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-glass)', borderRadius: '8px' }}>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#fff' }}>{po.orderId} - {po.item}</div>
                  <div style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--text-dark)', marginTop: '2px' }}>
                    From: {po.origin.slice(0, 24)}...
                  </div>
                </div>
                <span className={`badge ${po.status.includes('Closed') ? 'green' : 'amber'}`} style={{ fontSize: '9px', padding: '2px 8px' }}>
                  {po.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <WorkspaceContainer
      moduleName="daup-reseller"
      title="Reseller Engine Terminal"
      icon={<TrendingUp size={20} color="var(--neon-purple)" />}
      fallbackContent={fallbackView}
      devCommand="npm run dev:reseller"
      onExit={onExit}
    />
  );
};

// ==========================================
// 3. Eatery Workspace
// ==========================================
const EateryWorkspaceContent: React.FC<{ onExit: () => void }> = ({ onExit }) => {
  const fallbackView = (
    <div className="grid-container sidebar-layout">
      <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <h3 style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase' }}>EATERY TICKETING ENGINE</h3>
        <div style={{ padding: '15px', background: 'rgba(16, 185, 129, 0.03)', border: '1px solid var(--border-glass)', borderRadius: '8px' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>ACTIVE POS TERMINALS</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--neon-green)', fontFamily: 'var(--font-mono)', marginTop: '4px' }}>
            3 Online
          </div>
        </div>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
          Decentralized point-of-sale terminal managing table ordering, kitchen dispatch screens, and settlement crypto-invoices.
        </p>
      </div>

      <div className="glass-panel" style={{ padding: '20px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: 'bold', color: '#fff', marginBottom: '15px' }}>Active Kitchen Tickets</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {[
            { id: 'TKT-104', table: 'Table 4', items: '2x Truffle Risotto, 1x Organic Salad', status: 'Prepping' },
            { id: 'TKT-105', table: 'Table 12', items: '1x Hydroponic Grain Bowl', status: 'Ready for Service' }
          ].map((tkt, idx) => (
            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 15px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-glass)', borderRadius: '8px' }}>
              <div>
                <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#fff' }}>{tkt.id} &bull; {tkt.table}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{tkt.items}</div>
              </div>
              <span className={`badge ${tkt.status.includes('Ready') ? 'green' : 'cyan'}`} style={{ fontSize: '9px', padding: '2px 8px' }}>
                {tkt.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <WorkspaceContainer
      moduleName="daup-eatery"
      title="Eatery Hub Management Console"
      icon={<Utensils size={20} color="var(--neon-green)" />}
      fallbackContent={fallbackView}
      devCommand="npm run dev:eatery"
      onExit={onExit}
    />
  );
};

// ==========================================
// 4. Manufacturing Workspace
// ==========================================
const ManufacturingWorkspaceContent: React.FC<{ onExit: () => void }> = ({ onExit }) => {
  const fallbackView = (
    <div className="grid-container sidebar-layout">
      {/* Left Panel */}
      <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <h3 style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase' }}>BATCH HASH REGISTRATION</h3>
        <div style={{ padding: '12px', background: 'rgba(245, 158, 11, 0.03)', border: '1px solid var(--border-glass)', borderRadius: '8px' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>LAST BROADCAST BATCH</div>
          <div style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--neon-amber)', marginTop: '4px', wordBreak: 'break-all' }}>
            0xf4e9185a49c952b610c1122aef4a58f4a8b8c2c1e4d8f9a2e6b7c
          </div>
        </div>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.4' }}>
          Broadcasting assembly line telemetry hashes onto the decentralized provenance registry.
        </p>
      </div>

      {/* Right Panel */}
      <div className="glass-panel" style={{ padding: '20px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: 'bold', color: '#fff', marginBottom: '15px' }}>Active Production Lines</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {[
            { id: 'Line 1', task: 'Component Assembly', speed: '98%', status: 'Normal' },
            { id: 'Line 2', task: 'Quality Audit / Sign Envelopes', speed: '100%', status: 'Calibrating' },
            { id: 'Line 3', task: 'Batch Packaging & Provenance Sync', speed: '92%', status: 'Normal' }
          ].map((line, idx) => (
            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 15px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-glass)', borderRadius: '8px' }}>
              <div>
                <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#fff' }}>{line.id} - {line.task}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>Operational Speed: {line.speed}</div>
              </div>
              <span className={`badge ${line.status === 'Normal' ? 'green' : 'amber'}`} style={{ fontSize: '9px', padding: '1px 6px' }}>
                {line.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <WorkspaceContainer
      moduleName="daup-manufacturing"
      title="Manufacturer Assembly Portal"
      icon={<Cpu size={20} color="var(--neon-amber)" />}
      fallbackContent={fallbackView}
      devCommand="npm run dev:manufacturing"
      onExit={onExit}
    />
  );
};

// Wrap all components using our HOC
export const FarmerWorkspace = withLicenseCheck(FarmerWorkspaceContent, 'daup-farmer');
export const ResellerWorkspace = withLicenseCheck(ResellerWorkspaceContent, 'daup-reseller');
export const EateryWorkspace = withLicenseCheck(EateryWorkspaceContent, 'daup-eatery');
export const ManufacturingWorkspace = withLicenseCheck(ManufacturingWorkspaceContent, 'daup-manufacturing');
