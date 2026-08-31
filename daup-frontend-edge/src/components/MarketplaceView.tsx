import React from 'react';
import { ShoppingBag, Sparkles, Filter } from 'lucide-react';
import { MODULE_METADATA } from './withLicenseCheck';
import { AppCard } from './AppCard';
import { useUserProfile } from '../context/UserProfileContext';

interface MarketplaceViewProps {
  installedApps: Record<string, boolean>;
  subsData: Record<string, any>;
  currentTime: number;
  onLaunchApp: (moduleName: string) => void;
  onInstallApp: (moduleName: string) => void;
  onUninstallApp: (moduleName: string) => void;
}

export const MarketplaceView: React.FC<MarketplaceViewProps> = ({
  installedApps,
  subsData,
  currentTime,
  onLaunchApp,
  onInstallApp,
  onUninstallApp
}) => {
  const { instanceName, currency, profile } = useUserProfile();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      
      {/* Marketplace Header Banner */}
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
            <ShoppingBag size={22} color="var(--neon-cyan)" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 'bold', color: '#fff' }}>
                Decentralized Edge App Registry
              </h2>
              <span className="badge cyan" style={{ fontSize: '9px', padding: '1px 6px' }}>
                Ecosystem Store
              </span>
              <span className="badge green" style={{ fontSize: '9px', padding: '1px 6px' }}>
                {currency.code} ({currency.symbol})
              </span>
            </div>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
              New instances inherit active wallet instance name <strong style={{ color: 'var(--neon-cyan)' }}>{instanceName}</strong> &bull; Region: <span style={{ color: 'var(--neon-purple)' }}>{profile.location.country || 'Global'}</span> ({currency.name}).
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-dark)' }}>
            Catalog: {Object.keys(MODULE_METADATA).length} Apps Available
          </span>
        </div>
      </div>

      {/* Grid of Compact App Cards */}
      <div className="grid-container two-col" style={{ gap: '14px' }}>
        {Object.keys(MODULE_METADATA).map((mod) => (
          <AppCard
            key={mod}
            moduleKey={mod}
            isInstalled={installedApps[mod]}
            licenseSub={subsData[mod]}
            currentTime={currentTime}
            onLaunch={onLaunchApp}
            onInstall={onInstallApp}
            onUninstall={onUninstallApp}
            viewMode="marketplace"
            instanceName={instanceName}
          />
        ))}
      </div>

    </div>
  );
};

export default MarketplaceView;
