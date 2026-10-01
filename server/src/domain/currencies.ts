export interface CurrencyInfo {
  code: string;
  name: string;
  symbol: string;
  decimals: number; // Minor units (e.g. 2 for USD, 0 for JPY, 3 for BHD)
}

export const CURRENCIES: Record<string, CurrencyInfo> = {
  USD: { code: 'USD', name: 'US Dollar', symbol: '$', decimals: 2 },
  EUR: { code: 'EUR', name: 'Euro', symbol: '€', decimals: 2 },
  GBP: { code: 'GBP', name: 'British Pound', symbol: '£', decimals: 2 },
  INR: { code: 'INR', name: 'Indian Rupee', symbol: '₹', decimals: 2 },
  JPY: { code: 'JPY', name: 'Japanese Yen', symbol: '¥', decimals: 0 },
  CAD: { code: 'CAD', name: 'Canadian Dollar', symbol: 'CA$', decimals: 2 },
  AUD: { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', decimals: 2 },
  CHF: { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF', decimals: 2 },
  CNY: { code: 'CNY', name: 'Chinese Yuan', symbol: '¥', decimals: 2 },
  SGD: { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', decimals: 2 },
  THB: { code: 'THB', name: 'Thai Baht', symbol: '฿', decimals: 2 },
  AED: { code: 'AED', name: 'UAE Dirham', symbol: 'AED', decimals: 2 },
  BHD: { code: 'BHD', name: 'Bahraini Dinar', symbol: 'BD', decimals: 3 },
  KWD: { code: 'KWD', name: 'Kuwaiti Dinar', symbol: 'KD', decimals: 3 },
  KRW: { code: 'KRW', name: 'South Korean Won', symbol: '₩', decimals: 0 },
  IDR: { code: 'IDR', name: 'Indonesian Rupiah', symbol: 'Rp', decimals: 0 },
  VND: { code: 'VND', name: 'Vietnamese Dong', symbol: '₫', decimals: 0 },
  NZD: { code: 'NZD', name: 'New Zealand Dollar', symbol: 'NZ$', decimals: 2 },
  SEK: { code: 'SEK', name: 'Swedish Krona', symbol: 'kr', decimals: 2 },
  NOK: { code: 'NOK', name: 'Norwegian Krone', symbol: 'kr', decimals: 2 },
  DKK: { code: 'DKK', name: 'Danish Krone', symbol: 'kr', decimals: 2 },
  PLN: { code: 'PLN', name: 'Polish Zloty', symbol: 'zł', decimals: 2 },
  BRL: { code: 'BRL', name: 'Brazilian Real', symbol: 'R$', decimals: 2 },
  MXN: { code: 'MXN', name: 'Mexican Peso', symbol: 'Mex$', decimals: 2 },
  ZAR: { code: 'ZAR', name: 'South African Rand', symbol: 'R', decimals: 2 },
  TRY: { code: 'TRY', name: 'Turkish Lira', symbol: '₺', decimals: 2 },
  SAR: { code: 'SAR', name: 'Saudi Riyal', symbol: 'SR', decimals: 2 },
  MYR: { code: 'MYR', name: 'Malaysian Ringgit', symbol: 'RM', decimals: 2 },
  PHP: { code: 'PHP', name: 'Philippine Peso', symbol: '₱', decimals: 2 },
  OMR: { code: 'OMR', name: 'Omani Rial', symbol: 'OMR', decimals: 3 }
};

export const DEFAULT_CURRENCY = 'USD';

export function getCurrency(code: string): CurrencyInfo {
  const upper = (code || '').toUpperCase();
  if (CURRENCIES[upper]) {
    return CURRENCIES[upper];
  }
  return {
    code: upper || 'USD',
    name: upper || 'USD',
    symbol: upper || '$',
    decimals: 2
  };
}

/**
 * Converts a decimal string (e.g. "100.50") or number to integer minor units (e.g. 10050)
 * Uses string manipulation and BigInt/integer arithmetic to avoid IEEE-754 floating point drift.
 */
export function toMinorUnits(amount: string | number, currencyCode: string): bigint {
  const currency = getCurrency(currencyCode);
  const decimals = currency.decimals;

  if (typeof amount === 'number') {
    amount = amount.toString();
  }
  
  // Clean whitespace and any formatting
  let clean = amount.trim();
  if (!clean) return 0n;

  const isNegative = clean.startsWith('-');
  if (isNegative || clean.startsWith('+')) {
    clean = clean.substring(1).trim();
  }

  const parts = clean.split('.');
  const wholePart = parts[0] || '0';
  let fractionPart = parts[1] || '';

  if (decimals === 0) {
    const val = BigInt(wholePart.replace(/\D/g, '') || '0');
    return isNegative ? -val : val;
  }

  // Pad or trim fraction part to matching decimals
  if (fractionPart.length < decimals) {
    fractionPart = fractionPart.padEnd(decimals, '0');
  } else if (fractionPart.length > decimals) {
    fractionPart = fractionPart.substring(0, decimals);
  }

  const wholeInt = BigInt(wholePart.replace(/\D/g, '') || '0');
  const fractionInt = BigInt(fractionPart.replace(/\D/g, '') || '0');
  const multiplier = 10n ** BigInt(decimals);

  const total = wholeInt * multiplier + fractionInt;
  return isNegative ? -total : total;
}

/**
 * Converts integer minor units (e.g. 10050n) to a clean decimal string (e.g. "100.50")
 */
export function toDecimalString(minorUnits: bigint | number, currencyCode: string): string {
  const currency = getCurrency(currencyCode);
  const decimals = currency.decimals;
  let val = typeof minorUnits === 'number' ? BigInt(Math.round(minorUnits)) : minorUnits;

  const isNegative = val < 0n;
  if (isNegative) {
    val = -val;
  }

  if (decimals === 0) {
    return (isNegative ? '-' : '') + val.toString();
  }

  const divisor = 10n ** BigInt(decimals);
  const whole = val / divisor;
  const fraction = val % divisor;
  const fractionStr = fraction.toString().padStart(decimals, '0');

  return (isNegative ? '-' : '') + `${whole.toString()}.${fractionStr}`;
}

/**
 * Formats minor units into an attractive display string with symbol
 * e.g., formatMoney(10050n, 'USD') => "$100.50"
 */
export function formatMoney(minorUnits: bigint | number, currencyCode: string): string {
  const currency = getCurrency(currencyCode);
  const decStr = toDecimalString(minorUnits, currencyCode);
  return `${currency.symbol}${decStr}`;
}
