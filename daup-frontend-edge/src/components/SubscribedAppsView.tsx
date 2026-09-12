import React from 'react';
import { useUserProfile } from '../context/UserProfileContext';
import {
  OPEN_LABEL,
  PLUS_REGISTER_LABEL,
  YOUR_PLACES_EMPTY,
  YOUR_PLACES_KICKER
} from '../hub/copy';
import type { HubPane } from '../hub/hubPane';
import { ShopApp, listOwnerPlaces } from '../hub/places';
import { listPlacesOnTheChain } from '../hub/placeDirectory';
import { navigateToEatOutHome } from '../hub/eatoutUrls';
import { navigateToTheHouse } from '../hub/ownerArrival';
import { GetAppsSection } from './GetApps';
import { OnTheChainSection } from './OnTheChain';

export const SubscribedAppsView: React.FC<{
  pane?: Exclude<HubPane, 'you'>;
  onOpenAsk?: () => void;
  installedApps?: Record<string, boolean>;
  onSubscribeApp?: (moduleKey: string) => void;
  onLaunchApp?: (moduleKey: string) => void;
}> = ({
  pane = 'home',
  installedApps = {},
  onSubscribeApp,
  onLaunchApp
}) => {
  const {
    activeWallet,
    hasHouse,
    ownerSession,
    beginNamingPlace,
    profile
  } = useUserProfile();
  const houseName = (activeWallet?.legalName || '').trim();
  const email = ownerSession?.email || '';
  const city = (profile.location?.city || '').trim();
  const places = listOwnerPlaces({ email, placeName: houseName, city });
  const eatery = places[0];
  const chainPlaces = listPlacesOnTheChain();
  const showPlaces = pane === 'home' || pane === 'places';
  const showApps = pane === 'home' || pane === 'apps';
  const showChain = pane === 'home';

  const openTheHouse = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    if (!email.trim() || !houseName.trim()) return;
    navigateToTheHouse({ email, house: houseName });
  };

  const handleGet = (app: ShopApp) => {
    if (app.live && app.id === 'eatery') {
      if (!email.trim() || !houseName.trim()) return;
      navigateToTheHouse({ email, house: houseName });
      return;
    }
    if (app.live && app.id === 'eatout' && app.moduleKey) {
      if (!installedApps[app.moduleKey]) onSubscribeApp?.(app.moduleKey);
      return;
    }
    if (app.live && app.moduleKey) {
      if (!installedApps[app.moduleKey]) onSubscribeApp?.(app.moduleKey);
      else onLaunchApp?.(app.moduleKey);
    }
  };

  const handleOpen = (app: ShopApp) => {
    if (app.id === 'eatery') {
      if (!email.trim() || !houseName.trim()) return;
      navigateToTheHouse({ email, house: houseName });
      return;
    }
    if (app.id === 'eatout') {
      navigateToEatOutHome();
      return;
    }
    if (app.moduleKey) onLaunchApp?.(app.moduleKey);
  };

  return (
    <div className="apps-home" data-testid="hub-home" data-pane={pane}>
      {pane === 'home' ? (
        <div className="hub-home-cta" data-testid="hub-home-cta">
          {hasHouse ? (
            <a
              className="btn btn-primary btn-wide"
              href={eatery.href || undefined}
              data-testid="hub-home-open"
              onClick={openTheHouse}
            >
              {OPEN_LABEL}
            </a>
          ) : (
            <button
              type="button"
              className="btn btn-primary btn-wide"
              data-testid="register-new-house"
              onClick={beginNamingPlace}
            >
              {PLUS_REGISTER_LABEL}
            </button>
          )}
        </div>
      ) : null}

      {showPlaces ? (
        <>
          <div className="section-head">
            <span className="kicker">{YOUR_PLACES_KICKER}</span>
            <span className="rule" />
          </div>

          {hasHouse ? (
            <article className="place-card" data-testid="eatery-place-row">
              <div className="place-card-copy">
                <h3 data-testid="eatery-place-name">{eatery.title}</h3>
                {eatery.city ? (
                  <p data-testid="eatery-place-city">{eatery.city}</p>
                ) : null}
              </div>
              <span className="live" data-testid="eatery-place-status">{eatery.status}</span>
              <a
                className="btn btn-primary"
                href={eatery.href || undefined}
                data-testid="open-the-house"
                onClick={openTheHouse}
              >
                {eatery.actionLabel}
              </a>
            </article>
          ) : (
            <article className="place-card places-empty" data-testid="your-places-empty">
              <p className="caption" data-testid="your-places-empty-copy">{YOUR_PLACES_EMPTY}</p>
              {pane === 'places' ? (
                <button
                  type="button"
                  className="btn btn-primary"
                  data-testid="register-new-house"
                  onClick={beginNamingPlace}
                >
                  {PLUS_REGISTER_LABEL}
                </button>
              ) : (
                <button
                  type="button"
                  className="btn btn-primary"
                  data-testid="register-new-house-empty"
                  onClick={beginNamingPlace}
                >
                  {PLUS_REGISTER_LABEL}
                </button>
              )}
            </article>
          )}
        </>
      ) : null}

      {showApps ? (
        <GetAppsSection
          hasHouse={hasHouse}
          installedApps={installedApps}
          onGet={handleGet}
          onOpen={handleOpen}
        />
      ) : null}

      {showChain ? <OnTheChainSection places={chainPlaces} /> : null}
    </div>
  );
};

export default SubscribedAppsView;
