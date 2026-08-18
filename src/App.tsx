import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Layers, Key, ShoppingBag, Activity, Compass, HardDrive, Terminal, 
  Globe, Shield, Settings, User
} from 'lucide-react';
import { DIDWalletProvider, useDIDWallet } from './components/DIDWalletProvider';
import { UserProfileProvider, useUserProfile } from './context/UserProfileContext';
import { OnboardingGuard } from './guards/OnboardingGuard';
import { TelemetryGrid } from './components/TelemetryGrid';
import { DHTRouterView } from './components/DHTRouterView';
import { DcdnResolverView } from './components/DcdnResolverView';
import { McpConsole } from './components/McpConsole';
import { MarketplaceView } from './components/MarketplaceView';
import { SubscribedAppsView } from './components/SubscribedAppsView';
import { LicenseManagementView } from './components/LicenseManagementView';
import { McpProvider, getSubscriptionForDidAndModule, useMcp } from './hooks/useMcpClient';
import { FarmerWorkspace, ResellerWorkspace, EateryWorkspace, ManufacturingWorkspace } from './components/VerticalAppWorkspaces';
import { ProfileModal } from './components/ProfileModal';
import { MODULE_METADATA } from './components/withLicenseCheck';
import { deriveSeedNode } from './stores/identityStore';

const DashboardContent: React.FC = () => {
  const { did, seed, connectWallet, wasmLoaded, isLoadingWasm } = useDIDWallet();
  const { instanceName, activeWallet, identityKeySeedNode, isProfileModalOpen, setIsProfileModalOpen } = useUserProfile();
  const { sendRequest } = useMcp();
  
  // 3 Primary Tabs + Dev Mode Tabs
  const [activeTab, setActiveTab] = useState<'my-apps' | 'licenses' | 'marketplace' | 'telemetry' | 'dht' | 'dcdn' | 'mcp'>('my-apps');
  const [launchedApp, setLaunchedApp] = useState<string | null>(null);
  const [isDevMode, setIsDevMode] = useState(false);

  // Installed apps state (persisted)
  const [installedApps, setInstalledApps] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('daup_installed_apps');
      return saved ? JSON.parse(saved) : { 'daup-farmer': true };
    } catch {
      return { 'daup-farmer': true };
    }
  });

  // Active subscriptions data
  const [subsData, setSubsData] = useState<Record<string, any>>({});
  const [currentTime, setCurrentTime] = useState(Date.now());

  // Automatic Background Activation of derived Seed Node
  useEffect(() => {
    const targetLegalName = activeWallet?.legalName || instanceName;
    const targetSeed = identityKeySeedNode || deriveSeedNode(targetLegalName);
    if (targetSeed && seed !== targetSeed) {
      connectWallet(targetSeed);
    }
  }, [activeWallet?.legalName, instanceName, identityKeySeedNode, seed, connectWallet]);

  // Sync clock for countdowns
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Load subscriptions for active DID
  const loadSubscriptions = useCallback(() => {
    if (did) {
      const data: Record<string, any> = {};
      Object.keys(MODULE_METADATA).forEach((mod) => {
        data[mod] = getSubscriptionForDidAndModule(did, mod);
      });
      setSubsData(data);
    }
  }, [did]);

  useEffect(() => {
    loadSubscriptions();
  }, [loadSubscriptions, currentTime]);

  const saveInstalled = (updated: Record<string, boolean>) => {
    setInstalledApps(updated);
    try {
      localStorage.setItem('daup_installed_apps', JSON.stringify(updated));
    } catch (e) {}
  };

  const handleInstallApp = (moduleName: string) => {
    const updated = { ...installedApps, [moduleName]: true };
    saveInstalled(updated);
  };

  const handleUninstallApp = (moduleName: string) => {
    const updated = { ...installedApps, [moduleName]: false };
    saveInstalled(updated);
  };

  const handleDeleteInstance = async (moduleName: string, instName: string) => {
    // 1. Broadcast decentralized network deletion via MCP JSON-RPC
    if (did) {
      try {
        await sendRequest('instance_delete_from_network', {
          did,
          instanceName: instName,
          module: moduleName
        });
      } catch (e) {
        console.warn('Network deletion broadcast notice:', e);
      }
    }

    // 2. Unset installed app state in local storage
    const updated = { ...installedApps, [moduleName]: false };
    saveInstalled(updated);

    // 3. Purge/expire active subscription record from subscriptions database
    try {
      const rawSubs = localStorage.getItem('daup_subscriptions_db');
      const allSubs = rawSubs ? JSON.parse(rawSubs) : {};
      if (did) {
        if (!allSubs[did]) allSubs[did] = {};
        allSubs[did][moduleName] = {
          did,
          module: moduleName,
          tier: 'Free',
          expirationTimestamp: 0
        };
        localStorage.setItem('daup_subscriptions_db', JSON.stringify(allSubs));
      }
    } catch (e) {}

    // 4. Force reload subscriptions to update UI
    loadSubscriptions();
  };

  const handleExitApp = () => setLaunchedApp(null);

  // Count subscribed apps
  const subscribedCount = useMemo(() => {
    return Object.keys(MODULE_METADATA).filter((mod) => {
      const isInstalled = installedApps[mod];
      const sub = subsData[mod];
      const hasActiveSub = sub && sub.expirationTimestamp > currentTime;
      return isInstalled || hasActiveSub;
    }).length;
  }, [installedApps, subsData, currentTime]);

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* User Profile & Multi-Wallet Modal */}
      <ProfileModal />

      {/* Top Header Hub */}
      <header className="glass-panel" style={{ padding: '16px 24px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ background: 'rgba(6, 182, 212, 0.1)', padding: '8px', borderRadius: '8px' }}>
              <Globe size={26} color="var(--neon-cyan)" style={{ animation: 'pulse-glow 3s infinite ease-in-out' }} />
            </div>
            <div>
              <h1 style={{ fontSize: '20px', fontWeight: '800', letterSpacing: '0.04em', color: '#fff', textTransform: 'uppercase', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <span>DAUP <span style={{ color: 'var(--neon-cyan)' }}>Edge Hub</span></span>
                <span style={{ fontSize: '13px', color: 'var(--text-dark)', fontWeight: 'normal' }}>//</span>
                <span style={{ fontSize: '14px', color: 'var(--neon-cyan)', fontWeight: '700', textTransform: 'none', background: 'rgba(6, 182, 212, 0.08)', padding: '2px 10px', borderRadius: '6px', border: '1px solid rgba(6, 182, 212, 0.2)' }}>
                  {instanceName}
                </span>
              </h1>
              <p style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
                Decentralized Autonomic Utility Platform &bull; Node: <span style={{ color: 'var(--neon-cyan)' }}>{did ? `${did.slice(0, 18)}...${did.slice(-6)}` : 'Derived Node'}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Top-Level Navigation: Profile Icon adjacent to Settings Gear & Developer Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {isDevMode && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {isLoadingWasm ? (
                <span className="badge amber" style={{ fontSize: '9px' }}>Loading WASM...</span>
              ) : wasmLoaded ? (
                <span className="badge green" style={{ fontSize: '9px' }}>
                  <Shield size={10} /> WASM Active
                </span>
              ) : (
                <span className="badge amber" style={{ fontSize: '9px' }}>TS Cryptography</span>
              )}
              <span className="badge purple" style={{ fontSize: '9px' }}>Dev Mode</span>
            </div>
          )}

          {/* User Profile Avatar / Icon UI */}
          <button 
            className="glass-button" 
            onClick={() => setIsProfileModalOpen(true)}
            style={{ 
              padding: '6px 12px', 
              borderRadius: '8px', 
              borderColor: isProfileModalOpen ? 'var(--neon-cyan)' : 'var(--border-glass)',
              background: isProfileModalOpen ? 'rgba(6, 182, 212, 0.15)' : 'rgba(255,255,255,0.02)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
            title="User Identity Profile, Multi-Wallets & Free Trial"
          >
            <div style={{
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--neon-cyan), var(--neon-purple))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '11px',
              fontWeight: 'bold',
              color: '#fff',
              boxShadow: '0 0 8px rgba(6, 182, 212, 0.3)'
            }}>
              {activeWallet?.legalName ? activeWallet.legalName.charAt(0).toUpperCase() : <User size={12} />}
            </div>
            <span style={{ fontSize: '12px', fontWeight: '500', color: '#fff', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {activeWallet?.legalName || 'Profile'}
            </span>
          </button>

          {/* Settings / Developer Mode Button */}
          <button 
            className="glass-button" 
            onClick={() => setIsDevMode(!isDevMode)}
            style={{ 
              padding: '8px', 
              borderRadius: '8px', 
              borderColor: isDevMode ? 'var(--neon-purple)' : 'var(--border-glass)',
              background: isDevMode ? 'rgba(139, 92, 246, 0.1)' : 'rgba(255,255,255,0.02)' 
            }}
            title="Toggle Developer Options"
          >
            <Settings size={18} color={isDevMode ? 'var(--neon-purple)' : 'var(--text-muted)'} style={{ animation: isDevMode ? 'spin 8s linear infinite' : 'none' }} />
          </button>
        </div>
      </header>

      {/* Primary 3-Tab Navigation Bar */}
      <nav style={{ display: 'flex', flexWrap: 'wrap', borderBottom: '1px solid var(--border-glass)', paddingBottom: '2px', gap: '8px' }}>
        {/* Tab 1: Subscribed Apps */}
        <button
          onClick={() => {
            setActiveTab('my-apps');
            setLaunchedApp(null);
          }}
          className="glass-button"
          style={{
            padding: '10px 18px',
            borderRadius: '8px 8px 0 0',
            borderWidth: '1px 1px 0 1px',
            borderStyle: 'solid',
            borderTopColor: activeTab === 'my-apps' && !launchedApp ? 'var(--neon-cyan)' : 'transparent',
            borderLeftColor: activeTab === 'my-apps' && !launchedApp ? 'var(--neon-cyan)' : 'transparent',
            borderRightColor: activeTab === 'my-apps' && !launchedApp ? 'var(--neon-cyan)' : 'transparent',
            borderBottomColor: 'transparent',
            background: activeTab === 'my-apps' && !launchedApp ? 'rgba(6, 182, 212, 0.08)' : 'transparent',
            color: activeTab === 'my-apps' && !launchedApp ? 'var(--neon-cyan)' : 'var(--text-muted)',
            fontWeight: 600,
            fontSize: '13px'
          }}
        >
          <Layers size={16} />
          My Apps
          {subscribedCount > 0 && (
            <span className="badge cyan" style={{ fontSize: '9px', padding: '0px 6px', marginLeft: '4px' }}>
              {subscribedCount}
            </span>
          )}
        </button>

        {/* Tab 2: License Management */}
        <button
          onClick={() => {
            setActiveTab('licenses');
            setLaunchedApp(null);
          }}
          className="glass-button"
          style={{
            padding: '10px 18px',
            borderRadius: '8px 8px 0 0',
            borderWidth: '1px 1px 0 1px',
            borderStyle: 'solid',
            borderTopColor: activeTab === 'licenses' && !launchedApp ? 'var(--neon-purple)' : 'transparent',
            borderLeftColor: activeTab === 'licenses' && !launchedApp ? 'var(--neon-purple)' : 'transparent',
            borderRightColor: activeTab === 'licenses' && !launchedApp ? 'var(--neon-purple)' : 'transparent',
            borderBottomColor: 'transparent',
            background: activeTab === 'licenses' && !launchedApp ? 'rgba(139, 92, 246, 0.08)' : 'transparent',
            color: activeTab === 'licenses' && !launchedApp ? 'var(--neon-purple)' : 'var(--text-muted)',
            fontWeight: 600,
            fontSize: '13px'
          }}
        >
          <Key size={16} />
          Manage Licenses
        </button>

        {/* Tab 3: Marketplace */}
        <button
          onClick={() => {
            setActiveTab('marketplace');
            setLaunchedApp(null);
          }}
          className="glass-button"
          style={{
            padding: '10px 18px',
            borderRadius: '8px 8px 0 0',
            borderWidth: '1px 1px 0 1px',
            borderStyle: 'solid',
            borderTopColor: activeTab === 'marketplace' && !launchedApp ? 'var(--neon-green)' : 'transparent',
            borderLeftColor: activeTab === 'marketplace' && !launchedApp ? 'var(--neon-green)' : 'transparent',
            borderRightColor: activeTab === 'marketplace' && !launchedApp ? 'var(--neon-green)' : 'transparent',
            borderBottomColor: 'transparent',
            background: activeTab === 'marketplace' && !launchedApp ? 'rgba(16, 185, 129, 0.08)' : 'transparent',
            color: activeTab === 'marketplace' && !launchedApp ? 'var(--neon-green)' : 'var(--text-muted)',
            fontWeight: 600,
            fontSize: '13px'
          }}
        >
          <ShoppingBag size={16} />
          App Marketplace
        </button>

        {/* Developer Mode Tabs (Shown only when Dev Mode is active) */}
        {isDevMode && (
          <>
            <div style={{ width: '1px', background: 'var(--border-glass)', margin: '4px 4px' }} />

            <button
              onClick={() => {
                setActiveTab('telemetry');
                setLaunchedApp(null);
              }}
              className="glass-button"
              style={{
                padding: '10px 14px',
                borderRadius: '8px 8px 0 0',
                borderWidth: '1px 1px 0 1px',
                borderStyle: 'solid',
                borderTopColor: activeTab === 'telemetry' && !launchedApp ? 'var(--neon-cyan)' : 'transparent',
                borderLeftColor: activeTab === 'telemetry' && !launchedApp ? 'var(--neon-cyan)' : 'transparent',
                borderRightColor: activeTab === 'telemetry' && !launchedApp ? 'var(--neon-cyan)' : 'transparent',
                borderBottomColor: 'transparent',
                background: activeTab === 'telemetry' && !launchedApp ? 'rgba(6, 182, 212, 0.08)' : 'transparent',
                color: activeTab === 'telemetry' && !launchedApp ? 'var(--neon-cyan)' : 'var(--text-dark)',
                fontSize: '12px'
              }}
            >
              <Activity size={14} /> Telemetry
            </button>

            <button
              onClick={() => {
                setActiveTab('dht');
                setLaunchedApp(null);
              }}
              className="glass-button"
              style={{
                padding: '10px 14px',
                borderRadius: '8px 8px 0 0',
                borderWidth: '1px 1px 0 1px',
                borderStyle: 'solid',
                borderTopColor: activeTab === 'dht' && !launchedApp ? 'var(--neon-cyan)' : 'transparent',
                borderLeftColor: activeTab === 'dht' && !launchedApp ? 'var(--neon-cyan)' : 'transparent',
                borderRightColor: activeTab === 'dht' && !launchedApp ? 'var(--neon-cyan)' : 'transparent',
                borderBottomColor: 'transparent',
                background: activeTab === 'dht' && !launchedApp ? 'rgba(6, 182, 212, 0.08)' : 'transparent',
                color: activeTab === 'dht' && !launchedApp ? 'var(--neon-cyan)' : 'var(--text-dark)',
                fontSize: '12px'
              }}
            >
              <Compass size={14} /> DHT
            </button>

            <button
              onClick={() => {
                setActiveTab('dcdn');
                setLaunchedApp(null);
              }}
              className="glass-button"
              style={{
                padding: '10px 14px',
                borderRadius: '8px 8px 0 0',
                borderWidth: '1px 1px 0 1px',
                borderStyle: 'solid',
                borderTopColor: activeTab === 'dcdn' && !launchedApp ? 'var(--neon-cyan)' : 'transparent',
                borderLeftColor: activeTab === 'dcdn' && !launchedApp ? 'var(--neon-cyan)' : 'transparent',
                borderRightColor: activeTab === 'dcdn' && !launchedApp ? 'var(--neon-cyan)' : 'transparent',
                borderBottomColor: 'transparent',
                background: activeTab === 'dcdn' && !launchedApp ? 'rgba(6, 182, 212, 0.08)' : 'transparent',
                color: activeTab === 'dcdn' && !launchedApp ? 'var(--neon-cyan)' : 'var(--text-dark)',
                fontSize: '12px'
              }}
            >
              <HardDrive size={14} /> dCDN
            </button>

            <button
              onClick={() => {
                setActiveTab('mcp');
                setLaunchedApp(null);
              }}
              className="glass-button"
              style={{
                padding: '10px 14px',
                borderRadius: '8px 8px 0 0',
                borderWidth: '1px 1px 0 1px',
                borderStyle: 'solid',
                borderTopColor: activeTab === 'mcp' && !launchedApp ? 'var(--neon-cyan)' : 'transparent',
                borderLeftColor: activeTab === 'mcp' && !launchedApp ? 'var(--neon-cyan)' : 'transparent',
                borderRightColor: activeTab === 'mcp' && !launchedApp ? 'var(--neon-cyan)' : 'transparent',
                borderBottomColor: 'transparent',
                background: activeTab === 'mcp' && !launchedApp ? 'rgba(6, 182, 212, 0.08)' : 'transparent',
                color: activeTab === 'mcp' && !launchedApp ? 'var(--neon-cyan)' : 'var(--text-dark)',
                fontSize: '12px'
              }}
            >
              <Terminal size={14} /> MCP
            </button>
          </>
        )}
      </nav>

      {/* Main Workspace & Tab Content */}
      <main>
        {launchedApp ? (
          <div>
            {launchedApp === 'daup-farmer' && <FarmerWorkspace onExit={handleExitApp} />}
            {launchedApp === 'daup-reseller' && <ResellerWorkspace onExit={handleExitApp} />}
            {launchedApp === 'daup-eatery' && <EateryWorkspace onExit={handleExitApp} />}
            {launchedApp === 'daup-manufacturing' && <ManufacturingWorkspace onExit={handleExitApp} />}
          </div>
        ) : (
          <>
            {activeTab === 'my-apps' && (
              <SubscribedAppsView
                installedApps={installedApps}
                subsData={subsData}
                currentTime={currentTime}
                onLaunchApp={setLaunchedApp}
                onGoToMarketplace={() => setActiveTab('marketplace')}
                onDeleteInstance={handleDeleteInstance}
              />
            )}

            {activeTab === 'licenses' && (
              <LicenseManagementView
                subsData={subsData}
                currentTime={currentTime}
                onRefreshSubscriptions={loadSubscriptions}
              />
            )}

            {activeTab === 'marketplace' && (
              <MarketplaceView
                installedApps={installedApps}
                subsData={subsData}
                currentTime={currentTime}
                onLaunchApp={setLaunchedApp}
                onInstallApp={handleInstallApp}
                onUninstallApp={handleUninstallApp}
              />
            )}

            {isDevMode && activeTab === 'telemetry' && <TelemetryGrid />}
            {isDevMode && activeTab === 'dht' && <DHTRouterView />}
            {isDevMode && activeTab === 'dcdn' && <DcdnResolverView />}
            {isDevMode && activeTab === 'mcp' && <McpConsole />}
          </>
        )}
      </main>

      <footer style={{ marginTop: '20px', borderTop: '1px solid var(--border-glass)', paddingTop: '16px', display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-dark)' }}>
        <span>DAUP Edge Platform &bull; Instance: {instanceName}</span>
        <span>Secured via SHA-256 and asymmetric mathematical sign envelopes</span>
      </footer>

    </div>
  );
};

const McpProviderWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { did, signMessage } = useDIDWallet();
  const mockWasmExports = useMemo(() => ({
    sign_envelope: (msg: string, _key: string) => {
      try {
        return signMessage(msg);
      } catch {
        return "unconnected-sig";
      }
    }
  }), [signMessage]);
  return (
    <McpProvider wasmExports={mockWasmExports} activeDid={did}>
      {children}
    </McpProvider>
  );
};

export const App: React.FC = () => {
  return (
    <DIDWalletProvider>
      <UserProfileProvider>
        <OnboardingGuard>
          <McpProviderWrapper>
            <DashboardContent />
          </McpProviderWrapper>
        </OnboardingGuard>
      </UserProfileProvider>
    </DIDWalletProvider>
  );
};

export default App;
