import React, { useState } from 'react';
import { Wheat, TrendingUp, Utensils, Cpu, Download, Trash2, Play, ChevronDown, ChevronUp, Key, ExternalLink } from 'lucide-react';
import { MODULE_METADATA } from './withLicenseCheck';
import { useUserProfile } from '../context/UserProfileContext';
import { useDIDWallet } from './DIDWalletProvider';
import { launchExternalApp, deriveInstanceSlug } from '../utils/envResolver';

export interface AppCardProps {
  moduleKey: string;
  isInstalled: boolean;
  licenseSub?: {
    tier: string;
    expirationTimestamp: number;
  };
  currentTime: number;
  onLaunch?: (moduleKey: string) => void;
  onInstall?: (moduleKey: string) => void;
  onUninstall?: (moduleKey: string) => void;
  onRenew?: (moduleKey: string) => void;
  onDeleteInstance?: (moduleKey: string) => void;
  viewMode?: 'subscribed' | 'license' | 'marketplace';
  instanceName?: string;
}

export const getModuleIcon = (mod: string, size = 18) => {
  switch (mod) {
    case 'daup-farmer': return <Wheat size={size} color="var(--neon-cyan)" />;
    case 'daup-reseller': return <TrendingUp size={size} color="var(--neon-purple)" />;
    case 'daup-eatery': return <Utensils size={size} color="var(--neon-green)" />;
    case 'daup-manufacturing': return <Cpu size={size} color="var(--neon-amber)" />;
    default: return <Cpu size={size} color="var(--neon-cyan)" />;
  }
};

export const AppCard: React.FC<AppCardProps> = ({
  moduleKey,
  isInstalled,
  licenseSub,
  currentTime,
  onLaunch,
  onInstall,
  onUninstall,
  onRenew,
  onDeleteInstance,
  viewMode = 'marketplace',
  instanceName
}) => {
  const { currency, activeWallet } = useUserProfile();
  const { did } = useDIDWallet();
  const [showSignature, setShowSignature] = useState(false);
  const targetLegalName = activeWallet?.legalName || instanceName;
  const displayInstanceSlug = deriveInstanceSlug(targetLegalName);

  const meta = MODULE_METADATA[moduleKey] || {
    name: moduleKey,
    description: 'Ecosystem edge container application.',
    versionHash: '0x0000000000000000000000000000000000000000',
    pricing: { Pro: '0.04 ETH/mo', Developer: '0.06 ETH/mo', Enterprise: '0.15 ETH/mo' }
  };

  const isLicenseActive = licenseSub ? licenseSub.expirationTimestamp > currentTime : false;
  const isTrial = licenseSub?.tier === 'Trial';

  const formatShortCountdown = (expTime: number) => {
    const diff = expTime - currentTime;
    if (diff <= 0) return { text: 'EXPIRED', color: 'var(--neon-red)' };
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    if (days > 0) return { text: `${days}d ${hours}h left`, color: 'var(--neon-green)' };
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return { text: `${hours}h ${mins}m left`, color: 'var(--neon-amber)' };
  };

  const countdown = licenseSub ? formatShortCountdown(licenseSub.expirationTimestamp) : null;

  return (
    <div 
      className="glass-panel"
      style={{
        padding: '14px 16px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        gap: '10px',
        position: 'relative',
        borderRadius: '10px',
        transition: 'all 0.2s ease',
        background: isInstalled && isLicenseActive ? 'rgba(13, 20, 38, 0.75)' : 'rgba(10, 15, 30, 0.6)'
      }}
    >
      {/* Top Border Glow for Active Subscriptions */}
      {isInstalled && isLicenseActive && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '2px',
          background: 'linear-gradient(90deg, var(--neon-cyan), var(--neon-purple))'
        }} />
      )}

      {/* Header Row: Icon, Title & Status */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '34px',
              height: '34px',
              borderRadius: '8px',
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid var(--border-glass)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              {getModuleIcon(moduleKey, 18)}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <h4 style={{ fontSize: '13px', fontWeight: 'bold', color: '#fff', lineHeight: 1.2 }}>
                  {meta.name}
                </h4>
              </div>
              <span style={{ fontSize: '10px', color: 'var(--text-dark)', fontFamily: 'var(--font-mono)' }}>
                /{moduleKey}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            {isLicenseActive ? (
              <span className={`badge ${isTrial ? 'cyan' : 'green'}`} style={{ fontSize: '8px', padding: '1px 5px' }}>
                {isTrial ? 'Trial' : licenseSub?.tier || 'Active'}
              </span>
            ) : (
              <span className="badge red" style={{ fontSize: '8px', padding: '1px 5px' }}>
                No License
              </span>
            )}
          </div>
        </div>

        {/* Short Description */}
        <p style={{
          fontSize: '11px',
          color: 'var(--text-muted)',
          lineHeight: '1.4',
          margin: '4px 0 6px 0',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden'
        }}>
          {meta.description}
        </p>

        {/* Collapsible Release Signature */}
        <div style={{ marginTop: '4px' }}>
          <button
            type="button"
            onClick={() => setShowSignature(!showSignature)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-dark)',
              fontSize: '9px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '2px 0',
              fontFamily: 'var(--font-mono)'
            }}
          >
            <Key size={10} />
            <span>Signature Hash</span>
            {showSignature ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
          </button>

          {showSignature && (
            <div style={{
              marginTop: '4px',
              padding: '5px 8px',
              background: 'rgba(0, 0, 0, 0.4)',
              border: '1px solid var(--border-glass)',
              borderRadius: '4px',
              fontFamily: 'var(--font-mono)',
              fontSize: '9px',
              color: 'var(--neon-cyan)',
              wordBreak: 'break-all'
            }}>
              {meta.versionHash}
            </div>
          )}
        </div>
      </div>

      {/* Footer Info & Action Controls */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderTop: '1px solid var(--border-glass)',
        paddingTop: '8px',
        marginTop: '4px',
        gap: '6px'
      }}>
        {/* Left Status Text */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {countdown ? (
            <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: countdown.color, fontWeight: '600' }}>
              {countdown.text}
            </span>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '10px', color: 'var(--text-dark)' }}>
                {meta.pricing.Pro}
              </span>
              <span style={{ fontSize: '9px', color: 'var(--neon-green)', fontFamily: 'var(--font-mono)' }}>
                ~{currency.format(120 * currency.exchangeRateToUSD)}/mo
              </span>
            </div>
          )}
          {isInstalled && (
            <span style={{ fontSize: '9px', color: 'var(--neon-purple)', fontFamily: 'var(--font-mono)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '140px' }}>
              Instance: {displayInstanceSlug}
            </span>
          )}
        </div>

        {/* Right Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {viewMode === 'subscribed' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              {onDeleteInstance && (
                <button
                  className="glass-button red"
                  onClick={() => onDeleteInstance(moduleKey)}
                  style={{ padding: '4px 8px', fontSize: '11px', borderRadius: '5px' }}
                  title="Delete this instance from the network"
                >
                  <Trash2 size={11} /> Delete
                </button>
              )}
              <button
                className="glass-button"
                onClick={() => launchExternalApp(moduleKey, {
                  instanceName: displayInstanceSlug,
                  legalName: targetLegalName,
                  did,
                  token: (licenseSub as any)?.token
                })}
                style={{ padding: '4px 7px', fontSize: '11px', borderRadius: '5px' }}
                title="Launch Subdomain in New Window"
              >
                <ExternalLink size={11} />
              </button>
              {onLaunch && (
                <button
                  className="glass-button cyan"
                  onClick={() => onLaunch(moduleKey)}
                  style={{ padding: '4px 10px', fontSize: '11px', borderRadius: '5px' }}
                >
                  <Play size={11} fill="currentColor" /> Launch
                </button>
              )}
            </div>
          )}

          {viewMode === 'license' && (
            <>
              {onRenew && (
                <button
                  className="glass-button purple"
                  onClick={() => onRenew(moduleKey)}
                  style={{ padding: '4px 10px', fontSize: '11px', borderRadius: '5px' }}
                >
                  Renew / Upgrade
                </button>
              )}
            </>
          )}

          {viewMode === 'marketplace' && (
            <>
              {isInstalled ? (
                <div style={{ display: 'flex', gap: '5px' }}>
                  {onUninstall && (
                    <button
                      className="glass-button red"
                      onClick={() => onUninstall(moduleKey)}
                      style={{ padding: '4px 7px', fontSize: '11px', borderRadius: '5px' }}
                      title="Uninstall app"
                    >
                      <Trash2 size={11} />
                    </button>
                  )}
                  <button
                    className="glass-button"
                    onClick={() => launchExternalApp(moduleKey, {
                      instanceName: displayInstanceSlug,
                      legalName: targetLegalName,
                      did,
                      token: (licenseSub as any)?.token
                    })}
                    style={{ padding: '4px 7px', fontSize: '11px', borderRadius: '5px' }}
                    title="Launch Subdomain in New Window"
                  >
                    <ExternalLink size={11} />
                  </button>
                  {onLaunch && (
                    <button
                      className="glass-button cyan"
                      onClick={() => onLaunch(moduleKey)}
                      style={{ padding: '4px 10px', fontSize: '11px', borderRadius: '5px' }}
                    >
                      <Play size={11} fill="currentColor" /> Open
                    </button>
                  )}
                </div>
              ) : (
                onInstall && (
                  <button
                    className="glass-button"
                    onClick={() => onInstall(moduleKey)}
                    style={{ padding: '4px 10px', fontSize: '11px', borderRadius: '5px', borderColor: 'var(--neon-cyan)', color: 'var(--neon-cyan)' }}
                  >
                    <Download size={11} /> Deploy
                  </button>
                )
              )}
            </>
          )}
        </div>
      </div>

    </div>
  );
};

export default AppCard;
