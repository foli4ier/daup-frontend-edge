/**
 * Hub → Project Open. query contract (first-run).
 *
 *   No house facts:  https://project.daup.co.za
 *   Email + house:   https://project.daup.co.za/d/hub?token=
 *
 * Token is the same DAUP1 owner arrival as Eatery Open the house
 * (email, house, role=owner). Query is token-only — never did / wallet / mcp.
 * Project first-run UI (separate PR) reads the token at /d/hub.
 *
 * Hub may also know owned place ids; those stay off this door URL. Project
 * can list them from the house after it consumes email from the token.
 *
 * Advanced launch (`buildAppLaunchUrl`) is a different handshake and stays off Get apps.
 */

import { getModuleEndpoint } from '../utils/envResolver';
import { mintOwnerArrivalToken, ownerArrivalExposesBannedQuery } from './ownerArrival';

export const PROJECT_MODULE_KEY = 'daup-project';

/** Production Open. home. Locked so Get apps cannot land on the hub or Eatery. */
export const PROJECT_HOME = 'https://project.daup.co.za';

/** Project consumes the hub owner token here. */
export const PROJECT_HUB_PATH = '/d/hub';

export interface ProjectOpenHandshake {
  email?: string;
  house?: string;
  instance?: string;
  placeIds?: string[];
  now?: Date;
}

export function projectOrigin(origin?: string): string {
  const fromEnv =
    typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_APP_PROJECT_URL;
  const raw = (origin || fromEnv || getModuleEndpoint(PROJECT_MODULE_KEY) || PROJECT_HOME).trim();
  return raw.replace(/\/+$/, '') || PROJECT_HOME;
}

/** Bare home. Ignores env so lock tests cannot land on localhost. */
export function projectHomeUrl(): string {
  return PROJECT_HOME;
}

export function isProjectHome(url: string): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    const path = parsed.pathname.replace(/\/+$/, '') || '/';
    return parsed.hostname === 'project.daup.co.za' && (path === '/' || path === '');
  } catch {
    return url === PROJECT_HOME || url === `${PROJECT_HOME}/`;
  }
}

export function projectOpenHandshakeFromHub(args: {
  email?: string;
  house?: string;
  instance?: string;
  placeIds?: string[];
  now?: Date;
}): ProjectOpenHandshake {
  const email = (args.email || '').trim().toLowerCase();
  const house = (args.house || '').trim();
  const instance = (args.instance || '').trim();
  const placeIds = (args.placeIds || []).map(id => id.trim()).filter(Boolean);
  return {
    ...(email ? { email } : {}),
    ...(house ? { house } : {}),
    ...(instance ? { instance } : {}),
    ...(placeIds.length ? { placeIds } : {}),
    ...(args.now ? { now: args.now } : {})
  };
}

/**
 * Hub Open. deep-link.
 * Email + house → /d/hub?token= (same arrival as Eatery). Else PROJECT_HOME.
 */
export function buildProjectOpenUrl(handshake?: ProjectOpenHandshake, origin?: string): string {
  const email = (handshake?.email || '').trim().toLowerCase();
  const house = (handshake?.house || '').trim();
  const base = (origin || PROJECT_HOME).replace(/\/+$/, '');
  if (!email || !house) return origin ? base : PROJECT_HOME;
  const token = mintOwnerArrivalToken({ email, house, now: handshake?.now });
  return `${base}${PROJECT_HUB_PATH}?token=${encodeURIComponent(token)}`;
}

export function projectOpenHitsHubOrEatery(url: string): boolean {
  if (!url) return true;
  try {
    const parsed = new URL(url);
    if (parsed.hostname === 'app.daup.co.za') return true;
    if (parsed.hostname.includes('eatery')) return true;
    if (parsed.pathname === '/owner' || parsed.pathname.startsWith('/owner/')) return true;
    return false;
  } catch {
    return true;
  }
}

export function projectOpenExposesBannedQuery(url: string): boolean {
  return ownerArrivalExposesBannedQuery(url);
}

export function navigateToProjectHome(handshake?: ProjectOpenHandshake, origin?: string): string {
  const url = buildProjectOpenUrl(handshake, origin);
  if (typeof window !== 'undefined') {
    try {
      window.location.assign(url);
    } catch {
      // jsdom and some browsers throw on cross-origin assign in tests
    }
  }
  return url;
}
