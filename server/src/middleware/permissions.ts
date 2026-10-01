import { Request, Response, NextFunction } from 'express';
import { Membership } from '../models/index.js';

export async function requireGroupMembership(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }

    const groupId = req.params.groupId || req.params.id;
    if (!groupId) {
      res.status(400).json({ error: 'Group ID parameter is required.' });
      return;
    }

    const membership = await Membership.findOne({
      groupId,
      userId: req.user.userId,
      state: 'active'
    });

    if (!membership) {
      res.status(403).json({ error: 'Access denied. You are not a member of this trip group.' });
      return;
    }

    req.membership = {
      memberId: membership.memberId,
      role: membership.role,
      guestDisplayName: membership.guestDisplayName
    };

    next();
  } catch (err: any) {
    res.status(500).json({ error: 'Internal server error verifying permissions.', details: err.message });
  }
}
