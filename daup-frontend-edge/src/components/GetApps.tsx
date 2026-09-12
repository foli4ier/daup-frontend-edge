import React from 'react';
import { Factory, MessageCircle, Store, Utensils, UtensilsCrossed, Wheat } from 'lucide-react';
import {
  COMING_KICKER,
  GET_APPS_KICKER,
  GET_LABEL,
  OPEN_LABEL,
  SAME_CHAIN_CAPTION
} from '../hub/copy';
import {
  COMING_SHOP_APPS,
  LIVE_SHOP_APPS,
  ShopApp,
  shopAppIsHeld,
  shopAppOpenHref
} from '../hub/places';

const SHOP_ICONS = {
  eatery: Utensils,
  eatout: UtensilsCrossed,
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
  /** Home demotes Open. so the page CTA is the only terracotta primary. */
  demoteOpen?: boolean;
}

function OpenControl({
  app,
  onOpen,
  demoteOpen
}: {
  app: ShopApp;
  onOpen: (app: ShopApp) => void;
  demoteOpen?: boolean;
}) {
  const openHref = shopAppOpenHref(app);
  const className = demoteOpen ? 'btn btn-outline btn-wide' : 'btn btn-primary btn-wide';
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

export function GetAppsSection({
  hasHouse,
  installedApps,
  onGet,
  onOpen,
  demoteOpen
}: GetAppsProps) {
  const heldOf = (app: ShopApp) => shopAppIsHeld(app, { hasHouse, installed: installedApps });

  return (
    <section className="get-apps" data-testid="get-apps">
      <div className="section-head">
        <span className="kicker">{GET_APPS_KICKER}</span>
        <span className="rule" />
      </div>

      <div className="get-apps-live">
        {LIVE_SHOP_APPS.map(app => {
          const held = heldOf(app);
          const Icon = SHOP_ICONS[app.id];
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
                  <OpenControl app={app} onOpen={onOpen} demoteOpen={demoteOpen} />
                )}
              </div>
            </article>
          );
        })}
      </div>

      <div className="other-apps coming-apps" data-testid="other-apps">
        {COMING_SHOP_APPS.map(app => {
          const Icon = SHOP_ICONS[app.id];
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
    </section>
  );
}

export default GetAppsSection;
