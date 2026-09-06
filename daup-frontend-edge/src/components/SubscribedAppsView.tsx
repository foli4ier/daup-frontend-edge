import React, { useState } from 'react';
import { useUserProfile } from '../context/UserProfileContext';
import {
  ASK_FOR_ENHANCEMENT_LABEL,
  DELETE_THE_HOUSE_LABEL,
  REGISTER_A_NEW_HOUSE_LABEL,
  YOUR_PLACES_EMPTY,
  YOUR_PLACES_KICKER,
  YOUR_PLACES_UNREACHABLE
} from '../hub/copy';
import { ASKS_PATH } from '../hub/asksPath';
import { ShopApp, listOwnerPlaces } from '../hub/places';
import { listPlacesOnTheChain } from '../hub/placeDirectory';
import { navigateToEatOutHome } from '../hub/eatoutUrls';
import { navigateToTheHouse } from '../hub/ownerArrival';
import { DeleteHouseModal } from './DeleteHouseModal';
import { GetAppsSection } from './GetApps';
import { OnTheChainSection } from './OnTheChain';

const DOCS_SHIFT = 'https://www.daup.co.za/docs/eatery/tuesday-lunch';

export const SubscribedAppsView: React.FC<{
  onOpenAsk?: () => void;
  installedApps?: Record<string, boolean>;
  onSubscribeApp?: (moduleKey: string) => void;
  onLaunchApp?: (moduleKey: string) => void;
}> = ({
  onOpenAsk,
  installedApps = {},
  onSubscribeApp,
  onLaunchApp
}) => {
  const {
    activeWallet,
    hasHouse,
    ownerSession,
    beginNamingPlace,
    clearHouse,
    placesRestoreFailed
  } = useUserProfile();
  const houseName = (activeWallet?.legalName || '').trim();
  const email = ownerSession?.email || '';
  const places = listOwnerPlaces({ email, placeName: houseName });
  const eatery = places[0];
  const chainPlaces = listPlacesOnTheChain();
  const [deleteOpen, setDeleteOpen] = useState(false);

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
    <div className="apps-home" data-testid="hub-home">
      <div className="section-head">
        <span className="kicker">{YOUR_PLACES_KICKER}</span>
        <span className="rule" />
      </div>

      <article
        className={hasHouse ? 'card' : 'card places-empty'}
        data-testid={hasHouse ? 'eatery-place-row' : 'your-places-empty'}
      >
        {hasHouse ? (
          <>
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
          </>
        ) : (
          <p className="caption" data-testid="your-places-empty-copy">{YOUR_PLACES_EMPTY}</p>
          {placesRestoreFailed ? (
            <p className="caption" data-testid="your-places-unreachable">{YOUR_PLACES_UNREACHABLE}</p>
          ) : null}
        )}
        <div className="place-row-controls">
          {hasHouse ? (
            <button
              type="button"
              className="owner-quiet"
              data-testid="delete-the-house"
              onClick={() => setDeleteOpen(true)}
            >
              {DELETE_THE_HOUSE_LABEL}
            </button>
          ) : null}
          <button
            type="button"
            className="owner-quiet"
            data-testid="register-new-house"
            onClick={beginNamingPlace}
          >
            {REGISTER_A_NEW_HOUSE_LABEL}
          </button>
          <a
            className="owner-quiet"
            href={ASKS_PATH}
            data-testid="ask-for-enhancement"
            onClick={(event) => {
              event.preventDefault();
              onOpenAsk?.();
            }}
          >
            {ASK_FOR_ENHANCEMENT_LABEL}
          </a>
        </div>
        {hasHouse ? (
          <div className="card-links">
            <a href={DOCS_SHIFT}>Walk me through it ›</a>
          </div>
        ) : null}
      </article>

      <DeleteHouseModal
        isOpen={deleteOpen}
        houseName={eatery.title}
        onClose={() => setDeleteOpen(false)}
        onConfirm={() => {
          setDeleteOpen(false);
          clearHouse();
        }}
      />

      <GetAppsSection
        hasHouse={hasHouse}
        installedApps={installedApps}
        onGet={handleGet}
        onOpen={handleOpen}
      />

      <OnTheChainSection places={chainPlaces} />
    </div>
  );
};

export default SubscribedAppsView;
