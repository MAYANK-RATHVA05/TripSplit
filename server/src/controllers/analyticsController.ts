import { Request, Response } from 'express';
import { Group, Membership, Expense, Settlement } from '../models/index.js';
import { toDecimalString } from '../domain/currencies.js';
import { calculateGroupBalances, ExpenseRecord, SettlementRecord } from '../domain/balances.js';

export async function getTripAnalytics(req: Request, res: Response): Promise<void> {
  try {
    const groupId = req.params.groupId || req.params.id;
    const { startDate, endDate, category } = req.query;

    const group = await Group.findById(groupId);
    if (!group) {
      res.status(404).json({ error: 'Trip not found.' });
      return;
    }

    const members = await Membership.find({ groupId, state: 'active' });
    const allMemberIds = members.map(m => m.memberId);

    // Build filter query for expenses
    const query: any = { groupId, isVoided: false };
    if (category && category !== 'ALL') {
      query.category = category;
    }
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = String(startDate);
      if (endDate) query.date.$lte = String(endDate);
    }

    const filteredExpenses = await Expense.find(query).sort({ date: 1 });
    const allExpenses = await Expense.find({ groupId, isVoided: false });
    const allSettlements = await Settlement.find({ groupId, isReversed: false });

    // Map to domain interface for all-time balances
    const expRecords: ExpenseRecord[] = allExpenses.map(e => ({
      _id: e._id.toString(),
      description: e.description,
      date: e.date,
      category: e.category,
      originalCurrency: e.originalCurrency,
      exchangeRate: e.exchangeRate,
      baseCurrency: group.baseCurrency,
      baseAmountMinor: e.baseAmountMinor,
      isVoided: e.isVoided,
      payers: e.payers,
      participants: e.participants
    }));

    const settleRecords: SettlementRecord[] = allSettlements.map(s => ({
      _id: s._id.toString(),
      senderMemberId: s.senderMemberId,
      recipientMemberId: s.recipientMemberId,
      originalAmountMinor: s.originalAmountMinor,
      originalCurrency: s.originalCurrency,
      exchangeRate: s.exchangeRate,
      baseAmountMinor: s.baseAmountMinor,
      baseCurrency: group.baseCurrency,
      date: s.date,
      notes: s.notes,
      isReversed: s.isReversed
    }));

    const balancesResult = calculateGroupBalances(allMemberIds, group.baseCurrency, expRecords, settleRecords);
    const balanceByMemberId = new Map(balancesResult.memberBalances.map(mb => [mb.memberId, mb]));

    // 1. Spending by Friend within filtered expenses
    const paidByMember = new Map<string, bigint>();
    const shareByMember = new Map<string, bigint>();
    const countByMember = new Map<string, number>();

    for (const mId of allMemberIds) {
      paidByMember.set(mId, 0n);
      shareByMember.set(mId, 0n);
      countByMember.set(mId, 0);
    }

    for (const exp of filteredExpenses) {
      for (const p of exp.payers) {
        paidByMember.set(p.memberId, (paidByMember.get(p.memberId) || 0n) + BigInt(p.baseAmountMinor));
      }
      for (const part of exp.participants) {
        shareByMember.set(part.memberId, (shareByMember.get(part.memberId) || 0n) + BigInt(part.baseAmountMinor));
        countByMember.set(part.memberId, (countByMember.get(part.memberId) || 0) + 1);
      }
    }

    const spendingByFriend = members.map(m => {
      const paid = paidByMember.get(m.memberId) || 0n;
      const share = shareByMember.get(m.memberId) || 0n;
      const allTimeBal = balanceByMemberId.get(m.memberId);

      return {
        memberId: m.memberId,
        displayName: m.guestDisplayName,
        color: m.color,
        paidMinor: paid.toString(),
        paidDecimal: toDecimalString(paid, group.baseCurrency),
        paidNumber: Number(toDecimalString(paid, group.baseCurrency)),
        shareMinor: share.toString(),
        shareDecimal: toDecimalString(share, group.baseCurrency),
        shareNumber: Number(toDecimalString(share, group.baseCurrency)),
        expenseCount: countByMember.get(m.memberId) || 0,
        netBalanceDecimal: allTimeBal?.netBalanceDecimal || '0.00',
        status: allTimeBal?.status || 'settled'
      };
    });

    // 2. Spending by Category
    const categoryTotals = new Map<string, { totalMinor: bigint; count: number }>();
    let totalSpendMinor = 0n;

    for (const exp of filteredExpenses) {
      const amt = BigInt(exp.baseAmountMinor);
      totalSpendMinor += amt;

      const catData = categoryTotals.get(exp.category) || { totalMinor: 0n, count: 0 };
      catData.totalMinor += amt;
      catData.count += 1;
      categoryTotals.set(exp.category, catData);
    }

    const spendingByCategory = Array.from(categoryTotals.entries())
      .map(([category, data]) => {
        const percentage = totalSpendMinor > 0n
          ? Number((data.totalMinor * 10000n) / totalSpendMinor) / 100
          : 0;

        return {
          category,
          amountMinor: data.totalMinor.toString(),
          amountDecimal: toDecimalString(data.totalMinor, group.baseCurrency),
          amountNumber: Number(toDecimalString(data.totalMinor, group.baseCurrency)),
          percentage,
          count: data.count
        };
      })
      .sort((a, b) => b.amountNumber - a.amountNumber);

    // 3. Daily Spending Timeline
    const dailyMap = new Map<string, bigint>();
    for (const exp of filteredExpenses) {
      const amt = BigInt(exp.baseAmountMinor);
      dailyMap.set(exp.date, (dailyMap.get(exp.date) || 0n) + amt);
    }

    const dailySpending = Array.from(dailyMap.entries())
      .map(([date, amountMinor]) => ({
        date,
        amountDecimal: toDecimalString(amountMinor, group.baseCurrency),
        amountNumber: Number(toDecimalString(amountMinor, group.baseCurrency))
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    res.json({
      baseCurrency: group.baseCurrency,
      totalSpendDecimal: toDecimalString(totalSpendMinor, group.baseCurrency),
      totalSpendNumber: Number(toDecimalString(totalSpendMinor, group.baseCurrency)),
      spendingByFriend,
      spendingByCategory,
      dailySpending
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to generate analytics.', details: err.message });
  }
}
