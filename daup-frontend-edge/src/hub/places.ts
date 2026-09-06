import {
  CHAIN_APP_CHAT,
  CHAIN_APP_EATERY,
  CHAIN_APP_EATOUT,
  CHAIN_APP_FARM,
  CHAIN_APP_MAKER,
  CHAIN_APP_RESELLER,
  EATERY_ROW_BODY,
  HUB_HOME_FALLBACK,
  OPEN_THE_HOUSE_LABEL
} from './copy';
import { EATOUT_SEARCH_HOME } from './eatoutUrls';
import { buildOpenTheHouseUrl } from './ownerArrival';

export interface HubPlaceRow {
  id: 'eatery' | 'farm' | 'reseller' | 'maker';
  title: string;
  body: string;
  live: boolean;
  actionLabel?: string;
  href?: string;
}

export type ShopAppId = 'eatery' | 'eatout' | 'farm' | 'reseller' | 'maker' | 'chat';

export const EATOUT_MODULE_KEY = 'daup-eatout';

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
  placeName: string;
  origin?: string;
}): HubPlaceRow[] {
  const title = eateryRowTitle(args.placeName);
  const email = (args.email || '').trim();
  const href = email
    ? buildOpenTheHouseUrl({
        email,
        house: title,
        origin: args.origin
      })
    : undefined;
  return [
    {
      id: 'eatery',
      title,
      body: EATERY_ROW_BODY,
      live: true,
      actionLabel: OPEN_THE_HOUSE_LABEL,
      href
    }
  ];
}

export const COMING_APPS: HubPlaceRow[] = [
  { id: 'farm', title: CHAIN_APP_FARM, body: '', live: false },
  { id: 'reseller', title: CHAIN_APP_RESELLER, body: '', live: false },
  { id: 'maker', title: CHAIN_APP_MAKER, body: '', live: false }
];

/** Shop catalog for Get apps. Live first. Coming never Get. or Open. */
export const SHOP_APPS: ShopApp[] = [
  { id: 'eatery', title: CHAIN_APP_EATERY, live: true, moduleKey: 'daup-eatery' },
  { id: 'eatout', title: CHAIN_APP_EATOUT, live: true, moduleKey: EATOUT_MODULE_KEY },
  { id: 'farm', title: CHAIN_APP_FARM, live: false, moduleKey: 'daup-farmer' },
  { id: 'reseller', title: CHAIN_APP_RESELLER, live: false, moduleKey: 'daup-reseller' },
  { id: 'maker', title: CHAIN_APP_MAKER, live: false, moduleKey: 'daup-manufacturing' },
  { id: 'chat', title: CHAIN_APP_CHAT, live: false }
];

export const LIVE_SHOP_APPS = SHOP_APPS.filter(app => app.live);
export const COMING_SHOP_APPS = SHOP_APPS.filter(app => !app.live);

export function shopAppIsHeld(app: ShopApp, held: {
  hasHouse?: boolean;
  installed?: Record<string, boolean>;
}): boolean {
  if (!app.live) return false;
  if (app.id === 'eatery') return Boolean(held.hasHouse);
  if (app.id === 'eatout') {
    return Boolean(held.installed?.[app.moduleKey || EATOUT_MODULE_KEY]);
  }
  if (!app.moduleKey) return false;
  return Boolean(held.installed?.[app.moduleKey]);
}

/** EatOut Open. is search home. Eatery Open. stays a house button — never this href. */
export function shopAppOpenHref(app: ShopApp): string | undefined {
  if (app.id !== 'eatout') return undefined;
  return EATOUT_SEARCH_HOME;
}
