import React, { useRef, useState } from 'react';
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
import { continueHouseOpen, pickHousePlaceId } from '../hub/houseOpen';
import { houseOtpMockActive, rememberedHouseOtpPhone } from '../hub/house-session';
import { appUsesHouseRedeem } from '../hub/house-session/openUrl';
import { ShopApp, listOwnerPlaces, navigateSameTab, navigateToChatHome, ownerPlaceKey } from '../hub/places';
import { placeSubscriptionDisplay } from '../hub/placeSubscription';
import { loadSeednodeForPlace } from '../hub/seednode';
import { navigateToEatOutHome } from '../hub/eatoutUrls';
import { navigateToTheHouse } from '../hub/ownerArrival';
import { projectOpenHandshakeFromHub } from '../hub/projectUrls';
import { listOwnerPlaceRecords, listRegisteredPlaces, placeIdFromHubWallet } from '../stores/identityStore';
import { GetAppsSection } from './GetApps';
import { HouseOtpDoor } from './HouseOtpDoor';
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
  const houseBusy = useRef(false);
  const [houseDoor, setHouseDoor] = useState<{
    app: ShopApp;
    house: string;
    placeIds: string[];
    placeId: string;
    step: 'phone' | 'code';
    phone: string;
    challengeId: string;
    mockCode: string;
    error: string;
    busy: boolean;
  } | null>(null);
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
      navigateToTheHouse({
        email,
        house: houseName,
        placeIds: ownerRecords.map(place => (place.placeId || '').trim()).filter(Boolean)
      });
      return;
    }
    if (app.live && (app.id === 'eatout' || appUsesHouseRedeem(app.id)) && app.moduleKey) {
      if (!installedApps[app.moduleKey]) onSubscribeApp?.(app.moduleKey);
      return;
    }
    if (app.live && app.moduleKey) {
      if (!installedApps[app.moduleKey]) onSubscribeApp?.(app.moduleKey);
      else onLaunchApp?.(app.moduleKey);
    }
  };

  const preferredPhone = (
    profile.demographics.whatsappNumber || profile.demographics.contactNumber || ''
  ).trim();

  const placeIdFor = (explicit?: string[]) => {
    const primary = ownerRecords.find(record => record.placeName.trim() === houseName);
    return pickHousePlaceId([
      ...(explicit || []),
      primary?.placeId,
      placeIdFromHubWallet(activeWallet),
      primary?.companyId,
      companyId
    ]);
  };

  const runHouseOpen = async (
    app: ShopApp,
    house: string,
    placeIds: string[] | undefined,
    extra?: { phone?: string; code?: string; challengeId?: string }
  ) => {
    if (!appUsesHouseRedeem(app.id) || houseBusy.current) return;
    houseBusy.current = true;
    const ids = (placeIds || []).map(id => id.trim()).filter(Boolean);
    const placeId = placeIdFor(ids);
    setHouseDoor(current => (
      current && current.app.id === app.id
        ? { ...current, busy: true, error: '' }
        : current
    ));
    try {
      const result = await continueHouseOpen({
        appId: app.id,
        placeId,
        hints: { email, house, placeIds: ids },
        phone: extra?.phone,
        code: extra?.code,
        challengeId: extra?.challengeId
      });
      if (result.status === 'navigate') {
        setHouseDoor(null);
        navigateSameTab(result.url);
        return;
      }
      if (result.status === 'phone') {
        setHouseDoor({
          app,
          house,
          placeIds: ids,
          placeId,
          step: 'phone',
          phone: extra?.phone || preferredPhone,
          challengeId: '',
          mockCode: '',
          error: result.message,
          busy: false
        });
        return;
      }
      if (result.status === 'code') {
        setHouseDoor(current => ({
          app,
          house,
          placeIds: ids,
          placeId,
          step: 'code',
          phone: result.phone,
          challengeId: result.challengeId,
          mockCode: result.mockCode || (current?.challengeId === result.challengeId ? current.mockCode : ''),
          error: result.message,
          busy: false
        }));
        return;
      }
      setHouseDoor(current => (
        current
          ? { ...current, busy: false, error: result.message }
          : {
              app,
              house,
              placeIds: ids,
              placeId,
              step: 'phone',
              phone: preferredPhone,
              challengeId: '',
              mockCode: '',
              error: result.message,
              busy: false
            }
      ));
    } finally {
      houseBusy.current = false;
    }
  };

  const handleOpen = (app: ShopApp, house = houseName, placeIds?: string[]) => {
    if (app.id === 'chat') {
      navigateToChatHome();
      return;
    }
    if (app.id === 'eatery') {
      if (!email.trim() || !house.trim()) return;
      navigateToTheHouse({ email, house, placeIds });
      return;
    }
    if (app.id === 'eatout') {
      navigateToEatOutHome();
      return;
    }
    if (appUsesHouseRedeem(app.id)) {
      const ids = (placeIds || []).map(id => id.trim()).filter(Boolean);
      const placeId = placeIdFor(ids);
      // Mock mode already proved this place returns a code. Challenge again
      // with the number we have so the popup can show on this click. A live
      // hold (no mockCode) still skips the door — do not send a phone then.
      const phone = houseOtpMockActive(placeId)
        ? (rememberedHouseOtpPhone(placeId) || preferredPhone)
        : '';
      void runHouseOpen(app, house, placeIds, phone ? { phone } : undefined);
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
      {houseDoor ? (
        <HouseOtpDoor
          key={`${houseDoor.app.id}:${houseDoor.step}:${houseDoor.challengeId}`}
          appTitle={houseDoor.app.title}
          placeName={houseDoor.house || houseName}
          step={houseDoor.step}
          phone={houseDoor.phone}
          mockCode={houseDoor.mockCode}
          error={houseDoor.error}
          busy={houseDoor.busy}
          onSendCode={phone => {
            void runHouseOpen(houseDoor.app, houseDoor.house, houseDoor.placeIds, { phone });
          }}
          onSubmitCode={code => {
            void runHouseOpen(houseDoor.app, houseDoor.house, houseDoor.placeIds, {
              phone: houseDoor.phone,
              code,
              challengeId: houseDoor.challengeId
            });
          }}
          onCancel={() => setHouseDoor(null)}
        />
      ) : null}
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
