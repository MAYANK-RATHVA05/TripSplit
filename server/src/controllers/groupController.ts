import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { Group, Membership, Expense, Settlement, Activity } from '../models/index.js';
import { getCurrency, toDecimalString } from '../domain/currencies.js';

// Vibrant avatar colors for members
const AVATAR_COLORS = [
  '#4F46E5', '#059669', '#D97706', '#DC2626', '#7C3AED',
  '#0891B2', '#EA580C', '#2563EB', '#DB2777', '#475569'
];

export async function createGroup(req: Request, res: Response): Promise<void> {
  try {
    const { name, description, baseCurrency, startDate, endDate, budget } = req.body;

    if (!name || !name.trim()) {
      res.status(400).json({ error: 'Trip name is required.' });
      return;
    }

    const currencyCode = (baseCurrency || 'USD').toUpperCase();
    const currencyInfo = getCurrency(currencyCode);

    const group = await Group.create({
      name: name.trim(),
      description: (description || '').trim(),
      baseCurrency: currencyInfo.code,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      creatorId: req.user!.userId,
      budgetMinor: budget ? budget.toString() : undefined
    });

    // Create owner membership for the creator
    const memberId = uuidv4();
    const ownerMembership = await Membership.create({
      groupId: group._id,
      memberId,
      userId: req.user!.userId,
      guestDisplayName: req.user!.name,
      role: 'owner',
      state: 'active',
      color: AVATAR_COLORS[0]
    });

    await Activity.create({
      groupId: group._id,
      actorMemberId: memberId,
      actorName: req.user!.name,
      action: 'CREATE_GROUP',
      entityType: 'group',
      entityId: group._id.toString(),
      details: `Created trip "${group.name}" with base currency ${group.baseCurrency}.`
    });

    res.status(201).json({
      group: {
        id: group._id.toString(),
        name: group.name,
        description: group.description,
        baseCurrency: group.baseCurrency,
        startDate: group.startDate,
        endDate: group.endDate,
        status: group.status,
        memberId: ownerMembership.memberId
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to create trip.', details: err.message });
  }
}

export async function listGroups(req: Request, res: Response): Promise<void> {
  try {
    const userMemberships = await Membership.find({
      userId: req.user!.userId,
      state: 'active'
    });

    const groupIds = userMemberships.map(m => m.groupId);
    const groups = await Group.find({ _id: { $in: groupIds } }).sort({ updatedAt: -1 });

    const results = await Promise.all(
      groups.map(async g => {
        const membership = userMemberships.find(m => m.groupId.toString() === g._id.toString());
        const memberCount = await Membership.countDocuments({ groupId: g._id, state: 'active' });
        const expenseCount = await Expense.countDocuments({ groupId: g._id, isVoided: false });
        
        return {
          id: g._id.toString(),
          name: g.name,
          description: g.description,
          baseCurrency: g.baseCurrency,
          startDate: g.startDate,
          endDate: g.endDate,
          status: g.status,
          role: membership?.role || 'member',
          memberId: membership?.memberId,
          memberCount,
          expenseCount,
          createdAt: g.createdAt,
          updatedAt: g.updatedAt
        };
      })
    );

    res.json({ groups: results });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to list trips.', details: err.message });
  }
}

export async function getGroup(req: Request, res: Response): Promise<void> {
  try {
    const groupId = req.params.id;
    const group = await Group.findById(groupId);
    if (!group) {
      res.status(404).json({ error: 'Trip not found.' });
      return;
    }

    const members = await Membership.find({ groupId: group._id, state: 'active' })
      .populate('userId', 'name email avatar')
      .sort({ joinedAt: 1 });

    const formattedMembers = members.map(m => {
      const u = m.userId as any;
      return {
        id: m._id.toString(),
        memberId: m.memberId,
        displayName: u ? u.name : m.guestDisplayName,
        email: u ? u.email : undefined,
        isGuest: !m.userId,
        role: m.role,
        color: m.color,
        joinedAt: m.joinedAt
      };
    });

    const currentMember = formattedMembers.find(m => m.memberId === req.membership!.memberId);

    res.json({
      group: {
        id: group._id.toString(),
        name: group.name,
        description: group.description,
        baseCurrency: group.baseCurrency,
        startDate: group.startDate,
        endDate: group.endDate,
        status: group.status,
        budgetMinor: group.budgetMinor,
        members: formattedMembers,
        currentMember
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to get trip details.', details: err.message });
  }
}

export async function updateGroup(req: Request, res: Response): Promise<void> {
  try {
    const groupId = req.params.id;
    const { name, description, startDate, endDate, status, budget } = req.body;

    const group = await Group.findById(groupId);
    if (!group) {
      res.status(404).json({ error: 'Trip not found.' });
      return;
    }

    if (req.membership!.role !== 'owner') {
      res.status(403).json({ error: 'Only the trip owner can modify trip settings.' });
      return;
    }

    if (name) group.name = name.trim();
    if (description !== undefined) group.description = description.trim();
    if (startDate !== undefined) group.startDate = startDate;
    if (endDate !== undefined) group.endDate = endDate;
    if (status && ['active', 'closed', 'archived'].includes(status)) group.status = status;
    if (budget !== undefined) group.budgetMinor = budget ? budget.toString() : undefined;

    await group.save();

    await Activity.create({
      groupId: group._id,
      actorMemberId: req.membership!.memberId,
      actorName: req.membership!.guestDisplayName,
      action: 'UPDATE_GROUP',
      entityType: 'group',
      entityId: group._id.toString(),
      details: `Updated trip settings.`
    });

    res.json({
      group: {
        id: group._id.toString(),
        name: group.name,
        description: group.description,
        baseCurrency: group.baseCurrency,
        startDate: group.startDate,
        endDate: group.endDate,
        status: group.status
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update trip.', details: err.message });
  }
}

export async function exportCSV(req: Request, res: Response): Promise<void> {
  try {
    const groupId = req.params.id;
    const group = await Group.findById(groupId);
    if (!group) {
      res.status(404).json({ error: 'Trip not found.' });
      return;
    }

    const members = await Membership.find({ groupId }).populate('userId', 'name');
    const memberNameMap = new Map<string, string>();
    for (const m of members) {
      const u = m.userId as any;
      memberNameMap.set(m.memberId, u?.name || m.guestDisplayName);
    }

    const expenses = await Expense.find({ groupId, isVoided: false }).sort({ date: -1 });

    // CSV Headers
    const headers = [
      'Date',
      'Category',
      'Description',
      'Merchant',
      'Original Amount',
      'Currency',
      'Exchange Rate',
      `Base Amount (${group.baseCurrency})`,
      'Payers',
      'Split Method',
      'Participants',
      'Notes'
    ];

    const rows = expenses.map(exp => {
      const origDec = toDecimalString(BigInt(exp.originalAmountMinor), exp.originalCurrency);
      const baseDec = toDecimalString(BigInt(exp.baseAmountMinor), exp.baseCurrency);

      const payersStr = exp.payers
        .map(p => `${memberNameMap.get(p.memberId) || 'Unknown'}: ${toDecimalString(BigInt(p.amountMinor), exp.originalCurrency)}`)
        .join('; ');

      const participantsStr = exp.participants
        .map(p => `${memberNameMap.get(p.memberId) || 'Unknown'}: ${toDecimalString(BigInt(p.amountMinor), exp.originalCurrency)}`)
        .join('; ');

      return [
        `"${exp.date}"`,
        `"${exp.category}"`,
        `"${exp.description.replace(/"/g, '""')}"`,
        `"${(exp.merchant || '').replace(/"/g, '""')}"`,
        `"${origDec}"`,
        `"${exp.originalCurrency}"`,
        `"${exp.exchangeRate}"`,
        `"${baseDec}"`,
        `"${payersStr.replace(/"/g, '""')}"`,
        `"${exp.splitMethod}"`,
        `"${participantsStr.replace(/"/g, '""')}"`,
        `"${(exp.notes || '').replace(/"/g, '""')}"`
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\r\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="tripsplit-${group.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-expenses.csv"`
    );
    res.send(csvContent);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to export CSV.', details: err.message });
  }
}
