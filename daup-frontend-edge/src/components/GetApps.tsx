import React from 'react';
import { ArrowLeftRight, Building2, Factory, FolderKanban, Landmark, MessageCircle, Refrigerator, Store, Utensils, UtensilsCrossed, Vault, Wheat, type LucideIcon } from 'lucide-react';
import {
  APPS_SHELF_LINE,
  APPS_SHELF_TITLE,
  GET_LABEL,
  SOON_LABEL
} from '../hub/copy';
import {
  SHELF_SHOP_APPS,
  ShopApp,
  ShopAppId,
  interceptHouseRedeemClick,
  shopAppIsHeld,
  shopAppOpenHref
} from '../hub/places';
import type { ProjectOpenHandshake } from '../hub/projectUrls';

const SHOP_ICONS: Record<ShopAppId, LucideIcon> = {
  eatery: Utensils,
  eatin: Refrigerator,
  eatout: UtensilsCrossed,
  project: FolderKanban,
  finance: Landmark,
  trade: ArrowLeftRight,
  farm: Wheat,
  reseller: Store,
  maker: Factory,
  chat: MessageCircle,
  vault: Vault,
  property: Building2
};

export interface GetAppsProps {
  hasHouse: boolean;
  installedApps: Record<string, boolean>;
  onGet: (app: ShopApp) => void;
  onOpen: (app: ShopApp) => void;
  /** Hub facts for Project Open. query (email / house / place / instance). */
  openHandshake?: ProjectOpenHandshake;
  enabledApps?: readonly string[];
}

function ShelfMark({ id }: { id: ShopAppId }) {
  const Icon = SHOP_ICONS[id];
  return (
    <span className="ico-sq" aria-hidden="true">
      {Icon ? <Icon size={22} /> : null}
    </span>
  );
}

function ShelfTile({
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
  const mark = <ShelfMark id={app.id} />;
  const name = <span className="shelf-tile-name">{app.title}</span>;

  if (!app.live) {
    return (
      <div
        className="shelf-tile is-soon"
        data-testid={`coming-app-${app.id}`}
        data-app-id={app.id}
        aria-disabled="true"
      >
        {mark}
        {name}
        <span className="shelf-tile-state">{SOON_LABEL}</span>
      </div>
    );
  }

  if (held) {
    const openHref = shopAppOpenHref(app, openHandshake);
    if (openHref) {
      return (
        <a
          className="shelf-tile"
          href={openHref}
          target="_self"
          data-testid={`open-app-${app.id}`}
          data-app-id={app.id}
          onClick={event => interceptHouseRedeemClick(app, event, onOpen)}
        >
          {mark}
          {name}
        </a>
      );
    }
    return (
      <button
        type="button"
        className="shelf-tile"
        data-testid={`open-app-${app.id}`}
        data-app-id={app.id}
        onClick={() => onOpen(app)}
      >
        {mark}
        {name}
      </button>
    );
  }

  return (
    <button
      type="button"
      className="shelf-tile"
      data-testid={`get-app-${app.id}`}
      data-app-id={app.id}
      onClick={() => onGet(app)}
    >
      {mark}
      {name}
      <span className="shelf-tile-state">{GET_LABEL}</span>
    </button>
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
    <section className="get-apps apps-shelf-section" data-testid="get-apps">
      <header className="apps-shelf-head">
        <h1 className="apps-shelf-title">{APPS_SHELF_TITLE}</h1>
        <p className="apps-shelf-line">{APPS_SHELF_LINE}</p>
      </header>
      <div className="apps-shelf" data-testid="apps-shelf">
        {SHELF_SHOP_APPS.map(app => (
          <ShelfTile
            key={app.id}
            app={app}
            held={heldOf(app)}
            onGet={onGet}
            onOpen={onOpen}
            openHandshake={openHandshake}
          />
        ))}
      </div>
    </section>
  );
}

export default GetAppsSection;
