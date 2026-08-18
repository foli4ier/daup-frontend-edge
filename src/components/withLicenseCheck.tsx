import React, { useState, useEffect, useCallback } from 'react';
import { Shield, ShieldAlert, Key, Loader2, CheckCircle, CreditCard } from 'lucide-react';
import { useDIDWallet } from './DIDWalletProvider';
import { useMcp } from '../hooks/useMcpClient';

// Module configuration metadata and feature lists
export const MODULE_METADATA: Record<string, {
  name: string;
  description: string;
  versionHash: string;
  features: string[];
  pricing: { Pro: string; Developer: string; Enterprise: string };
  endpoint?: string;
}> = {
  'daup-farmer': {
    name: 'DAUP Farmer Portal',
    description: 'Decentralized agricultural and field operations management suite.',
    versionHash: 'e69c7f212239dcfc7bb92cd2139b4b0de57e849db2c918f8bb1a49fa81f4a9b6',
    features: [
      'Foreman terminal logistics & dispatch dashboard',
      'IoT telemetry metrics tracking (humidity/temp/soil)',
      'CSA billing & subscriber records',
      'Batch supply chain provenance mapping'
    ],
    pricing: { Pro: '0.04 ETH/mo', Developer: '0.06 ETH/mo', Enterprise: '0.15 ETH/mo' },
    endpoint: import.meta.env.VITE_APP_FARMER_URL || 'http://localhost:3007'
  },
  'daup-reseller': {
    name: 'DAUP Reseller Engine',
    description: 'B2B decentralized retail portal, inventory sync, and orders pipeline.',
    versionHash: 'a58f4a8b8c2c1e4d8f9a2e6b7c8d9e2f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d',
    features: [
      'Automated P2P purchase contracts',
      'Active inventory synchronization nodes',
      'Merchant reputation ledger registry',
      'Wholesale supply catalog ingestion'
    ],
    pricing: { Pro: '0.05 ETH/mo', Developer: '0.08 ETH/mo', Enterprise: '0.20 ETH/mo' },
    endpoint: import.meta.env.VITE_APP_RESELLER_URL || 'http://localhost:3006'
  },
  'daup-eatery': {
    name: 'DAUP Eatery Hub',
    description: 'DeFi-enabled customer point-of-sale (POS) and inventory tracker.',
    versionHash: '4392a832c25608bfa9dfd827f31be276b10526e85fa9b12e3e5c6a7a8d9b1c2e',
    features: [
      'Smart customer order queuing',
      'DHT POS terminal state synchronization',
      'Decentralized ticketing audits',
      'Food safety provenance certificates'
    ],
    pricing: { Pro: '0.03 ETH/mo', Developer: '0.05 ETH/mo', Enterprise: '0.12 ETH/mo' },
    endpoint: import.meta.env.VITE_APP_EATERY_URL || 'https://eatery.daup.co.za/'
  },
  'daup-manufacturing': {
    name: 'DAUP Manufacturer Portal',
    description: 'Factory floor operations, IoT logs, and assembly telemetry resolver.',
    versionHash: '8995f5cfd720c29f44f6f7eb366d40ee55a8cf72f4e9185a49c952b610c1122a',
    features: [
      'Real-time factory floor IoT feeds',
      'Batch provenance hash validation',
      'Procurement smart agreements',
      'Assembly line schedule dispatch'
    ],
    pricing: { Pro: '0.08 ETH/mo', Developer: '0.12 ETH/mo', Enterprise: '0.35 ETH/mo' },
    endpoint: import.meta.env.VITE_APP_MANUFACTURING_URL || import.meta.env.VITE_APP_MANUFACTURER_URL || 'http://localhost:3008'
  }
};

interface LicenseCheckWrapperProps {
  moduleName: string;
  children: React.ReactNode;
}

export const LicenseCheck: React.FC<LicenseCheckWrapperProps> = ({ moduleName, children }) => {
  const { isConnected, did } = useDIDWallet();
  const { sendRequest } = useMcp();

  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [licenseValid, setLicenseValid] = useState<boolean | null>(null);
  const [licenseData, setLicenseData] = useState<any>(null);
  const [purchasing, setPurchasing] = useState(false);
  const [selectedTier, setSelectedTier] = useState<'Pro' | 'Developer' | 'Enterprise'>('Pro');
  const [duration, setDuration] = useState<number>(30); // days
  const [txHash, setTxHash] = useState<string | null>(null);

  const steps = [
    'Establishing secure IPC tunnel to MCP host...',
    'Generating cryptographic signature envelope...',
    'Querying Subscription Gateway (DaupLicensingRegistry.sol)...',
    'Validating DID licensing tiers and permissions...'
  ];

  const verifyLicense = useCallback(async () => {
    if (!isConnected || !did) {
      setLicenseValid(false);
      return;
    }

    setLoading(true);
    setLoadingStep(0);

    // Dynamic loading sequence for futuristic look
    const stepInterval = setInterval(() => {
      setLoadingStep((prev) => {
        if (prev < steps.length - 1) {
          return prev + 1;
        }
        clearInterval(stepInterval);
        return prev;
      });
    }, 450);

    try {
      const response = await sendRequest('verify_subscription_access', { did, module: moduleName });
      
      // Artificial delay to allow user to appreciate the crypto operations sequence
      await new Promise(resolve => setTimeout(resolve, 2000));

      if (response && response.result) {
        setLicenseValid(response.result.isValid);
        setLicenseData(response.result);
      } else {
        setLicenseValid(false);
      }
    } catch (e) {
      console.error('License check failed:', e);
      setLicenseValid(false);
    } finally {
      clearInterval(stepInterval);
      setLoading(false);
    }
  }, [isConnected, did, moduleName, sendRequest]);

  useEffect(() => {
    verifyLicense();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, did, moduleName]);

  const handlePurchaseLicense = async () => {
    if (!did) return;
    setPurchasing(true);
    setTxHash(null);

    try {
      const response = await sendRequest('register_subscription', {
        did,
        module: moduleName,
        tier: selectedTier,
        durationDays: duration
      });

      if (response && response.result && response.result.status === 'success') {
        setTxHash(response.result.transactionHash);
        // Wait 2s for transaction visualization, then verify again
        setTimeout(() => {
          setTxHash(null);
          verifyLicense();
        }, 2000);
      }
    } catch (e) {
      console.error('Purchase simulation failed:', e);
    } finally {
      setPurchasing(false);
    }
  };

  // 1. Wallet not connected state
  if (!isConnected) {
    return (
      <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', maxWidth: '650px', margin: '40px auto' }}>
        <ShieldAlert size={48} color="var(--neon-amber)" style={{ marginBottom: '15px', animation: 'pulse-glow 2s infinite' }} />
        <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#fff', marginBottom: '10px' }}>DID CONNECTION REQUIRED</h2>
        <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '25px', lineHeight: '1.6' }}>
          This vertical ecosystem application uses cryptographic credentials and requires an active node Decentralized Identifier (DID) to verify license validity.
        </p>
        <div style={{ padding: '12px', background: 'rgba(245, 158, 11, 0.05)', border: '1px solid rgba(245, 158, 11, 0.15)', borderRadius: '8px', fontSize: '12px', color: 'var(--neon-amber)', fontFamily: 'var(--font-mono)' }}>
          Please input a wallet seed string and connect your DID Wallet in the header.
        </div>
      </div>
    );
  }

  // 2. Loading state
  if (loading) {
    return (
      <div className="glass-panel" style={{ padding: '50px 30px', textAlign: 'center', maxWidth: '500px', margin: '60px auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
        <div style={{ position: 'relative', width: '80px', height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Loader2 size={64} color="var(--neon-cyan)" style={{ animation: 'spin 2s linear infinite' }} />
          <Shield size={24} color="var(--neon-purple)" style={{ position: 'absolute', animation: 'pulse-glow 1.5s infinite' }} />
        </div>
        
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: '#fff', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Authorizing Workspace
          </h3>
          <p style={{ fontSize: '11px', color: 'var(--neon-cyan)', fontFamily: 'var(--font-mono)', marginTop: '4px' }}>
            JSON-RPC: verify_subscription_access
          </p>
        </div>

        {/* Console step progress */}
        <div style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-glass)', borderRadius: '6px', padding: '12px', textAlign: 'left', fontFamily: 'var(--font-mono)', fontSize: '11px' }}>
          {steps.map((step, idx) => (
            <div key={idx} style={{ 
              color: idx < loadingStep ? 'var(--neon-green)' : idx === loadingStep ? 'var(--neon-cyan)' : 'var(--text-dark)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '6px'
            }}>
              <span>{idx < loadingStep ? '✔' : idx === loadingStep ? '❯' : '○'}</span>
              <span>{step}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 3. Unauthorized / Paywall state
  if (licenseValid === false) {
    const meta = MODULE_METADATA[moduleName] || {
      name: moduleName,
      description: 'Ecosystem workspace application.',
      versionHash: 'unknown',
      features: ['Access portal operations'],
      pricing: { Pro: '0.05 ETH', Developer: '0.08 ETH', Enterprise: '0.20 ETH' }
    };

    return (
      <div className="glass-panel" style={{ padding: '30px', maxWidth: '750px', margin: '30px auto', display: 'flex', flexDirection: 'column', gap: '25px' }}>
        {/* Header Block */}
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-glass)', paddingBottom: '18px', gap: '15px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <div style={{ background: 'rgba(244, 63, 94, 0.1)', padding: '12px', borderRadius: '10px' }}>
              <ShieldAlert size={28} color="var(--neon-red)" />
            </div>
            <div>
              <span className="badge red" style={{ marginBottom: '4px' }}>License Blocked</span>
              <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#fff' }}>{meta.name}</h2>
              <span style={{ fontSize: '10px', color: 'var(--text-dark)', fontFamily: 'var(--font-mono)' }}>
                VER.HASH: {meta.versionHash}
              </span>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>License Tier Status</span>
            <div style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--neon-red)' }}>INVALID OR EXPIRED</div>
          </div>
        </div>

        <div className="grid-container two-col" style={{ gap: '25px' }}>
          {/* Left: Features checklist */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <h4 style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Module Features Locked:
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {meta.features.map((feature, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '13px', lineHeight: '1.4' }}>
                  <span style={{ color: 'var(--neon-red)', fontWeight: 'bold', flexShrink: 0 }}>🞩</span>
                  <span style={{ color: 'var(--text-primary)' }}>{feature}</span>
                </div>
              ))}
            </div>
            <p style={{ fontSize: '11px', color: 'var(--text-dark)', fontStyle: 'italic', marginTop: '10px' }}>
              Verify status via MCP governance tool or by renewing the license via the decentralized contract registry directly.
            </p>
          </div>

          {/* Right: Payment configuration panel */}
          <div className="glass-panel" style={{ padding: '20px', background: 'rgba(255,255,255,0.01)', borderColor: 'rgba(244,63,94,0.15)', display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-muted)' }}>
              RENEW / UPGRADE SUBSCRIPTION
            </div>
            
            {/* Tier Select */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>SELECT LICENSE TIER</label>
              <select 
                className="glass-select" 
                value={selectedTier} 
                onChange={(e) => setSelectedTier(e.target.value as any)}
                style={{ width: '100%' }}
              >
                <option value="Pro">Pro Tier ({meta.pricing.Pro})</option>
                <option value="Developer">Developer Tier ({meta.pricing.Developer})</option>
                <option value="Enterprise">Enterprise Tier ({meta.pricing.Enterprise})</option>
              </select>
            </div>

            {/* Duration Select */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>LEASE DURATION</label>
              <select 
                className="glass-select" 
                value={duration} 
                onChange={(e) => setDuration(Number(e.target.value))}
                style={{ width: '100%' }}
              >
                <option value="30">30 Days</option>
                <option value="90">90 Days (Save 10%)</option>
                <option value="365">1 Year (Save 20%)</option>
              </select>
            </div>

            {/* Renew action button */}
            <button 
              className="glass-button red" 
              onClick={handlePurchaseLicense}
              disabled={purchasing || !!txHash}
              style={{ width: '100%', justifyContent: 'center', marginTop: '10px' }}
            >
              {purchasing ? (
                <>
                  <Loader2 size={14} style={{ animation: 'spin 1.5s linear infinite' }} />
                  Broadcasting Tx...
                </>
              ) : txHash ? (
                <>
                  <CheckCircle size={14} />
                  Registry Confirmed
                </>
              ) : (
                <>
                  <CreditCard size={14} />
                  Purchase License
                </>
              )}
            </button>

            {txHash && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '8px', padding: '10px', background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '6px' }}>
                <span style={{ fontSize: '10px', color: 'var(--neon-green)', fontWeight: 'bold' }}>TX SUCCESSFUL:</span>
                <span style={{ fontSize: '9px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {txHash}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 4. Valid state - Mount app workspace
  return <>{children}</>;
};

// HOC Function Decorator
export function withLicenseCheck<P extends object>(
  Component: React.ComponentType<P>,
  moduleName: string
): React.FC<P> {
  const WrappedComponent: React.FC<P> = (props) => {
    return (
      <LicenseCheck moduleName={moduleName}>
        <Component {...props} />
      </LicenseCheck>
    );
  };
  
  WrappedComponent.displayName = `withLicenseCheck(${Component.displayName || Component.name || 'Component'})`;
  return WrappedComponent;
}

export default withLicenseCheck;
