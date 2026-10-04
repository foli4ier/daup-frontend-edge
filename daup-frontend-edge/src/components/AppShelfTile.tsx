import React from 'react';
import { ArrowLeftRight, Building2, Factory, FolderKanban, Landmark, MessageCircle, Refrigerator, Store, Utensils, UtensilsCrossed, Vault, Wheat, type LucideIcon } from 'lucide-react';
import type { ShopApp, ShopAppId } from '../hub/places';

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

export function AppShelfMark({ id }: { id: ShopAppId }) {
  const Icon = SHOP_ICONS[id];
  return (
    <span className="ico-sq" aria-hidden="true">
      {Icon ? <Icon size={22} /> : null}
    </span>
  );
}

/**
 * Same tile as the Hub Apps shelf: the tile is the tap, icon and name.
 * Soon tiles stay quiet. No write-up on the tile.
 */
export function AppShelfTile({
  app,
  testId,
  href,
  state,
  soon,
  onClick
}: {
  app: ShopApp;
  testId: string;
  href?: string;
  state?: string;
  soon?: boolean;
  onClick?: (event: React.MouseEvent<HTMLElement>) => void;
}) {
  const mark = <AppShelfMark id={app.id} />;
  const name = <span className="shelf-tile-name">{app.title}</span>;
  const stateNode = state ? <span className="shelf-tile-state">{state}</span> : null;

  if (soon || !app.live) {
    return (
      <div
        className="shelf-tile is-soon"
        data-testid={testId}
        data-app-id={app.id}
        aria-disabled="true"
      >
        {mark}
        {name}
        {stateNode}
      </div>
    );
  }

  if (href) {
    return (
      <a
        className="shelf-tile"
        href={href}
        target="_self"
        data-testid={testId}
        data-app-id={app.id}
        onClick={onClick}
      >
        {mark}
        {name}
        {stateNode}
      </a>
    );
  }

  return (
    <button
      type="button"
      className="shelf-tile"
      data-testid={testId}
      data-app-id={app.id}
      onClick={onClick}
    >
      {mark}
      {name}
      {stateNode}
    </button>
  );
}
