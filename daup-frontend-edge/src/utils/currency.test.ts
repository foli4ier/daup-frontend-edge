import { describe, expect, it } from 'vitest';
import { getCurrencyForCountry } from './currency';

describe('hub money is R unless another country is set', () => {
  it('defaults empty country to R', () => {
    const money = getCurrencyForCountry();
    expect(money.code).toBe('ZAR');
    expect(money.symbol).toBe('R');
    expect(money.format(12)).toMatch(/^R /);
    expect(money.format(12)).toContain('12');
    expect(money.format(12)).not.toMatch(/^\$/);
  });

  it('keeps $ only when the country is the United States', () => {
    expect(getCurrencyForCountry('United States').symbol).toBe('$');
    expect(getCurrencyForCountry('South Africa').symbol).toBe('R');
    expect(getCurrencyForCountry('South Africa').format(89.9)).toMatch(/^R /);
  });
});
