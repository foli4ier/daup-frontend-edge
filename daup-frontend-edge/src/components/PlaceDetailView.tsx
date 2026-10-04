import { useEffect, useState } from 'react';
import {
  ADD_APPS_LABEL,
  ANNUAL_OFF_LINE,
  BACK_TO_PLACES_LABEL,
  CANCEL_LABEL,
  CHECK_SEED_LABEL,
  DOWNLOAD_SEED_SETUP_LABEL,
  EDIT_LABEL,
  ON_PREM_SEED_NEXT,
  PAY_WITH_PAYSTACK_LABEL,
  PAYSTACK_CHANNELS_LABEL,
  PAYSTACK_NOT_READY_LABEL,
  PLACE_APPS_KICKER,
  PLACE_LOCATION_TAB,
  PLACE_SUBSCRIPTION_TAB,
  PLACE_TRIAL_LINE,
  PLAN_ANNUAL_LABEL,
  PLAN_MONTHLY_LABEL,
  SAVE_LABEL,
  SEED_KICKER,
  SEEDNODE_MODE_HOSTED,
  SEEDNODE_MODE_ON_PREM,
  SEEDNODE_STATUS_CONNECTED,
  SEED_STATUS_NOT_CONNECTED,
  SEED_STATUS_UNCHECKED
} from '../hub/copy';
import { resolvePlaceSubscriptionStatus, type PlaceEntitlement } from '../hub/entitlements';
import { pollSeednodeStatus } from '../hub/houseMcp';
import {
  SEED_SETUP_ZIP_HREF,
  onPremAttachFields,
  saveSeednodeForPlace,
  seedConfigForMode,
  type SeednodeConfig,
  type SeednodeMode
} from '../hub/seednode';
import { ENABLEABLE_SHOP_APPS, SHELF_SHOP_APPS, interceptHouseRedeemClick, shopAppOpenHref, type ShopApp } from '../hub/places';
import {
  annualFigureLine,
  placeSubscriptionDate,
  placeTileStatus,
  planChoiceLabel,
  resolvePlacePlan,
  savePlacePlan,
  type PlacePlanChoice
} from '../hub/placeSubscription';
import type { ProjectOpenHandshake } from '../hub/projectUrls';
import type { PlatformPlaceRecord } from '../stores/identityStore';
import { openPaystackCheckout, startPaystackCheckout } from '../hub/paystackEntitlement';
import { AppShelfTile } from './AppShelfTile';

export type PlacePane = 'apps' | 'subscription' | 'location';

export function PlaceDetailView({
  place,
  email,
  entitlement,
  seed,
  trialEndsAt,
  enabledApps,
  tab,
  onTab,
  onBack,
  onOpenApp,
  onAddApps,
  onSaveLocation,
  openHandshake
}: {
  place: PlatformPlaceRecord;
  email: string;
  entitlement: PlaceEntitlement | null;
  seed: SeednodeConfig | null;
  trialEndsAt?: number | null;
  enabledApps: readonly string[];
  tab: PlacePane;
  onTab: (tab: PlacePane) => void;
  onBack: () => void;
  onOpenApp: (app: ShopApp) => void;
  onAddApps?: (appIds: readonly string[]) => void;
  onSaveLocation?: (location: { city: string; region: string; country: string }) => void;
  openHandshake?: ProjectOpenHandshake;
}) {
  const licensedId = (place.companyId || '').trim();
  const openedPlaceId = (place.placeId || '').trim();
  const [seedConfig, setSeedConfig] = useState<SeednodeConfig | null>(seed);
  const [seedCheck, setSeedCheck] = useState<'unchecked' | 'connected' | 'not-connected'>('unchecked');
  const [checkingSeed, setCheckingSeed] = useState(false);
  const [adding, setAdding] = useState(false);
  const [picking, setPicking] = useState<string[]>([]);
  const [planOverride, setPlanOverride] = useState<PlacePlanChoice | null>(null);
  const [payNote, setPayNote] = useState('');
  const [paying, setPaying] = useState(false);
  const [locEditing, setLocEditing] = useState(false);
  const [city, setCity] = useState(place.city || '');
  const [region, setRegion] = useState(place.region || '');
  const [country, setCountry] = useState(place.country || '');
  const status = entitlement ? resolvePlaceSubscriptionStatus(entitlement) : (trialEndsAt ? 'trial' : null);
  const mode: SeednodeMode = seedConfig?.mode || 'hosted';
  const clock = entitlement || (trialEndsAt ? {
    trial_started_at: null,
    trial_ends_at: trialEndsAt,
    payment_method_ok: false
  } : null);
  const plan = planOverride || resolvePlacePlan({
    placeId: licensedId || openedPlaceId,
    seedMode: mode
  });
  const tileStatus = placeTileStatus(clock, Date.now(), plan.cadence);
  const dateLine = placeSubscriptionDate(clock, Date.now(), plan.cadence);
  const apps = SHELF_SHOP_APPS.filter(app => app.id !== 'eatout' && app.live && enabledApps.includes(app.id));
  const heldApps = new Set(enabledApps);
  const missingApps = ENABLEABLE_SHOP_APPS.filter(app => app.live && !heldApps.has(app.id));
  const locationLine = [place.city, place.region, place.country].map(part => (part || '').trim()).filter(Boolean).join(', ');

  useEffect(() => {
    if (locEditing) return;
    setCity(place.city || '');
    setRegion(place.region || '');
    setCountry(place.country || '');
  }, [place.city, place.region, place.country, locEditing]);

  const payWithPaystack = () => {
    if (paying) return;
    const placeId = licensedId || openedPlaceId;
    setPaying(true);
    setPayNote('');
    void startPaystackCheckout({
      email,
      placeId,
      bundle: plan.bundle,
      cadence: plan.cadence
    }).then(result => {
      if (result.authorizationUrl) {
        openPaystackCheckout(result.authorizationUrl);
        return;
      }
      setPayNote(result.message || PAYSTACK_NOT_READY_LABEL);
    }).catch(() => {
      setPayNote(PAYSTACK_NOT_READY_LABEL);
    }).finally(() => {
      setPaying(false);
    });
  };

  const choosePlan = (patch: Partial<PlacePlanChoice>) => {
    const id = licensedId || openedPlaceId;
    setPlanOverride(prev => {
      const held = prev || resolvePlacePlan({ placeId: id, seedMode: mode });
      const next: PlacePlanChoice = {
        bundle: patch.bundle ?? held.bundle,
        cadence: patch.cadence ?? held.cadence
      };
      if (id) savePlacePlan(id, next);
      return next;
    });
  };

  const chooseMode = (next: SeednodeMode) => {
    const mapKey = licensedId || openedPlaceId;
    if (!mapKey || next === mode) return;
    const attach = next === 'on-prem'
      ? onPremAttachFields({
          ownerEmail: email,
          companyId: licensedId,
          placeId: openedPlaceId
        })
      : null;
    const config = saveSeednodeForPlace(
      mapKey,
      attach || seedConfigForMode({
        mode: next,
        companyId: licensedId || openedPlaceId,
        placeId: openedPlaceId,
        ownerEmail: email
      })
    );
    setSeedConfig(config);
    setSeedCheck('unchecked');
  };

  const onCheckSeed = async () => {
    if (checkingSeed) return;
    const attached = seedConfig;
    if (!attached?.endpoint) {
      setSeedCheck('not-connected');
      return;
    }
    setCheckingSeed(true);
    try {
      const result = await pollSeednodeStatus({
        endpoint: attached.endpoint,
        mode: attached.mode,
        ownerEmail: email,
        companyId: licensedId || attached.companyId,
        placeId: openedPlaceId || attached.placeId,
        attach: attached.mode === 'on-prem'
      });
      setSeedCheck(result.ok && result.connected ? 'connected' : 'not-connected');
    } catch {
      setSeedCheck('not-connected');
    } finally {
      setCheckingSeed(false);
    }
  };

  const saveLocation = () => {
    onSaveLocation?.({ city, region, country });
    setLocEditing(false);
  };

  return (
    <section className="place-detail" data-testid="place-detail">
      <button
        type="button"
        className="owner-quiet"
        data-testid="back-to-places"
        onClick={onBack}
      >
        {BACK_TO_PLACES_LABEL}
      </button>

      <header className="place-detail-head">
        <h1 data-testid="place-detail-name">{place.placeName}</h1>
      </header>

      <div className="place-tabs" role="tablist" data-testid="place-tabs">
        {([
          ['apps', PLACE_APPS_KICKER],
          ['subscription', PLACE_SUBSCRIPTION_TAB],
          ['location', PLACE_LOCATION_TAB]
        ] as const).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            className={tab === id ? 'place-tab is-on' : 'place-tab'}
            data-testid={`place-tab-${id}`}
            aria-selected={tab === id}
            onClick={() => onTab(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'apps' ? (
        <article className="place-detail-block" data-testid="place-apps">
          <div className="apps-shelf" data-testid="place-apps-shelf">
            {apps.map(app => {
              const openHref = shopAppOpenHref(app, openHandshake);
              return (
                <div className="place-app-slot" key={app.id} data-testid={`place-app-${app.id}`}>
                  <AppShelfTile
                    app={app}
                    testId={`open-place-app-${app.id}`}
                    href={openHref}
                    onClick={openHref
                      ? event => interceptHouseRedeemClick(app, event, onOpenApp)
                      : () => onOpenApp(app)}
                  />
                </div>
              );
            })}
          </div>
          <div className="place-add-apps">
            {adding ? (
              <div data-testid="place-add-apps">
                <div className="wizard-apps">
                  {missingApps.map(app => {
                    const selected = picking.includes(app.id);
                    return (
                      <button
                        key={app.id}
                        type="button"
                        className={selected ? 'wizard-app is-on' : 'wizard-app'}
                        data-testid={`add-app-${app.id}`}
                        aria-pressed={selected}
                        onClick={() => {
                          setPicking(prev => (
                            prev.includes(app.id)
                              ? prev.filter(id => id !== app.id)
                              : [...prev, app.id]
                          ));
                        }}
                      >
                        <span>{app.title}</span>
                      </button>
                    );
                  })}
                </div>
                <button
                  type="button"
                  className="btn btn-primary"
                  data-testid="confirm-add-apps"
                  disabled={!picking.length || !onAddApps}
                  onClick={() => {
                    if (!picking.length) return;
                    onAddApps?.(picking);
                    setPicking([]);
                    setAdding(false);
                  }}
                >
                  {ADD_APPS_LABEL}
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="btn btn-outline"
                data-testid="show-add-apps"
                onClick={() => setAdding(true)}
              >
                {ADD_APPS_LABEL}
              </button>
            )}
          </div>
        </article>
      ) : null}

      {tab === 'subscription' ? (
        <article className="card place-detail-block" data-testid="place-subscription">
          {tileStatus ? (
            <p data-testid="place-sub-status">{tileStatus}</p>
          ) : null}
          {dateLine && dateLine !== tileStatus ? (
            <p className="caption" data-testid="place-sub-date">{dateLine}</p>
          ) : null}
          <div className="place-plan-choice" data-testid="place-plan-choice" role="group" aria-label={PLACE_SUBSCRIPTION_TAB}>
            {(['place', 'hosted-seed', 'both'] as const).map(bundle => (
              <button
                key={bundle}
                type="button"
                className={plan.bundle === bundle ? 'place-plan is-on' : 'place-plan'}
                data-testid={`plan-${bundle}`}
                aria-pressed={plan.bundle === bundle}
                onClick={() => choosePlan({ bundle })}
              >
                {planChoiceLabel(bundle)}
              </button>
            ))}
          </div>
          <div className="place-plan-choice place-cadence-choice" data-testid="place-cadence-choice">
            {([
              ['monthly', PLAN_MONTHLY_LABEL],
              ['annual', PLAN_ANNUAL_LABEL]
            ] as const).map(([cadence, label]) => (
              <button
                key={cadence}
                type="button"
                className={plan.cadence === cadence ? 'place-plan is-on' : 'place-plan'}
                data-testid={`cadence-${cadence}`}
                aria-pressed={plan.cadence === cadence}
                onClick={() => choosePlan({ cadence })}
              >
                {label}
              </button>
            ))}
          </div>
          {plan.cadence === 'annual' ? (
            <>
              <p data-testid="place-sub-annual-off">{ANNUAL_OFF_LINE}</p>
              <p className="place-sub-quote" data-testid="place-sub-quote">{annualFigureLine(plan.bundle)}</p>
            </>
          ) : null}
          {status === 'trial' ? (
            <p data-testid="place-sub-trial">{PLACE_TRIAL_LINE}</p>
          ) : null}
          <div className="place-detail-cta">
            <button
              type="button"
              className="btn btn-primary place-pay"
              data-testid="pay-with-paystack"
              aria-busy={paying}
              disabled={paying}
              onClick={payWithPaystack}
            >
              {PAY_WITH_PAYSTACK_LABEL}
            </button>
          </div>
          <p className="caption place-pay-note" data-testid="paystack-channels">{PAYSTACK_CHANNELS_LABEL}</p>
          {payNote ? (
            <p className="caption place-pay-note" data-testid="paystack-note">{payNote}</p>
          ) : null}
          {seedConfig ? (
            <div className="place-seed-sheet" data-testid="place-seed">
              <p className="caption">{SEED_KICKER}</p>
              <div className="seed-mode-choice" data-testid="place-seed-mode">
                <button
                  type="button"
                  className={mode === 'hosted' ? 'seed-mode is-on' : 'seed-mode'}
                  data-testid="seed-mode-hosted"
                  aria-pressed={mode === 'hosted'}
                  onClick={() => chooseMode('hosted')}
                >
                  {SEEDNODE_MODE_HOSTED}
                </button>
                <button
                  type="button"
                  className={mode === 'on-prem' ? 'seed-mode is-on' : 'seed-mode'}
                  data-testid="seed-mode-on-prem"
                  aria-pressed={mode === 'on-prem'}
                  onClick={() => chooseMode('on-prem')}
                >
                  {SEEDNODE_MODE_ON_PREM}
                </button>
              </div>
              <p className="caption" data-testid="place-seed-host">
                {mode === 'on-prem' ? SEEDNODE_MODE_ON_PREM : SEEDNODE_MODE_HOSTED}
              </p>
              <p className="caption" data-testid="place-seed-status">
                {seedCheck === 'connected'
                  ? SEEDNODE_STATUS_CONNECTED
                  : seedCheck === 'not-connected'
                    ? SEED_STATUS_NOT_CONNECTED
                    : SEED_STATUS_UNCHECKED}
              </p>
              <div className="place-detail-cta">
                <button
                  type="button"
                  className="btn btn-outline"
                  data-testid="check-seed"
                  disabled={checkingSeed}
                  onClick={() => { void onCheckSeed(); }}
                >
                  {CHECK_SEED_LABEL}
                </button>
              </div>
              {mode === 'on-prem' ? (
                <div className="place-seed-on-prem" data-testid="seed-on-prem-next">
                  <p className="caption">{ON_PREM_SEED_NEXT}</p>
                  <a
                    className="btn btn-primary"
                    href={SEED_SETUP_ZIP_HREF}
                    data-testid="download-seed-setup"
                  >
                    {DOWNLOAD_SEED_SETUP_LABEL}
                  </a>
                </div>
              ) : null}
            </div>
          ) : null}
        </article>
      ) : null}

      {tab === 'location' ? (
        <article className="card place-detail-block" data-testid="place-location">
          {locEditing ? (
            <div className="place-location-edit" data-testid="place-location-edit">
              <label>
                City.
                <input
                  data-testid="place-location-city"
                  value={city}
                  onChange={event => setCity(event.target.value)}
                />
              </label>
              <label>
                Province.
                <input
                  data-testid="place-location-region"
                  value={region}
                  onChange={event => setRegion(event.target.value)}
                />
              </label>
              <label>
                Country.
                <input
                  data-testid="place-location-country"
                  value={country}
                  onChange={event => setCountry(event.target.value)}
                />
              </label>
              <div className="place-card-actions">
                <button type="button" className="btn btn-primary" data-testid="save-place-location" onClick={saveLocation}>
                  {SAVE_LABEL}
                </button>
                <button
                  type="button"
                  className="btn btn-outline"
                  data-testid="cancel-place-location"
                  onClick={() => {
                    setCity(place.city || '');
                    setRegion(place.region || '');
                    setCountry(place.country || '');
                    setLocEditing(false);
                  }}
                >
                  {CANCEL_LABEL}
                </button>
              </div>
            </div>
          ) : (
            <div className="place-card-name">
              <p data-testid="place-location-line">{locationLine}</p>
              <button
                type="button"
                className="place-text-action"
                data-testid="edit-place-location"
                onClick={() => setLocEditing(true)}
              >
                {EDIT_LABEL}
              </button>
            </div>
          )}
        </article>
      ) : null}
    </section>
  );
}

export default PlaceDetailView;
