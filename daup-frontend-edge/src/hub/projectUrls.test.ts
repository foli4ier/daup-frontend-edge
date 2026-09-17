import { describe, expect, it } from 'vitest';
import { CHAIN_APP_PROJECT, GET_LABEL, OPEN_LABEL, hasBannedDoorCopy } from './copy';
import {
  PROJECT_HOME,
  PROJECT_HUB_PATH,
  PROJECT_MODULE_KEY,
  buildProjectOpenUrl,
  isProjectHome,
  projectHomeUrl,
  projectOpenExposesBannedQuery,
  projectOpenHandshakeFromHub,
  projectOpenHitsHubOrEatery
} from './projectUrls';
import { getModuleEndpoint } from '../utils/envResolver';
import { ownerArrivalExposesBannedQuery, readOwnerArrivalToken } from './ownerArrival';

describe('Project Open. URLs', () => {
  it('Open. home is exactly https://project.daup.co.za without handshake', () => {
    expect(PROJECT_HOME).toBe('https://project.daup.co.za');
    expect(PROJECT_HUB_PATH).toBe('/d/hub');
    expect(projectHomeUrl()).toBe(PROJECT_HOME);
    expect(buildProjectOpenUrl()).toBe(PROJECT_HOME);
    expect(buildProjectOpenUrl({})).toBe(PROJECT_HOME);
    expect(buildProjectOpenUrl({ email: 'you@gmail.com' })).toBe(PROJECT_HOME);
    expect(isProjectHome(PROJECT_HOME)).toBe(true);
    expect(projectOpenHitsHubOrEatery(PROJECT_HOME)).toBe(false);
    expect(projectOpenHitsHubOrEatery('https://app.daup.co.za/')).toBe(true);
    expect(projectOpenHitsHubOrEatery('https://eatery.daup.co.za/owner')).toBe(true);
    expect(hasBannedDoorCopy(CHAIN_APP_PROJECT)).toBe(false);
    expect(GET_LABEL).toBe('Get.');
    expect(OPEN_LABEL).toBe('Open.');
  });

  it('email + house Open. is /d/hub?token= only, same arrival as Eatery', () => {
    const handshake = projectOpenHandshakeFromHub({
      email: 'Owner@TheOlive.co.za',
      house: 'The Olive',
      placeIds: ['place-olive']
    });
    expect(handshake.email).toBe('owner@theolive.co.za');
    expect(handshake.house).toBe('The Olive');
    const href = buildProjectOpenUrl(handshake);
    const parsed = new URL(href);
    expect(parsed.origin).toBe('https://project.daup.co.za');
    expect(parsed.pathname).toBe('/d/hub');
    expect([...parsed.searchParams.keys()]).toEqual(['token']);
    expect(projectOpenExposesBannedQuery(href)).toBe(false);
    expect(ownerArrivalExposesBannedQuery(href)).toBe(false);
    expect(href).not.toMatch(/[?&](did|walletName|instance|mcp|email|house|place)=/i);
    const claims = readOwnerArrivalToken(parsed.searchParams.get('token') || '');
    expect(claims?.email).toBe('owner@theolive.co.za');
    expect(claims?.house).toBe('The Olive');
    expect(claims?.role).toBe('owner');
    expect(projectOpenHitsHubOrEatery(href)).toBe(false);
  });

  it('never mints a Project arrival without email and house', () => {
    expect(buildProjectOpenUrl({ email: '', house: 'The Olive' })).toBe(PROJECT_HOME);
    expect(buildProjectOpenUrl({ email: 'you@gmail.com', house: '' })).toBe(PROJECT_HOME);
  });

  it('resolves daup-project to project.daup.co.za or localhost:3002', () => {
    expect(PROJECT_MODULE_KEY).toBe('daup-project');
    const endpoint = getModuleEndpoint(PROJECT_MODULE_KEY);
    expect(endpoint.includes('project.daup.co.za') || endpoint.includes('localhost:3002')).toBe(true);
  });
});
