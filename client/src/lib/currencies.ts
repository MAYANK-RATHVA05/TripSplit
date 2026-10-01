export interface CurrencyOption {
  code: string;
  name: string;
  symbol: string;
  decimals: number;
}

export const CURRENCIES: Record<string, CurrencyOption> = {
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

export function getCurrency(code: string): CurrencyOption {
  const upper = (code || '').toUpperCase();
  return CURRENCIES[upper] || { code: upper || 'USD', name: upper || 'USD', symbol: upper || '$', decimals: 2 };
}

export function formatCurrencyAmount(amount: string | number, currencyCode: string): string {
  const currency = getCurrency(currencyCode);
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return `${currency.symbol}0.00`;

  const absNum = Math.abs(num);
  const formatted = absNum.toLocaleString(undefined, {
    minimumFractionDigits: currency.decimals,
    maximumFractionDigits: currency.decimals
  });

  const sign = num < 0 ? '-' : '';
  return `${sign}${currency.symbol}${formatted}`;
}
