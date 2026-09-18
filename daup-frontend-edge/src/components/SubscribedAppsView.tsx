import React, { useState } from 'react';
import { useUserProfile } from '../context/UserProfileContext';
import {
  HOSTED_SEED_SUMMARY,
  OPEN_LABEL,
  PLUS_REGISTER_LABEL,
  YOUR_PLACES_EMPTY,
  YOUR_PLACES_KICKER
} from '../hub/copy';
import { loadPlaceEntitlement } from '../hub/entitlements';
import { DEFAULT_HUB_PANE, type HubPane } from '../hub/hubPane';
import { ShopApp, listOwnerPlaces, ownerPlaceKey } from '../hub/places';
import { placeSubscriptionDisplay } from '../hub/placeSubscription';
import { loadSeednodeForPlace } from '../hub/seednode';
import { navigateToEatOutHome } from '../hub/eatoutUrls';
import { navigateToTheHouse } from '../hub/ownerArrival';
import { navigateToProjectHome, projectOpenHandshakeFromHub } from '../hub/projectUrls';
import { listOwnerPlaceRecords, listRegisteredPlaces } from '../stores/identityStore';
import { GetAppsSection } from './GetApps';
import { OtherPlacesView } from './OtherPlaces';
import { PlaceDetailView } from './PlaceDetailView';

export const SubscribedAppsView: React.FC<{
  pane?: Exclude<HubPane, 'you'>;
  onOpenAsk?: () => void;
  installedApps?: Record<string, boolean>;
  onSubscribeApp?: (moduleKey: string) => void;
  onLaunchApp?: (moduleKey: string) => void;
  openPlaceKey?: string | null;
  onOpenPlace?: (placeKey: string) => void;
  onClosePlace?: () => void;
}> = ({
  pane = DEFAULT_HUB_PANE,
  installedApps = {},
  onSubscribeApp,
  onLaunchApp,
  openPlaceKey = null,
  onOpenPlace,
  onClosePlace
}) => {
  const [localOpenKey, setLocalOpenKey] = useState<string | null>(null);
  const resolvedOpenKey = onOpenPlace ? openPlaceKey : localOpenKey;
  const openPlace = onOpenPlace || setLocalOpenKey;
  const closePlace = onClosePlace || (() => setLocalOpenKey(null));
  const {
    activeWallet,
    hasHouse,
    ownerSession,
    beginNamingPlace,
    profile,
    enabledApps,
    enableApp,
    enableAppsOnPlace,
    companyId,
    trialState,
    vault
  } = useUserProfile();
  const houseName = (activeWallet?.legalName || '').trim();
  const email = ownerSession?.email || '';
  const city = (profile.location?.city || '').trim();
  const ownerRecords = listOwnerPlaceRecords({
    email,
    fallback: houseName
      ? {
          placeName: houseName,
          city,
          country: profile.location?.country,
          region: profile.location?.provinceState,
          companyId: companyId || undefined,
          enabledApps,
          ownerEmail: email
        }
      : undefined
  });
  const places = listOwnerPlaces({
    email,
    placeName: houseName,
    city,
    records: ownerRecords
  });
  const showPlaces = pane === 'places';
  const showApps = pane === 'apps';
  const showOther = pane === 'other';
  const openRecord = resolvedOpenKey
    ? ownerRecords.find(record => ownerPlaceKey(record) === resolvedOpenKey) || null
    : null;

  const handshakeFor = (placeName: string, placeIds: string[]) => projectOpenHandshakeFromHub({
    email,
    house: placeName,
    placeIds
  });

  const openHandshake = handshakeFor(
    houseName,
    listRegisteredPlaces()
      .map(place => (place.placeId || '').trim())
      .filter(Boolean)
  );

  const handleGet = (app: ShopApp) => {
    if (app.live && app.id !== 'eatout' && hasHouse && !enabledApps.includes(app.id)) {
      enableApp(app.id);
      if (app.moduleKey && !installedApps[app.moduleKey]) onSubscribeApp?.(app.moduleKey);
      return;
    }
    if (app.live && app.id === 'eatery') {
      if (!email.trim() || !houseName.trim()) return;
      navigateToTheHouse({ email, house: houseName });
      return;
    }
    if (app.live && (app.id === 'eatout' || app.id === 'project') && app.moduleKey) {
      if (!installedApps[app.moduleKey]) onSubscribeApp?.(app.moduleKey);
      return;
    }
    if (app.live && app.moduleKey) {
      if (!installedApps[app.moduleKey]) onSubscribeApp?.(app.moduleKey);
      else onLaunchApp?.(app.moduleKey);
    }
  };

  const handleOpen = (app: ShopApp, house = houseName, placeIds?: string[]) => {
    if (app.id === 'eatery') {
      if (!email.trim() || !house.trim()) return;
      navigateToTheHouse({ email, house });
      return;
    }
    if (app.id === 'eatout') {
      navigateToEatOutHome();
      return;
    }
    if (app.id === 'project') {
      navigateToProjectHome(handshakeFor(house, placeIds || []));
      return;
    }
    if (app.moduleKey) onLaunchApp?.(app.moduleKey);
  };

  const enabledForPlace = (record: NonNullable<typeof openRecord>) => {
    if (record.enabledApps && record.enabledApps.length) return record.enabledApps;
    const licensed = (record.companyId || '').trim();
    const entitlement = licensed ? loadPlaceEntitlement(licensed) : null;
    if (entitlement?.enabled_apps?.length) return entitlement.enabled_apps;
    if (licensed && companyId && licensed === companyId && enabledApps.length) return enabledApps;
    if (!licensed && enabledApps.length) return enabledApps;
    return ['eatery'];
  };

  return (
    <div className="apps-home" data-testid="hub-home" data-pane={pane}>
      {showPlaces && openRecord ? (
        <PlaceDetailView
          key={ownerPlaceKey(openRecord)}
          place={openRecord}
          email={email}
          entitlement={loadPlaceEntitlement(openRecord.companyId || openRecord.placeId || '')}
          seed={
            loadSeednodeForPlace(openRecord.companyId || openRecord.placeId || '')
            || (openRecord.companyId && vault.seednode?.companyId === openRecord.companyId
              ? (vault.seednode || null)
              : null)
          }
          trialEndsAt={
            loadPlaceEntitlement(openRecord.companyId || openRecord.placeId || '')?.trial_ends_at
            || (openRecord.placeName.trim() === houseName ? trialState.trialExpiresAt : null)
          }
          enabledApps={enabledForPlace(openRecord)}
          onBack={() => closePlace()}
          onAddApps={(appIds) => enableAppsOnPlace({
            ...openRecord,
            enabledApps: enabledForPlace(openRecord)
          }, appIds)}
          onOpenApp={(app) => handleOpen(
            app,
            openRecord.placeName,
            [openRecord.placeId || ''].filter(Boolean)
          )}
          openHandshake={handshakeFor(
            openRecord.placeName,
            [openRecord.placeId || ''].filter(Boolean)
          )}
        />
      ) : null}

      {showPlaces && !openRecord ? (
        <>
          <div className="section-head">
            <span className="kicker">{YOUR_PLACES_KICKER}</span>
            <span className="rule" />
          </div>

          {places.length ? (
            <div className="owner-places-list" data-testid="owner-places-list">
              {places.map((place, index) => {
                const key = place.placeKey || place.title;
                const record = ownerRecords.find(row => ownerPlaceKey(row) === key);
                const licensed = (place.companyId || place.placeId || record?.companyId || record?.placeId || '').trim();
                const entitlement = licensed ? loadPlaceEntitlement(licensed) : null;
                const seed = licensed ? loadSeednodeForPlace(licensed) : null;
                const isPrimaryHouse = place.title.trim() === houseName;
                const sub = placeSubscriptionDisplay({
                  entitlement,
                  seedMode: seed?.mode || 'hosted',
                  trialStartedAt: isPrimaryHouse ? trialState.trialStartedAt : null,
                  trialEndsAt: entitlement?.trial_ends_at
                    || (isPrimaryHouse ? trialState.trialExpiresAt : null)
                });
                return (
                  <article
                    className="place-card"
                    key={key}
                    data-testid={index === 0 ? 'eatery-place-row' : 'owner-place-row'}
                    data-place-name={place.title}
                  >
                    <div className="place-card-copy">
                      <h3 data-testid={index === 0 ? 'eatery-place-name' : 'owner-place-name'}>{place.title}</h3>
                      {place.city ? (
                        <p data-testid={index === 0 ? 'eatery-place-city' : 'owner-place-city'}>{place.city}</p>
                      ) : null}
                      <p className="place-card-choice" data-testid={index === 0 ? 'eatery-place-choice' : 'place-card-choice'}>
                        {sub.choiceLines.map(line => (
                          <span key={line}>{line}</span>
                        ))}
                        {sub.seedSummary === HOSTED_SEED_SUMMARY ? (
                          <span className="place-card-total">{sub.totalLine}</span>
                        ) : null}
                      </p>
                      {sub.remaining ? (
                        <p className="place-card-remaining" data-testid={index === 0 ? 'eatery-place-remaining' : 'place-card-remaining'}>
                          {sub.remaining}
                        </p>
                      ) : null}
                    </div>
                    <span className="live" data-testid={index === 0 ? 'eatery-place-status' : 'owner-place-status'}>
                      {place.status}
                    </span>
                    <button
                      type="button"
                      className="btn btn-primary"
                      data-testid={index === 0 ? 'open-the-house' : 'open-place'}
                      onClick={() => openPlace(key)}
                    >
                      {place.actionLabel || OPEN_LABEL}
                    </button>
                  </article>
                );
              })}
              <button
                type="button"
                className="btn btn-outline btn-wide"
                data-testid="register-another-place"
                onClick={beginNamingPlace}
              >
                {PLUS_REGISTER_LABEL}
              </button>
            </div>
          ) : (
            <article className="place-card places-empty" data-testid="your-places-empty">
              <p className="caption" data-testid="your-places-empty-copy">{YOUR_PLACES_EMPTY}</p>
              <button
                type="button"
                className="btn btn-primary"
                data-testid="register-new-house"
                onClick={beginNamingPlace}
              >
                {PLUS_REGISTER_LABEL}
              </button>
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
          openHandshake={openHandshake}
          enabledApps={enabledApps}
        />
      ) : null}

      {showOther ? (
        <OtherPlacesView
          ownerEmail={email}
          ownerPlaceNames={places.map(place => place.title)}
        />
      ) : null}
    </div>
  );
};

export default SubscribedAppsView;
