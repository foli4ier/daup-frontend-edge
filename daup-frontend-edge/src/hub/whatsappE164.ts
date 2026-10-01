/**
 * WhatsApp identity for house SSO.
 *
 * The Hub profile stores one number, E.164 (`+27829261373`), on
 * `demographics.whatsappNumber`. House OTP sends that same value as `phone`.
 * A local South African number (`0829261373` or `829261373`) is the same key.
 */

const E164_MIN = 8;
const E164_MAX = 15;

function digitsOnly(value: string): string {
  return (value || '').replace(/\D/g, '');
}

/**
 * Parse a typed WhatsApp number into E.164.
 * Returns '' when the text is empty or not a number we can text.
 * `callingCode` is the trunk-prefix country (South Africa, 27) for a leading 0
 * or a 9-digit subscriber number.
 */
export function toWhatsappE164(raw: string, callingCode = '27'): string {
  const compact = (raw || '').trim().replace(/[\s().-]/g, '');
  if (!compact) return '';

  const hadPlus = compact.startsWith('+');
  const had00 = !hadPlus && compact.startsWith('00');
  const hadTrunk = !hadPlus && !had00 && compact.startsWith('0');
  const bare = digitsOnly(compact);
  let digits = bare;

  if (hadPlus || had00) {
    digits = hadPlus ? digitsOnly(compact.slice(1)) : digitsOnly(compact.slice(2));
  } else if (hadTrunk) {
    digits = callingCode + digitsOnly(compact.slice(1));
  } else if (bare.length === 9) {
    digits = callingCode + bare;
  }

  if (digits.length < E164_MIN || digits.length > E164_MAX) return '';
  if (!/^[1-9]/.test(digits)) return '';

  const explicitInternational = hadPlus || had00;
  const national = hadTrunk || (!hadPlus && !had00 && bare.length === 9);
  const countryIncluded = !hadPlus && !had00 && !hadTrunk && bare.length >= 11;
  if (!explicitInternational && !national && !countryIncluded) return '';

  return `+${digits}`;
}

/**
 * Value to store on the profile.
 * Empty stays empty. A parseable number becomes E.164. Unparseable text is kept
 * so a bad edit does not wipe a number we could not read.
 */
export function canonicalWhatsappField(raw: string): string {
  const trimmed = (raw || '').trim();
  if (!trimmed) return '';
  return toWhatsappE164(trimmed) || trimmed;
}

/**
 * True when the profile already had an E.164 WhatsApp and the next value is
 * a different number (or cleared). The first time a number is linked does not
 * count: that must not drop the place session just minted for it.
 */
export function whatsappIdentityChanged(previousRaw: string, nextRaw: string): boolean {
  const previous = toWhatsappE164(previousRaw);
  if (!previous) return false;
  return previous !== toWhatsappE164(nextRaw);
}
