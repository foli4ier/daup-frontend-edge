/** South African display lock: R money, day-first dates. */

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;

export function formatDayFirstDate(value: Date | number): string {
  const date = typeof value === 'number' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

export function formatTrialEndsOn(value: Date | number): string {
  const day = formatDayFirstDate(value);
  return day ? `Ends ${day}.` : '';
}

/** `YYYY-MM-DD` as a day-first date. Empty or unreadable stays empty. */
export function formatBirthdate(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec((iso || '').trim());
  if (!match) return '';
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  if (Number.isNaN(date.getTime())) return '';
  if (date.getFullYear() !== Number(match[1]) || date.getMonth() !== Number(match[2]) - 1) return '';
  return formatDayFirstDate(date);
}

export function isDayFirstDate(text: string): boolean {
  return /^\d{1,2} (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \d{4}$/.test((text || '').trim());
}
