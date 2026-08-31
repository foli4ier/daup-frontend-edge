import React, { useState } from 'react';
import { ShieldCheck, ShieldAlert, CreditCard, Clock, Key, CheckCircle, Loader2, RefreshCw, Layers, Shield } from 'lucide-react';
import { MODULE_METADATA } from './withLicenseCheck';
import { useMcp } from '../hooks/useMcpClient';
import { useDIDWallet } from './DIDWalletProvider';
import { useUserProfile } from '../context/UserProfileContext';

interface LicenseManagementViewProps {
  subsData: Record<string, any>;
  currentTime: number;
  onRefreshSubscriptions: () => void;
}

export const LicenseManagementView: React.FC<LicenseManagementViewProps> = ({
  subsData,
  currentTime,
  onRefreshSubscriptions
}) => {
  const { did } = useDIDWallet();
  const { sendRequest } = useMcp();
  const { instanceName, currency } = useUserProfile();

  const [renewModalModule, setRenewModalModule] = useState<string | null>(null);
  const [renewTier, setRenewTier] = useState<'Pro' | 'Developer' | 'Enterprise'>('Pro');
  const [renewDuration, setRenewDuration] = useState<number>(30);
  const [renewing, setRenewing] = useState(false);
  const [renewTx, setRenewTx] = useState<string | null>(null);

  const formatCountdown = (expTime: number) => {
    const diff = expTime - currentTime;
    if (diff <= 0) return { text: 'EXPIRED / INVALID', color: 'var(--neon-red)', status: 'expired' };

    const secs = Math.floor(diff / 1000);
    const mins = Math.floor(secs / 60);
    const hours = Math.floor(mins / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return { text: `${days} Days ${hours % 24} Hours`, color: 'var(--neon-green)', status: 'active' };
    }
    return { text: `${hours}h ${mins % 60}m ${secs % 60}s`, color: 'var(--neon-amber)', status: 'expiring_soon' };
  };

  const handleRenew = async () => {
    if (!did || !renewModalModule) return;
    setRenewing(true);
    setRenewTx(null);

    try {
      const response = await sendRequest('register_subscription', {
        did,
        module: renewModalModule,
        tier: renewTier,
        durationDays: renewDuration
      });

      if (response && response.result && response.result.status === 'success') {
        setRenewTx(response.result.transactionHash);
        setTimeout(() => {
          setRenewModalModule(null);
          setRenewTx(null);
          onRefreshSubscriptions();
        }, 1500);
      }
    } catch (e) {
      console.error('Failed to renew license:', e);
    } finally {
      setRenewing(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      
      {/* Header Overview Card */}
      <div 
        className="glass-panel" 
        style={{ 
          padding: '16px 20px', 
          background: 'linear-gradient(90deg, rgba(139, 92, 246, 0.08) 0%, rgba(6, 182, 212, 0.08) 50%, rgba(10, 15, 30, 0.7) 100%)',
          borderColor: 'rgba(139, 92, 246, 0.25)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '15px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ background: 'rgba(139, 92, 246, 0.15)', padding: '8px', borderRadius: '8px' }}>
            <Key size={22} color="var(--neon-purple)" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 'bold', color: '#fff' }}>
                Smart Contract License Gateway
              </h2>
              <span className="badge purple" style={{ fontSize: '9px', padding: '1px 6px' }}>
                DaupLicensingRegistry.sol
              </span>
              <span className="badge green" style={{ fontSize: '9px', padding: '1px 6px' }}>
                {currency.code} ({currency.symbol})
              </span>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
              Identity Node: <span style={{ color: 'var(--neon-cyan)', fontFamily: 'var(--font-mono)' }}>{did || 'Auto-Deriving...'}</span> &bull; Instance: <strong style={{ color: '#fff' }}>{instanceName}</strong>
            </div>
          </div>
        </div>

        <button 
          className="glass-button" 
          onClick={onRefreshSubscriptions}
          style={{ padding: '6px 12px', fontSize: '12px' }}
          title="Query smart contract license registry"
        >
          <RefreshCw size={13} /> Refresh Leases
        </button>
      </div>

      {/* Licenses Table / List */}
      <div className="glass-panel" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-glass)', paddingBottom: '10px' }}>
          <h3 style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Active & Expiring Ecosystem Leases
          </h3>
          <span style={{ fontSize: '11px', color: 'var(--text-dark)' }}>
            Total Modules: {Object.keys(MODULE_METADATA).length}
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {Object.keys(MODULE_METADATA).map((mod) => {
            const meta = MODULE_METADATA[mod];
            const sub = subsData[mod];
            const active = sub ? sub.expirationTimestamp > currentTime : false;
            const countdown = sub ? formatCountdown(sub.expirationTimestamp) : { text: 'UNSUBSCRIBED', color: 'var(--text-dark)', status: 'none' };
            const isTrial = sub?.tier === 'Trial';

            return (
              <div 
                key={mod}
                className="glass-panel"
                style={{
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '12px',
                  background: 'rgba(255, 255, 255, 0.01)',
                  borderColor: active ? 'rgba(16, 185, 129, 0.2)' : 'var(--border-glass)'
                }}
              >
                {/* Left: Module Details */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: '220px' }}>
                  <div style={{ padding: '6px', borderRadius: '6px', background: active ? 'rgba(16, 185, 129, 0.1)' : 'rgba(244, 63, 94, 0.1)' }}>
                    {active ? <ShieldCheck size={18} color="var(--neon-green)" /> : <ShieldAlert size={18} color="var(--neon-red)" />}
                  </div>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#fff' }}>
                      {meta.name}
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--text-dark)', fontFamily: 'var(--font-mono)' }}>
                      Key ID: {meta.versionHash.slice(0, 18)}...
                    </div>
                  </div>
                </div>

                {/* Middle: Tier and Seat Allocation */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                  <div>
                    <span style={{ fontSize: '10px', color: 'var(--text-dark)', display: 'block' }}>TIER LEVEL</span>
                    <span className={`badge ${active ? (isTrial ? 'cyan' : 'green') : 'red'}`} style={{ fontSize: '9px', padding: '1px 6px', marginTop: '2px' }}>
                      {sub?.tier || 'Free / Expired'}
                    </span>
                  </div>

                  <div>
                    <span style={{ fontSize: '10px', color: 'var(--text-dark)', display: 'block' }}>SEAT ALLOCATION</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                      {sub?.tier === 'Enterprise' ? 'Unlimited Seats' : sub?.tier === 'Developer' ? '5 Dev Nodes' : '1 Operator Node'}
                    </span>
                  </div>

                  <div>
                    <span style={{ fontSize: '10px', color: 'var(--text-dark)', display: 'block' }}>VALIDITY COUNTDOWN</span>
                    <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: countdown.color, fontWeight: 'bold' }}>
                      {countdown.text}
                    </span>
                  </div>
                </div>

                {/* Right: Actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    className="glass-button purple"
                    onClick={() => {
                      setRenewModalModule(mod);
                      setRenewTier(sub?.tier === 'Free' || !sub?.tier ? 'Pro' : (sub.tier as any));
                    }}
                    style={{ padding: '5px 12px', fontSize: '11px', borderRadius: '6px' }}
                  >
                    <CreditCard size={12} /> {active ? 'Renew / Upgrade' : 'Purchase License'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Renew License Modal Popup */}
      {renewModalModule && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(5, 7, 19, 0.85)', backdropFilter: 'blur(8px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '440px', padding: '22px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-glass)', paddingBottom: '10px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 'bold', color: '#fff' }}>
                Renew Smart Contract Lease
              </h3>
              <button 
                onClick={() => setRenewModalModule(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '16px' }}
              >
                🗙
              </button>
            </div>

            <div>
              <div style={{ fontSize: '10px', color: 'var(--text-dark)' }}>TARGET APPLICATION</div>
              <div style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--neon-cyan)', marginTop: '2px' }}>
                {MODULE_METADATA[renewModalModule]?.name}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>SELECT LICENSE TIER</label>
              <select 
                className="glass-select" 
                value={renewTier} 
                onChange={(e) => setRenewTier(e.target.value as any)}
                style={{ width: '100%' }}
              >
                <option value="Pro">Pro ({MODULE_METADATA[renewModalModule]?.pricing.Pro})</option>
                <option value="Developer">Developer ({MODULE_METADATA[renewModalModule]?.pricing.Developer})</option>
                <option value="Enterprise">Enterprise ({MODULE_METADATA[renewModalModule]?.pricing.Enterprise})</option>
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>LEASE DURATION</label>
              <select 
                className="glass-select" 
                value={renewDuration} 
                onChange={(e) => setRenewDuration(Number(e.target.value))}
                style={{ width: '100%' }}
              >
                <option value="30">30 Days</option>
                <option value="90">90 Days (10% discount)</option>
                <option value="365">365 Days (20% discount)</option>
              </select>
            </div>

            <button 
              className="glass-button purple" 
              onClick={handleRenew}
              disabled={renewing || !!renewTx}
              style={{ width: '100%', justifyContent: 'center' }}
            >
              {renewing ? (
                <>
                  <Loader2 size={14} style={{ animation: 'spin 1.5s linear infinite' }} />
                  Broadcasting Tx to Smart Contract...
                </>
              ) : renewTx ? (
                'Registry Confirmed'
              ) : (
                'Confirm License Lease'
              )}
            </button>

            {renewTx && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '8px 10px', background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '6px' }}>
                <span style={{ fontSize: '10px', color: 'var(--neon-green)', fontWeight: 'bold' }}>TRANSACTION HASH:</span>
                <span style={{ fontSize: '9px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {renewTx}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};

export default LicenseManagementView;
