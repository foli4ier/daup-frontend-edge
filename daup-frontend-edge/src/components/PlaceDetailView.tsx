import React, { useState } from 'react';
import {
  BACK_TO_PLACES_LABEL,
  COMING_DOT_LABEL,
  COMING_KICKER,
  LIVE_STATUS_LABEL,
  MANAGE_BILLING_LABEL,
  MANAGE_SEED_LABEL,
  OPEN_LABEL,
  PLACE_ACTIVE_STATUS,
  PLACE_APPS_KICKER,
  PLACE_PAUSED,
  PLACE_PAYMENT_DUE,
  PLACE_SUB_LINE,
  PLACE_TRIAL_LINE,
  PLACE_TRIAL_STATUS,
  SEED_HOSTED_LINE,
  SEED_KICKER,
  SEEDNODE_MODE_HOSTED,
  SEEDNODE_MODE_ON_PREM,
  SEED_STATUS_UNCHECKED,
  SUBSCRIPTION_KICKER
} from '../hub/copy';
import {
  PLACE_SUB_MONTHLY_CODE,
  PLACE_TRIAL_CODE,
  SEED_HOSTED_MONTHLY_CODE,
  stubMonthlyLines
} from '../hub/priceMeters';
import { resolvePlaceSubscriptionStatus, type PlaceEntitlement } from '../hub/entitlements';
import {
  HOSTED_SEED_DOOR_LABEL,
  seednodeDoorHost,
  type SeednodeConfig
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

function kitchenMeterLine(code: string): string {
  if (code === PLACE_TRIAL_CODE) return PLACE_TRIAL_LINE;
  if (code === PLACE_SUB_MONTHLY_CODE) return PLACE_SUB_LINE;
  if (code === SEED_HOSTED_MONTHLY_CODE) return SEED_HOSTED_LINE;
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
  const [seedSheet, setSeedSheet] = useState(false);
  const status = entitlement ? resolvePlaceSubscriptionStatus(entitlement) : (trialEndsAt ? 'trial' : null);
  const mode = seed?.mode || 'hosted';
  const host = seednodeDoorHost(seed);
  const lines = stubMonthlyLines({
    seedMode: mode,
    inTrial: status === 'trial'
  });
  const trialEnds = (status === 'trial' && (entitlement?.trial_ends_at || trialEndsAt))
    ? formatTrialEndsOn(entitlement?.trial_ends_at || trialEndsAt || 0)
    : '';
  const apps = SHOP_APPS.filter(app => app.id !== 'eatout' && enabledApps.includes(app.id));
  const eateryHref = email
    ? buildOpenTheHouseUrl({ email, house: place.placeName })
    : undefined;

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

      <article className="card place-detail-block" data-testid="place-seednode">
        <div className="section-head">
          <span className="kicker">{SEED_KICKER}</span>
          <span className="rule" />
        </div>
        <p data-testid="place-seed-mode">{mode === 'on-prem' ? SEEDNODE_MODE_ON_PREM : SEEDNODE_MODE_HOSTED}</p>
        <p className="caption" data-testid="place-seed-host">{host || HOSTED_SEED_DOOR_LABEL}</p>
        <p className="caption" data-testid="place-seed-status">{SEED_STATUS_UNCHECKED}</p>
        <div className="place-detail-cta">
          <button
            type="button"
            className="btn btn-outline"
            data-testid="manage-seed"
            onClick={() => setSeedSheet(open => !open)}
          >
            {MANAGE_SEED_LABEL}
          </button>
        </div>
        {seedSheet ? (
          <div className="place-seed-sheet" data-testid="seed-sheet">
            <p>{mode === 'on-prem' ? SEEDNODE_MODE_ON_PREM : SEEDNODE_MODE_HOSTED}</p>
            <p className="caption">{host || HOSTED_SEED_DOOR_LABEL}</p>
            <p className="caption">{SEED_STATUS_UNCHECKED}</p>
            <p className="caption">{COMING_DOT_LABEL}</p>
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
            const copy = kitchenMeterLine(line.code);
            return copy ? (
              <li key={line.code} data-meter={line.code}>{copy}</li>
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
    </section>
  );
}

export default PlaceDetailView;
