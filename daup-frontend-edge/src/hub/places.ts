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
  const email = (args.email || '').trim();
  const href = email
    ? buildOpenTheHouseUrl({
        email,
        house: title,
        origin: args.origin
      })
    : undefined;
  return [
    {
      id: 'eatery',
      title,
      body: EATERY_ROW_BODY,
      live: true,
      actionLabel: OPEN_THE_HOUSE_LABEL,
      href
    }
  ];
}

export const COMING_APPS: HubPlaceRow[] = [
  { id: 'farm', title: 'Farm', body: '', live: false },
  { id: 'reseller', title: 'Reseller', body: '', live: false },
  { id: 'maker', title: 'Maker', body: '', live: false }
];

export const COMING_APP_MODULES: Record<HubPlaceRow['id'], string | null> = {
  eatery: null,
  farm: 'daup-farmer',
  reseller: 'daup-reseller',
  maker: 'daup-manufacturing'
};
