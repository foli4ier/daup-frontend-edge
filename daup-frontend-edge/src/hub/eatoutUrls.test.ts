import { describe, expect, it } from 'vitest';
import {
  DEFAULT_EATOUT_ORIGIN,
  EATOUT_PLACE_PATH_TEMPLATE,
  buildEatOutPlaceUrl,
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
    expect(publicPlaceUrlHitsOwnerFloor(card)).toBe(false);
    expect(publicPlaceUrlHitsOwnerFloor(menu)).toBe(false);
    expect(publicPlaceUrlHitsOwnerFloor(reserve)).toBe(false);
    expect(publicPlaceUrlHitsOwnerFloor('https://eatery.daup.co.za/owner?token=abc')).toBe(true);
    expect(menu).not.toMatch(/eatery\.daup\.co\.za/);
    expect(menu).not.toMatch(/\/owner/);
    expect(hasBannedDoorCopy(SEE_THE_MENU_LABEL + RESERVE_A_TABLE_LABEL)).toBe(false);
  });
});
