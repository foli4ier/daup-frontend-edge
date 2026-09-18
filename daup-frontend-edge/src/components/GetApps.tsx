import React from 'react';
import { Factory, FolderKanban, MessageCircle, Store, Utensils, UtensilsCrossed, Wheat } from 'lucide-react';
import {
  APPS_PAID_KICKER,
  APPS_SOCIAL_KICKER,
  COMING_KICKER,
  GET_APPS_KICKER,
  GET_LABEL,
  OPEN_LABEL,
  SAME_CHAIN_CAPTION
} from '../hub/copy';
import {
  PAID_SHOP_APPS,
  SOCIAL_SHOP_APPS,
  ShopApp,
  shopAppIsHeld,
  shopAppOpenHref
} from '../hub/places';
import type { ProjectOpenHandshake } from '../hub/projectUrls';

const SHOP_ICONS = {
  eatery: Utensils,
  eatout: UtensilsCrossed,
  project: FolderKanban,
  farm: Wheat,
  reseller: Store,
  maker: Factory,
  chat: MessageCircle
} as const;

export interface GetAppsProps {
  hasHouse: boolean;
  installedApps: Record<string, boolean>;
  onGet: (app: ShopApp) => void;
  onOpen: (app: ShopApp) => void;
  /** Hub facts for Project Open. query (email / house / place / instance). */
  openHandshake?: ProjectOpenHandshake;
  enabledApps?: readonly string[];
}

function OpenControl({
  app,
  onOpen,
  openHandshake
}: {
  app: ShopApp;
  onOpen: (app: ShopApp) => void;
  openHandshake?: ProjectOpenHandshake;
}) {
  const openHref = shopAppOpenHref(app, openHandshake);
  const className = 'btn btn-primary btn-wide';
  if (openHref) {
    return (
      <a
        className={className}
        href={openHref}
        target="_self"
        data-testid={`open-app-${app.id}`}
      >
        {OPEN_LABEL}
      </a>
    );
  }
  return (
    <button
      type="button"
      className={className}
      data-testid={`open-app-${app.id}`}
      onClick={() => onOpen(app)}
    >
      {OPEN_LABEL}
    </button>
  );
}

function ShopAppCard({
  app,
  held,
  onGet,
  onOpen,
  openHandshake
}: {
  app: ShopApp;
  held: boolean;
  onGet: (app: ShopApp) => void;
  onOpen: (app: ShopApp) => void;
  openHandshake?: ProjectOpenHandshake;
}) {
  const Icon = SHOP_ICONS[app.id];
  if (!app.live) {
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
  }
  return (
    <article
      className="card"
      key={app.id}
      data-testid={`shop-app-${app.id}`}
      data-live="true"
    >
      <div className="card-top">
        <span className="ico-sq" aria-hidden="true">
          {Icon ? <Icon size={22} /> : null}
        </span>
        <div>
          <h3>
            {app.title} <span className="live">LIVE</span>
          </h3>
        </div>
      </div>
      <div className="shop-app-actions">
        {!held ? (
          <button
            type="button"
            className="btn btn-primary btn-wide"
            data-testid={`get-app-${app.id}`}
            onClick={() => onGet(app)}
          >
            {GET_LABEL}
          </button>
        ) : (
          <OpenControl
            app={app}
            onOpen={onOpen}
            openHandshake={openHandshake}
          />
        )}
      </div>
    </article>
  );
}

export function GetAppsSection({
  hasHouse,
  installedApps,
  onGet,
  onOpen,
  openHandshake,
  enabledApps
}: GetAppsProps) {
  const heldOf = (app: ShopApp) => shopAppIsHeld(app, { hasHouse, installed: installedApps, enabledApps });

  return (
    <section className="get-apps" data-testid="get-apps">
      <div className="section-head">
        <span className="kicker">{GET_APPS_KICKER}</span>
        <span className="rule" />
      </div>

      <div className="shop-apps-section" data-testid="apps-social">
        <div className="section-head">
          <span className="kicker">{APPS_SOCIAL_KICKER}</span>
          <span className="rule" />
        </div>
        <div className="get-apps-live">
          {SOCIAL_SHOP_APPS.map(app => (
            <ShopAppCard
              key={app.id}
              app={app}
              held={heldOf(app)}
              onGet={onGet}
              onOpen={onOpen}
              openHandshake={openHandshake}
            />
          ))}
        </div>
      </div>

      <div className="shop-apps-section" data-testid="apps-paid">
        <div className="section-head">
          <span className="kicker">{APPS_PAID_KICKER}</span>
          <span className="rule" />
        </div>
        <div className="get-apps-live">
          {PAID_SHOP_APPS.map(app => (
            <ShopAppCard
              key={app.id}
              app={app}
              held={heldOf(app)}
              onGet={onGet}
              onOpen={onOpen}
              openHandshake={openHandshake}
            />
          ))}
        </div>
      </div>
      <p className="caption" data-testid="same-chain-caption">{SAME_CHAIN_CAPTION}</p>
    </section>
  );
}

export default GetAppsSection;
