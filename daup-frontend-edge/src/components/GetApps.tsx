import {
  APPS_SHELF_LINE,
  APPS_SHELF_TITLE,
  GET_LABEL,
  SOON_LABEL
} from '../hub/copy';
import {
  SHELF_SHOP_APPS,
  ShopApp,
  interceptHouseRedeemClick,
  shopAppIsHeld,
  shopAppOpenHref
} from '../hub/places';
import type { ProjectOpenHandshake } from '../hub/projectUrls';
import { AppShelfTile } from './AppShelfTile';

export interface GetAppsProps {
  hasHouse: boolean;
  installedApps: Record<string, boolean>;
  onGet: (app: ShopApp) => void;
  onOpen: (app: ShopApp) => void;
  /** Hub facts for Project Open. query (email / house / place / instance). */
  openHandshake?: ProjectOpenHandshake;
  enabledApps?: readonly string[];
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
  if (!app.live) {
    return (
      <AppShelfTile
        app={app}
        testId={`coming-app-${app.id}`}
        soon
        state={SOON_LABEL}
      />
    );
  }

  if (held) {
    const openHref = shopAppOpenHref(app, openHandshake);
    return (
      <AppShelfTile
        app={app}
        testId={`open-app-${app.id}`}
        href={openHref}
        onClick={openHref
          ? event => interceptHouseRedeemClick(app, event, onOpen)
          : () => onOpen(app)}
      />
    );
  }

  return (
    <AppShelfTile
      app={app}
      testId={`get-app-${app.id}`}
      state={GET_LABEL}
      onClick={() => onGet(app)}
    />
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
