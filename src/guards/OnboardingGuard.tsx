import React from 'react';
import { Loader2 } from 'lucide-react';
import { useUserProfile } from '../context/UserProfileContext';
import { OnboardingWizard } from '../components/OnboardingWizard';

interface OnboardingGuardProps {
  children: React.ReactNode;
}

export const OnboardingGuard: React.FC<OnboardingGuardProps> = ({ children }) => {
  const { isHydrating, hasCompletedOnboarding, activeWallet } = useUserProfile();

  if (isHydrating) {
    return (
      <div className="owner-hydrate">
        <div className="card">
          <div className="logo">DAUP</div>
          <h1 className="serif" style={{ fontSize: '1.6rem', margin: 0 }}>Opening your hub</h1>
          <p className="caption">Set up the house, invite the floor.</p>
          <Loader2 size={22} className="spin" />
        </div>
      </div>
    );
  }

  if (!hasCompletedOnboarding || !activeWallet) {
    return <OnboardingWizard />;
  }

  return <>{children}</>;
};

export default OnboardingGuard;
