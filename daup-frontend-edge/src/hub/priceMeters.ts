/**
 * DAUP company-node price meters (ZAR v0 stubs).
 *
 * Source of truth: docs/license-pivot.md (meters / trial / migration)
 * and the Ideation license-pivot README (locked 2026-09-17).
 *
 * One meter family for scale: billable_locations = count of active
 * locations on the company node (minimum 1 = primary place). Do not add
 * a parallel storage-GB price in v0.
 *
 * Change numbers in this table only. Do not change meter codes without Ideation.
 * Full invoices are slice G — this module is the stub catalog, not a billing UI.
 */

export const PRICE_CURRENCY = 'ZAR' as const;

/** First 30 days after `node.trial_started`. Then NODE_SUB_MONTHLY invoices. */
export const NODE_TRIAL_CODE = 'NODE_TRIAL' as const;
export const NODE_TRIAL_ZAR_EX_VAT = 0;

/** Always. Covers the licensed node + installed apps (no per-app fee). */
export const NODE_SUB_MONTHLY_CODE = 'NODE_SUB_MONTHLY' as const;
export const NODE_SUB_MONTHLY_ZAR_EX_VAT = 499;

/** Charged for max(0, billable_locations - 1). First location is in the node sub. */
export const LOCATION_MONTHLY_CODE = 'LOCATION_MONTHLY' as const;
export const LOCATION_MONTHLY_ZAR_EX_VAT = 79;

/**
 * Hosted seednode only. size_units = billable_locations (same meter).
 * On-prem → R0 hosted line.
 */
export const SEED_HOSTED_MONTHLY_CODE = 'SEED_HOSTED_MONTHLY' as const;
export const SEED_HOSTED_MONTHLY_ZAR_EX_VAT = 199;

export const PRICE_METERS = {
  NODE_TRIAL: {
    code: NODE_TRIAL_CODE,
    zarExVat: NODE_TRIAL_ZAR_EX_VAT,
    rule: 'First 30 days after node.trial_started. Then NODE_SUB_MONTHLY invoices.'
  },
  NODE_SUB_MONTHLY: {
    code: NODE_SUB_MONTHLY_CODE,
    zarExVat: NODE_SUB_MONTHLY_ZAR_EX_VAT,
    rule: 'Always. Covers the licensed node + installed apps (no per-app fee).'
  },
  LOCATION_MONTHLY: {
    code: LOCATION_MONTHLY_CODE,
    zarExVat: LOCATION_MONTHLY_ZAR_EX_VAT,
    rule: 'max(0, billable_locations - 1). First location included in NODE_SUB_MONTHLY.'
  },
  SEED_HOSTED_MONTHLY: {
    code: SEED_HOSTED_MONTHLY_CODE,
    zarExVat: SEED_HOSTED_MONTHLY_ZAR_EX_VAT,
    rule: 'Hosted only. R199 × billable_locations. On-prem → R0.'
  }
} as const;

export type PriceMeterCode =
  | typeof NODE_TRIAL_CODE
  | typeof NODE_SUB_MONTHLY_CODE
  | typeof LOCATION_MONTHLY_CODE
  | typeof SEED_HOSTED_MONTHLY_CODE;

export function extraLocationCount(billableLocations: number): number {
  return Math.max(0, Math.max(1, billableLocations) - 1);
}

/** Stub monthly lines (ex VAT). Trial period is R0 for all lines. */
export function stubMonthlyLines(args: {
  billableLocations: number;
  seedMode: 'hosted' | 'on-prem';
  inTrial: boolean;
}): { code: PriceMeterCode; units: number; zarExVat: number }[] {
  const locations = Math.max(1, args.billableLocations || 1);
  const extra = extraLocationCount(locations);
  const hostedUnits = args.seedMode === 'hosted' ? locations : 0;
  if (args.inTrial) {
    return [{ code: NODE_TRIAL_CODE, units: 1, zarExVat: 0 }];
  }
  return [
    { code: NODE_SUB_MONTHLY_CODE, units: 1, zarExVat: NODE_SUB_MONTHLY_ZAR_EX_VAT },
    ...(extra > 0
      ? [{
          code: LOCATION_MONTHLY_CODE,
          units: extra,
          zarExVat: extra * LOCATION_MONTHLY_ZAR_EX_VAT
        }]
      : []),
    ...(hostedUnits > 0
      ? [{
          code: SEED_HOSTED_MONTHLY_CODE,
          units: hostedUnits,
          zarExVat: hostedUnits * SEED_HOSTED_MONTHLY_ZAR_EX_VAT
        }]
      : [])
  ];
}
