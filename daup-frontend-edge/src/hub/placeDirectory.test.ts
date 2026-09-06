import { describe, expect, it, beforeEach } from 'vitest';
import {
  flattenChainPlaces,
  groupPlacesOnTheChain,
  chainPlaceRow,
  chainPlaceWhere
} from './placeDirectory';
import {
  BANNED_DOOR_WORDS,
  CHAIN_APP_EATERY,
  CHAIN_APP_FARM,
  CHAIN_APP_MAKER,
  ON_THE_CHAIN_EMPTY,
  ON_THE_CHAIN_KICKER,
  hasBannedDoorCopy
} from './copy';
import {
  PLATFORM_ENTITIES_KEY,
  getRegisteredLegalNames,
  listRegisteredPlaces,
  registerLegalNameOnPlatform,
  registerPlaceOnPlatform,
  unregisterLegalNameOnPlatform,
  PlatformPlaceRecord
} from '../stores/identityStore';

const olive: PlatformPlaceRecord = {
  placeName: 'The Olive',
  app: 'eatery',
  country: 'South Africa',
  region: 'Western Cape',
  city: 'Stellenbosch'
};

const salt: PlatformPlaceRecord = {
  placeName: 'Salt',
  app: 'eatery',
  country: 'South Africa',
  region: 'Western Cape',
  city: 'Cape Town'
};

const braai: PlatformPlaceRecord = {
  placeName: 'Braai',
  app: 'eatery',
  country: 'South Africa',
  region: 'Gauteng',
  city: 'Johannesburg'
};

const greenField: PlatformPlaceRecord = {
  placeName: 'Green Field',
  app: 'farm',
  country: 'Kenya',
  region: 'Nairobi',
  city: 'Nairobi'
};

const press: PlatformPlaceRecord = {
  placeName: 'Press',
  app: 'maker',
  country: 'United States',
  region: 'Texas',
  city: 'Austin'
};

describe('On the chain. copy', () => {
  it('uses kitchen English and keeps banned protocol words off', () => {
    expect(ON_THE_CHAIN_KICKER).toBe('On the chain.');
    expect(ON_THE_CHAIN_EMPTY).toBe('No other places on the chain yet.');
    expect(chainPlaceWhere(olive)).toBe('Stellenbosch, Western Cape, South Africa');
    expect(chainPlaceRow(olive)).toBe('The Olive · Stellenbosch, Western Cape, South Africa · Eatery');
    for (const word of BANNED_DOOR_WORDS) {
      expect(hasBannedDoorCopy(ON_THE_CHAIN_KICKER), `banned "${word}" in kicker`).toBe(false);
      expect(hasBannedDoorCopy(ON_THE_CHAIN_EMPTY), `banned "${word}" in empty`).toBe(false);
      expect(hasBannedDoorCopy(chainPlaceRow(olive)), `banned "${word}" on place row`).toBe(false);
    }
  });
});

describe('groupPlacesOnTheChain', () => {
  it('nests App → Country → Region → City → place name', () => {
    const groups = groupPlacesOnTheChain([press, olive, greenField, salt, braai]);
    expect(groups.map(group => group.appLabel)).toEqual([
      CHAIN_APP_EATERY,
      CHAIN_APP_FARM,
      CHAIN_APP_MAKER
    ]);
    expect(groups[0].countries[0].country).toBe('South Africa');
    expect(groups[0].countries[0].regions.map(region => region.region)).toEqual([
      'Gauteng',
      'Western Cape'
    ]);
    expect(groups[0].countries[0].regions[1].cities.map(city => city.city)).toEqual([
      'Cape Town',
      'Stellenbosch'
    ]);
    expect(flattenChainPlaces(groups).map(place => place.placeName)).toEqual([
      'Braai',
      'Salt',
      'The Olive',
      'Green Field',
      'Press'
    ]);
  });
});

describe('platform place directory', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('keeps legacy name strings for uniqueness and off the chain list', () => {
    registerLegalNameOnPlatform('The Olive');
    expect(getRegisteredLegalNames()).toEqual(['The Olive']);
    expect(listRegisteredPlaces()).toEqual([]);
    expect(JSON.parse(localStorage.getItem(PLATFORM_ENTITIES_KEY) || '[]')).toEqual(['The Olive']);
  });

  it('writes a rich place and does not let a later name-only register downgrade it', () => {
    registerPlaceOnPlatform(olive);
    registerLegalNameOnPlatform('The Olive');
    expect(listRegisteredPlaces()).toEqual([olive]);
    expect(getRegisteredLegalNames()).toEqual(['The Olive']);
  });

  it('upserts the same place and removes it on unregister', () => {
    registerPlaceOnPlatform(olive);
    registerPlaceOnPlatform({
      ...olive,
      city: 'Franschhoek'
    });
    expect(listRegisteredPlaces()[0].city).toBe('Franschhoek');
    unregisterLegalNameOnPlatform('The Olive');
    expect(listRegisteredPlaces()).toEqual([]);
    expect(getRegisteredLegalNames()).toEqual([]);
  });
});
