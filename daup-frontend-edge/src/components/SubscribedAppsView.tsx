import React from 'react';
import { Wheat, Store, Factory } from 'lucide-react';
import { useUserProfile } from '../context/UserProfileContext';
import { COMING_KICKER, YOUR_APPS_KICKER } from '../hub/copy';
import { COMING_APPS, listOwnerPlaces } from '../hub/places';
import { navigateToTheHouse } from '../hub/ownerArrival';

const DOCS_SHIFT = 'https://www.daup.co.za/docs/eatery/tuesday-lunch';

export const SubscribedAppsView: React.FC = () => {
  const { activeWallet, instanceName, ownerSession } = useUserProfile();
  const houseName = activeWallet?.legalName || instanceName || 'the house';
  const email = ownerSession?.email || '';
  const places = listOwnerPlaces({ email, placeName: houseName });
  const eatery = places[0];

  const openTheHouse = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    navigateToTheHouse({ email, house: houseName });
  };

  return (
    <div className="apps-grid" data-testid="hub-home">
      <div className="section-head live-kicker">
        <span className="kicker">{YOUR_APPS_KICKER}</span>
        <span className="rule" />
      </div>

      <article className="card" data-testid="eatery-place-row">
        <div className="card-top">
          <span className="ico-sq" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 11h18" />
              <path d="M5 11V7a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v4" />
              <path d="M5 11v8h4v-4h6v4h4v-8" />
            </svg>
          </span>
          <div>
            <h3 data-testid="eatery-place-name">
              {eatery.title} <span className="live">LIVE</span>
            </h3>
            <p>{eatery.body}</p>
          </div>
        </div>
        <div className="place-row-action">
          <a
            className="btn btn-primary btn-wide"
            href={eatery.href}
            data-testid="open-the-house"
            onClick={openTheHouse}
          >
            {eatery.actionLabel}
          </a>
        </div>
        <div className="card-links">
          <a href={DOCS_SHIFT}>Walk me through it ›</a>
        </div>
      </article>

      <aside className="coming" aria-label="Coming soon">
        <div className="coming-head">
          <span className="kicker">{COMING_KICKER}</span>
          <span className="rule" />
        </div>
        <div className="chips">
          <div className="chip"><Wheat size={16} /> {COMING_APPS[0].title}</div>
          <div className="chip"><Store size={16} /> {COMING_APPS[1].title}</div>
          <div className="chip"><Factory size={16} /> {COMING_APPS[2].title}</div>
        </div>
        <p className="caption">Same chain. Not live yet.</p>
      </aside>
    </div>
  );
};

export default SubscribedAppsView;
