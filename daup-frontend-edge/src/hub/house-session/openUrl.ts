/**
 * Hub Open URLs for house apps.
 *
 * Project keeps /d/hub. Finance, Trade, Vault, and Property stay on the
 * app home and carry the same hint query plus houseRedeem — those apps
 * do not have a /d/hub arrival yet (cutover is a later PR).
 *
 * Chat is not a house app. buildChatOpenUrl never accepts a redeem.
 * Hints stay non-authoritative. houseRedeem is the one-time proof from
 * the seed. Credential query keys are stripped if they appear.
 */

import {
  appendAppHandoffHints,
  type AppHandoffHints
} from '../ownerArrival';
import { HOUSE_REDEEM_QUERY } from './seed';

export const HOUSE_REDEEM_APP_IDS = ['finance', 'trade', 'vault', 'project', 'property'] as const;
export type HouseRedeemAppId = (typeof HOUSE_REDEEM_APP_IDS)[number];

export const FINANCE_HOME = 'https://finance.daup.co.za';
export const TRADE_HOME = 'https://trade.daup.co.za';
export const VAULT_HOME = 'https://vault.daup.co.za';
export const PROJECT_HOME = 'https://project.daup.co.za';
export const PROPERTY_HOME = 'https://property.daup.co.za';
export const CHAT_HOME = 'https://chat.daup.co.za';

export const PROJECT_HUB_PATH = '/d/hub';

const HOMES: Record<HouseRedeemAppId, string> = {
  finance: FINANCE_HOME,
  trade: TRADE_HOME,
  vault: VAULT_HOME,
  project: PROJECT_HOME,
  property: PROPERTY_HOME
};

const MODULE_TO_APP: Record<string, HouseRedeemAppId> = {
  'daup-finance': 'finance',
  'daup-trade': 'trade',
  'daup-vault': 'vault',
  'daup-project': 'project',
  'daup-property': 'property'
};

const CREDENTIAL_KEYS = new Set([
  'token',
  'email',
  'places',
  'hubplaces',
  'role',
  'daup_owner',
  'daup1',
  'pepper'
]);

export function appUsesHouseRedeem(id: string): id is HouseRedeemAppId {
  return (HOUSE_REDEEM_APP_IDS as readonly string[]).includes(id);
}

export function houseRedeemAppForModule(moduleName: string): HouseRedeemAppId | null {
  return MODULE_TO_APP[moduleName] || null;
}

/** Chat stays a plain host. Redeem arguments are ignored. */
export function buildChatOpenUrl(): string {
  return CHAT_HOME;
}

export interface HouseAppOpenInput extends AppHandoffHints {
  houseRedeem?: string;
  origin?: string;
}

function stripCredentialQuery(url: URL): void {
  for (const key of [...url.searchParams.keys()]) {
    if (CREDENTIAL_KEYS.has(key.toLowerCase())) url.searchParams.delete(key);
  }
}

export function buildHouseAppOpenUrl(app: HouseRedeemAppId, input: HouseAppOpenInput = {}): string {
  const home = (input.origin || HOMES[app]).replace(/\/+$/, '');
  const email = (input.email || '').trim().toLowerCase();
  const house = (input.house || '').trim();
  const redeem = (input.houseRedeem || '').trim();
  const hasHints = Boolean(email && house);
  // Project already opens /d/hub for hints. The other house apps stay on
  // the bare home until a redeem is issued, then hints ride along with it.
  if (app !== 'project' && !redeem) return home;
  if (!redeem && !hasHints) return home;

  const url = app === 'project'
    ? new URL(`${home}${PROJECT_HUB_PATH}`)
    : new URL(`${home}/`);
  if (hasHints) {
    appendAppHandoffHints(url, {
      email,
      house,
      placeIds: input.placeIds
    });
  }
  if (redeem) url.searchParams.set(HOUSE_REDEEM_QUERY, redeem);
  stripCredentialQuery(url);
  return url.toString();
}
