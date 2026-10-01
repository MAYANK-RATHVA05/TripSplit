import { Request, Response } from 'express';
import { Group, Settlement, Membership, Activity } from '../models/index.js';
import { toMinorUnits, toDecimalString } from '../domain/currencies.js';
import { createConversionSnapshot } from '../domain/money.js';

export async function recordSettlement(req: Request, res: Response): Promise<void> {
  try {
    const groupId = req.params.groupId || req.params.id;
    const group = await Group.findById(groupId);
    if (!group) {
      res.status(404).json({ error: 'Trip not found.' });
      return;
    }

    const {
      senderMemberId,
      recipientMemberId,
      amount,
      currency,
      exchangeRate,
      date,
      notes,
      proofUrl,
      idempotencyKey
    } = req.body;

    if (idempotencyKey) {
      const existing = await Settlement.findOne({ groupId, idempotencyKey });
      if (existing) {
        res.status(200).json({ settlement: existing, isDuplicate: true });
        return;
      }
    }

    if (!senderMemberId || !recipientMemberId) {
      res.status(400).json({ error: 'Sender and recipient member IDs are required.' });
      return;
    }

    if (senderMemberId === recipientMemberId) {
      res.status(400).json({ error: 'Sender and recipient cannot be the same member.' });
      return;
    }

    if (!amount || Number(amount) <= 0) {
      res.status(400).json({ error: 'Repayment amount must be greater than zero.' });
      return;
    }

    const settlementCurrency = (currency || group.baseCurrency).toUpperCase();
    const origMinor = toMinorUnits(amount, settlementCurrency);
    const effectiveRate = settlementCurrency === group.baseCurrency ? '1.0' : (exchangeRate || '1.0');
    const conversion = createConversionSnapshot(origMinor, settlementCurrency, group.baseCurrency, effectiveRate);

    const settlement = await Settlement.create({
      groupId,
      senderMemberId,
      recipientMemberId,
      originalAmountMinor: origMinor.toString(),
      originalCurrency: settlementCurrency,
      exchangeRate: effectiveRate,
      rateDirection: conversion.rateDirection,
      baseAmountMinor: conversion.baseAmountMinor,
      baseCurrency: group.baseCurrency,
      date: date || new Date().toISOString().split('T')[0],
      notes: (notes || '').trim(),
      proofUrl,
      creatorMemberId: req.membership!.memberId,
      version: 1,
      isReversed: false,
      idempotencyKey
    });

    const [senderMem, recipientMem] = await Promise.all([
      Membership.findOne({ groupId, memberId: senderMemberId }),
      Membership.findOne({ groupId, memberId: recipientMemberId })
    ]);

    await Activity.create({
      groupId,
      actorMemberId: req.membership!.memberId,
      actorName: req.membership!.guestDisplayName,
      action: 'RECORD_SETTLEMENT',
      entityType: 'settlement',
      entityId: settlement._id.toString(),
      details: `Recorded repayment: ${senderMem?.guestDisplayName || 'Sender'} paid ${recipientMem?.guestDisplayName || 'Recipient'} ${toDecimalString(origMinor, settlementCurrency)} ${settlementCurrency}.`
    });

    res.status(201).json({
      settlement: {
        id: settlement._id.toString(),
        senderMemberId: settlement.senderMemberId,
        recipientMemberId: settlement.recipientMemberId,
        originalAmountDecimal: toDecimalString(origMinor, settlementCurrency),
        originalCurrency: settlement.originalCurrency,
        baseAmountDecimal: toDecimalString(BigInt(settlement.baseAmountMinor), group.baseCurrency),
        baseCurrency: settlement.baseCurrency,
        date: settlement.date,
        notes: settlement.notes,
        isReversed: settlement.isReversed,
        createdAt: settlement.createdAt
      }
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to record repayment.' });
  }
}

export async function listSettlements(req: Request, res: Response): Promise<void> {
  try {
    const groupId = req.params.groupId || req.params.id;
    const settlements = await Settlement.find({ groupId }).sort({ date: -1, createdAt: -1 });

    const members = await Membership.find({ groupId });
    const nameMap = new Map<string, string>();
    for (const m of members) {
      nameMap.set(m.memberId, m.guestDisplayName);
    }

    const group = await Group.findById(groupId);
    const baseCurrency = group?.baseCurrency || 'USD';

    const formatted = settlements.map(s => ({
      id: s._id.toString(),
      senderMemberId: s.senderMemberId,
      senderDisplayName: nameMap.get(s.senderMemberId) || 'Member',
      recipientMemberId: s.recipientMemberId,
      recipientDisplayName: nameMap.get(s.recipientMemberId) || 'Member',
      originalAmountDecimal: toDecimalString(BigInt(s.originalAmountMinor), s.originalCurrency),
      originalCurrency: s.originalCurrency,
      baseAmountDecimal: toDecimalString(BigInt(s.baseAmountMinor), baseCurrency),
      baseCurrency: s.baseCurrency,
      date: s.date,
      notes: s.notes,
      proofUrl: s.proofUrl,
      isReversed: s.isReversed,
      createdAt: s.createdAt
    }));

    res.json({ settlements: formatted });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to list settlements.', details: err.message });
  }
}

export async function reverseSettlement(req: Request, res: Response): Promise<void> {
  try {
    const { settlementId } = req.params;
    const settlement = await Settlement.findById(settlementId);
    if (!settlement) {
      res.status(404).json({ error: 'Settlement record not found.' });
      return;
    }

    settlement.isReversed = true;
    settlement.version += 1;
    await settlement.save();

    await Activity.create({
      groupId: settlement.groupId,
      actorMemberId: req.membership!.memberId,
      actorName: req.membership!.guestDisplayName,
      action: 'REVERSE_SETTLEMENT',
      entityType: 'settlement',
      entityId: settlement._id.toString(),
      details: `Reversed repayment record. Debt restored to original state.`
    });

    res.json({ message: 'Repayment reversed successfully.', settlementId: settlement._id.toString() });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to reverse repayment.', details: err.message });
  }
}
