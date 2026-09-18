import React, { useState } from 'react';
import {
  BACK_TO_PLACES_LABEL,
  CHECK_SEED_LABEL,
  COMING_DOT_LABEL,
  COMING_KICKER,
  DOWNLOAD_SEED_SETUP_LABEL,
  LIVE_STATUS_LABEL,
  MANAGE_BILLING_LABEL,
  ON_PREM_SEED_NEXT,
  OPEN_LABEL,
  PLACE_ACTIVE_STATUS,
  PLACE_APPS_KICKER,
  PLACE_PAUSED,
  PLACE_PAYMENT_DUE,
  PLACE_SUB_LINE,
  PLACE_TRIAL_LINE,
  PLACE_TRIAL_STATUS,
  SEED_HOSTED_LINE,
  SEED_HOSTED_ON_PREM_LINE,
  SEED_KICKER,
  SEEDNODE_MODE_HOSTED,
  SEEDNODE_MODE_ON_PREM,
  SEEDNODE_STATUS_CONNECTED,
  SEED_STATUS_NOT_CONNECTED,
  SEED_STATUS_UNCHECKED,
  SUBSCRIPTION_KICKER
} from '../hub/copy';
import {
  PLACE_SUB_MONTHLY_CODE,
  PLACE_TRIAL_CODE,
  SEED_HOSTED_MONTHLY_CODE,
  stubCatalogLines,
  stubMonthlyLines
} from '../hub/priceMeters';
import { resolvePlaceSubscriptionStatus, type PlaceEntitlement } from '../hub/entitlements';
import { pollSeednodeStatus } from '../hub/houseMcp';
import {
  HOSTED_SEED_DOOR_LABEL,
  SEED_SETUP_ZIP_HREF,
  onPremAttachFields,
  saveSeednodeForPlace,
  seedConfigForMode,
  seednodeDoorHost,
  type SeednodeConfig,
  type SeednodeMode
} from '../hub/seednode';
import { SHOP_APPS, type ShopApp } from '../hub/places';
import { formatTrialEndsOn } from '../hub/zaFormat';
import { buildOpenTheHouseUrl } from '../hub/ownerArrival';
import { shopAppOpenHref } from '../hub/places';
import type { ProjectOpenHandshake } from '../hub/projectUrls';
import type { PlatformPlaceRecord } from '../stores/identityStore';

function kitchenStatus(status: ReturnType<typeof resolvePlaceSubscriptionStatus> | null): string {
  if (status === 'trial') return PLACE_TRIAL_STATUS;
  if (status === 'active') return PLACE_ACTIVE_STATUS;
  if (status === 'past_due') return PLACE_PAYMENT_DUE;
  if (status === 'suspended') return PLACE_PAUSED;
  return '';
}

function kitchenMeterLine(code: string, zarExVat: number): string {
  if (code === PLACE_TRIAL_CODE) return PLACE_TRIAL_LINE;
  if (code === PLACE_SUB_MONTHLY_CODE) return PLACE_SUB_LINE;
  if (code === SEED_HOSTED_MONTHLY_CODE) {
    return zarExVat === 0 ? SEED_HOSTED_ON_PREM_LINE : SEED_HOSTED_LINE;
  }
  return '';
}

export function PlaceDetailView({
  place,
  email,
  entitlement,
  seed,
  trialEndsAt,
  enabledApps,
  onBack,
  onOpenApp,
  openHandshake
}: {
  place: PlatformPlaceRecord;
  email: string;
  entitlement: PlaceEntitlement | null;
  seed: SeednodeConfig | null;
  trialEndsAt?: number | null;
  enabledApps: readonly string[];
  onBack: () => void;
  onOpenApp: (app: ShopApp) => void;
  openHandshake?: ProjectOpenHandshake;
}) {
  const licensedId = (place.companyId || '').trim();
  const openedPlaceId = (place.placeId || '').trim();
  const [seedConfig, setSeedConfig] = useState<SeednodeConfig | null>(seed);
  const [seedCheck, setSeedCheck] = useState<'unchecked' | 'connected' | 'not-connected'>('unchecked');
  const [checkingSeed, setCheckingSeed] = useState(false);
  const status = entitlement ? resolvePlaceSubscriptionStatus(entitlement) : (trialEndsAt ? 'trial' : null);
  const mode: SeednodeMode = seedConfig?.mode || 'hosted';
  const host = seednodeDoorHost(seedConfig);
  const trialLines = stubMonthlyLines({
    seedMode: mode,
    inTrial: status === 'trial'
  });
  const catalog = stubCatalogLines({ seedMode: mode });
  const lines = status === 'trial' ? [...trialLines, ...catalog] : catalog;
  const trialEnds = (status === 'trial' && (entitlement?.trial_ends_at || trialEndsAt))
    ? formatTrialEndsOn(entitlement?.trial_ends_at || trialEndsAt || 0)
    : '';
  const apps = SHOP_APPS.filter(app => app.id !== 'eatout' && enabledApps.includes(app.id));
  const eateryHref = email
    ? buildOpenTheHouseUrl({ email, house: place.placeName })
    : undefined;

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
        {place.city ? (
          <p className="caption" data-testid="place-detail-city">{place.city}</p>
        ) : null}
      </header>

      <article className="place-detail-block" data-testid="place-apps">
        <div className="section-head">
          <span className="kicker">{PLACE_APPS_KICKER}</span>
          <span className="rule" />
        </div>
        <div className="place-apps-list">
          {apps.map(app => {
            const openHref = app.id === 'eatery'
              ? eateryHref
              : shopAppOpenHref(app, openHandshake);
            return (
              <article
                className="place-card"
                key={app.id}
                data-testid={`place-app-${app.id}`}
              >
                <div className="place-card-copy">
                  <h3>{app.title}</h3>
                </div>
                {app.live ? (
                  <span className="live">{LIVE_STATUS_LABEL}</span>
                ) : (
                  <span className="coming-flag">{COMING_KICKER}</span>
                )}
                {app.live ? (
                  openHref ? (
                    <a
                      className="btn btn-primary"
                      href={openHref}
                      target="_self"
                      data-testid={`open-place-app-${app.id}`}
                    >
                      {OPEN_LABEL}
                    </a>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-primary"
                      data-testid={`open-place-app-${app.id}`}
                      onClick={() => onOpenApp(app)}
                    >
                      {OPEN_LABEL}
                    </button>
                  )
                ) : null}
              </article>
            );
          })}
        </div>
      </article>

      <article className="card place-detail-block" data-testid="place-seed">
        <div className="section-head">
          <span className="kicker">{SEED_KICKER}</span>
          <span className="rule" />
        </div>
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
        <p className="caption" data-testid="place-seed-host">{host || HOSTED_SEED_DOOR_LABEL}</p>
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
      </article>

      <article className="card place-detail-block" data-testid="place-subscription">
        <div className="section-head">
          <span className="kicker">{SUBSCRIPTION_KICKER}</span>
          <span className="rule" />
        </div>
        {status ? (
          <p data-testid="place-sub-status">{kitchenStatus(status)}</p>
        ) : null}
        {trialEnds ? (
          <p className="caption" data-testid="place-sub-trial-ends">{trialEnds}</p>
        ) : null}
        <ul className="place-sub-meters" data-testid="place-sub-meters">
          {lines.map(line => {
            const copy = kitchenMeterLine(line.code, line.zarExVat);
            return copy ? (
              <li key={line.code} data-meter={line.code} data-zar={line.zarExVat}>{copy}</li>
            ) : null;
          })}
        </ul>
        <div className="place-detail-cta">
          <button
            type="button"
            className="btn btn-outline"
            data-testid="manage-billing"
            disabled
          >
            {MANAGE_BILLING_LABEL}
          </button>
          <span className="caption">{COMING_DOT_LABEL}</span>
        </div>
      </article>
    </section>
  );
}

export default PlaceDetailView;
