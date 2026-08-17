import React from 'react';
import { Sparkles, Clock, ShieldCheck, ShieldAlert, ArrowRight, UserCheck, CreditCard } from 'lucide-react';
import { useUserProfile } from '../context/UserProfileContext';

export const SubscriptionBanner: React.FC = () => {
  const { trialState, trialDaysRemaining, isOnboarded, startFreeTrial, setIsProfileModalOpen, instanceName } = useUserProfile();

  if (!isOnboarded) {
    return (
      <div 
        className="glass-panel" 
        style={{ 
          padding: '14px 20px', 
          background: 'linear-gradient(90deg, rgba(245, 158, 11, 0.1) 0%, rgba(13, 20, 38, 0.7) 100%)',
          borderColor: 'rgba(245, 158, 11, 0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '15px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ background: 'rgba(245, 158, 11, 0.15)', padding: '8px', borderRadius: '8px' }}>
            <ShieldAlert size={20} color="var(--neon-amber)" />
          </div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>Registration Prerequisite Required</span>
              <span className="badge amber" style={{ fontSize: '9px', padding: '1px 6px' }}>Gated</span>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              Complete identity profile and settlement wallet registration to unlock full module trials and license subscriptions.
            </div>
          </div>
        </div>

        <button 
          className="glass-button" 
          onClick={() => setIsProfileModalOpen(true)}
          style={{ padding: '6px 14px', fontSize: '12px', borderColor: 'var(--neon-amber)', color: '#fbbf24' }}
        >
          <UserCheck size={14} /> Complete Registration
        </button>
      </div>
    );
  }

  if (trialState.isTrialActive) {
    return (
      <div 
        className="glass-panel" 
        style={{ 
          padding: '14px 20px', 
          background: 'linear-gradient(90deg, rgba(6, 182, 212, 0.08) 0%, rgba(139, 92, 246, 0.08) 50%, rgba(13, 20, 38, 0.7) 100%)',
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
            <Sparkles size={20} color="var(--neon-cyan)" style={{ animation: 'pulse-glow 3s infinite ease-in-out' }} />
          </div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>30-Day Free Trial Active</span>
              <span className="badge cyan" style={{ fontSize: '9px', padding: '1px 6px' }}>Full Pro Access</span>
              <span style={{ fontSize: '11px', color: 'var(--neon-purple)', fontWeight: 'normal', fontFamily: 'var(--font-mono)' }}>
                [{instanceName}]
              </span>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
              <Clock size={12} color="var(--neon-cyan)" />
              <span>
                <strong>{trialDaysRemaining} day{trialDaysRemaining === 1 ? '' : 's'} remaining</strong> in your all-inclusive trial. All 4 ecosystem modules are unlocked.
              </span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button 
            className="glass-button purple" 
            onClick={() => setIsProfileModalOpen(true)}
            style={{ padding: '6px 14px', fontSize: '12px' }}
          >
            <CreditCard size={14} /> Subscription Options <ArrowRight size={12} />
          </button>
        </div>
      </div>
    );
  }

  // Not started or expired
  return (
    <div 
      className="glass-panel" 
      style={{ 
        padding: '14px 20px', 
        background: 'linear-gradient(90deg, rgba(16, 185, 129, 0.08) 0%, rgba(13, 20, 38, 0.7) 100%)',
        borderColor: 'rgba(16, 185, 129, 0.25)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '15px'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ background: 'rgba(16, 185, 129, 0.15)', padding: '8px', borderRadius: '8px' }}>
          <ShieldCheck size={20} color="var(--neon-green)" />
        </div>
        <div>
          <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>Ready to Unlock DAUP Edge Ecosystem</span>
            <span className="badge green" style={{ fontSize: '9px', padding: '1px 6px' }}>30-Day Free Trial</span>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            Start your free 30-day trial with full access to Farmer, Reseller, Eatery, and Manufacturing suites.
          </div>
        </div>
      </div>

      <button 
        className="glass-button" 
        onClick={() => startFreeTrial(30)}
        style={{ padding: '6px 16px', fontSize: '12px', background: 'rgba(16, 185, 129, 0.15)', borderColor: 'var(--neon-green)', color: '#34d399' }}
      >
        <Sparkles size={14} /> Activate 30-Day Trial
      </button>
    </div>
  );
};

export const PaywallGuard: React.FC<{ children: React.ReactNode; fallback?: React.ReactNode }> = ({ children, fallback }) => {
  const { isOnboarded, setIsProfileModalOpen } = useUserProfile();

  if (!isOnboarded) {
    if (fallback) return <>{fallback}</>;
    return (
      <div className="glass-panel" style={{ padding: '30px', textAlign: 'center', maxWidth: '550px', margin: '30px auto' }}>
        <ShieldAlert size={40} color="var(--neon-amber)" style={{ marginBottom: '12px' }} />
        <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#fff', marginBottom: '8px' }}>Profile Registration Required</h3>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px', lineHeight: '1.5' }}>
          To activate trials and manage subscriptions, your identity profile and primary payout wallet must be configured.
        </p>
        <button 
          className="glass-button cyan" 
          onClick={() => setIsProfileModalOpen(true)}
          style={{ padding: '10px 20px', fontSize: '13px' }}
        >
          <UserCheck size={16} /> Open Registration Wizard
        </button>
      </div>
    );
  }

  return <>{children}</>;
};

export default SubscriptionBanner;
