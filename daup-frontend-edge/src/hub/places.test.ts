import { describe, expect, it } from 'vitest';
import { CHAIN_APP_EATOUT, CHAIN_APP_PROJECT, GET_LABEL, OPEN_LABEL, hasBannedDoorCopy } from './copy';
import {
  EATOUT_SEARCH_HOME,
  eatoutHomeUrl,
  eatoutOpenHitsPlaceOrHub,
  isEatOutSearchHome,
  publicPlaceUrlHitsOwnerFloor
} from './eatoutUrls';
import {
  COMING_SHOP_APPS,
  EATOUT_MODULE_KEY,
  LIVE_SHOP_APPS,
  PROJECT_MODULE_KEY,
  SHOP_APPS,
  shopAppIsHeld,
  shopAppOpenHref
} from './places';
import { PROJECT_HOME, buildProjectOpenUrl, projectOpenHandshakeFromHub } from './projectUrls';
import { readOwnerArrivalToken } from './ownerArrival';

describe('Get apps. shop catalog', () => {
  it('lists EatOut and Project as LIVE and keeps Coming to Farm / Reseller / Maker / Chat', () => {
    expect(LIVE_SHOP_APPS.map(app => app.id)).toEqual(['eatery', 'eatout', 'project']);
    const eatout = LIVE_SHOP_APPS.find(app => app.id === 'eatout');
    expect(eatout?.title).toBe(CHAIN_APP_EATOUT);
    expect(eatout?.title).toBe('EatOut');
    expect(eatout?.live).toBe(true);
    expect(eatout?.moduleKey).toBe(EATOUT_MODULE_KEY);
    const project = LIVE_SHOP_APPS.find(app => app.id === 'project');
    expect(project?.title).toBe(CHAIN_APP_PROJECT);
    expect(project?.title).toBe('Project');
    expect(project?.live).toBe(true);
    expect(project?.moduleKey).toBe(PROJECT_MODULE_KEY);
    expect(COMING_SHOP_APPS.map(app => app.id)).toEqual(['farm', 'reseller', 'maker', 'chat']);
    expect(COMING_SHOP_APPS.some(app => app.id === 'eatout' || app.id === 'project')).toBe(false);
    expect(SHOP_APPS.find(app => app.id === 'eatout')?.live).toBe(true);
    expect(SHOP_APPS.find(app => app.id === 'project')?.live).toBe(true);
    expect(hasBannedDoorCopy(CHAIN_APP_EATOUT)).toBe(false);
    expect(hasBannedDoorCopy(CHAIN_APP_PROJECT)).toBe(false);
  });

  it('holds EatOut by daup-eatout, never hasHouse', () => {
    const eatout = SHOP_APPS.find(app => app.id === 'eatout')!;
    expect(shopAppIsHeld(eatout, { hasHouse: true, installed: {} })).toBe(false);
    expect(shopAppIsHeld(eatout, { hasHouse: false, installed: { 'daup-eatout': true } })).toBe(true);
    expect(shopAppIsHeld(eatout, { hasHouse: true, installed: { 'daup-eatery': true } })).toBe(false);
    expect(shopAppIsHeld(eatout, { hasHouse: true, installed: { [EATOUT_MODULE_KEY]: true } })).toBe(true);
  });

  it('holds Project by daup-project, never hasHouse', () => {
    const project = SHOP_APPS.find(app => app.id === 'project')!;
    expect(shopAppIsHeld(project, { hasHouse: true, installed: {} })).toBe(false);
    expect(shopAppIsHeld(project, { hasHouse: false, installed: { 'daup-project': true } })).toBe(true);
    expect(shopAppIsHeld(project, { hasHouse: true, installed: { 'daup-eatout': true } })).toBe(false);
    expect(shopAppIsHeld(project, { hasHouse: true, installed: { [PROJECT_MODULE_KEY]: true } })).toBe(true);
  });

  it('still holds Eatery by hasHouse only', () => {
    const eatery = SHOP_APPS.find(app => app.id === 'eatery')!;
    expect(shopAppIsHeld(eatery, { hasHouse: true, installed: {} })).toBe(true);
    expect(shopAppIsHeld(eatery, { hasHouse: false, installed: { 'daup-eatery': true } })).toBe(false);
    expect(shopAppOpenHref(eatery)).toBeUndefined();
  });

  it('Open. for EatOut is search home, never a place page or the hub', () => {
    const eatout = SHOP_APPS.find(app => app.id === 'eatout')!;
    const href = shopAppOpenHref(eatout);
    expect(href).toBe('https://eatout.daup.co.za/');
    expect(href).toBe(EATOUT_SEARCH_HOME);
    expect(href).toBe(eatoutHomeUrl());
    expect(isEatOutSearchHome(href || '')).toBe(true);
    expect(href).not.toMatch(/\/place\/|#menu|#book|eatery\.daup\.co\.za|\/owner|app\.daup\.co\.za/i);
    expect(eatoutOpenHitsPlaceOrHub(href || '')).toBe(false);
    expect(eatoutOpenHitsPlaceOrHub('https://eatout.daup.co.za/place/kortrijk#menu')).toBe(true);
    expect(publicPlaceUrlHitsOwnerFloor(href || '')).toBe(false);
    expect(GET_LABEL).toBe('Get.');
    expect(OPEN_LABEL).toBe('Open.');
  });

  it('Open. for Project is project.daup.co.za, never the hub or eatery /owner', () => {
    const project = SHOP_APPS.find(app => app.id === 'project')!;
    const href = shopAppOpenHref(project);
    expect(href).toBe('https://project.daup.co.za');
    expect(href).toBe(PROJECT_HOME);
    expect(href).not.toMatch(/eatery\.daup\.co\.za|\/owner|app\.daup\.co\.za/i);
    const withHub = shopAppOpenHref(project, projectOpenHandshakeFromHub({
      email: 'owner@theolive.co.za',
      house: 'The Olive',
      placeIds: ['place-olive']
    }));
    const parsed = new URL(withHub || '');
    expect(parsed.origin).toBe('https://project.daup.co.za');
    expect(parsed.pathname).toBe('/d/hub');
    expect([...parsed.searchParams.keys()]).toEqual(['token']);
    expect(buildProjectOpenUrl({
      email: 'owner@theolive.co.za',
      house: 'The Olive'
    })).toMatch(/^https:\/\/project\.daup\.co\.za\/d\/hub\?token=/);
    const claims = readOwnerArrivalToken(parsed.searchParams.get('token') || '');
    expect(claims?.email).toBe('owner@theolive.co.za');
    expect(claims?.house).toBe('The Olive');
    expect(withHub).not.toMatch(/[?&](did|walletName|instance|mcp|email|house|place)=/i);
  });
});
