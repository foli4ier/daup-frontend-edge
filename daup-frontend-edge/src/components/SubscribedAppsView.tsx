import React from 'react';
import { Wheat, Store, Factory } from 'lucide-react';
import { useUserProfile } from '../context/UserProfileContext';
import {
  COMING_KICKER,
  OTHER_APPS_KICKER,
  SAME_CHAIN_CAPTION,
  YOUR_APPS_KICKER
} from '../hub/copy';
import { COMING_APPS, listOwnerPlaces } from '../hub/places';
import { navigateToTheHouse } from '../hub/ownerArrival';

const DOCS_SHIFT = 'https://www.daup.co.za/docs/eatery/tuesday-lunch';

const COMING_ICONS = {
  farm: Wheat,
  reseller: Store,
  maker: Factory
} as const;

export const SubscribedAppsView: React.FC = () => {
  const { activeWallet, instanceName, ownerSession } = useUserProfile();
  const houseName = activeWallet?.legalName || instanceName || 'the house';
  const email = ownerSession?.email || '';
  const places = listOwnerPlaces({ email, placeName: houseName });
  const eatery = places[0];

  const openTheHouse = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    if (!email.trim() || !houseName.trim()) return;
    navigateToTheHouse({ email, house: houseName });
  };

  return (
    <div className="apps-home" data-testid="hub-home">
      <div className="section-head">
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
            href={eatery.href || undefined}
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

      <div className="section-head">
        <span className="kicker">{OTHER_APPS_KICKER}</span>
        <span className="rule" />
      </div>

      <div className="other-apps" data-testid="other-apps">
        {COMING_APPS.map((app) => {
          const Icon = COMING_ICONS[app.id as keyof typeof COMING_ICONS];
          return (
            <article
              className="card coming-card"
              key={app.id}
              data-testid={`coming-app-${app.id}`}
            >
              <div className="card-top">
                <span className="ico-sq" aria-hidden="true">
                  {Icon ? <Icon size={22} /> : null}
                </span>
                <div>
                  <h3>
                    {app.title} <span className="coming-flag">{COMING_KICKER}</span>
                  </h3>
                </div>
              </div>
            </article>
          );
        })}
      </div>
      <p className="caption" data-testid="same-chain-caption">{SAME_CHAIN_CAPTION}</p>
    </div>
  );
};

export default SubscribedAppsView;
