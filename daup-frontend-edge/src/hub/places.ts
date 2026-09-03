import { EATERY_ROW_BODY, HUB_HOME_FALLBACK, OPEN_THE_HOUSE_LABEL } from './copy';
import { buildOpenTheHouseUrl } from './ownerArrival';

export interface HubPlaceRow {
  id: 'eatery' | 'farm' | 'reseller' | 'maker';
  title: string;
  body: string;
  live: boolean;
  actionLabel?: string;
  href?: string;
}

export function eateryRowTitle(placeName?: string | null): string {
  const name = (placeName || '').trim();
  return name || HUB_HOME_FALLBACK;
}

export function listOwnerPlaces(args: {
  email: string;
  placeName: string;
  origin?: string;
}): HubPlaceRow[] {
  const title = eateryRowTitle(args.placeName);
  return [
    {
      id: 'eatery',
      title,
      body: EATERY_ROW_BODY,
      live: true,
      actionLabel: OPEN_THE_HOUSE_LABEL,
      href: buildOpenTheHouseUrl({
        email: args.email,
        house: title,
        origin: args.origin
      })
    }
  ];
}

export const COMING_APPS: HubPlaceRow[] = [
  { id: 'farm', title: 'Farm', body: 'Same chain. Not live yet.', live: false },
  { id: 'reseller', title: 'Reseller', body: 'Same chain. Not live yet.', live: false },
  { id: 'maker', title: 'Maker', body: 'Same chain. Not live yet.', live: false }
];
