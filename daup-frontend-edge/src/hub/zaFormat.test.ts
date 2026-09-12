import { describe, expect, it } from 'vitest';
import { formatDayFirstDate, formatTrialEndsOn, isDayFirstDate } from './zaFormat';

describe('day-first ZA dates', () => {
  it('prints 14 Dec 2023 from the trial stamp, never month-first', () => {
    const stamp = 1702592000000;
    const printed = formatDayFirstDate(stamp);
    expect(printed).toMatch(/^\d{1,2} Dec 2023$/);
    expect(isDayFirstDate(printed)).toBe(true);
    expect(printed).not.toMatch(/Dec \d{1,2}, 2023/);
    expect(printed).not.toMatch(/12\/14\/2023|14\/12\/2023/);
    expect(formatTrialEndsOn(stamp)).toBe(`Ends ${printed}.`);
  });
});
