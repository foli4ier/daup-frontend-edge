/**
 * Hub → Project Open. query contract (first-run).
 *
 *   No house facts:  https://project.daup.co.za
 *   Email + house:   https://project.daup.co.za/d/hub?emailHint=&houseHint=&placeIdHint=
 *
 * Query params are non-authoritative hints (email prefill, house name, place
 * ids) plus an optional one-time houseRedeem from the seed. They are not a
 * client-signed credential. Never did / wallet / mcp / token / email /
 * places / hubPlaces. Project verifies the redeem after its own cutover.
 *
 * Advanced launch (`buildAppLaunchUrl`) is a different handshake and stays off Get apps.
 */

import { getModuleEndpoint } from '../utils/envResolver';
import { ownerArrivalExposesBannedQuery } from './ownerArrival';
import { buildHouseAppOpenUrl, PROJECT_HOME, PROJECT_HUB_PATH } from './house-session/openUrl';

export const PROJECT_MODULE_KEY = 'daup-project';

export { PROJECT_HOME, PROJECT_HUB_PATH };

export interface ProjectOpenHandshake {
  email?: string;
  house?: string;
  instance?: string;
  placeIds?: string[];
  /** One-time seed redeem. Omitted from the static href until Open. issues it. */
  houseRedeem?: string;
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
}): ProjectOpenHandshake {
  const email = (args.email || '').trim().toLowerCase();
  const house = (args.house || '').trim();
  const instance = (args.instance || '').trim();
  const placeIds = (args.placeIds || []).map(id => id.trim()).filter(Boolean);
  return {
    ...(email ? { email } : {}),
    ...(house ? { house } : {}),
    ...(instance ? { instance } : {}),
    ...(placeIds.length ? { placeIds } : {})
  };
}

/**
 * Hub Open. deep-link.
 * Email + house → /d/hub with hint params. houseRedeem, when the seed
 * just issued one, is the proof. Else PROJECT_HOME.
 * Missing hints still open Project. The Hub does not invent a token.
 */
export function buildProjectOpenUrl(handshake?: ProjectOpenHandshake, origin?: string): string {
  return buildHouseAppOpenUrl('project', {
    email: handshake?.email,
    house: handshake?.house,
    placeIds: handshake?.placeIds,
    houseRedeem: handshake?.houseRedeem,
    origin: origin || PROJECT_HOME
  });
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
