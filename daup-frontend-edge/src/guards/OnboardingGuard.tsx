import React from 'react';
import { Loader2 } from 'lucide-react';
import { useUserProfile } from '../context/UserProfileContext';
import { OnboardingWizard } from '../components/OnboardingWizard';
import { HubEmailDoor } from '../components/HubEmailDoor';
import { resolveHubSurface } from '../hub/ownerSession';

interface OnboardingGuardProps {
  children: React.ReactNode;
}

export const OnboardingGuard: React.FC<OnboardingGuardProps> = ({ children }) => {
  const { isHydrating, hasHouse, ownerSession, openHubWithEmail } = useUserProfile();

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

  const surface = resolveHubSurface({ session: ownerSession, hasHouse });

  if (surface === 'email-door') {
    return <HubEmailDoor onOpenHub={openHubWithEmail} />;
  }

  if (surface === 'wizard') {
    return <OnboardingWizard />;
  }

  return <>{children}</>;
};

export default OnboardingGuard;
