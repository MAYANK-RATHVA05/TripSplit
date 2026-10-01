import { toDecimalString } from './currencies.js';

export type SplitMethod = 'EQUAL' | 'EXACT' | 'PERCENTAGE' | 'SHARES';

export interface ParticipantShareInput {
  memberId: string;
  exactAmountMinor?: string; // For EXACT
  percentage?: number;       // For PERCENTAGE (e.g. 50, 33.33)
  shares?: number;           // For SHARES (e.g. 1, 2)
}

export interface PayerContributionInput {
  memberId: string;
  amountMinor: string;
}

export interface CalculatedShare {
  memberId: string;
  amountMinor: string; // BigInt string
  amountDecimal: string;
  explanation?: string;
}

export interface SplitResult {
  shares: CalculatedShare[];
  totalMinor: string;
  totalDecimal: string;
  explanation: string;
}

export interface PayerValidationResult {
  payers: {
    memberId: string;
    amountMinor: string;
    amountDecimal: string;
  }[];
  totalMinor: string;
  totalDecimal: string;
}

/**
 * Calculates deterministic participant shares based on the selected method.
 * Guarantees that the sum of shares strictly equals the total minor units.
 */
export function calculateSplits(
  totalMinor: bigint,
  currencyCode: string,
  splitMethod: SplitMethod,
  participants: ParticipantShareInput[]
): SplitResult {
  if (totalMinor <= 0n) {
    throw new Error('Expense amount must be greater than zero.');
  }

  if (!participants || participants.length === 0) {
    throw new Error('At least one participant is required for an expense.');
  }

  const N = BigInt(participants.length);

  switch (splitMethod) {
    case 'EQUAL': {
      const quotient = totalMinor / N;
      const remainder = Number(totalMinor % N);

      const shares: CalculatedShare[] = participants.map((p, index) => {
        // Deterministically give +1 minor unit to the first `remainder` participants
        const allocated = index < remainder ? quotient + 1n : quotient;
        return {
          memberId: p.memberId,
          amountMinor: allocated.toString(),
          amountDecimal: toDecimalString(allocated, currencyCode),
          explanation: index < remainder && remainder > 0 ? '+1 minor unit allocated to preserve total' : undefined
        };
      });

      const explanation = remainder > 0
        ? `Split equally: ${remainder} member${remainder > 1 ? 's pay' : ' pays'} ${toDecimalString(quotient + 1n, currencyCode)}, and ${participants.length - remainder} pay ${toDecimalString(quotient, currencyCode)} (remainder allocated deterministically).`
        : `Split equally: each member owes ${toDecimalString(quotient, currencyCode)}.`;

      return {
        shares,
        totalMinor: totalMinor.toString(),
        totalDecimal: toDecimalString(totalMinor, currencyCode),
        explanation
      };
    }

    case 'EXACT': {
      let sum = 0n;
      const shares: CalculatedShare[] = [];

      for (const p of participants) {
        if (!p.exactAmountMinor) {
          throw new Error(`Participant ${p.memberId} is missing an exact amount.`);
        }
        const amt = BigInt(p.exactAmountMinor);
        if (amt < 0n) {
          throw new Error('Exact share amounts cannot be negative.');
        }
        sum += amt;
        shares.push({
          memberId: p.memberId,
          amountMinor: amt.toString(),
          amountDecimal: toDecimalString(amt, currencyCode)
        });
      }

      if (sum !== totalMinor) {
        const diff = totalMinor - sum;
        const diffStr = toDecimalString(diff < 0n ? -diff : diff, currencyCode);
        const direction = diff > 0n ? 'Add' : 'Remove';
        throw new Error(
          `Shares total ${toDecimalString(sum, currencyCode)}. ${direction} ${diffStr} to match the bill of ${toDecimalString(totalMinor, currencyCode)}.`
        );
      }

      return {
        shares,
        totalMinor: totalMinor.toString(),
        totalDecimal: toDecimalString(totalMinor, currencyCode),
        explanation: 'Split by exact custom amounts specified for each member.'
      };
    }

    case 'PERCENTAGE': {
      let percentSum = 0;
      for (const p of participants) {
        if (p.percentage === undefined || p.percentage < 0) {
          throw new Error(`Participant ${p.memberId} must have a non-negative percentage.`);
        }
        percentSum += p.percentage;
      }

      // Check sum of percentages (allowing tiny 0.01 tolerance for floating point representations)
      if (Math.abs(percentSum - 100) > 0.01) {
        throw new Error(
          `Percentages must total 100%. Current total is ${percentSum.toFixed(2)}%.`
        );
      }

      // Multiply percentage by 100 to work in basis points (e.g. 33.33% => 3333 basis points)
      // totalMinor * basisPoints / 10000
      let allocatedTotal = 0n;
      const intermediate: { memberId: string; baseAlloc: bigint; fracRemainder: bigint }[] = [];

      for (const p of participants) {
        const basisPoints = BigInt(Math.round((p.percentage || 0) * 100));
        const numerator = totalMinor * basisPoints;
        const denominator = 10000n;
        const baseAlloc = numerator / denominator;
        const fracRemainder = numerator % denominator;

        allocatedTotal += baseAlloc;
        intermediate.push({ memberId: p.memberId, baseAlloc, fracRemainder });
      }

      let remainder = totalMinor - allocatedTotal;
      // Sort intermediate by fractional remainder descending to distribute minor unit remainders
      const sortedIndices = intermediate
        .map((item, idx) => ({ idx, frac: item.fracRemainder }))
        .sort((a, b) => (b.frac > a.frac ? 1 : b.frac < a.frac ? -1 : 0));

      const extraAllocations = new Map<number, bigint>();
      let i = 0;
      while (remainder > 0n && i < sortedIndices.length) {
        const itemIdx = sortedIndices[i].idx;
        extraAllocations.set(itemIdx, (extraAllocations.get(itemIdx) || 0n) + 1n);
        remainder -= 1n;
        i++;
      }

      const shares: CalculatedShare[] = intermediate.map((item, index) => {
        const extra = extraAllocations.get(index) || 0n;
        const finalAmt = item.baseAlloc + extra;
        return {
          memberId: item.memberId,
          amountMinor: finalAmt.toString(),
          amountDecimal: toDecimalString(finalAmt, currencyCode),
          explanation: extra > 0n ? '+1 minor unit to preserve 100% total' : undefined
        };
      });

      return {
        shares,
        totalMinor: totalMinor.toString(),
        totalDecimal: toDecimalString(totalMinor, currencyCode),
        explanation: 'Split by percentage with deterministic integer rounding.'
      };
    }

    case 'SHARES': {
      let totalSharesWeight = 0;
      for (const p of participants) {
        const weight = p.shares !== undefined ? p.shares : 1;
        if (weight <= 0) {
          throw new Error('Weighted share values must be strictly positive (greater than 0).');
        }
        totalSharesWeight += weight;
      }

      const totalWeightBig = BigInt(totalSharesWeight);
      let allocatedTotal = 0n;
      const intermediate: { memberId: string; baseAlloc: bigint; fracRemainder: bigint }[] = [];

      for (const p of participants) {
        const weight = BigInt(p.shares !== undefined ? p.shares : 1);
        const numerator = totalMinor * weight;
        const baseAlloc = numerator / totalWeightBig;
        const fracRemainder = numerator % totalWeightBig;

        allocatedTotal += baseAlloc;
        intermediate.push({ memberId: p.memberId, baseAlloc, fracRemainder });
      }

      let remainder = totalMinor - allocatedTotal;
      const sortedIndices = intermediate
        .map((item, idx) => ({ idx, frac: item.fracRemainder }))
        .sort((a, b) => (b.frac > a.frac ? 1 : b.frac < a.frac ? -1 : 0));

      const extraAllocations = new Map<number, bigint>();
      let i = 0;
      while (remainder > 0n && i < sortedIndices.length) {
        const itemIdx = sortedIndices[i].idx;
        extraAllocations.set(itemIdx, (extraAllocations.get(itemIdx) || 0n) + 1n);
        remainder -= 1n;
        i++;
      }

      const shares: CalculatedShare[] = intermediate.map((item, index) => {
        const extra = extraAllocations.get(index) || 0n;
        const finalAmt = item.baseAlloc + extra;
        return {
          memberId: item.memberId,
          amountMinor: finalAmt.toString(),
          amountDecimal: toDecimalString(finalAmt, currencyCode),
          explanation: extra > 0n ? '+1 minor unit rounding allocation' : undefined
        };
      });

      return {
        shares,
        totalMinor: totalMinor.toString(),
        totalDecimal: toDecimalString(totalMinor, currencyCode),
        explanation: `Split by weights (${totalSharesWeight} total shares).`
      };
    }

    default:
      throw new Error(`Unsupported split method: ${splitMethod}`);
  }
}

/**
 * Validates multiple payer contributions against the total expense amount.
 */
export function validatePayers(
  totalMinor: bigint,
  currencyCode: string,
  payers: PayerContributionInput[]
): PayerValidationResult {
  if (!payers || payers.length === 0) {
    throw new Error('At least one payer is required.');
  }

  let sum = 0n;
  const resultPayers = [];

  for (const p of payers) {
    const amt = BigInt(p.amountMinor);
    if (amt <= 0n) {
      throw new Error('Payer contribution must be greater than zero.');
    }
    sum += amt;
    resultPayers.push({
      memberId: p.memberId,
      amountMinor: amt.toString(),
      amountDecimal: toDecimalString(amt, currencyCode)
    });
  }

  if (sum !== totalMinor) {
    const diff = totalMinor - sum;
    const diffStr = toDecimalString(diff < 0n ? -diff : diff, currencyCode);
    const direction = diff > 0n ? 'Add' : 'Remove';
    throw new Error(
      `Payer contributions total ${toDecimalString(sum, currencyCode)}. ${direction} ${diffStr} to match the bill of ${toDecimalString(totalMinor, currencyCode)}.`
    );
  }

  return {
    payers: resultPayers,
    totalMinor: totalMinor.toString(),
    totalDecimal: toDecimalString(totalMinor, currencyCode)
  };
}
