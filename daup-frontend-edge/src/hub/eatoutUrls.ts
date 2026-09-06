/**
 * Public EatOut place URLs. Locked shape:
 *   https://eatout.daup.co.za/place/{id}
 *   See the menu.     → #menu
 *   Reserve a table.  → #book
 * Aliases: ?focus=menu | ?focus=book | ?focus=reserve (#reserve → book).
 *
 * {id} matches what EatOut resolves (kortrijk | genesis | noop today):
 * derive a stable slug from the place name (Kortrijk → kortrijk).
 * Owner Floor lives on eatery.daup.co.za/owner — never from public cards.
 *
 * Update EATOUT_PLACE_PATH_TEMPLATE if the diner app changes path shape.
 */

export const DEFAULT_EATOUT_ORIGIN = 'https://eatout.daup.co.za';

/** Single constant to update if EatOut changes the place path. */
export const EATOUT_PLACE_PATH_TEMPLATE = '/place/{slug}';

export const EATOUT_MENU_HASH = 'menu';
export const EATOUT_BOOK_HASH = 'book';

export function eatoutOrigin(origin?: string): string {
  const fromEnv =
    typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_APP_EATOUT_URL;
  const raw = (origin || fromEnv || DEFAULT_EATOUT_ORIGIN).trim();
  return raw.replace(/\/+$/, '') || DEFAULT_EATOUT_ORIGIN;
}

/** Diner home. Never eatery owner Floor / /owner. */
export function eatoutHomeUrl(origin?: string): string {
  return `${eatoutOrigin(origin)}/`;
}

export function navigateToEatOutHome(origin?: string): void {
  const url = eatoutHomeUrl(origin);
  if (publicPlaceUrlHitsOwnerFloor(url)) return;
  if (typeof window === 'undefined') return;
  window.location.assign(url);
}

/**
 * EatOut /place/:id values live today. Map common house names onto those ids
 * so the hub publishes the same {id} EatOut resolves.
 */
const EATOUT_RESOLVED_IDS: Record<string, string> = {
  kortrijk: 'kortrijk',
  'kortrijk-bistro': 'kortrijk',
  'kortrijk-bistro-grill': 'kortrijk',
  genesis: 'genesis',
  'genesis-bistro': 'genesis',
  noop: 'noop',
  'noop-restaurant': 'noop'
};

export function placePublicSlug(placeName: string): string {
  const slug = (placeName || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (!slug) return 'place';
  if (EATOUT_RESOLVED_IDS[slug]) return EATOUT_RESOLVED_IDS[slug];
  const first = slug.split('-')[0];
  if (first && EATOUT_RESOLVED_IDS[first]) return EATOUT_RESOLVED_IDS[first];
  return slug;
}

export type EatOutPlaceFocus = 'menu' | 'book' | 'reserve';

export function buildEatOutPlaceUrl(args: {
  placeName: string;
  focus?: EatOutPlaceFocus;
  origin?: string;
}): string {
  const slug = placePublicSlug(args.placeName);
  const path = EATOUT_PLACE_PATH_TEMPLATE.replace('{slug}', slug);
  const url = `${eatoutOrigin(args.origin)}${path}`;
  if (args.focus === 'menu') return `${url}#${EATOUT_MENU_HASH}`;
  if (args.focus === 'book' || args.focus === 'reserve') return `${url}#${EATOUT_BOOK_HASH}`;
  return url;
}

/** One helper for public card menu / book hrefs. */
export function eatoutPlaceHrefs(placeName: string, origin?: string): {
  id: string;
  place: string;
  menu: string;
  book: string;
} {
  return {
    id: placePublicSlug(placeName),
    place: buildEatOutPlaceUrl({ placeName, origin }),
    menu: buildEatOutPlaceUrl({ placeName, focus: 'menu', origin }),
    book: buildEatOutPlaceUrl({ placeName, focus: 'book', origin })
  };
}

export function publicPlaceUrlHitsOwnerFloor(url: string): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url, DEFAULT_EATOUT_ORIGIN);
    const host = parsed.hostname.toLowerCase();
    const path = parsed.pathname.toLowerCase();
    const hitsEateryOwner =
      (host === 'eatery.daup.co.za' || host.endsWith('.eatery.daup.co.za')) &&
      (path === '/owner' || path.startsWith('/owner/') || path.includes('/floor'));
    const hitsOwnerPath = path === '/owner' || path.startsWith('/owner/');
    return hitsEateryOwner || (host !== new URL(DEFAULT_EATOUT_ORIGIN).hostname && hitsOwnerPath && host.includes('eatery'));
  } catch {
    return /eatery\.daup\.co\.za\/owner/i.test(url) || /\/owner\?token=/i.test(url);
  }
}
