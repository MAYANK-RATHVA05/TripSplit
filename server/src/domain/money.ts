import { getCurrency, toDecimalString, toMinorUnits } from './currencies.js';

export interface ConversionSnapshot {
  originalAmountMinor: string; // Serialized BigInt string
  originalAmountDecimal: string;
  originalCurrency: string;
  exchangeRate: string; // e.g. "1.085" or "82.5"
  rateDirection: string; // "1 EUR = 1.085 USD"
  baseAmountMinor: string; // Serialized BigInt string
  baseAmountDecimal: string;
  baseCurrency: string;
}

/**
 * Converts minor units of originalCurrency to minor units of baseCurrency
 * using exact integer arithmetic:
 * rate = 1 unit of original = R units of base.
 * R is parsed into integer R_int / 10^k.
 * baseMinor = round( (origMinor * R_int * 10^baseDecimals) / 10^(origDecimals + k) )
 */
export function convertCurrency(
  originalMinor: bigint,
  originalCurrency: string,
  baseCurrency: string,
  rateStr: string = '1.0'
): bigint {
  const origUpper = (originalCurrency || '').toUpperCase();
  const baseUpper = (baseCurrency || '').toUpperCase();

  if (origUpper === baseUpper) {
    return originalMinor;
  }

  const origInfo = getCurrency(origUpper);
  const baseInfo = getCurrency(baseUpper);

  // Parse rate string into integer and scale
  const cleanRate = (rateStr || '1').trim();
  const rateParts = cleanRate.split('.');
  const wholePart = rateParts[0] || '0';
  const fracPart = rateParts[1] || '';
  const k = BigInt(fracPart.length);
  const rateInt = BigInt(wholePart + fracPart);

  const origDecimals = BigInt(origInfo.decimals);
  const baseDecimals = BigInt(baseInfo.decimals);

  // Formula: (origMinor * rateInt * 10^baseDecimals) / 10^(origDecimals + k)
  const numerator = originalMinor * rateInt * (10n ** baseDecimals);
  const denominator = 10n ** (origDecimals + k);

  if (denominator === 0n) return 0n;

  // Round half away from zero: (numerator + denominator/2) / denominator
  const isNegative = numerator < 0n;
  const absNum = isNegative ? -numerator : numerator;
  const rounded = (absNum + denominator / 2n) / denominator;

  return isNegative ? -rounded : rounded;
}

/**
 * Creates a frozen conversion snapshot for storing in the expense or settlement record
 */
export function createConversionSnapshot(
  originalAmountMinor: bigint,
  originalCurrency: string,
  baseCurrency: string,
  exchangeRateStr: string = '1.0'
): ConversionSnapshot {
  const origUpper = (originalCurrency || '').toUpperCase();
  const baseUpper = (baseCurrency || '').toUpperCase();
  const effectiveRate = origUpper === baseUpper ? '1.0' : (exchangeRateStr || '1.0');

  const baseMinor = convertCurrency(originalAmountMinor, origUpper, baseUpper, effectiveRate);

  return {
    originalAmountMinor: originalAmountMinor.toString(),
    originalAmountDecimal: toDecimalString(originalAmountMinor, origUpper),
    originalCurrency: origUpper,
    exchangeRate: effectiveRate,
    rateDirection: `1 ${origUpper} = ${effectiveRate} ${baseUpper}`,
    baseAmountMinor: baseMinor.toString(),
    baseAmountDecimal: toDecimalString(baseMinor, baseUpper),
    baseCurrency: baseUpper
  };
}
