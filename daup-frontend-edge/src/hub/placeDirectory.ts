import { CHAIN_APP_LABELS } from './copy';
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
