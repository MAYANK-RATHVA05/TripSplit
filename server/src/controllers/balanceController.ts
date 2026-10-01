import { Request, Response } from 'express';
import { Group, Membership, Expense, Settlement } from '../models/index.js';
import { calculateGroupBalances, getMemberBalanceExplanation, ExpenseRecord, SettlementRecord } from '../domain/balances.js';
import { generateSettlementSuggestions } from '../domain/settlements.js';
import { toDecimalString } from '../domain/currencies.js';

export async function getGroupBalances(req: Request, res: Response): Promise<void> {
  try {
    const groupId = req.params.groupId || req.params.id;
    const group = await Group.findById(groupId);
    if (!group) {
      res.status(404).json({ error: 'Trip not found.' });
      return;
    }

    const members = await Membership.find({ groupId, state: 'active' });
    const allMemberIds = members.map(m => m.memberId);

    const expensesDocs = await Expense.find({ groupId, isVoided: false });
    const settlementsDocs = await Settlement.find({ groupId, isReversed: false });

    // Map to domain interface
    const expenses: ExpenseRecord[] = expensesDocs.map(e => ({
      _id: e._id.toString(),
      description: e.description,
      merchant: e.merchant,
      date: e.date,
      category: e.category,
      originalCurrency: e.originalCurrency,
      exchangeRate: e.exchangeRate,
      baseCurrency: group.baseCurrency,
      baseAmountMinor: e.baseAmountMinor,
      isVoided: e.isVoided,
      payers: e.payers.map(p => ({
        memberId: p.memberId,
        amountMinor: p.amountMinor,
        baseAmountMinor: p.baseAmountMinor
      })),
      participants: e.participants.map(part => ({
        memberId: part.memberId,
        amountMinor: part.amountMinor,
        baseAmountMinor: part.baseAmountMinor
      }))
    }));

    const settlements: SettlementRecord[] = settlementsDocs.map(s => ({
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

    const balancesResult = calculateGroupBalances(allMemberIds, group.baseCurrency, expenses, settlements);
    const suggestions = generateSettlementSuggestions(balancesResult.memberBalances, group.baseCurrency);

    // Total trip spend in base currency (excluding repayments and voids)
    const totalSpendMinor = expenses.reduce((acc, e) => acc + BigInt(e.baseAmountMinor), 0n);

    // Member lookup mapping
    const memberNameMap: Record<string, { displayName: string; color: string }> = {};
    for (const m of members) {
      memberNameMap[m.memberId] = {
        displayName: m.guestDisplayName,
        color: m.color
      };
    }

    const enhancedBalances = balancesResult.memberBalances.map(mb => ({
      ...mb,
      displayName: memberNameMap[mb.memberId]?.displayName || 'Member',
      color: memberNameMap[mb.memberId]?.color || '#4F46E5'
    }));

    const enhancedSuggestions = suggestions.map(s => ({
      ...s,
      fromDisplayName: memberNameMap[s.fromMemberId]?.displayName || 'Member',
      fromColor: memberNameMap[s.fromMemberId]?.color || '#4F46E5',
      toDisplayName: memberNameMap[s.toMemberId]?.displayName || 'Member',
      toColor: memberNameMap[s.toMemberId]?.color || '#4F46E5'
    }));

    res.json({
      baseCurrency: group.baseCurrency,
      totalSpendDecimal: toDecimalString(totalSpendMinor, group.baseCurrency),
      memberBalances: enhancedBalances,
      suggestions: enhancedSuggestions,
      isBalanced: balancesResult.isBalanced
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to calculate group balances.', details: err.message });
  }
}

export async function explainMemberBalance(req: Request, res: Response): Promise<void> {
  try {
    const groupId = req.params.groupId || req.params.id;
    const memberId = String(req.params.memberId);

    const group = await Group.findById(groupId);
    if (!group) {
      res.status(404).json({ error: 'Trip not found.' });
      return;
    }

    const expensesDocs = await Expense.find({ groupId, isVoided: false });
    const settlementsDocs = await Settlement.find({ groupId, isReversed: false });

    const expenses: ExpenseRecord[] = expensesDocs.map(e => ({
      _id: e._id.toString(),
      description: e.description,
      merchant: e.merchant,
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

    const settlements: SettlementRecord[] = settlementsDocs.map(s => ({
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

    const explanation = getMemberBalanceExplanation(memberId, group.baseCurrency, expenses, settlements);

    const members = await Membership.find({ groupId });
    const memberNameMap = new Map<string, string>();
    for (const m of members) {
      memberNameMap.set(m.memberId, m.guestDisplayName);
    }

    const enrichedExplanation = {
      ...explanation,
      memberDisplayName: memberNameMap.get(memberId) || 'Member',
      repaymentsSent: explanation.repaymentsSent.map(r => ({
        ...r,
        recipientName: memberNameMap.get(r.recipientMemberId) || 'Member'
      })),
      repaymentsReceived: explanation.repaymentsReceived.map(r => ({
        ...r,
        senderName: memberNameMap.get(r.senderMemberId) || 'Member'
      }))
    };

    res.json({ explanation: enrichedExplanation });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to explain balance.', details: err.message });
  }
}
