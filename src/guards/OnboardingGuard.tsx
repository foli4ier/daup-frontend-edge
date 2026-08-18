import React from 'react';
import { Shield, Loader2, Sparkles, Globe } from 'lucide-react';
import { useUserProfile } from '../context/UserProfileContext';
import { OnboardingWizard } from '../components/OnboardingWizard';

interface OnboardingGuardProps {
  children: React.ReactNode;
}

export const OnboardingGuard: React.FC<OnboardingGuardProps> = ({ children }) => {
  const { isHydrating, hasCompletedOnboarding, activeWallet } = useUserProfile();

  // 1. Vault Rehydration Loading Splash
  if (isHydrating) {
    return (
      <div 
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'radial-gradient(ellipse at top, rgba(6, 182, 212, 0.1) 0%, rgba(3, 7, 18, 0.95) 70%)',
          padding: '20px'
        }}
      >
        <div 
          className="glass-panel"
          style={{
            padding: '36px 40px',
            maxWidth: '440px',
            width: '100%',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '20px',
            borderColor: 'rgba(6, 182, 212, 0.3)',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.7), 0 0 30px rgba(6, 182, 212, 0.15)',
            borderRadius: '16px',
            animation: 'pulse-glow 3s infinite ease-in-out'
          }}
        >
          <div style={{ position: 'relative' }}>
            <div 
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.2), rgba(139, 92, 246, 0.2))',
                border: '1px solid rgba(6, 182, 212, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 20px rgba(6, 182, 212, 0.3)'
              }}
            >
              <Globe size={32} color="var(--neon-cyan)" />
            </div>
            <div 
              style={{
                position: 'absolute',
                bottom: '-4px',
                right: '-4px',
                background: 'rgba(10, 16, 33, 0.9)',
                borderRadius: '50%',
                padding: '4px',
                border: '1px solid rgba(6, 182, 212, 0.3)'
              }}
            >
              <Loader2 size={16} color="var(--neon-cyan)" style={{ animation: 'spin 1.2s linear infinite' }} />
            </div>
          </div>

          <div>
            <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#fff', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              DAUP <span style={{ color: 'var(--neon-cyan)' }}>Edge Hub</span>
            </h2>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px', lineHeight: '1.5' }}>
              Hydrating decentralized operator identity vault & secure MCP node runtime...
            </p>
          </div>

          <div 
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 14px',
              borderRadius: '20px',
              background: 'rgba(6, 182, 212, 0.08)',
              border: '1px solid rgba(6, 182, 212, 0.2)',
              fontSize: '11px',
              fontFamily: 'var(--font-mono)',
              color: 'var(--neon-cyan)'
            }}
          >
            <Shield size={12} />
            <span>Verifying Asymmetric Keys & Vault State</span>
          </div>
        </div>
      </div>
    );
  }

  // 2. First-time Visitor Onboarding Wizard
  // Triggers ONLY if onboarding is not completed OR no active wallet exists
  if (!hasCompletedOnboarding || !activeWallet) {
    return <OnboardingWizard />;
  }

  // 3. Authenticated & Hydrated Dashboard Content
  return <>{children}</>;
};

export default OnboardingGuard;
