import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Key, Activity, Compass, HardDrive, Terminal,
  Shield
} from 'lucide-react';
import { DIDWalletProvider, useDIDWallet } from './components/DIDWalletProvider';
import { UserProfileProvider, useUserProfile } from './context/UserProfileContext';
import { OnboardingGuard } from './guards/OnboardingGuard';
import { TelemetryGrid } from './components/TelemetryGrid';
import { DHTRouterView } from './components/DHTRouterView';
import { DcdnResolverView } from './components/DcdnResolverView';
import { McpConsole } from './components/McpConsole';
import { SubscribedAppsView } from './components/SubscribedAppsView';
import { AskForEnhancementView } from './components/AskForEnhancementView';
import { LicenseManagementView } from './components/LicenseManagementView';
import { McpProvider, getSubscriptionForDidAndModule } from './hooks/useMcpClient';
import { FarmerWorkspace, ResellerWorkspace, ManufacturingWorkspace } from './components/VerticalAppWorkspaces';
import { ProfileModal } from './components/ProfileModal';
import { HubThumbNav } from './components/HubThumbNav';
import { HubYouView } from './components/HubYouView';
import { MODULE_METADATA } from './components/withLicenseCheck';
import { deriveSeedNode, deployAppInstance } from './stores/identityStore';
import { navigateToEatOutHome } from './hub/eatoutUrls';
import { navigateToTheHouse } from './hub/ownerArrival';
import { HUB_HOME_FALLBACK } from './hub/copy';
import { goToAsks, goToHubHome, readHubPage } from './hub/asksPath';
import type { HubPane } from './hub/hubPane';

const DashboardContent: React.FC = () => {
  const { did, seed, connectWallet, wasmLoaded, isLoadingWasm } = useDIDWallet();
  const {
    instanceName,
    activeWallet,
    identityKeySeedNode,
    ownerSession,
    hasHouse,
    profile
  } = useUserProfile();

  const [activeTab, setActiveTab] = useState<'home' | 'licenses' | 'telemetry' | 'dht' | 'dcdn' | 'mcp'>('home');
  const [launchedApp, setLaunchedApp] = useState<string | null>(null);
  const [isAdvanced, setIsAdvanced] = useState(false);
  const [hubPage, setHubPage] = useState<'home' | 'ask'>(() => readHubPage());
  const [hubPane, setHubPane] = useState<HubPane>('home');

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

  useEffect(() => {
    const onPop = () => setHubPage(readHubPage());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const openHome = () => {
    goToHubHome();
    setHubPage('home');
    setActiveTab('home');
    setLaunchedApp(null);
    setHubPane('home');
    setIsAdvanced(false);
  };

  const openPane = (pane: HubPane) => {
    goToHubHome();
    setHubPage('home');
    setActiveTab('home');
    setLaunchedApp(null);
    setHubPane(pane);
    if (pane !== 'you') setIsAdvanced(false);
  };

  const openAsks = () => {
    goToAsks();
    setHubPage('ask');
    setActiveTab('home');
    setLaunchedApp(null);
    setHubPane('you');
  };

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

  const handleLaunchApp = (moduleName: string) => {
    if (moduleName === 'daup-eatery') {
      const house = activeWallet?.legalName || instanceName || '';
      const email = ownerSession?.email || '';
      if (!email.trim() || !house.trim()) return;
      navigateToTheHouse({ email, house });
      return;
    }
    if (moduleName === 'daup-eatout') {
      navigateToEatOutHome();
      return;
    }
    setLaunchedApp(moduleName);
  };

  const handleExitApp = () => setLaunchedApp(null);

  const houseName = (activeWallet?.legalName || instanceName || '').trim() || HUB_HOME_FALLBACK;
  const city = (profile.location?.city || '').trim();
  const email = ownerSession?.email || '';
  const contextPlace = hasHouse ? houseName : HUB_HOME_FALLBACK;
  const contextMeta = [city, email].filter(Boolean).join(' · ');

  const showProtocol = isAdvanced && !launchedApp && activeTab !== 'home';
  const showThumb = !launchedApp;
  const thumbPane: HubPane = hubPage === 'ask' ? 'you' : hubPane;

  return (
    <div className={showThumb ? 'owner-shell has-thumb' : 'owner-shell'}>
      <ProfileModal />

      <header className="owner-context" data-testid="hub-context">
        <div className="wrap owner-context-row">
          <div>
            <div className="logo">DAUP</div>
            <p className="owner-context-place" data-testid="hub-context-place">{contextPlace}</p>
            {contextMeta ? (
              <p className="owner-context-meta" data-testid="hub-context-meta">{contextMeta}</p>
            ) : null}
          </div>
        </div>
      </header>

      {isAdvanced && (
        <nav className="wrap owner-advanced-nav" aria-label="Advanced" data-testid="owner-advanced-nav">
          <button
            type="button"
            onClick={openHome}
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
              hubPage === 'ask' ? (
                <AskForEnhancementView onBack={openHome} />
              ) : hubPane === 'you' ? (
                <HubYouView
                  onOpenAsk={openAsks}
                  isAdvanced={isAdvanced}
                  onHouseCleared={openHome}
                  onToggleAdvanced={() => {
                    const next = !isAdvanced;
                    setIsAdvanced(next);
                    if (!next) {
                      setActiveTab('home');
                    }
                  }}
                />
              ) : (
                <SubscribedAppsView
                  pane={hubPane}
                  onOpenAsk={openAsks}
                  installedApps={installedApps}
                  onSubscribeApp={handleInstallApp}
                  onLaunchApp={handleLaunchApp}
                />
              )
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
            {showProtocol && activeTab === 'telemetry' && <div className="protocol-console"><TelemetryGrid /></div>}
            {showProtocol && activeTab === 'dht' && <div className="protocol-console"><DHTRouterView /></div>}
            {showProtocol && activeTab === 'dcdn' && <div className="protocol-console"><DcdnResolverView /></div>}
            {showProtocol && activeTab === 'mcp' && <div className="protocol-console"><McpConsole /></div>}
          </>
        )}
      </main>

      {showThumb ? (
        <HubThumbNav pane={thumbPane} onPane={openPane} />
      ) : null}
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
