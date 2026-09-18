import { describe, expect, it, beforeEach } from 'vitest';
import {
  flattenChainPlaces,
  groupPlacesOnTheChain,
  chainPlaceRow,
  chainPlaceWhere,
  filterOtherPlaces,
  listOtherPlacesAppCards,
  listOtherPlacesForApp,
  SAMPLE_OTHER_EATERY_PLACES
} from './placeDirectory';
import {
  BANNED_DOOR_WORDS,
  CHAIN_APP_EATERY,
  CHAIN_APP_FARM,
  CHAIN_APP_MAKER,
  NAV_OTHER_PLACES_LABEL,
  NAV_PLACES_LABEL,
  OTHER_PLACES_KICKER,
  SAMPLE_SOURCE_LABEL,
  hasBannedDoorCopy,
  otherPlacesSourceLabel,
  subscribedCountLabel
} from './copy';
import {
  PLATFORM_ENTITIES_KEY,
  DEFAULT_VAULT,
  applyHousePlacesToVault,
  getRegisteredLegalNames,
  listRegisteredPlaces,
  mergeHousePlacesIntoPlatform,
  heldPlaceIdForHouse,
  placeIdFromHubWallet,
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

describe('Other places. copy', () => {
  it('uses kitchen English and keeps banned protocol words off', () => {
    expect(NAV_PLACES_LABEL).toBe('My places');
    expect(NAV_OTHER_PLACES_LABEL).toBe('Other places');
    expect(OTHER_PLACES_KICKER).toBe('Other places.');
    expect(subscribedCountLabel(4)).toBe('4 subscribed.');
    expect(otherPlacesSourceLabel(0, 4)).toBe(SAMPLE_SOURCE_LABEL);
    expect(otherPlacesSourceLabel(1, 3)).toBe('1 on this hub. 3 sample.');
    expect(chainPlaceWhere(olive)).toBe('Stellenbosch, Western Cape, South Africa');
    expect(chainPlaceRow(olive)).toBe('The Olive · Stellenbosch, Western Cape, South Africa · Eatery');
    for (const word of BANNED_DOOR_WORDS) {
      expect(hasBannedDoorCopy(NAV_PLACES_LABEL), `banned "${word}" in My places`).toBe(false);
      expect(hasBannedDoorCopy(NAV_OTHER_PLACES_LABEL), `banned "${word}" in Other places`).toBe(false);
      expect(hasBannedDoorCopy(subscribedCountLabel(4)), `banned "${word}" in count`).toBe(false);
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

describe('Other places discovery', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('marks Eatery sample counts and keeps owned places off the list', () => {
    registerPlaceOnPlatform(olive);
    registerPlaceOnPlatform(salt);
    const owner = { email: 'owner@theolive.co.za', placeNames: ['The Olive'] };
    const cards = listOtherPlacesAppCards(owner);
    const eatery = cards.find(card => card.id === 'eatery');
    expect(eatery?.publicSurface).toBe(true);
    expect(eatery?.sampleCount).toBe(SAMPLE_OTHER_EATERY_PLACES.length);
    expect(eatery?.liveCount).toBe(1);
    expect(eatery?.total).toBe(SAMPLE_OTHER_EATERY_PLACES.length + 1);
    const names = listOtherPlacesForApp('eatery', owner).map(place => place.placeName);
    expect(names).toContain('Salt');
    expect(names).toContain('Kortrijk');
    expect(names).not.toContain('The Olive');
    const farm = cards.find(card => card.id === 'farm');
    expect(farm?.publicSurface).toBe(false);
    expect(farm?.total).toBe(0);
  });

  it('filters Country · Region · Town', () => {
    const places = listOtherPlacesForApp('eatery');
    const cape = filterOtherPlaces(places, { country: 'South Africa', region: 'Western Cape', town: 'Cape Town' });
    expect(cape.map(place => place.placeName)).toEqual(['Genesis Bistro']);
    const belgium = filterOtherPlaces(places, { country: 'Belgium' });
    expect(belgium.map(place => place.placeName)).toEqual(['Kortrijk']);
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

  it('keeps placeId from the house node on upsert', () => {
    registerPlaceOnPlatform({ ...olive, placeId: 'place-olive', ownerEmail: 'you@gmail.com' });
    registerPlaceOnPlatform({ ...olive, city: 'Franschhoek' });
    expect(listRegisteredPlaces()[0]).toEqual({
      ...olive,
      city: 'Franschhoek',
      placeId: 'place-olive',
      ownerEmail: 'you@gmail.com'
    });
  });
});

describe('applyHousePlacesToVault', () => {
  it('applies the first listed place when the vault has no house', () => {
    const next = applyHousePlacesToVault(DEFAULT_VAULT, 'you@gmail.com', [{
      ...olive,
      placeId: 'place-olive'
    }]);
    expect(next.hasCompletedOnboarding).toBe(true);
    expect(next.activeWallet?.legalName).toBe('The Olive');
    expect(next.profile.demographics.email).toBe('you@gmail.com');
    expect(next.profile.location.city).toBe('Stellenbosch');
    expect(placeIdFromHubWallet(next.activeWallet)).toBe('place-olive');
  });

  it('reads the placeId Hub currently holds after a re-seed, never a hardcoded seed', () => {
    localStorage.clear();
    registerPlaceOnPlatform({ ...olive, placeId: 'place-old-seed' });
    expect(heldPlaceIdForHouse('The Olive')).toBe('place-old-seed');
    registerPlaceOnPlatform({ ...olive, placeId: 'place-reseed-now' });
    expect(heldPlaceIdForHouse('The Olive')).toBe('place-reseed-now');
    expect(heldPlaceIdForHouse('The Olive')).not.toBe('3b2ee9b8-8c92-4cda-a862-66fe10fc6f59');
  });

  it('does not overwrite an existing named house', () => {
    const housed = applyHousePlacesToVault(DEFAULT_VAULT, 'you@gmail.com', [olive]);
    const again = applyHousePlacesToVault(housed, 'you@gmail.com', [salt]);
    expect(again.activeWallet?.legalName).toBe('The Olive');
  });

  it('merges house-node places into the platform store', () => {
    localStorage.clear();
    mergeHousePlacesIntoPlatform([olive, salt]);
    expect(listRegisteredPlaces().map(place => place.placeName)).toEqual(['The Olive', 'Salt']);
  });
});
