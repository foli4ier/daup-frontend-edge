import React, { useState } from 'react';
import { ShoppingBag, Plus, Layers, ArrowRight } from 'lucide-react';
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

export const SubscribedAppsView: React.FC<SubscribedAppsViewProps> = ({
  installedApps,
  subsData,
  currentTime,
  onLaunchApp,
  onGoToMarketplace,
  onDeleteInstance
}) => {
  const { instanceName, primaryWallet, currency, profile } = useUserProfile();
  const { did } = useDIDWallet();

  const [deleteModalState, setDeleteModalState] = useState<{
    isOpen: boolean;
    moduleKey: string | null;
    moduleName?: string;
    instanceName: string;
  }>({
    isOpen: false,
    moduleKey: null,
    moduleName: undefined,
    instanceName: ''
  });

  // Find all installed/active apps
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      
      {/* Delete Instance Modal with strict Name Typing Confirmation */}
      <DeleteInstanceModal
        isOpen={deleteModalState.isOpen}
        instanceName={deleteModalState.instanceName}
        moduleKey={deleteModalState.moduleKey}
        moduleName={deleteModalState.moduleName}
        did={did}
        onClose={() => setDeleteModalState(prev => ({ ...prev, isOpen: false }))}
        onConfirmDelete={handleConfirmDelete}
      />

      {/* Active Instance Header Banner */}
      <div 
        className="glass-panel" 
        style={{ 
          padding: '16px 20px', 
          background: 'linear-gradient(90deg, rgba(6, 182, 212, 0.08) 0%, rgba(139, 92, 246, 0.08) 50%, rgba(10, 15, 30, 0.7) 100%)',
          borderColor: 'rgba(6, 182, 212, 0.25)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '15px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ background: 'rgba(6, 182, 212, 0.15)', padding: '8px', borderRadius: '8px' }}>
            <Layers size={22} color="var(--neon-cyan)" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 'bold', color: '#fff' }}>
                Subscribed Edge Applications
              </h2>
              <span className="badge cyan" style={{ fontSize: '9px', padding: '1px 6px' }}>
                {subscribedModuleKeys.length} Active
              </span>
              <span className="badge green" style={{ fontSize: '9px', padding: '1px 6px' }}>
                {currency.code} ({currency.symbol})
              </span>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
              Instance Name: <strong style={{ color: 'var(--neon-cyan)' }}>{instanceName}</strong> &bull; Settlement: <span style={{ color: 'var(--neon-purple)' }}>{primaryWallet?.legalName || 'Verified Operator'}</span> ({profile.location.country || 'Global'} &bull; {currency.name})
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button 
            className="glass-button" 
            onClick={onGoToMarketplace}
            style={{ padding: '6px 14px', fontSize: '12px', borderColor: 'var(--neon-cyan)', color: 'var(--neon-cyan)' }}
          >
            <Plus size={14} /> Add Ecosystem App
          </button>
        </div>
      </div>

      {/* Grid of Subscribed Apps */}
      {subscribedModuleKeys.length === 0 ? (
        <div className="glass-panel" style={{ padding: '40px 20px', textAlign: 'center', maxWidth: '560px', margin: '20px auto' }}>
          <ShoppingBag size={36} color="var(--neon-cyan)" style={{ marginBottom: '12px' }} />
          <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: '#fff', marginBottom: '6px' }}>
            No Applications Subscribed Yet
          </h3>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '18px' }}>
            Explore the ecosystem catalog to deploy and subscribe to vertical workspaces like Farmer, Reseller, Eatery, and Manufacturing.
          </p>
          <button 
            className="glass-button cyan" 
            onClick={onGoToMarketplace}
            style={{ padding: '8px 18px', fontSize: '13px' }}
          >
            Browse Marketplace <ArrowRight size={14} />
          </button>
        </div>
      ) : (
        <div className="grid-container two-col" style={{ gap: '14px' }}>
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

    </div>
  );
};

export default SubscribedAppsView;
