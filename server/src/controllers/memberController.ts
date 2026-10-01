import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { Membership, Invitation, Expense, Settlement, Activity } from '../models/index.js';

const AVATAR_COLORS = [
  '#4F46E5', '#059669', '#D97706', '#DC2626', '#7C3AED',
  '#0891B2', '#EA580C', '#2563EB', '#DB2777', '#475569'
];

export async function addGuestMember(req: Request, res: Response): Promise<void> {
  try {
    const groupId = req.params.groupId || req.params.id;
    const { name } = req.body;

    if (!name || !name.trim()) {
      res.status(400).json({ error: 'Guest name is required.' });
      return;
    }

    const trimmedName = name.trim();
    const existing = await Membership.findOne({
      groupId,
      guestDisplayName: trimmedName,
      state: 'active'
    });

    if (existing) {
      res.status(409).json({ error: `A member named "${trimmedName}" already exists in this trip.` });
      return;
    }

    const memberCount = await Membership.countDocuments({ groupId });
    const color = AVATAR_COLORS[memberCount % AVATAR_COLORS.length];
    const memberId = uuidv4();

    const membership = await Membership.create({
      groupId,
      memberId,
      guestDisplayName: trimmedName,
      role: 'member',
      state: 'active',
      color
    });

    await Activity.create({
      groupId,
      actorMemberId: req.membership!.memberId,
      actorName: req.membership!.guestDisplayName,
      action: 'ADD_MEMBER',
      entityType: 'member',
      entityId: memberId,
      details: `Added "${trimmedName}" to the trip.`
    });

    res.status(201).json({
      member: {
        id: membership._id.toString(),
        memberId: membership.memberId,
        displayName: membership.guestDisplayName,
        isGuest: true,
        role: membership.role,
        color: membership.color,
        joinedAt: membership.joinedAt
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to add guest member.', details: err.message });
  }
}

export async function createInvitation(req: Request, res: Response): Promise<void> {
  try {
    const groupId = req.params.groupId || req.params.id;
    const { memberId } = req.body;

    let targetMemberId = memberId;

    // If specific guest memberId provided, verify it exists and is unlinked
    if (targetMemberId) {
      const mem = await Membership.findOne({ groupId, memberId: targetMemberId });
      if (!mem) {
        res.status(404).json({ error: 'Target member not found in this group.' });
        return;
      }
      if (mem.userId) {
        res.status(400).json({ error: 'This member has already been claimed by a registered user.' });
        return;
      }
    } else {
      // Create a new invited slot
      targetMemberId = uuidv4();
      const memberCount = await Membership.countDocuments({ groupId });
      const color = AVATAR_COLORS[memberCount % AVATAR_COLORS.length];

      await Membership.create({
        groupId,
        memberId: targetMemberId,
        guestDisplayName: 'Friend',
        role: 'member',
        state: 'invited',
        color
      });
    }

    // Generate cryptographically secure invite token
    const token = crypto.randomBytes(24).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await Invitation.create({
      groupId,
      memberId: targetMemberId,
      tokenHash,
      expiresAt,
      creatorUserId: req.user!.userId,
      status: 'pending'
    });

    res.status(201).json({
      token,
      memberId: targetMemberId,
      expiresAt,
      inviteUrl: `/join/${token}`
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to create invitation.', details: err.message });
  }
}

export async function claimInvitation(req: Request, res: Response): Promise<void> {
  try {
    const rawToken = req.params.token;
    if (!rawToken) {
      res.status(400).json({ error: 'Invitation token is required.' });
      return;
    }

    const token = String(rawToken);
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const invitation = await Invitation.findOne({
      tokenHash,
      status: 'pending',
      expiresAt: { $gt: new Date() }
    });

    if (!invitation) {
      res.status(404).json({ error: 'Invitation is invalid or has expired.' });
      return;
    }

    // Check if the claiming user is already a member of this group
    const existingMembership = await Membership.findOne({
      groupId: invitation.groupId,
      userId: req.user!.userId,
      state: 'active'
    });

    if (existingMembership) {
      res.status(400).json({
        error: 'You are already an active member of this trip.',
        groupId: invitation.groupId.toString()
      });
      return;
    }

    // Associate target membership with current user
    const membership = await Membership.findOne({
      groupId: invitation.groupId,
      memberId: invitation.memberId
    });

    if (!membership) {
      res.status(404).json({ error: 'Membership slot not found.' });
      return;
    }

    membership.userId = req.user!.userId as any;
    membership.guestDisplayName = req.user!.name;
    membership.state = 'active';
    await membership.save();

    invitation.status = 'accepted';
    await invitation.save();

    await Activity.create({
      groupId: invitation.groupId,
      actorMemberId: membership.memberId,
      actorName: req.user!.name,
      action: 'CLAIM_MEMBERSHIP',
      entityType: 'member',
      entityId: membership.memberId,
      details: `${req.user!.name} joined the trip.`
    });

    res.json({
      message: 'Successfully joined trip.',
      groupId: invitation.groupId.toString(),
      memberId: membership.memberId
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to claim invitation.', details: err.message });
  }
}
