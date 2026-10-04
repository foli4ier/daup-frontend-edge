import React, { useEffect, useRef, useState } from 'react';
import { useUserProfile } from '../context/UserProfileContext';
import {
  APPS_SHELF_TITLE,
  ASK_FOR_ENHANCEMENT_LABEL,
  CANCEL_LABEL,
  DELETE_THE_HOUSE_LABEL,
  EDIT_LABEL,
  OPEN_LABEL,
  PLACE_NAME_IN_USE,
  PLUS_REGISTER_LABEL,
  SAVE_LABEL,
  SUBSCRIPTION_OPEN_LABEL,
  YOUR_PLACES_EMPTY,
  YOUR_PLACES_KICKER
} from '../hub/copy';
import { loadPlaceEntitlement } from '../hub/entitlements';
import { DEFAULT_HUB_PANE, type HubPane } from '../hub/hubPane';
import { continueHouseOpen, pickHousePlaceId } from '../hub/houseOpen';
import { houseOtpMockActive, rememberedHouseOtpPhone } from '../hub/house-session';
import { appUsesHouseRedeem } from '../hub/house-session/openUrl';
import { ShopApp, heldShopApps, listOwnerPlaces, navigateSameTab, navigateToChatHome, ownerPlaceKey } from '../hub/places';
import { placeTileStatus, resolvePlacePlan } from '../hub/placeSubscription';
import type { PlacePane } from './PlaceDetailView';
import { loadSeednodeForPlace } from '../hub/seednode';
import { navigateToEatOutHome } from '../hub/eatoutUrls';
import { navigateToTheHouse } from '../hub/ownerArrival';
import { projectOpenHandshakeFromHub } from '../hub/projectUrls';
import { listOwnerPlaceRecords, listRegisteredPlaces, placeIdFromHubWallet } from '../stores/identityStore';
import { toWhatsappE164 } from '../hub/whatsappE164';
import { AskForEnhancementView } from './AskForEnhancementView';
import { DeleteHouseModal } from './DeleteHouseModal';
import { GetAppsSection } from './GetApps';
import { HouseOtpDoor } from './HouseOtpDoor';
import { OtherPlacesView } from './OtherPlaces';
import {
  applyPaystackVerdict,
  clearPaystackReturnQuery,
  confirmPaystackReference,
  paystackReferencesOnThisHub,
  paystackReturnReference
} from '../hub/paystackEntitlement';
import { PlaceDetailView } from './PlaceDetailView';

function PlaceCard({
  index,
  title,
  city,
  statusLine,
  onOpen,
  onSubscription,
  onRename
}: {
  index: number;
  title: string;
  city: string;
  statusLine: string;
  onOpen: () => void;
  onSubscription: () => void;
  onRename: (nextName: string) => { ok: boolean; reason?: string };
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(title);
  const [nameNote, setNameNote] = useState('');
  const first = index === 0;
  const save = () => {
    const next = draft.trim();
    if (!next || next === title) {
      setDraft(title);
      setEditing(false);
      setNameNote('');
      return;
    }
    const result = onRename(next);
    if (!result.ok) {
      setNameNote(result.reason || PLACE_NAME_IN_USE);
      return;
    }
    setNameNote('');
    setEditing(false);
  };
  return (
    <article
      className="place-card"
      data-testid={first ? 'eatery-place-row' : 'owner-place-row'}
      data-place-name={title}
    >
      {editing ? (
        <div className="place-rename">
          <input
            className="place-rename-field"
            data-testid={first ? 'edit-place-name-input' : `edit-place-name-input-${index}`}
            value={draft}
            aria-label="Place name."
            onChange={event => setDraft(event.target.value)}
          />
          <div className="place-card-actions place-rename-actions">
            <button type="button" className="btn btn-primary" data-testid={first ? 'save-place-name' : `save-place-name-${index}`} onClick={save}>
              {SAVE_LABEL}
            </button>
            <button
              type="button"
              className="btn btn-outline"
              data-testid={first ? 'cancel-place-name' : `cancel-place-name-${index}`}
              onClick={() => {
                setDraft(title);
                setNameNote('');
                setEditing(false);
              }}
            >
              {CANCEL_LABEL}
            </button>
          </div>
        </div>
      ) : (
        <div className="place-card-name">
          <h3 data-testid={first ? 'eatery-place-name' : 'owner-place-name'}>{title}</h3>
          <button
            type="button"
            className="place-text-action"
            data-testid={first ? 'edit-place-name' : `edit-place-name-${index}`}
            onClick={() => {
              setDraft(title);
              setNameNote('');
              setEditing(true);
            }}
          >
            {EDIT_LABEL}
          </button>
        </div>
      )}
      {nameNote ? <p className="caption" data-testid="place-name-note">{nameNote}</p> : null}
      {city ? (
        <p data-testid={first ? 'eatery-place-city' : 'owner-place-city'}>{city}</p>
      ) : null}
      {statusLine ? (
        <p className="place-card-status" data-testid={first ? 'eatery-place-status' : 'owner-place-status'}>{statusLine}</p>
      ) : null}
      <div className="place-card-actions">
        <button
          type="button"
          className="btn btn-primary"
          data-testid={first ? 'open-the-house' : 'open-place'}
          onClick={onOpen}
        >
          {OPEN_LABEL}
        </button>
        <button
          type="button"
          className="btn btn-outline"
          data-testid={first ? 'open-place-subscription' : `open-place-subscription-${index}`}
          onClick={onSubscription}
        >
          {SUBSCRIPTION_OPEN_LABEL}
        </button>
      </div>
    </article>
  );
}

export const SubscribedAppsView: React.FC<{
  pane?: Exclude<HubPane, 'you'>;
  appsTab?: 'shelf' | 'ask';
  onAppsTab?: (tab: 'shelf' | 'ask') => void;
  installedApps?: Record<string, boolean>;
  onSubscribeApp?: (moduleKey: string) => void;
  onLaunchApp?: (moduleKey: string) => void;
  openPlaceKey?: string | null;
  onOpenPlace?: (placeKey: string) => void;
  onClosePlace?: () => void;
}> = ({
  pane = DEFAULT_HUB_PANE,
  appsTab,
  onAppsTab,
  installedApps = {},
  onSubscribeApp,
  onLaunchApp,
  openPlaceKey = null,
  onOpenPlace,
  onClosePlace
}) => {
  const [localOpenKey, setLocalOpenKey] = useState<string | null>(null);
  const [localAppsTab, setLocalAppsTab] = useState<'shelf' | 'ask'>('shelf');
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [paidTick, setPaidTick] = useState(0);
  const [openedTab, setOpenedTab] = useState<PlacePane>('apps');
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
    clearHouse,
    profile,
    enabledApps,
    enableApp,
    enableAppsOnPlace,
    renamePlace,
    savePlaceLocation,
    companyId,
    trialState,
    vault,
    updateDemographics
  } = useUserProfile();
  const houseName = (activeWallet?.legalName || '').trim();
  const email = ownerSession?.email || '';

  useEffect(() => {
    let cancel = false;
    const fromUrl = paystackReturnReference();
    const refs = [...new Set([fromUrl, ...paystackReferencesOnThisHub()].filter(Boolean))];
    if (!refs.length) return undefined;
    void (async () => {
      let changed = false;
      for (const reference of refs) {
        try {
          const verdict = await confirmPaystackReference(reference);
          if (cancel || !verdict) continue;
          if (applyPaystackVerdict(verdict)) changed = true;
        } catch {
          // A failed lookup is not a payment, and it does not clear a covered period.
        }
      }
      if (fromUrl) clearPaystackReturnQuery();
      if (!cancel && changed) setPaidTick(tick => tick + 1);
    })();
    return () => {
      cancel = true;
    };
  }, []);
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
  const appsPaneTab = appsTab ?? localAppsTab;
  const pickAppsTab = (tab: 'shelf' | 'ask') => {
    if (onAppsTab) onAppsTab(tab);
    else setLocalAppsTab(tab);
  };
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

  const preferredPhone = toWhatsappE164(
    profile.demographics.whatsappNumber || profile.demographics.contactNumber || ''
  );

  const linkWhatsapp = (phone: string) => {
    const e164 = toWhatsappE164(phone);
    if (!e164) return;
    if (toWhatsappE164(profile.demographics.whatsappNumber) === e164) return;
    updateDemographics({ whatsappNumber: e164 });
  };

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
        linkWhatsapp(extra?.phone || '');
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
        linkWhatsapp(result.phone);
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
          key={`${ownerPlaceKey(openRecord)}:${paidTick}`}
          place={openRecord}
          email={email}
          tab={openedTab}
          onTab={setOpenedTab}
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
          onSaveLocation={(location) => {
            savePlaceLocation(openRecord, location);
          }}
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
                const isPrimaryHouse = place.title.trim() === houseName;
                const plan = resolvePlacePlan({ placeId: licensed });
                const statusLine = placeTileStatus(
                  entitlement || (isPrimaryHouse && trialState.trialExpiresAt ? {
                    trial_started_at: trialState.trialStartedAt,
                    trial_ends_at: trialState.trialExpiresAt,
                    payment_method_ok: false
                  } : null),
                  Date.now(),
                  plan.cadence
                );
                return (
                  <PlaceCard
                    key={`${key}:${paidTick}:${place.title}`}
                    index={index}
                    title={place.title}
                    city={place.city}
                    statusLine={statusLine}
                    onOpen={() => {
                      setOpenedTab('apps');
                      openPlace(key);
                    }}
                    onSubscription={() => {
                      setOpenedTab('subscription');
                      openPlace(key);
                    }}
                    onRename={(nextName) => {
                      if (!record) return { ok: false, reason: PLACE_NAME_IN_USE };
                      return renamePlace(record, nextName);
                    }}
                  />
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
              <button
                type="button"
                className="owner-quiet places-delete"
                data-testid="delete-the-house"
                onClick={() => setDeleteOpen(true)}
              >
                {DELETE_THE_HOUSE_LABEL}
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
        <div className="apps-pane" data-testid="apps-pane">
          <div className="apps-tabs" role="tablist" aria-label={APPS_SHELF_TITLE}>
            <button
              type="button"
              role="tab"
              className={appsPaneTab === 'shelf' ? 'apps-tab is-current' : 'apps-tab'}
              aria-selected={appsPaneTab === 'shelf'}
              data-testid="apps-tab-shelf"
              onClick={() => pickAppsTab('shelf')}
            >
              {APPS_SHELF_TITLE}
            </button>
            <button
              type="button"
              role="tab"
              className={appsPaneTab === 'ask' ? 'apps-tab is-current' : 'apps-tab'}
              aria-selected={appsPaneTab === 'ask'}
              data-testid="apps-tab-ask"
              onClick={() => pickAppsTab('ask')}
            >
              {ASK_FOR_ENHANCEMENT_LABEL}
            </button>
          </div>
          {appsPaneTab === 'ask' ? (
            <AskForEnhancementView
              apps={heldShopApps({
                hasHouse,
                installed: installedApps,
                enabledApps,
                extraEnabled: ownerRecords.map(record => record.enabledApps || [])
              })}
            />
          ) : (
            <GetAppsSection
              hasHouse={hasHouse}
              installedApps={installedApps}
              onGet={handleGet}
              onOpen={handleOpen}
              openHandshake={openHandshake}
              enabledApps={enabledApps}
            />
          )}
        </div>
      ) : null}

      <DeleteHouseModal
        isOpen={deleteOpen}
        houseName={houseName}
        onClose={() => setDeleteOpen(false)}
        onConfirm={() => {
          setDeleteOpen(false);
          clearHouse();
        }}
      />

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
