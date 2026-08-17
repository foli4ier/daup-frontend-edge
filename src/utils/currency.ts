// Currency derivation utility based on peer profile country

export interface CurrencyInfo {
  code: string;
  symbol: string;
  name: string;
  exchangeRateToUSD: number;
  format: (amount: number) => string;
}

export const COUNTRY_CURRENCY_MAP: Record<string, Omit<CurrencyInfo, 'format'>> = {
  'south africa': { code: 'ZAR', symbol: 'R', name: 'South African Rand', exchangeRateToUSD: 18.25 },
  'za': { code: 'ZAR', symbol: 'R', name: 'South African Rand', exchangeRateToUSD: 18.25 },
  'rsa': { code: 'ZAR', symbol: 'R', name: 'South African Rand', exchangeRateToUSD: 18.25 },
  'united states': { code: 'USD', symbol: '$', name: 'US Dollar', exchangeRateToUSD: 1.0 },
  'usa': { code: 'USD', symbol: '$', name: 'US Dollar', exchangeRateToUSD: 1.0 },
  'us': { code: 'USD', symbol: '$', name: 'US Dollar', exchangeRateToUSD: 1.0 },
  'united kingdom': { code: 'GBP', symbol: '£', name: 'British Pound', exchangeRateToUSD: 0.79 },
  'uk': { code: 'GBP', symbol: '£', name: 'British Pound', exchangeRateToUSD: 0.79 },
  'great britain': { code: 'GBP', symbol: '£', name: 'British Pound', exchangeRateToUSD: 0.79 },
  'england': { code: 'GBP', symbol: '£', name: 'British Pound', exchangeRateToUSD: 0.79 },
  'germany': { code: 'EUR', symbol: '€', name: 'Euro', exchangeRateToUSD: 0.92 },
  'france': { code: 'EUR', symbol: '€', name: 'Euro', exchangeRateToUSD: 0.92 },
  'italy': { code: 'EUR', symbol: '€', name: 'Euro', exchangeRateToUSD: 0.92 },
  'spain': { code: 'EUR', symbol: '€', name: 'Euro', exchangeRateToUSD: 0.92 },
  'netherlands': { code: 'EUR', symbol: '€', name: 'Euro', exchangeRateToUSD: 0.92 },
  'belgium': { code: 'EUR', symbol: '€', name: 'Euro', exchangeRateToUSD: 0.92 },
  'portugal': { code: 'EUR', symbol: '€', name: 'Euro', exchangeRateToUSD: 0.92 },
  'ireland': { code: 'EUR', symbol: '€', name: 'Euro', exchangeRateToUSD: 0.92 },
  'austria': { code: 'EUR', symbol: '€', name: 'Euro', exchangeRateToUSD: 0.92 },
  'finland': { code: 'EUR', symbol: '€', name: 'Euro', exchangeRateToUSD: 0.92 },
  'greece': { code: 'EUR', symbol: '€', name: 'Euro', exchangeRateToUSD: 0.92 },
  'european union': { code: 'EUR', symbol: '€', name: 'Euro', exchangeRateToUSD: 0.92 },
  'eu': { code: 'EUR', symbol: '€', name: 'Euro', exchangeRateToUSD: 0.92 },
  'japan': { code: 'JPY', symbol: '¥', name: 'Japanese Yen', exchangeRateToUSD: 155.0 },
  'canada': { code: 'CAD', symbol: 'CA$', name: 'Canadian Dollar', exchangeRateToUSD: 1.36 },
  'australia': { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', exchangeRateToUSD: 1.52 },
  'new zealand': { code: 'NZD', symbol: 'NZ$', name: 'New Zealand Dollar', exchangeRateToUSD: 1.64 },
  'india': { code: 'INR', symbol: '₹', name: 'Indian Rupee', exchangeRateToUSD: 83.5 },
  'nigeria': { code: 'NGN', symbol: '₦', name: 'Nigerian Naira', exchangeRateToUSD: 1480.0 },
  'kenya': { code: 'KES', symbol: 'KSh', name: 'Kenyan Shilling', exchangeRateToUSD: 130.0 },
  'ghana': { code: 'GHS', symbol: 'GH₵', name: 'Ghanaian Cedi', exchangeRateToUSD: 15.2 },
  'brazil': { code: 'BRL', symbol: 'R$', name: 'Brazilian Real', exchangeRateToUSD: 5.4 },
  'mexico': { code: 'MXN', symbol: 'Mex$', name: 'Mexican Peso', exchangeRateToUSD: 18.1 },
  'switzerland': { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc', exchangeRateToUSD: 0.90 },
  'china': { code: 'CNY', symbol: '¥', name: 'Chinese Yuan', exchangeRateToUSD: 7.25 },
  'singapore': { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar', exchangeRateToUSD: 1.35 },
  'united arab emirates': { code: 'AED', symbol: 'AED', name: 'UAE Dirham', exchangeRateToUSD: 3.67 },
  'uae': { code: 'AED', symbol: 'AED', name: 'UAE Dirham', exchangeRateToUSD: 3.67 },
  'saudi arabia': { code: 'SAR', symbol: 'SAR', name: 'Saudi Riyal', exchangeRateToUSD: 3.75 },
  'philippines': { code: 'PHP', symbol: '₱', name: 'Philippine Peso', exchangeRateToUSD: 58.0 },
  'indonesia': { code: 'IDR', symbol: 'Rp', name: 'Indonesian Rupiah', exchangeRateToUSD: 16200.0 },
  'thailand': { code: 'THB', symbol: '฿', name: 'Thai Baht', exchangeRateToUSD: 36.5 },
  'malaysia': { code: 'MYR', symbol: 'RM', name: 'Malaysian Ringgit', exchangeRateToUSD: 4.7 },
  'vietnam': { code: 'VND', symbol: '₫', name: 'Vietnamese Dong', exchangeRateToUSD: 25400.0 },
  'egypt': { code: 'EGP', symbol: 'E£', name: 'Egyptian Pound', exchangeRateToUSD: 48.0 },
  'turkey': { code: 'TRY', symbol: '₺', name: 'Turkish Lira', exchangeRateToUSD: 32.8 },
  'south korea': { code: 'KRW', symbol: '₩', name: 'South Korean Won', exchangeRateToUSD: 1380.0 },
  'korea': { code: 'KRW', symbol: '₩', name: 'South Korean Won', exchangeRateToUSD: 1380.0 },
  'sweden': { code: 'SEK', symbol: 'kr', name: 'Swedish Krona', exchangeRateToUSD: 10.5 },
  'norway': { code: 'NOK', symbol: 'kr', name: 'Norwegian Krone', exchangeRateToUSD: 10.6 },
  'denmark': { code: 'DKK', symbol: 'kr', name: 'Danish Krone', exchangeRateToUSD: 6.9 },
  'poland': { code: 'PLN', symbol: 'zł', name: 'Polish Zloty', exchangeRateToUSD: 4.0 },
  'argentina': { code: 'ARS', symbol: 'AR$', name: 'Argentine Peso', exchangeRateToUSD: 915.0 },
  'chile': { code: 'CLP', symbol: 'CL$', name: 'Chilean Peso', exchangeRateToUSD: 930.0 },
  'colombia': { code: 'COP', symbol: 'COL$', name: 'Colombian Peso', exchangeRateToUSD: 4100.0 },
};

export function getCurrencyForCountry(country?: string): CurrencyInfo {
  const clean = (country || '').trim().toLowerCase();
  
  if (clean && COUNTRY_CURRENCY_MAP[clean]) {
    const found = COUNTRY_CURRENCY_MAP[clean];
    return {
      ...found,
      format: (amount: number) => `${found.symbol} ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    };
  }

  // Check substring matches
  if (clean) {
    for (const [key, val] of Object.entries(COUNTRY_CURRENCY_MAP)) {
      if (clean.includes(key) || (key.length > 3 && clean.startsWith(key))) {
        return {
          ...val,
          format: (amount: number) => `${val.symbol} ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        };
      }
    }
  }

  // Default fallback to USD
  return {
    code: 'USD',
    symbol: '$',
    name: 'US Dollar',
    exchangeRateToUSD: 1.0,
    format: (amount: number) => `$ ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  };
}
