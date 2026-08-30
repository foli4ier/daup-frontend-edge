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
import { deriveSeedNode, deployAppInstance } from './stores/identityStore';

const DashboardContent: React.FC = () => {
  const { did, seed, connectWallet, wasmLoaded, isLoadingWasm } = useDIDWallet();
  const { instanceName, activeWallet, identityKeySeedNode, isProfileModalOpen, setIsProfileModalOpen } = useUserProfile();
  const { sendRequest } = useMcp();

  const [activeTab, setActiveTab] = useState<'my-apps' | 'licenses' | 'marketplace' | 'telemetry' | 'dht' | 'dcdn' | 'mcp'>('my-apps');
  const [launchedApp, setLaunchedApp] = useState<string | null>(null);
  const [isAdvanced, setIsAdvanced] = useState(false);

  const [installedApps, setInstalledApps] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('daup_installed_apps');
      return saved ? JSON.parse(saved) : { 'daup-farmer': true };
    } catch {
      return { 'daup-farmer': true };
    }
  });

  const [subsData, setSubsData] = useState<Record<string, any>>({});
  const [currentTime, setCurrentTime] = useState(Date.now());

  useEffect(() => {
    const targetLegalName = activeWallet?.legalName || instanceName;
    const targetSeed = identityKeySeedNode || deriveSeedNode(targetLegalName);
    if (targetSeed && seed !== targetSeed) {
      connectWallet(targetSeed);
    }
  }, [activeWallet?.legalName, instanceName, identityKeySeedNode, seed, connectWallet]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

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
    const targetInstName = activeWallet?.legalName || instanceName || 'The house';
    deployAppInstance(moduleName, targetInstName, did || 'did:daup:node-primary');
    const updated = { ...installedApps, [moduleName]: true };
    saveInstalled(updated);
    loadSubscriptions();
  };

  const handleUninstallApp = (moduleName: string) => {
    const updated = { ...installedApps, [moduleName]: false };
    saveInstalled(updated);
  };

  const handleDeleteInstance = async (moduleName: string, instName: string) => {
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

    const updated = { ...installedApps, [moduleName]: false };
    saveInstalled(updated);

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

    loadSubscriptions();
  };

  const handleExitApp = () => setLaunchedApp(null);

  const subscribedCount = useMemo(() => {
    return Object.keys(MODULE_METADATA).filter((mod) => {
      const isInstalled = installedApps[mod];
      const sub = subsData[mod];
      const hasActiveSub = sub && sub.expirationTimestamp > currentTime;
      return isInstalled || hasActiveSub;
    }).length;
  }, [installedApps, subsData, currentTime]);

  const houseName = activeWallet?.legalName || instanceName || 'Your hub';

  return (
    <div className="owner-chrome" style={{ maxWidth: '1120px', margin: '0 auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <ProfileModal />

      <header className="card" style={{ padding: '16px 24px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span className="ico-sq"><Globe size={22} /></span>
          <div>
            <h1 className="serif" style={{ fontSize: '22px', fontWeight: 700, margin: 0, letterSpacing: '-0.03em' }}>
              Your hub
            </h1>
            <p style={{ margin: '2px 0 0', color: 'var(--muted)', fontSize: '15px' }}>
              {houseName} · set up the house, invite the floor
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => setIsProfileModalOpen(true)}
          >
            <User size={16} />
            {activeWallet?.legalName || 'Profile'}
          </button>
          <button
            type="button"
            className={isAdvanced ? 'btn btn-primary' : 'btn btn-outline'}
            onClick={() => {
              setIsAdvanced(!isAdvanced);
              if (isAdvanced && ['telemetry', 'dht', 'dcdn', 'mcp'].includes(activeTab)) {
                setActiveTab('my-apps');
              }
            }}
            title="Advanced network tools — not the home"
          >
            <Settings size={16} /> Advanced
          </button>
        </div>
      </header>

      <nav style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
        <button
          type="button"
          onClick={() => { setActiveTab('my-apps'); setLaunchedApp(null); }}
          className={activeTab === 'my-apps' && !launchedApp ? 'btn btn-primary' : 'btn btn-outline'}
        >
          <Layers size={16} /> My Apps
          {subscribedCount > 0 && (
            <span className="chip" style={{ minHeight: 28, padding: '0 8px', pointerEvents: 'none' }}>{subscribedCount}</span>
          )}
        </button>
        <button
          type="button"
          onClick={() => { setActiveTab('licenses'); setLaunchedApp(null); }}
          className={activeTab === 'licenses' && !launchedApp ? 'btn btn-primary' : 'btn btn-outline'}
        >
          <Key size={16} /> Licenses
        </button>
        <button
          type="button"
          onClick={() => { setActiveTab('marketplace'); setLaunchedApp(null); }}
          className={activeTab === 'marketplace' && !launchedApp ? 'btn btn-primary' : 'btn btn-outline'}
        >
          <ShoppingBag size={16} /> Other apps
        </button>

        {isAdvanced && (
          <>
            <button type="button" onClick={() => { setActiveTab('telemetry'); setLaunchedApp(null); }} className={activeTab === 'telemetry' ? 'btn btn-primary' : 'btn btn-outline'}>
              <Activity size={14} /> Telemetry
            </button>
            <button type="button" onClick={() => { setActiveTab('dht'); setLaunchedApp(null); }} className={activeTab === 'dht' ? 'btn btn-primary' : 'btn btn-outline'}>
              <Compass size={14} /> DHT
            </button>
            <button type="button" onClick={() => { setActiveTab('dcdn'); setLaunchedApp(null); }} className={activeTab === 'dcdn' ? 'btn btn-primary' : 'btn btn-outline'}>
              <HardDrive size={14} /> dCDN
            </button>
            <button type="button" onClick={() => { setActiveTab('mcp'); setLaunchedApp(null); }} className={activeTab === 'mcp' ? 'btn btn-primary' : 'btn btn-outline'}>
              <Terminal size={14} /> MCP
            </button>
            {isLoadingWasm ? <span className="chip" style={{ pointerEvents: 'none' }}>Loading runtime</span> : wasmLoaded ? (
              <span className="chip" style={{ pointerEvents: 'none' }}><Shield size={12} /> Runtime on</span>
            ) : null}
          </>
        )}
      </nav>

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
              <div className="protocol-console">
                <LicenseManagementView
                  subsData={subsData}
                  currentTime={currentTime}
                  onRefreshSubscriptions={loadSubscriptions}
                />
              </div>
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
            {isAdvanced && activeTab === 'telemetry' && <div className="protocol-console"><TelemetryGrid /></div>}
            {isAdvanced && activeTab === 'dht' && <div className="protocol-console"><DHTRouterView /></div>}
            {isAdvanced && activeTab === 'dcdn' && <div className="protocol-console"><DcdnResolverView /></div>}
            {isAdvanced && activeTab === 'mcp' && <div className="protocol-console"><McpConsole /></div>}
          </>
        )}
      </main>

      <footer style={{ marginTop: '20px', borderTop: '1px solid var(--line)', paddingTop: '16px', display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: 'var(--muted)' }}>
        <span>Your hub · {houseName}</span>
        <span>Staff join with a WhatsApp tap.</span>
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
