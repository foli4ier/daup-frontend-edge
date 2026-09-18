import {
  CHAIN_APP_CHAT,
  CHAIN_APP_EATERY,
  CHAIN_APP_FARM,
  CHAIN_APP_LABELS,
  CHAIN_APP_MAKER,
  CHAIN_APP_PROJECT,
  CHAIN_APP_RESELLER
} from './copy';
import {
  PLATFORM_APP_IDS,
  PlatformAppId,
  PlatformPlaceRecord,
  listRegisteredPlaces
} from '../stores/identityStore';

export const CHAIN_APP_ORDER: PlatformAppId[] = [...PLATFORM_APP_IDS];

export interface ChainCityGroup {
  city: string;
  places: PlatformPlaceRecord[];
}

export interface ChainRegionGroup {
  region: string;
  cities: ChainCityGroup[];
}

export interface ChainCountryGroup {
  country: string;
  regions: ChainRegionGroup[];
}

export interface ChainAppGroup {
  app: PlatformAppId;
  appLabel: string;
  countries: ChainCountryGroup[];
}

function localeSort(a: string, b: string): number {
  return a.localeCompare(b, undefined, { sensitivity: 'base' });
}

export function chainAppLabel(app: PlatformAppId | string): string {
  if (app === 'farm' || app === 'reseller' || app === 'maker' || app === 'eatery') {
    return CHAIN_APP_LABELS[app];
  }
  return CHAIN_APP_LABELS.eatery;
}

/** Kitchen where-line: city, region, country. */
export function chainPlaceWhere(place: Pick<PlatformPlaceRecord, 'city' | 'region' | 'country'>): string {
  return [place.city, place.region, place.country].map(part => (part || '').trim()).filter(Boolean).join(', ');
}

/** Place name + city, region, country + which app. */
export function chainPlaceRow(place: PlatformPlaceRecord): string {
  const where = chainPlaceWhere(place);
  const app = chainAppLabel(place.app);
  return where ? `${place.placeName} · ${where} · ${app}` : `${place.placeName} · ${app}`;
}

export function groupPlacesOnTheChain(places: PlatformPlaceRecord[]): ChainAppGroup[] {
  const byApp = new Map<PlatformAppId, PlatformPlaceRecord[]>();
  for (const place of places) {
    const app = CHAIN_APP_ORDER.includes(place.app) ? place.app : 'eatery';
    const bucket = byApp.get(app) || [];
    bucket.push(place);
    byApp.set(app, bucket);
  }

  return CHAIN_APP_ORDER
    .filter(app => (byApp.get(app) || []).length > 0)
    .map(app => ({
      app,
      appLabel: chainAppLabel(app),
      countries: groupCountries(byApp.get(app) || [])
    }));
}

function groupCountries(places: PlatformPlaceRecord[]): ChainCountryGroup[] {
  const byCountry = new Map<string, PlatformPlaceRecord[]>();
  for (const place of places) {
    const key = (place.country || '').trim();
    const bucket = byCountry.get(key) || [];
    bucket.push(place);
    byCountry.set(key, bucket);
  }
  return [...byCountry.keys()]
    .sort(localeSort)
    .map(country => ({
      country,
      regions: groupRegions(byCountry.get(country) || [])
    }));
}

function groupRegions(places: PlatformPlaceRecord[]): ChainRegionGroup[] {
  const byRegion = new Map<string, PlatformPlaceRecord[]>();
  for (const place of places) {
    const key = (place.region || '').trim();
    const bucket = byRegion.get(key) || [];
    bucket.push(place);
    byRegion.set(key, bucket);
  }
  return [...byRegion.keys()]
    .sort(localeSort)
    .map(region => ({
      region,
      cities: groupCities(byRegion.get(region) || [])
    }));
}

function groupCities(places: PlatformPlaceRecord[]): ChainCityGroup[] {
  const byCity = new Map<string, PlatformPlaceRecord[]>();
  for (const place of places) {
    const key = (place.city || '').trim();
    const bucket = byCity.get(key) || [];
    bucket.push(place);
    byCity.set(key, bucket);
  }
  return [...byCity.keys()]
    .sort(localeSort)
    .map(city => ({
      city,
      places: (byCity.get(city) || []).slice().sort((a, b) => localeSort(a.placeName, b.placeName))
    }));
}

export function flattenChainPlaces(groups: ChainAppGroup[]): PlatformPlaceRecord[] {
  const rows: PlatformPlaceRecord[] = [];
  for (const app of groups) {
    for (const country of app.countries) {
      for (const region of country.regions) {
        for (const city of region.cities) {
          rows.push(...city.places);
        }
      }
    }
  }
  return rows;
}

export function listPlacesOnTheChain(): PlatformPlaceRecord[] {
  return listRegisteredPlaces();
}

/** Apps shown on Other places. Eatery has a public EatOut surface; the rest are Coming. */
export type OtherPlacesAppId = PlatformAppId | 'project' | 'chat';
export type OtherPlaceSource = 'live' | 'sample';

export interface OtherPlaceRecord extends PlatformPlaceRecord {
  source: OtherPlaceSource;
}

export interface OtherPlacesAppCard {
  id: OtherPlacesAppId;
  title: string;
  publicSurface: boolean;
  liveCount: number;
  sampleCount: number;
  total: number;
}

export const OTHER_PLACES_APPS: { id: OtherPlacesAppId; title: string; publicSurface: boolean }[] = [
  { id: 'eatery', title: CHAIN_APP_EATERY, publicSurface: true },
  { id: 'project', title: CHAIN_APP_PROJECT, publicSurface: false },
  { id: 'farm', title: CHAIN_APP_FARM, publicSurface: false },
  { id: 'reseller', title: CHAIN_APP_RESELLER, publicSurface: false },
  { id: 'maker', title: CHAIN_APP_MAKER, publicSurface: false },
  { id: 'chat', title: CHAIN_APP_CHAT, publicSurface: false }
];

/**
 * Sample Eatery directory. No live public directory API exists on Hub yet.
 * EatOut resolves kortrijk | genesis | noop; other names slug from the place name.
 */
export const SAMPLE_OTHER_EATERY_PLACES: PlatformPlaceRecord[] = [
  {
    placeName: 'Kortrijk',
    app: 'eatery',
    country: 'Belgium',
    region: 'West Flanders',
    city: 'Kortrijk'
  },
  {
    placeName: 'Genesis Bistro',
    app: 'eatery',
    country: 'South Africa',
    region: 'Western Cape',
    city: 'Cape Town'
  },
  {
    placeName: 'Noop Restaurant',
    app: 'eatery',
    country: 'South Africa',
    region: 'Western Cape',
    city: 'Stellenbosch'
  },
  {
    placeName: 'The Press Café',
    app: 'eatery',
    country: 'United Kingdom',
    region: 'England',
    city: 'London'
  }
];

function normalizePlaceName(name: string): string {
  return (name || '').trim().toLowerCase();
}

export function isOwnedOtherPlace(
  place: Pick<PlatformPlaceRecord, 'placeName' | 'ownerEmail'>,
  owner?: { email?: string; placeNames?: readonly string[] }
): boolean {
  const names = new Set((owner?.placeNames || []).map(normalizePlaceName).filter(Boolean));
  if (names.has(normalizePlaceName(place.placeName))) return true;
  const email = (owner?.email || '').trim().toLowerCase();
  const placeEmail = (place.ownerEmail || '').trim().toLowerCase();
  return Boolean(email && placeEmail && email === placeEmail);
}

/** Live = this hub's platform store minus the owner's own places. Not a network directory. */
export function listLiveOtherPlaces(owner?: {
  email?: string;
  placeNames?: readonly string[];
}): PlatformPlaceRecord[] {
  return listRegisteredPlaces().filter(place => !isOwnedOtherPlace(place, owner));
}

export function samplePlacesForApp(app: OtherPlacesAppId): PlatformPlaceRecord[] {
  if (app === 'eatery') return SAMPLE_OTHER_EATERY_PLACES.slice();
  return [];
}

export function mergeOtherPlaces(
  live: PlatformPlaceRecord[],
  sample: PlatformPlaceRecord[]
): OtherPlaceRecord[] {
  const byName = new Map<string, OtherPlaceRecord>();
  for (const place of sample) {
    byName.set(normalizePlaceName(place.placeName), { ...place, source: 'sample' });
  }
  for (const place of live) {
    byName.set(normalizePlaceName(place.placeName), { ...place, source: 'live' });
  }
  return [...byName.values()].sort((a, b) => localeSort(a.placeName, b.placeName));
}

export function listOtherPlacesForApp(
  app: OtherPlacesAppId,
  owner?: { email?: string; placeNames?: readonly string[] }
): OtherPlaceRecord[] {
  const live = listLiveOtherPlaces(owner).filter(place => {
    if (app === 'eatery' || app === 'farm' || app === 'reseller' || app === 'maker') {
      return place.app === app;
    }
    return false;
  });
  const sample = samplePlacesForApp(app).filter(place => !isOwnedOtherPlace(place, owner));
  return mergeOtherPlaces(live, sample);
}

export function listOtherPlacesAppCards(owner?: {
  email?: string;
  placeNames?: readonly string[];
}): OtherPlacesAppCard[] {
  return OTHER_PLACES_APPS.map(app => {
    const places = listOtherPlacesForApp(app.id, owner);
    const liveCount = places.filter(place => place.source === 'live').length;
    const sampleCount = places.filter(place => place.source === 'sample').length;
    return {
      ...app,
      liveCount,
      sampleCount,
      total: places.length
    };
  });
}

export function uniqueFilterValues(
  places: Array<Pick<PlatformPlaceRecord, 'country' | 'region' | 'city'>>,
  key: 'country' | 'region' | 'city'
): string[] {
  return [...new Set(places.map(place => (place[key] || '').trim()).filter(Boolean))].sort(localeSort);
}

export function filterOtherPlaces(
  places: OtherPlaceRecord[],
  filters: { country?: string; region?: string; town?: string }
): OtherPlaceRecord[] {
  const country = (filters.country || '').trim();
  const region = (filters.region || '').trim();
  const town = (filters.town || '').trim();
  return places.filter(place => {
    if (country && (place.country || '').trim() !== country) return false;
    if (region && (place.region || '').trim() !== region) return false;
    if (town && (place.city || '').trim() !== town) return false;
    return true;
  });
}
