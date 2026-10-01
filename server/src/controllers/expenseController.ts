import { Request, Response } from 'express';
import { Group, Expense, Membership, Activity } from '../models/index.js';
import { toMinorUnits, toDecimalString, getCurrency } from '../domain/currencies.js';
import { convertCurrency, createConversionSnapshot } from '../domain/money.js';
import { calculateSplits, validatePayers, SplitMethod } from '../domain/splitting.js';

export async function createExpense(req: Request, res: Response): Promise<void> {
  try {
    const groupId = req.params.groupId || req.params.id;
    const group = await Group.findById(groupId);
    if (!group) {
      res.status(404).json({ error: 'Trip not found.' });
      return;
    }

    const {
      description,
      merchant,
      date,
      category,
      notes,
      amount,
      currency,
      exchangeRate,
      splitMethod,
      payers,
      participants,
      idempotencyKey
    } = req.body;

    // 1. Idempotency Check
    if (idempotencyKey) {
      const existing = await Expense.findOne({ groupId, idempotencyKey });
      if (existing) {
        res.status(200).json({ expense: existing, isDuplicate: true });
        return;
      }
    }

    if (!description || !description.trim()) {
      res.status(400).json({ error: 'Expense description is required.' });
      return;
    }

    if (!amount || Number(amount) <= 0) {
      res.status(400).json({ error: 'Expense amount must be greater than zero.' });
      return;
    }

    const expenseCurrency = (currency || group.baseCurrency).toUpperCase();
    const totalMinor = toMinorUnits(amount, expenseCurrency);

    // 2. Conversion snapshot to Group Base Currency
    const effectiveRate = expenseCurrency === group.baseCurrency ? '1.0' : (exchangeRate || '1.0');
    const conversion = createConversionSnapshot(totalMinor, expenseCurrency, group.baseCurrency, effectiveRate);

    // 3. Validate Payers
    // If no payers array provided, default to current member paying 100%
    let payerInputs = payers;
    if (typeof payerInputs === 'string') {
      try {
        payerInputs = JSON.parse(payerInputs);
      } catch {}
    }

    if (!payerInputs || payerInputs.length === 0) {
      payerInputs = [{
        memberId: req.membership!.memberId,
        amountMinor: totalMinor.toString()
      }];
    } else {
      payerInputs = payerInputs.map((p: any) => ({
        memberId: p.memberId,
        amountMinor: p.amountMinor || toMinorUnits(p.amount, expenseCurrency).toString()
      }));
    }

    const validatedPayersResult = validatePayers(totalMinor, expenseCurrency, payerInputs);

    // Converted base amount for each payer
    const payersWithBase = validatedPayersResult.payers.map(p => {
      const pMinor = BigInt(p.amountMinor);
      const pBaseMinor = convertCurrency(pMinor, expenseCurrency, group.baseCurrency, effectiveRate);
      return {
        memberId: p.memberId,
        amountMinor: p.amountMinor,
        baseAmountMinor: pBaseMinor.toString()
      };
    });

    // 4. Calculate Split Shares
    const method: SplitMethod = (splitMethod || 'EQUAL') as SplitMethod;
    let participantInputs = participants;
    if (typeof participantInputs === 'string') {
      try {
        participantInputs = JSON.parse(participantInputs);
      } catch {}
    }

    // If no participants array provided, default to all active members of the group
    if (!participantInputs || participantInputs.length === 0) {
      const allMembers = await Membership.find({ groupId, state: 'active' });
      participantInputs = allMembers.map(m => ({ memberId: m.memberId }));
    } else {
      participantInputs = participantInputs.map((part: any) => ({
        memberId: part.memberId,
        exactAmountMinor: part.exactAmount ? toMinorUnits(part.exactAmount, expenseCurrency).toString() : part.exactAmountMinor,
        percentage: part.percentage !== undefined ? Number(part.percentage) : undefined,
        shares: part.shares !== undefined ? Number(part.shares) : undefined
      }));
    }

    const splitResult = calculateSplits(totalMinor, expenseCurrency, method, participantInputs);

    const participantsWithBase = splitResult.shares.map((share, idx) => {
      const sMinor = BigInt(share.amountMinor);
      const sBaseMinor = convertCurrency(sMinor, expenseCurrency, group.baseCurrency, effectiveRate);
      const originalInput = participantInputs[idx];

      return {
        memberId: share.memberId,
        amountMinor: share.amountMinor,
        baseAmountMinor: sBaseMinor.toString(),
        percentage: originalInput?.percentage,
        shares: originalInput?.shares
      };
    });

    // 5. Handle Uploaded Attachments
    const attachments = [];
    if (req.files && Array.isArray(req.files)) {
      for (const file of req.files) {
        attachments.push({
          filename: file.filename,
          originalName: file.originalname,
          mimeType: file.mimetype,
          size: file.size,
          url: `/uploads/${file.filename}`
        });
      }
    }

    const expense = await Expense.create({
      groupId,
      description: description.trim(),
      merchant: merchant ? merchant.trim() : undefined,
      date: date || new Date().toISOString().split('T')[0],
      category: category || 'Food & Drink',
      notes: notes ? notes.trim() : '',
      originalAmountMinor: totalMinor.toString(),
      originalCurrency: expenseCurrency,
      exchangeRate: effectiveRate,
      rateDirection: conversion.rateDirection,
      baseAmountMinor: conversion.baseAmountMinor,
      baseCurrency: group.baseCurrency,
      splitMethod: method,
      splitExplanation: splitResult.explanation,
      payers: payersWithBase,
      participants: participantsWithBase,
      attachments,
      creatorMemberId: req.membership!.memberId,
      version: 1,
      isVoided: false,
      idempotencyKey
    });

    await Activity.create({
      groupId,
      actorMemberId: req.membership!.memberId,
      actorName: req.membership!.guestDisplayName,
      action: 'CREATE_EXPENSE',
      entityType: 'expense',
      entityId: expense._id.toString(),
      details: `Added expense "${expense.description}" for ${conversion.originalAmountDecimal} ${expense.originalCurrency}.`
    });

    res.status(201).json({
      expense: formatExpenseResponse(expense, group.baseCurrency)
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to create expense.' });
  }
}

export async function listExpenses(req: Request, res: Response): Promise<void> {
  try {
    const groupId = req.params.groupId || req.params.id;
    const { category, search, startDate, endDate, page = '1', limit = '50' } = req.query;

    const query: any = { groupId, isVoided: false };

    if (category && category !== 'ALL') {
      query.category = category;
    }

    if (search) {
      const searchRegex = new RegExp(String(search), 'i');
      query.$or = [{ description: searchRegex }, { merchant: searchRegex }];
    }

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = String(startDate);
      if (endDate) query.date.$lte = String(endDate);
    }

    const pageNum = parseInt(String(page), 10) || 1;
    const limitNum = parseInt(String(limit), 10) || 50;
    const skip = (pageNum - 1) * limitNum;

    const [expenses, totalCount] = await Promise.all([
      Expense.find(query).sort({ date: -1, createdAt: -1 }).skip(skip).limit(limitNum),
      Expense.countDocuments(query)
    ]);

    const group = await Group.findById(groupId);
    const baseCurrency = group?.baseCurrency || 'USD';

    res.json({
      expenses: expenses.map(e => formatExpenseResponse(e, baseCurrency)),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalCount,
        pages: Math.ceil(totalCount / limitNum)
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to list expenses.', details: err.message });
  }
}

export async function getExpense(req: Request, res: Response): Promise<void> {
  try {
    const { expenseId } = req.params;
    const expense = await Expense.findById(expenseId);
    if (!expense) {
      res.status(404).json({ error: 'Expense not found.' });
      return;
    }

    res.json({ expense: formatExpenseResponse(expense, expense.baseCurrency) });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to get expense.', details: err.message });
  }
}

export async function updateExpense(req: Request, res: Response): Promise<void> {
  try {
    const { expenseId } = req.params;
    const expense = await Expense.findById(expenseId);
    if (!expense) {
      res.status(404).json({ error: 'Expense not found.' });
      return;
    }

    const {
      description,
      merchant,
      date,
      category,
      notes,
      amount,
      currency,
      exchangeRate,
      splitMethod,
      payers,
      participants,
      version
    } = req.body;

    // Optimistic concurrency check
    if (version !== undefined && expense.version !== version) {
      res.status(409).json({
        error: 'Conflict: This expense has been modified by someone else. Please refresh and try again.'
      });
      return;
    }

    const expenseCurrency = (currency || expense.originalCurrency).toUpperCase();
    const effectiveAmount = amount !== undefined ? amount : toDecimalString(BigInt(expense.originalAmountMinor), expenseCurrency);
    const totalMinor = toMinorUnits(effectiveAmount, expenseCurrency);

    const effectiveRate = expenseCurrency === expense.baseCurrency ? '1.0' : (exchangeRate || expense.exchangeRate || '1.0');
    const conversion = createConversionSnapshot(totalMinor, expenseCurrency, expense.baseCurrency, effectiveRate);

    // Payers
    let payerInputs = payers;
    if (typeof payerInputs === 'string') {
      try {
        payerInputs = JSON.parse(payerInputs);
      } catch {}
    }

    if (!payerInputs || payerInputs.length === 0) {
      payerInputs = expense.payers;
    } else {
      payerInputs = payerInputs.map((p: any) => ({
        memberId: p.memberId,
        amountMinor: p.amountMinor || toMinorUnits(p.amount, expenseCurrency).toString()
      }));
    }
    const validatedPayers = validatePayers(totalMinor, expenseCurrency, payerInputs);
    const payersWithBase = validatedPayers.payers.map(p => ({
      memberId: p.memberId,
      amountMinor: p.amountMinor,
      baseAmountMinor: convertCurrency(BigInt(p.amountMinor), expenseCurrency, expense.baseCurrency, effectiveRate).toString()
    }));

    // Split
    const method: SplitMethod = (splitMethod || expense.splitMethod) as SplitMethod;
    let participantInputs = participants;
    if (typeof participantInputs === 'string') {
      try {
        participantInputs = JSON.parse(participantInputs);
      } catch {}
    }

    if (!participantInputs || participantInputs.length === 0) {
      participantInputs = expense.participants;
    } else {
      participantInputs = participantInputs.map((part: any) => ({
        memberId: part.memberId,
        exactAmountMinor: part.exactAmount ? toMinorUnits(part.exactAmount, expenseCurrency).toString() : part.exactAmountMinor,
        percentage: part.percentage !== undefined ? Number(part.percentage) : undefined,
        shares: part.shares !== undefined ? Number(part.shares) : undefined
      }));
    }

    const splitResult = calculateSplits(totalMinor, expenseCurrency, method, participantInputs);
    const participantsWithBase = splitResult.shares.map((share, idx) => ({
      memberId: share.memberId,
      amountMinor: share.amountMinor,
      baseAmountMinor: convertCurrency(BigInt(share.amountMinor), expenseCurrency, expense.baseCurrency, effectiveRate).toString(),
      percentage: participantInputs[idx]?.percentage,
      shares: participantInputs[idx]?.shares
    }));

    if (description) expense.description = description.trim();
    if (merchant !== undefined) expense.merchant = merchant ? merchant.trim() : undefined;
    if (date) expense.date = date;
    if (category) expense.category = category;
    if (notes !== undefined) expense.notes = notes.trim();

    expense.originalAmountMinor = totalMinor.toString();
    expense.originalCurrency = expenseCurrency;
    expense.exchangeRate = effectiveRate;
    expense.rateDirection = conversion.rateDirection;
    expense.baseAmountMinor = conversion.baseAmountMinor;
    expense.splitMethod = method;
    expense.splitExplanation = splitResult.explanation;
    expense.payers = payersWithBase as any;
    expense.participants = participantsWithBase as any;
    expense.version += 1;

    await expense.save();

    await Activity.create({
      groupId: expense.groupId,
      actorMemberId: req.membership!.memberId,
      actorName: req.membership!.guestDisplayName,
      action: 'UPDATE_EXPENSE',
      entityType: 'expense',
      entityId: expense._id.toString(),
      details: `Updated expense "${expense.description}".`
    });

    res.json({ expense: formatExpenseResponse(expense, expense.baseCurrency) });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to update expense.' });
  }
}

export async function voidExpense(req: Request, res: Response): Promise<void> {
  try {
    const { expenseId } = req.params;
    const expense = await Expense.findById(expenseId);
    if (!expense) {
      res.status(404).json({ error: 'Expense not found.' });
      return;
    }

    expense.isVoided = true;
    expense.version += 1;
    await expense.save();

    await Activity.create({
      groupId: expense.groupId,
      actorMemberId: req.membership!.memberId,
      actorName: req.membership!.guestDisplayName,
      action: 'VOID_EXPENSE',
      entityType: 'expense',
      entityId: expense._id.toString(),
      details: `Voided expense "${expense.description}". Balance effect reversed.`
    });

    res.json({ message: 'Expense voided successfully.', expenseId: expense._id.toString() });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to void expense.', details: err.message });
  }
}

function formatExpenseResponse(e: any, baseCurrency: string) {
  const origMinor = BigInt(e.originalAmountMinor);
  const baseMinor = BigInt(e.baseAmountMinor);

  return {
    id: e._id.toString(),
    groupId: e.groupId.toString(),
    description: e.description,
    merchant: e.merchant,
    date: e.date,
    category: e.category,
    notes: e.notes,
    originalAmountDecimal: toDecimalString(origMinor, e.originalCurrency),
    originalCurrency: e.originalCurrency,
    exchangeRate: e.exchangeRate,
    rateDirection: e.rateDirection,
    baseAmountDecimal: toDecimalString(baseMinor, baseCurrency),
    baseCurrency: e.baseCurrency,
    splitMethod: e.splitMethod,
    splitExplanation: e.splitExplanation,
    payers: e.payers.map((p: any) => ({
      memberId: p.memberId,
      amountDecimal: toDecimalString(BigInt(p.amountMinor), e.originalCurrency),
      baseAmountDecimal: toDecimalString(BigInt(p.baseAmountMinor), baseCurrency)
    })),
    participants: e.participants.map((part: any) => ({
      memberId: part.memberId,
      amountDecimal: toDecimalString(BigInt(part.amountMinor), e.originalCurrency),
      baseAmountDecimal: toDecimalString(BigInt(part.baseAmountMinor), baseCurrency),
      percentage: part.percentage,
      shares: part.shares
    })),
    attachments: e.attachments,
    creatorMemberId: e.creatorMemberId,
    version: e.version,
    isVoided: e.isVoided,
    createdAt: e.createdAt,
    updatedAt: e.updatedAt
  };
}
