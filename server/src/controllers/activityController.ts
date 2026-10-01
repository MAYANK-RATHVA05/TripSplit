import { Request, Response } from 'express';
import { Activity } from '../models/index.js';

export async function listTripActivity(req: Request, res: Response): Promise<void> {
  try {
    const groupId = req.params.groupId || req.params.id;
    const activities = await Activity.find({ groupId })
      .sort({ createdAt: -1 })
      .limit(100);

    const formatted = activities.map(a => ({
      id: a._id.toString(),
      actorMemberId: a.actorMemberId,
      actorName: a.actorName,
      action: a.action,
      entityType: a.entityType,
      entityId: a.entityId,
      details: a.details,
      createdAt: a.createdAt
    }));

    res.json({ activity: formatted });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to list trip activity.', details: err.message });
  }
}
