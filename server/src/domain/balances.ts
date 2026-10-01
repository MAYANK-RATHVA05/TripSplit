import { toDecimalString } from './currencies.js';
import { convertCurrency } from './money.js';

export interface ExpenseRecord {
  _id: string;
  description: string;
  merchant?: string;
  date: string;
  category: string;
  originalCurrency: string;
  exchangeRate: string;
  baseCurrency: string;
  baseAmountMinor: string;
  isVoided: boolean;
  payers: {
    memberId: string;
    amountMinor: string; // in originalCurrency
    baseAmountMinor?: string;
  }[];
  participants: {
    memberId: string;
    amountMinor: string; // in originalCurrency
    baseAmountMinor?: string;
  }[];
}

export interface SettlementRecord {
  _id: string;
  senderMemberId: string;
  recipientMemberId: string;
  originalAmountMinor: string;
  originalCurrency: string;
  exchangeRate: string;
  baseAmountMinor: string;
  baseCurrency: string;
  date: string;
  notes?: string;
  isReversed: boolean;
}

export interface MemberBalanceSummary {
  memberId: string;
  totalPaidMinor: string;
  totalPaidDecimal: string;
  totalShareMinor: string;
  totalShareDecimal: string;
  repaymentsSentMinor: string;
  repaymentsSentDecimal: string;
  repaymentsReceivedMinor: string;
  repaymentsReceivedDecimal: string;
  netBalanceMinor: string; // positive = owed money, negative = owes money
  netBalanceDecimal: string;
  status: 'receives' | 'owes' | 'settled';
}

export interface BalanceExplanation {
  memberId: string;
  netBalanceDecimal: string;
  status: 'receives' | 'owes' | 'settled';
  totalPaidDecimal: string;
  totalShareDecimal: string;
  repaymentsSentDecimal: string;
  repaymentsReceivedDecimal: string;
  paidExpenses: {
    expenseId: string;
    description: string;
    date: string;
    originalAmountDecimal: string;
    originalCurrency: string;
    baseAmountDecimal: string;
  }[];
  shareExpenses: {
    expenseId: string;
    description: string;
    date: string;
    originalShareDecimal: string;
    originalCurrency: string;
    baseShareDecimal: string;
  }[];
  repaymentsSent: {
    settlementId: string;
    recipientMemberId: string;
    date: string;
    baseAmountDecimal: string;
  }[];
  repaymentsReceived: {
    settlementId: string;
    senderMemberId: string;
    date: string;
    baseAmountDecimal: string;
  }[];
}

export interface GroupBalancesResult {
  baseCurrency: string;
  memberBalances: MemberBalanceSummary[];
  sumOfNetBalancesMinor: string;
  isBalanced: boolean; // sum == 0
}

/**
 * Calculates authoritative member balances for a group.
 * Ensures the fundamental accounting rule:
 * Net Balance = Total Paid - Allocated Personal Shares + Repayments Sent - Repayments Received
 */
export function calculateGroupBalances(
  allMemberIds: string[],
  baseCurrency: string,
  expenses: ExpenseRecord[],
  settlements: SettlementRecord[]
): GroupBalancesResult {
  const paidMap = new Map<string, bigint>();
  const shareMap = new Map<string, bigint>();
  const sentMap = new Map<string, bigint>();
  const recvMap = new Map<string, bigint>();

  for (const mId of allMemberIds) {
    paidMap.set(mId, 0n);
    shareMap.set(mId, 0n);
    sentMap.set(mId, 0n);
    recvMap.set(mId, 0n);
  }

  // 1. Process Active Expenses
  for (const exp of expenses) {
    if (exp.isVoided) continue;

    // Converted base amounts for payers
    for (const p of exp.payers) {
      const baseAmt = p.baseAmountMinor
        ? BigInt(p.baseAmountMinor)
        : convertCurrency(BigInt(p.amountMinor), exp.originalCurrency, baseCurrency, exp.exchangeRate);
      paidMap.set(p.memberId, (paidMap.get(p.memberId) || 0n) + baseAmt);
    }

    // Converted base amounts for participants
    for (const part of exp.participants) {
      const baseAmt = part.baseAmountMinor
        ? BigInt(part.baseAmountMinor)
        : convertCurrency(BigInt(part.amountMinor), exp.originalCurrency, baseCurrency, exp.exchangeRate);
      shareMap.set(part.memberId, (shareMap.get(part.memberId) || 0n) + baseAmt);
    }
  }

  // 2. Process Settlements (Transfers)
  for (const s of settlements) {
    if (s.isReversed) continue;

    const baseAmt = BigInt(s.baseAmountMinor);
    sentMap.set(s.senderMemberId, (sentMap.get(s.senderMemberId) || 0n) + baseAmt);
    recvMap.set(s.recipientMemberId, (recvMap.get(s.recipientMemberId) || 0n) + baseAmt);
  }

  // 3. Assemble Balances
  let sumNet = 0n;
  const memberBalances: MemberBalanceSummary[] = [];

  for (const mId of allMemberIds) {
    const paid = paidMap.get(mId) || 0n;
    const share = shareMap.get(mId) || 0n;
    const sent = sentMap.get(mId) || 0n;
    const recv = recvMap.get(mId) || 0n;

    const net = paid - share + sent - recv;
    sumNet += net;

    let status: 'receives' | 'owes' | 'settled' = 'settled';
    if (net > 0n) status = 'receives';
    else if (net < 0n) status = 'owes';

    memberBalances.push({
      memberId: mId,
      totalPaidMinor: paid.toString(),
      totalPaidDecimal: toDecimalString(paid, baseCurrency),
      totalShareMinor: share.toString(),
      totalShareDecimal: toDecimalString(share, baseCurrency),
      repaymentsSentMinor: sent.toString(),
      repaymentsSentDecimal: toDecimalString(sent, baseCurrency),
      repaymentsReceivedMinor: recv.toString(),
      repaymentsReceivedDecimal: toDecimalString(recv, baseCurrency),
      netBalanceMinor: net.toString(),
      netBalanceDecimal: toDecimalString(net, baseCurrency),
      status
    });
  }

  return {
    baseCurrency,
    memberBalances,
    sumOfNetBalancesMinor: sumNet.toString(),
    isBalanced: sumNet === 0n
  };
}

/**
 * Generates an itemized explanation for a specific member's balance.
 */
export function getMemberBalanceExplanation(
  memberId: string,
  baseCurrency: string,
  expenses: ExpenseRecord[],
  settlements: SettlementRecord[]
): BalanceExplanation {
  let paidTotal = 0n;
  let shareTotal = 0n;
  let sentTotal = 0n;
  let recvTotal = 0n;

  const paidExpenses: BalanceExplanation['paidExpenses'] = [];
  const shareExpenses: BalanceExplanation['shareExpenses'] = [];
  const repaymentsSent: BalanceExplanation['repaymentsSent'] = [];
  const repaymentsReceived: BalanceExplanation['repaymentsReceived'] = [];

  for (const exp of expenses) {
    if (exp.isVoided) continue;

    const payer = exp.payers.find(p => p.memberId === memberId);
    if (payer) {
      const origAmt = BigInt(payer.amountMinor);
      const baseAmt = payer.baseAmountMinor
        ? BigInt(payer.baseAmountMinor)
        : convertCurrency(origAmt, exp.originalCurrency, baseCurrency, exp.exchangeRate);
      paidTotal += baseAmt;
      paidExpenses.push({
        expenseId: exp._id,
        description: exp.description,
        date: exp.date,
        originalAmountDecimal: toDecimalString(origAmt, exp.originalCurrency),
        originalCurrency: exp.originalCurrency,
        baseAmountDecimal: toDecimalString(baseAmt, baseCurrency)
      });
    }

    const participant = exp.participants.find(p => p.memberId === memberId);
    if (participant) {
      const origAmt = BigInt(participant.amountMinor);
      const baseAmt = participant.baseAmountMinor
        ? BigInt(participant.baseAmountMinor)
        : convertCurrency(origAmt, exp.originalCurrency, baseCurrency, exp.exchangeRate);
      shareTotal += baseAmt;
      shareExpenses.push({
        expenseId: exp._id,
        description: exp.description,
        date: exp.date,
        originalShareDecimal: toDecimalString(origAmt, exp.originalCurrency),
        originalCurrency: exp.originalCurrency,
        baseShareDecimal: toDecimalString(baseAmt, baseCurrency)
      });
    }
  }

  for (const s of settlements) {
    if (s.isReversed) continue;
    const baseAmt = BigInt(s.baseAmountMinor);

    if (s.senderMemberId === memberId) {
      sentTotal += baseAmt;
      repaymentsSent.push({
        settlementId: s._id,
        recipientMemberId: s.recipientMemberId,
        date: s.date,
        baseAmountDecimal: toDecimalString(baseAmt, baseCurrency)
      });
    }

    if (s.recipientMemberId === memberId) {
      recvTotal += baseAmt;
      repaymentsReceived.push({
        settlementId: s._id,
        senderMemberId: s.senderMemberId,
        date: s.date,
        baseAmountDecimal: toDecimalString(baseAmt, baseCurrency)
      });
    }
  }

  const net = paidTotal - shareTotal + sentTotal - recvTotal;
  let status: 'receives' | 'owes' | 'settled' = 'settled';
  if (net > 0n) status = 'receives';
  else if (net < 0n) status = 'owes';

  return {
    memberId,
    netBalanceDecimal: toDecimalString(net, baseCurrency),
    status,
    totalPaidDecimal: toDecimalString(paidTotal, baseCurrency),
    totalShareDecimal: toDecimalString(shareTotal, baseCurrency),
    repaymentsSentDecimal: toDecimalString(sentTotal, baseCurrency),
    repaymentsReceivedDecimal: toDecimalString(recvTotal, baseCurrency),
    paidExpenses,
    shareExpenses,
    repaymentsSent,
    repaymentsReceived
  };
}
