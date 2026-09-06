import { describe, expect, it } from 'vitest';
import {
  DEFAULT_EATOUT_ORIGIN,
  EATOUT_PLACE_PATH_TEMPLATE,
  EATOUT_SEARCH_HOME,
  buildEatOutPlaceUrl,
  eatoutHomeUrl,
  eatoutOpenHitsPlaceOrHub,
  eatoutPlaceHrefs,
  isEatOutSearchHome,
  navigateToEatOutHome,
  placePublicSlug,
  publicPlaceUrlHitsOwnerFloor
} from './eatoutUrls';
import { RESERVE_A_TABLE_LABEL, SEE_THE_MENU_LABEL, hasBannedDoorCopy } from './copy';

describe('EatOut public place URLs', () => {
  it('builds eatout.daup.co.za/place/{slug} and never owner Floor', () => {
    expect(EATOUT_PLACE_PATH_TEMPLATE).toBe('/place/{slug}');
    expect(placePublicSlug('The Olive')).toBe('the-olive');
    const card = buildEatOutPlaceUrl({ placeName: 'The Olive' });
    const menu = buildEatOutPlaceUrl({ placeName: 'The Olive', focus: 'menu' });
    const reserve = buildEatOutPlaceUrl({ placeName: 'The Olive', focus: 'reserve' });
    const book = buildEatOutPlaceUrl({ placeName: 'Kortrijk', focus: 'book' });
    expect(card).toBe(`${DEFAULT_EATOUT_ORIGIN}/place/the-olive`);
    expect(menu).toBe(`${DEFAULT_EATOUT_ORIGIN}/place/the-olive#menu`);
    expect(reserve).toBe(`${DEFAULT_EATOUT_ORIGIN}/place/the-olive#book`);
    expect(book).toBe(`${DEFAULT_EATOUT_ORIGIN}/place/kortrijk#book`);
    expect(placePublicSlug('Kortrijk')).toBe('kortrijk');
    expect(placePublicSlug('Kortrijk Bistro & Grill')).toBe('kortrijk');
    expect(placePublicSlug('Genesis Bistro')).toBe('genesis');
    expect(placePublicSlug('Noop Restaurant')).toBe('noop');
    expect(eatoutPlaceHrefs('Kortrijk')).toEqual({
      id: 'kortrijk',
      place: `${DEFAULT_EATOUT_ORIGIN}/place/kortrijk`,
      menu: `${DEFAULT_EATOUT_ORIGIN}/place/kortrijk#menu`,
      book: `${DEFAULT_EATOUT_ORIGIN}/place/kortrijk#book`
    });
    expect(eatoutPlaceHrefs('Genesis Bistro').menu).toBe(`${DEFAULT_EATOUT_ORIGIN}/place/genesis#menu`);
    expect(eatoutPlaceHrefs('Noop Restaurant').book).toBe(`${DEFAULT_EATOUT_ORIGIN}/place/noop#book`);
    expect(eatoutPlaceHrefs('Kortrijk').menu).not.toMatch(/eatery\.daup\.co\.za|\/owner|#reserve/);
    expect(publicPlaceUrlHitsOwnerFloor(card)).toBe(false);
    expect(publicPlaceUrlHitsOwnerFloor(menu)).toBe(false);
    expect(publicPlaceUrlHitsOwnerFloor(reserve)).toBe(false);
    expect(publicPlaceUrlHitsOwnerFloor('https://eatery.daup.co.za/owner?token=abc')).toBe(true);
    expect(menu).not.toMatch(/eatery\.daup\.co\.za/);
    expect(menu).not.toMatch(/\/owner/);
    expect(hasBannedDoorCopy(SEE_THE_MENU_LABEL + RESERVE_A_TABLE_LABEL)).toBe(false);
  });

  it('Open. search home is exactly https://eatout.daup.co.za/', () => {
    const home = eatoutHomeUrl();
    expect(home).toBe('https://eatout.daup.co.za/');
    expect(home).toBe(EATOUT_SEARCH_HOME);
    expect(isEatOutSearchHome(home)).toBe(true);
    expect(home).not.toMatch(/\/place\/|#menu|#book/i);
    expect(eatoutOpenHitsPlaceOrHub(home)).toBe(false);
    expect(eatoutOpenHitsPlaceOrHub(`${DEFAULT_EATOUT_ORIGIN}/place/the-olive#menu`)).toBe(true);
    expect(eatoutOpenHitsPlaceOrHub('https://app.daup.co.za/')).toBe(true);
    expect(publicPlaceUrlHitsOwnerFloor(home)).toBe(false);
    expect(navigateToEatOutHome.toString()).toContain('location.assign');
    expect(navigateToEatOutHome.toString()).toContain('EATOUT_SEARCH_HOME');
    expect(navigateToEatOutHome.toString()).not.toContain('/place/');
    expect(navigateToEatOutHome.toString()).not.toContain('/owner');
  });
});
