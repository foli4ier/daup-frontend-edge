/**
 * DAUP place price meters (ZAR v0 stubs).
 *
 * Source of truth: docs/license-pivot.md (meters / trial / migration)
 * and the Ideation license-pivot README (locked 2026-09-17, place-billing amend).
 *
 * One subscription per place. Apps are included — no per-app SKU.
 * Extra branch = a new place (LOCATION_MONTHLY is dead in v0).
 *
 * Change numbers in this table only. Do not change meter codes without Ideation.
 * Full invoices are slice G — this module is the stub catalog, not a billing UI.
 */

export const PRICE_CURRENCY = 'ZAR' as const;

/** First 30 days after `place.trial_started`. Then PLACE_SUB_MONTHLY invoices. */
export const PLACE_TRIAL_CODE = 'PLACE_TRIAL' as const;
export const PLACE_TRIAL_ZAR_EX_VAT = 0;

/** Always. Covers this place + enabled apps (no per-app fee). */
export const PLACE_SUB_MONTHLY_CODE = 'PLACE_SUB_MONTHLY' as const;
export const PLACE_SUB_MONTHLY_ZAR_EX_VAT = 499;

/**
 * Dead in v0. Extra branch is a new place with its own PLACE_SUB_MONTHLY.
 * Do not invoice LOCATION_MONTHLY. Kept so old stubs are not reminted as live.
 */
export const LOCATION_MONTHLY_CODE = 'LOCATION_MONTHLY' as const;
export const LOCATION_MONTHLY_ZAR_EX_VAT = 79;
export const LOCATION_MONTHLY_DEAD = true;

/**
 * Hosted seednode only. R199 / place if hosted; R0 on-prem.
 */
export const SEED_HOSTED_MONTHLY_CODE = 'SEED_HOSTED_MONTHLY' as const;
export const SEED_HOSTED_MONTHLY_ZAR_EX_VAT = 199;

export const PRICE_METERS = {
  PLACE_TRIAL: {
    code: PLACE_TRIAL_CODE,
    zarExVat: PLACE_TRIAL_ZAR_EX_VAT,
    rule: 'First 30 days after place.trial_started. Then PLACE_SUB_MONTHLY invoices.'
  },
  PLACE_SUB_MONTHLY: {
    code: PLACE_SUB_MONTHLY_CODE,
    zarExVat: PLACE_SUB_MONTHLY_ZAR_EX_VAT,
    rule: 'Always. Covers this place + enabled apps (no per-app fee).'
  },
  SEED_HOSTED_MONTHLY: {
    code: SEED_HOSTED_MONTHLY_CODE,
    zarExVat: SEED_HOSTED_MONTHLY_ZAR_EX_VAT,
    rule: 'Hosted only. R199 / place. On-prem → R0.'
  }
} as const;

export type PriceMeterCode =
  | typeof PLACE_TRIAL_CODE
  | typeof PLACE_SUB_MONTHLY_CODE
  | typeof SEED_HOSTED_MONTHLY_CODE;

/** Stub monthly lines (ex VAT). Trial period is R0 for all lines. LOCATION is dead. */
export function stubMonthlyLines(args: {
  seedMode: 'hosted' | 'on-prem';
  inTrial: boolean;
  billableLocations?: number;
}): { code: PriceMeterCode; units: number; zarExVat: number }[] {
  const hosted = args.seedMode === 'hosted';
  if (args.inTrial) {
    return [{ code: PLACE_TRIAL_CODE, units: 1, zarExVat: 0 }];
  }
  return [
    { code: PLACE_SUB_MONTHLY_CODE, units: 1, zarExVat: PLACE_SUB_MONTHLY_ZAR_EX_VAT },
    ...(hosted
      ? [{
          code: SEED_HOSTED_MONTHLY_CODE,
          units: 1,
          zarExVat: SEED_HOSTED_MONTHLY_ZAR_EX_VAT
        }]
      : [])
  ];
}
