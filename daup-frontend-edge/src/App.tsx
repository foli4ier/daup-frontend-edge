import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Key, ShoppingBag, Activity, Compass, HardDrive, Terminal,
  Shield, User
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
import { McpProvider, getSubscriptionForDidAndModule } from './hooks/useMcpClient';
import { FarmerWorkspace, ResellerWorkspace, ManufacturingWorkspace } from './components/VerticalAppWorkspaces';
import { ProfileModal } from './components/ProfileModal';
import { MODULE_METADATA } from './components/withLicenseCheck';
import { deriveSeedNode, deployAppInstance } from './stores/identityStore';
import { navigateToTheHouse } from './hub/ownerArrival';
import { LOG_OFF_LABEL } from './hub/copy';

const EATERY = 'https://eatery.daup.co.za/';

function staffInviteHref(houseName: string) {
  const text = `You're on tonight's floor at ${houseName}. Open the eatery: ${EATERY}`;
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

const DashboardContent: React.FC = () => {
  const { did, seed, connectWallet, wasmLoaded, isLoadingWasm } = useDIDWallet();
  const { instanceName, activeWallet, identityKeySeedNode, setIsProfileModalOpen, ownerSession, logOffHub } = useUserProfile();

  const [activeTab, setActiveTab] = useState<'home' | 'licenses' | 'marketplace' | 'telemetry' | 'dht' | 'dcdn' | 'mcp'>('home');
  const [launchedApp, setLaunchedApp] = useState<string | null>(null);
  const [isAdvanced, setIsAdvanced] = useState(false);

  const [installedApps, setInstalledApps] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('daup_installed_apps');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
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

  const handleLaunchApp = (moduleName: string) => {
    if (moduleName === 'daup-eatery') {
      const house = activeWallet?.legalName || instanceName || '';
      const email = ownerSession?.email || '';
      if (!email.trim() || !house.trim()) return;
      navigateToTheHouse({ email, house });
      return;
    }
    setLaunchedApp(moduleName);
  };

  const handleExitApp = () => setLaunchedApp(null);

  const houseName = activeWallet?.legalName || instanceName || 'Your hub';
  const inviteHref = staffInviteHref(houseName);

  const showProtocol = isAdvanced && !launchedApp && activeTab !== 'home';

  return (
    <div className="owner-shell">
      <ProfileModal />

      <header className="owner-top">
        <div className="wrap owner-nav">
          <div>
            <div className="logo">DAUP</div>
            <p className="owner-house">{houseName}</p>
          </div>
          <div className="owner-nav-actions">
            <button
              type="button"
              className="owner-quiet"
              aria-pressed={isAdvanced}
              onClick={() => {
                const next = !isAdvanced;
                setIsAdvanced(next);
                if (!next) {
                  setActiveTab('home');
                  setLaunchedApp(null);
                }
              }}
              title="Advanced tools — off by default"
            >
              Advanced
            </button>
            <button
              type="button"
              className="owner-quiet"
              data-testid="hub-log-off"
              onClick={logOffHub}
            >
              {LOG_OFF_LABEL}
            </button>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => setIsProfileModalOpen(true)}
            >
              <User size={16} />
              {activeWallet?.legalName || 'Profile'}
            </button>
          </div>
        </div>
      </header>

      {isAdvanced && (
        <nav className="wrap owner-advanced-nav" aria-label="Advanced">
          <button
            type="button"
            onClick={() => { setActiveTab('home'); setLaunchedApp(null); }}
            className={activeTab === 'home' && !launchedApp ? 'btn btn-primary' : 'btn btn-outline'}
          >
            Home
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
        </nav>
      )}

      <main className="wrap owner-main">
        {launchedApp ? (
          <div className="protocol-console">
            {launchedApp === 'daup-farmer' && <FarmerWorkspace onExit={handleExitApp} />}
            {launchedApp === 'daup-reseller' && <ResellerWorkspace onExit={handleExitApp} />}
            {launchedApp === 'daup-manufacturing' && <ManufacturingWorkspace onExit={handleExitApp} />}
          </div>
        ) : (
          <>
            {(!isAdvanced || activeTab === 'home') && (
              <SubscribedAppsView />
            )}
            {showProtocol && activeTab === 'licenses' && (
              <div className="protocol-console">
                <LicenseManagementView
                  subsData={subsData}
                  currentTime={currentTime}
                  onRefreshSubscriptions={loadSubscriptions}
                />
              </div>
            )}
            {showProtocol && activeTab === 'marketplace' && (
              <div className="protocol-console">
                <MarketplaceView
                  installedApps={installedApps}
                  subsData={subsData}
                  currentTime={currentTime}
                  onLaunchApp={handleLaunchApp}
                  onInstallApp={handleInstallApp}
                  onUninstallApp={handleUninstallApp}
                />
              </div>
            )}
            {showProtocol && activeTab === 'telemetry' && <div className="protocol-console"><TelemetryGrid /></div>}
            {showProtocol && activeTab === 'dht' && <div className="protocol-console"><DHTRouterView /></div>}
            {showProtocol && activeTab === 'dcdn' && <div className="protocol-console"><DcdnResolverView /></div>}
            {showProtocol && activeTab === 'mcp' && <div className="protocol-console"><McpConsole /></div>}
          </>
        )}
      </main>

      <footer className="wrap owner-footer">
        <p className="caption" style={{ margin: 0 }}>Staff join with a WhatsApp tap.</p>
        <a className="btn btn-primary" href={inviteHref} target="_blank" rel="noreferrer">
          Invite tonight’s floor
        </a>
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
