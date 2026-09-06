import { describe, expect, it } from 'vitest';
import { CHAIN_APP_EATOUT, GET_LABEL, OPEN_LABEL, hasBannedDoorCopy } from './copy';
import { DEFAULT_EATOUT_ORIGIN, eatoutHomeUrl, publicPlaceUrlHitsOwnerFloor } from './eatoutUrls';
import {
  COMING_SHOP_APPS,
  EATOUT_MODULE_KEY,
  LIVE_SHOP_APPS,
  SHOP_APPS,
  shopAppIsHeld,
  shopAppOpenHref
} from './places';

describe('Get apps. shop catalog', () => {
  it('lists EatOut as LIVE and keeps Coming to Farm / Reseller / Maker / Chat', () => {
    expect(LIVE_SHOP_APPS.map(app => app.id)).toEqual(['eatery', 'eatout']);
    const eatout = LIVE_SHOP_APPS.find(app => app.id === 'eatout');
    expect(eatout?.title).toBe(CHAIN_APP_EATOUT);
    expect(eatout?.title).toBe('EatOut');
    expect(eatout?.live).toBe(true);
    expect(eatout?.moduleKey).toBe(EATOUT_MODULE_KEY);
    expect(COMING_SHOP_APPS.map(app => app.id)).toEqual(['farm', 'reseller', 'maker', 'chat']);
    expect(COMING_SHOP_APPS.some(app => app.id === 'eatout')).toBe(false);
    expect(SHOP_APPS.find(app => app.id === 'eatout')?.live).toBe(true);
    expect(hasBannedDoorCopy(CHAIN_APP_EATOUT)).toBe(false);
  });

  it('holds EatOut by daup-eatout, never hasHouse', () => {
    const eatout = SHOP_APPS.find(app => app.id === 'eatout')!;
    expect(shopAppIsHeld(eatout, { hasHouse: true, installed: {} })).toBe(false);
    expect(shopAppIsHeld(eatout, { hasHouse: false, installed: { 'daup-eatout': true } })).toBe(true);
    expect(shopAppIsHeld(eatout, { hasHouse: true, installed: { 'daup-eatery': true } })).toBe(false);
    expect(shopAppIsHeld(eatout, { hasHouse: true, installed: { [EATOUT_MODULE_KEY]: true } })).toBe(true);
  });

  it('still holds Eatery by hasHouse only', () => {
    const eatery = SHOP_APPS.find(app => app.id === 'eatery')!;
    expect(shopAppIsHeld(eatery, { hasHouse: true, installed: {} })).toBe(true);
    expect(shopAppIsHeld(eatery, { hasHouse: false, installed: { 'daup-eatery': true } })).toBe(false);
    expect(shopAppOpenHref(eatery)).toBeUndefined();
  });

  it('Open. for EatOut is diner home, never eatery owner Floor', () => {
    const eatout = SHOP_APPS.find(app => app.id === 'eatout')!;
    const href = shopAppOpenHref(eatout);
    expect(href).toBe(`${DEFAULT_EATOUT_ORIGIN}/`);
    expect(href).toBe(eatoutHomeUrl());
    expect(href).not.toMatch(/eatery\.daup\.co\.za|\/owner|\/floor/i);
    expect(publicPlaceUrlHitsOwnerFloor(href || '')).toBe(false);
    expect(GET_LABEL).toBe('Get.');
    expect(OPEN_LABEL).toBe('Open.');
  });
});
