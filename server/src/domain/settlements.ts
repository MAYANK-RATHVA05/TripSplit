import { toDecimalString } from './currencies.js';
import { MemberBalanceSummary } from './balances.js';

export interface SuggestedTransfer {
  fromMemberId: string;
  toMemberId: string;
  amountMinor: string;
  amountDecimal: string;
  currency: string;
}

/**
 * Generates simplified settlement transfer suggestions using a greedy min-cash-flow approach.
 * Minimizes the number of payments required for all group members to settle their debts to zero.
 */
export function generateSettlementSuggestions(
  memberBalances: MemberBalanceSummary[],
  baseCurrency: string
): SuggestedTransfer[] {
  // Separate into debtors (net < 0) and creditors (net > 0)
  const debtors: { memberId: string; amount: bigint }[] = [];
  const creditors: { memberId: string; amount: bigint }[] = [];

  for (const mb of memberBalances) {
    const net = BigInt(mb.netBalanceMinor);
    if (net < 0n) {
      debtors.push({ memberId: mb.memberId, amount: -net });
    } else if (net > 0n) {
      creditors.push({ memberId: mb.memberId, amount: net });
    }
  }

  // Sort descending by amount
  debtors.sort((a, b) => (b.amount > a.amount ? 1 : b.amount < a.amount ? -1 : 0));
  creditors.sort((a, b) => (b.amount > a.amount ? 1 : b.amount < a.amount ? -1 : 0));

  const transfers: SuggestedTransfer[] = [];
  let dIdx = 0;
  let cIdx = 0;

  while (dIdx < debtors.length && cIdx < creditors.length) {
    const debtor = debtors[dIdx];
    const creditor = creditors[cIdx];

    const transferAmount = debtor.amount < creditor.amount ? debtor.amount : creditor.amount;

    if (transferAmount > 0n) {
      transfers.push({
        fromMemberId: debtor.memberId,
        toMemberId: creditor.memberId,
        amountMinor: transferAmount.toString(),
        amountDecimal: toDecimalString(transferAmount, baseCurrency),
        currency: baseCurrency
      });
    }

    debtor.amount -= transferAmount;
    creditor.amount -= transferAmount;

    if (debtor.amount === 0n) {
      dIdx++;
    }
    if (creditor.amount === 0n) {
      cIdx++;
    }
  }

  return transfers;
}
