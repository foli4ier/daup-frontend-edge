import React from 'react';
import { Wheat, Store, Factory } from 'lucide-react';
import { useUserProfile } from '../context/UserProfileContext';

const EATERY = 'https://eatery.daup.co.za/';
const DOCS_SHIFT = 'https://www.daup.co.za/docs/eatery/tuesday-lunch';
const DOCS_SETUP = 'https://www.daup.co.za/docs/hub/set-up-eatery';

function staffInviteHref(houseName: string) {
  const text = `You're on tonight's floor at ${houseName}. Open the eatery: ${EATERY}`;
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

interface SubscribedAppsViewProps {
  installedApps: Record<string, boolean>;
  subsData: Record<string, any>;
  currentTime: number;
  onLaunchApp: (moduleName: string) => void;
  onGoToMarketplace: () => void;
  onDeleteInstance?: (moduleKey: string, instanceName: string) => Promise<void> | void;
}

export const SubscribedAppsView: React.FC<SubscribedAppsViewProps> = () => {
  const { activeWallet, instanceName } = useUserProfile();
  const houseName = activeWallet?.legalName || instanceName || 'the house';
  const inviteHref = staffInviteHref(houseName);

  return (
    <div className="apps-grid">
      <div className="section-head live-kicker">
        <span className="kicker">Live now</span>
        <span className="rule" />
      </div>

      <article className="card">
        <div className="card-top">
          <span className="ico-sq" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 11h18" />
              <path d="M5 11V7a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v4" />
              <path d="M5 11v8h4v-4h6v4h4v-8" />
            </svg>
          </span>
          <div>
            <h3>
              Eatery <span className="live">LIVE</span>
            </h3>
            <p>Tables, tickets, kitchen, stock.</p>
          </div>
        </div>
        <div className="card-links">
          <a href={EATERY}>Open eatery ›</a>
          <a href={DOCS_SHIFT}>Walk me through it ›</a>
        </div>
      </article>

      <article className="card">
        <div className="card-top">
          <span className="ico-sq" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 10.5 12 3l9 7.5" />
              <path d="M5 10v10h14V10" />
              <path d="M9 20v-6h6v6" />
            </svg>
          </span>
          <div>
            <h3>
              Your hub <span className="live">LIVE</span>
            </h3>
            <p>Where the owner sets up the business and invites staff.</p>
          </div>
        </div>
        <div className="card-links">
          <a href={inviteHref} target="_blank" rel="noreferrer">Invite tonight’s floor ›</a>
          <a href={DOCS_SETUP}>Walk me through it ›</a>
        </div>
      </article>

      <aside className="coming" aria-label="Coming soon">
        <div className="coming-head">
          <span className="kicker">Coming</span>
          <span className="rule" />
        </div>
        <div className="chips">
          <div className="chip"><Wheat size={16} /> Farm</div>
          <div className="chip"><Store size={16} /> Reseller</div>
          <div className="chip"><Factory size={16} /> Maker</div>
        </div>
        <p className="caption">Same chain. Not live yet.</p>
      </aside>
    </div>
  );
};

export default SubscribedAppsView;
