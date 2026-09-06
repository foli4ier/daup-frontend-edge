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

export function placePublicSlug(placeName: string): string {
  const slug = (placeName || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'place';
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
