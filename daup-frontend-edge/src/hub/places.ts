import { ENABLEABLE_APP_IDS } from './companyNode';
import {
  CHAIN_APP_CHAT,
  CHAIN_APP_EATERY,
  CHAIN_APP_EATOUT,
  CHAIN_APP_FARM,
  CHAIN_APP_MAKER,
  CHAIN_APP_PROJECT,
  CHAIN_APP_RESELLER,
  EATERY_ROW_BODY,
  HUB_HOME_FALLBACK,
  LIVE_STATUS_LABEL,
  OPEN_LABEL
} from './copy';
import { EATOUT_SEARCH_HOME } from './eatoutUrls';
import { buildOpenTheHouseUrl } from './ownerArrival';
import { PROJECT_HOME, PROJECT_MODULE_KEY, ProjectOpenHandshake, buildProjectOpenUrl } from './projectUrls';

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

export type ShopAppId = 'eatery' | 'eatout' | 'project' | 'farm' | 'reseller' | 'maker' | 'chat';

export const EATOUT_MODULE_KEY = 'daup-eatout';
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
  { id: 'farm', title: CHAIN_APP_FARM, live: false, moduleKey: 'daup-farmer' },
  { id: 'reseller', title: CHAIN_APP_RESELLER, live: false, moduleKey: 'daup-reseller' },
  { id: 'maker', title: CHAIN_APP_MAKER, live: false, moduleKey: 'daup-manufacturing' },
  { id: 'chat', title: CHAIN_APP_CHAT, live: false }
];

export const LIVE_SHOP_APPS = SHOP_APPS.filter(app => app.live);
export const COMING_SHOP_APPS = SHOP_APPS.filter(app => !app.live);

/** Apps pane IA: Social (top) then Paid. Coming apps stay Coming. */
export const SOCIAL_SHOP_APP_IDS: ShopAppId[] = ['eatout', 'chat'];
export const PAID_SHOP_APP_IDS: ShopAppId[] = ['eatery', 'project', 'farm', 'reseller', 'maker'];

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
  if (!app.moduleKey) return false;
  return Boolean(held.installed?.[app.moduleKey]);
}

/**
 * EatOut Open. is search home. Project Open. is project.daup.co.za
 * (email + house → /d/hub?token= — see projectUrls.ts).
 * Eatery Open. stays a house button — never this href.
 */
export function shopAppOpenHref(app: ShopApp, handshake?: ProjectOpenHandshake): string | undefined {
  if (app.id === 'eatout') return EATOUT_SEARCH_HOME;
  if (app.id === 'project') return buildProjectOpenUrl(handshake) || PROJECT_HOME;
  return undefined;
}
