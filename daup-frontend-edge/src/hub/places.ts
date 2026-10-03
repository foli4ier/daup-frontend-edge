import { ENABLEABLE_APP_IDS } from './companyNode';
import {
  CHAIN_APP_CHAT,
  CHAIN_APP_EATERY,
  CHAIN_APP_EATOUT,
  CHAIN_APP_FARM,
  CHAIN_APP_FINANCE,
  CHAIN_APP_MAKER,
  CHAIN_APP_PROJECT,
  CHAIN_APP_PROPERTY,
  CHAIN_APP_RESELLER,
  CHAIN_APP_TRADE,
  CHAIN_APP_VAULT,
  EATERY_ROW_BODY,
  HUB_HOME_FALLBACK,
  LIVE_STATUS_LABEL,
  OPEN_LABEL
} from './copy';
import { EATOUT_SEARCH_HOME } from './eatoutUrls';
import {
  CHAT_HOME,
  FINANCE_HOME,
  PROPERTY_HOME,
  TRADE_HOME,
  VAULT_HOME,
  appUsesHouseRedeem,
  buildChatOpenUrl,
  buildHouseAppOpenUrl
} from './house-session/openUrl';
import { buildOpenTheHouseUrl } from './ownerArrival';
import { PROJECT_MODULE_KEY, type ProjectOpenHandshake } from './projectUrls';

export { CHAT_HOME, FINANCE_HOME, PROPERTY_HOME, TRADE_HOME, VAULT_HOME };

export interface HubPlaceRow {
  id: string;
  title: string;
  city: string;
  body: string;
  live: boolean;
  status: string;
  actionLabel?: string;
  href?: string;
  placeKey?: string;
  companyId?: string;
  placeId?: string;
  enabledApps?: readonly string[];
}

/** Licensed id first (companyId), then house-network placeId, then name. */
export function ownerPlaceKey(place: {
  companyId?: string | null;
  placeId?: string | null;
  placeName?: string | null;
  title?: string | null;
}): string {
  return (
    (place.companyId || '').trim()
    || (place.placeId || '').trim()
    || (place.placeName || place.title || '').trim()
  );
}

export type ShopAppId = 'eatery' | 'eatout' | 'project' | 'finance' | 'trade' | 'farm' | 'reseller' | 'maker' | 'chat' | 'vault' | 'property';

export const EATOUT_MODULE_KEY = 'daup-eatout';
export const CHAT_MODULE_KEY = 'daup-chat';
export const FINANCE_MODULE_KEY = 'daup-finance';
export const TRADE_MODULE_KEY = 'daup-trade';
export const VAULT_MODULE_KEY = 'daup-vault';
export const PROPERTY_MODULE_KEY = 'daup-property';
export { PROJECT_MODULE_KEY };

export interface ShopApp {
  id: ShopAppId;
  title: string;
  live: boolean;
  moduleKey?: string;
}

export function eateryRowTitle(placeName?: string | null): string {
  const name = (placeName || '').trim();
  return name || HUB_HOME_FALLBACK;
}

export function listOwnerPlaces(args: {
  email: string;
  placeName?: string;
  city?: string;
  origin?: string;
  records?: Array<{
    placeName: string;
    city?: string;
    placeId?: string;
    companyId?: string;
    enabledApps?: readonly string[];
  }>;
}): HubPlaceRow[] {
  const email = (args.email || '').trim();
  const records = (args.records && args.records.length)
    ? args.records
    : ((args.placeName || '').trim()
      ? [{ placeName: args.placeName || '', city: args.city || '' }]
      : []);
  return records.map((record, index) => {
    const title = eateryRowTitle(record.placeName);
    const href = email
      ? buildOpenTheHouseUrl({
          email,
          house: title,
          placeId: record.placeId,
          origin: args.origin
        })
      : undefined;
    const placeKey = ownerPlaceKey({
      companyId: record.companyId,
      placeId: record.placeId,
      placeName: title
    });
    return {
      id: placeKey || `place-${index}`,
      title,
      city: (record.city || '').trim(),
      body: EATERY_ROW_BODY,
      live: true,
      status: LIVE_STATUS_LABEL,
      actionLabel: OPEN_LABEL,
      href,
      placeKey,
      companyId: (record.companyId || '').trim() || undefined,
      placeId: (record.placeId || '').trim() || undefined,
      enabledApps: record.enabledApps
    };
  });
}

export const COMING_APPS: HubPlaceRow[] = [
  { id: 'farm', title: CHAIN_APP_FARM, city: '', body: '', live: false, status: '' },
  { id: 'reseller', title: CHAIN_APP_RESELLER, city: '', body: '', live: false, status: '' },
  { id: 'maker', title: CHAIN_APP_MAKER, city: '', body: '', live: false, status: '' }
];

/** Shop catalog for Get apps. Live first. Coming never Get. or Open. */
export const SHOP_APPS: ShopApp[] = [
  { id: 'eatery', title: CHAIN_APP_EATERY, live: true, moduleKey: 'daup-eatery' },
  { id: 'eatout', title: CHAIN_APP_EATOUT, live: true, moduleKey: EATOUT_MODULE_KEY },
  { id: 'project', title: CHAIN_APP_PROJECT, live: true, moduleKey: PROJECT_MODULE_KEY },
  { id: 'finance', title: CHAIN_APP_FINANCE, live: true, moduleKey: FINANCE_MODULE_KEY },
  { id: 'trade', title: CHAIN_APP_TRADE, live: true, moduleKey: TRADE_MODULE_KEY },
  { id: 'vault', title: CHAIN_APP_VAULT, live: true, moduleKey: VAULT_MODULE_KEY },
  { id: 'chat', title: CHAIN_APP_CHAT, live: true, moduleKey: CHAT_MODULE_KEY },
  { id: 'property', title: CHAIN_APP_PROPERTY, live: true, moduleKey: PROPERTY_MODULE_KEY },
  { id: 'farm', title: CHAIN_APP_FARM, live: false, moduleKey: 'daup-farmer' },
  { id: 'reseller', title: CHAIN_APP_RESELLER, live: false, moduleKey: 'daup-reseller' },
  { id: 'maker', title: CHAIN_APP_MAKER, live: false, moduleKey: 'daup-manufacturing' }
];

export const LIVE_SHOP_APPS = SHOP_APPS.filter(app => app.live);
export const COMING_SHOP_APPS = SHOP_APPS.filter(app => !app.live);

/** Apps pane IA: Social (top) then Paid. Coming apps stay Coming. */
export const SOCIAL_SHOP_APP_IDS: ShopAppId[] = ['eatout', 'chat'];
export const PAID_SHOP_APP_IDS: ShopAppId[] = ['eatery', 'project', 'finance', 'trade', 'vault', 'property', 'farm', 'reseller', 'maker'];

export const SOCIAL_SHOP_APPS = SOCIAL_SHOP_APP_IDS
  .map(id => SHOP_APPS.find(app => app.id === id))
  .filter((app): app is ShopApp => Boolean(app));
export const PAID_SHOP_APPS = PAID_SHOP_APP_IDS
  .map(id => SHOP_APPS.find(app => app.id === id))
  .filter((app): app is ShopApp => Boolean(app));

/** Place-app picker (wizard + Add apps.). EatOut is consumer — not a place app. */
export const ENABLEABLE_SHOP_APPS = ENABLEABLE_APP_IDS
  .map(id => SHOP_APPS.find(app => app.id === id))
  .filter((app): app is ShopApp => Boolean(app));

export function shopAppIsHeld(app: ShopApp, held: {
  hasHouse?: boolean;
  installed?: Record<string, boolean>;
  enabledApps?: readonly string[];
}): boolean {
  if (!app.live) return false;
  if (app.id === 'eatout') {
    return Boolean(held.installed?.[app.moduleKey || EATOUT_MODULE_KEY]);
  }
  const enabled = Array.isArray(held.enabledApps) ? held.enabledApps : [];
  if (enabled.length > 0) {
    return enabled.includes(app.id);
  }
  // Legacy houses (no enabled_apps): eatery rides hasHouse; others ride installs.
  if (app.id === 'eatery') return Boolean(held.hasHouse);
  if (app.id === 'project') {
    return Boolean(held.installed?.[app.moduleKey || PROJECT_MODULE_KEY]);
  }
  if (app.id === 'chat') {
    return Boolean(held.installed?.[app.moduleKey || CHAT_MODULE_KEY]);
  }
  if (app.id === 'vault') {
    return Boolean(held.installed?.[app.moduleKey || VAULT_MODULE_KEY]);
  }
  if (app.id === 'property') {
    return Boolean(held.installed?.[app.moduleKey || PROPERTY_MODULE_KEY]);
  }
  if (!app.moduleKey) return false;
  return Boolean(held.installed?.[app.moduleKey]);
}

/**
 * EatOut Open. is search home. Chat Open. is the chat host with no redeem.
 * Finance, Trade, Vault, Project, Property, and Eatery use house Open URLs
 * (hints, and houseRedeem once the seed has issued one).
 */
export function shopAppOpenHref(app: ShopApp, handshake?: ProjectOpenHandshake): string | undefined {
  if (!app.live) return undefined;
  if (app.id === 'eatout') return EATOUT_SEARCH_HOME;
  if (app.id === 'chat') return buildChatOpenUrl();
  if (appUsesHouseRedeem(app.id)) {
    return buildHouseAppOpenUrl(app.id, {
      email: handshake?.email,
      house: handshake?.house,
      placeIds: handshake?.placeIds,
      houseRedeem: handshake?.houseRedeem
    });
  }
  return undefined;
}

/** Door click for a house app. Chat and EatOut keep their own hrefs. */
export function interceptHouseRedeemClick(
  app: ShopApp,
  event: { preventDefault(): void },
  onOpen: (app: ShopApp) => void
): void {
  if (!appUsesHouseRedeem(app.id)) return;
  event.preventDefault();
  onOpen(app);
}

/** Same-tab navigation. Does not ping the host first. */
export function navigateSameTab(url: string): string {
  if (typeof window !== 'undefined') {
    try {
      window.location.assign(url);
    } catch {
      // jsdom and some browsers throw on cross-origin assign in tests
    }
  }
  return url;
}

export function navigateToChatHome(): string {
  return navigateSameTab(CHAT_HOME);
}

export function navigateToVaultHome(): string {
  return navigateSameTab(VAULT_HOME);
}

export function navigateToPropertyHome(): string {
  return navigateSameTab(PROPERTY_HOME);
}

/**
 * Bare same-tab host for Chat, Vault, or Property.
 * Door Open. for Finance, Trade, Vault, Project, Property, and Eatery issues
 * a houseRedeem instead of calling this. Chat stays on this path.
 */
export function launchHeldModule(moduleName: string): string | undefined {
  if (moduleName === CHAT_MODULE_KEY) return navigateToChatHome();
  if (moduleName === VAULT_MODULE_KEY) return navigateToVaultHome();
  if (moduleName === PROPERTY_MODULE_KEY) return navigateToPropertyHome();
  return undefined;
}
