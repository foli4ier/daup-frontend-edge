import React, { useState } from 'react';
import { ShoppingBag, ArrowRight, Utensils, TrendingUp, Wheat, Cpu } from 'lucide-react';
import { MODULE_METADATA } from './withLicenseCheck';
import { AppCard } from './AppCard';
import { useUserProfile } from '../context/UserProfileContext';
import { useDIDWallet } from './DIDWalletProvider';
import { DeleteInstanceModal } from './DeleteInstanceModal';

interface SubscribedAppsViewProps {
  installedApps: Record<string, boolean>;
  subsData: Record<string, any>;
  currentTime: number;
  onLaunchApp: (moduleName: string) => void;
  onGoToMarketplace: () => void;
  onDeleteInstance?: (moduleKey: string, instanceName: string) => Promise<void> | void;
}

const HOME_TILES: { key: string; label: string; hint: string; ico: 'forest' | 'terra'; Icon: typeof Utensils }[] = [
  { key: 'daup-eatery', label: 'Eatery', hint: 'Tables, tickets, kitchen, stock.', ico: 'forest', Icon: Utensils },
  { key: 'daup-reseller', label: 'Reseller', hint: 'Kitchens send what they need.', ico: 'terra', Icon: TrendingUp },
  { key: 'daup-farmer', label: 'Farm', hint: 'Coming.', ico: 'forest', Icon: Wheat },
  { key: 'daup-manufacturing', label: 'Maker', hint: 'Coming.', ico: 'terra', Icon: Cpu }
];

export const SubscribedAppsView: React.FC<SubscribedAppsViewProps> = ({
  installedApps,
  subsData,
  currentTime,
  onLaunchApp,
  onGoToMarketplace,
  onDeleteInstance
}) => {
  const { instanceName } = useUserProfile();
  const { did } = useDIDWallet();

  const [deleteModalState, setDeleteModalState] = useState({
    isOpen: false,
    moduleKey: null as string | null,
    moduleName: undefined as string | undefined,
    instanceName: ''
  });

  const subscribedModuleKeys = Object.keys(MODULE_METADATA).filter((mod) => {
    const isInstalled = installedApps[mod];
    const sub = subsData[mod];
    const hasActiveSub = sub && sub.expirationTimestamp > currentTime;
    return isInstalled || hasActiveSub;
  });

  const handleOpenDeleteModal = (moduleKey: string) => {
    const meta = MODULE_METADATA[moduleKey];
    setDeleteModalState({
      isOpen: true,
      moduleKey,
      moduleName: meta?.name || moduleKey,
      instanceName: instanceName
    });
  };

  const handleConfirmDelete = async (confirmedInstanceName: string, targetModuleKey?: string | null) => {
    if (onDeleteInstance && targetModuleKey) {
      await onDeleteInstance(targetModuleKey, confirmedInstanceName);
    }
  };

  const liveKeys = subscribedModuleKeys.length ? subscribedModuleKeys : ['daup-eatery'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <DeleteInstanceModal
        isOpen={deleteModalState.isOpen}
        instanceName={deleteModalState.instanceName}
        moduleKey={deleteModalState.moduleKey}
        moduleName={deleteModalState.moduleName}
        did={did}
        onClose={() => setDeleteModalState(prev => ({ ...prev, isOpen: false }))}
        onConfirmDelete={handleConfirmDelete}
      />

      <p className="kicker">My apps</p>
      <h2 className="serif" style={{ margin: 0, fontSize: '1.8rem' }}>Open the house</h2>
      <p style={{ margin: 0, color: 'var(--muted)' }}>Start with your eatery. Farm, reseller, and maker are next.</p>

      <div className="owner-home-tiles">
        {HOME_TILES.filter(t => liveKeys.includes(t.key) || t.key === 'daup-eatery').map(tile => {
          const Icon = tile.Icon;
          const isLive = subscribedModuleKeys.includes(tile.key) || tile.key === 'daup-eatery';
          return (
            <button
              key={tile.key}
              type="button"
              className="tile"
              onClick={() => isLive ? onLaunchApp(tile.key) : onGoToMarketplace()}
            >
              <span className={`ico ${tile.ico}`}><Icon size={16} /></span>
              <span>
                {tile.label}
                <span style={{ display: 'block', color: 'var(--muted)', fontWeight: 500, fontSize: '15px' }}>{tile.hint}</span>
              </span>
            </button>
          );
        })}
      </div>

      {subscribedModuleKeys.length > 0 && (
        <div className="grid-container two-col" style={{ gap: '14px', marginTop: '8px' }}>
          {subscribedModuleKeys.map((mod) => (
            <AppCard
              key={mod}
              moduleKey={mod}
              isInstalled={true}
              licenseSub={subsData[mod]}
              currentTime={currentTime}
              onLaunch={onLaunchApp}
              onDeleteInstance={handleOpenDeleteModal}
              viewMode="subscribed"
              instanceName={instanceName}
            />
          ))}
        </div>
      )}

      {subscribedModuleKeys.length === 0 && (
        <button type="button" className="btn btn-outline" onClick={onGoToMarketplace}>
          <ShoppingBag size={16} /> See other apps <ArrowRight size={14} />
        </button>
      )}
    </div>
  );
};

export default SubscribedAppsView;
