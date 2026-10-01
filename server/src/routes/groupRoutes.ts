import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireGroupMembership } from '../middleware/permissions.js';
import { uploadAttachment } from '../adapters/storage.js';
import { createGroup, listGroups, getGroup, updateGroup, exportCSV } from '../controllers/groupController.js';
import { addGuestMember, createInvitation, claimInvitation } from '../controllers/memberController.js';
import { createExpense, listExpenses, getExpense, updateExpense, voidExpense } from '../controllers/expenseController.js';
import { getGroupBalances, explainMemberBalance } from '../controllers/balanceController.js';
import { recordSettlement, listSettlements, reverseSettlement } from '../controllers/settlementController.js';
import { getTripAnalytics } from '../controllers/analyticsController.js';
import { listTripActivity } from '../controllers/activityController.js';

const router = Router();

// Groups base
router.use(requireAuth);

router.post('/', createGroup);
router.get('/', listGroups);

// Invitation claim (user doesn't need to be member of the group yet)
router.post('/invitations/:token/claim', claimInvitation);

// Group-specific routes (require membership)
router.get('/:id', requireGroupMembership, getGroup);
router.patch('/:id', requireGroupMembership, updateGroup);
router.get('/:id/export', requireGroupMembership, exportCSV);

// Members & Invitations
router.post('/:id/members', requireGroupMembership, addGuestMember);
router.post('/:id/invitations', requireGroupMembership, createInvitation);

// Expenses
router.get('/:id/expenses', requireGroupMembership, listExpenses);
router.post('/:id/expenses', requireGroupMembership, uploadAttachment.array('attachments', 5), createExpense);
router.get('/:id/expenses/:expenseId', requireGroupMembership, getExpense);
router.patch('/:id/expenses/:expenseId', requireGroupMembership, updateExpense);
router.delete('/:id/expenses/:expenseId', requireGroupMembership, voidExpense);

// Balances & Settlements
router.get('/:id/balances', requireGroupMembership, getGroupBalances);
router.get('/:id/balances/:memberId/explain', requireGroupMembership, explainMemberBalance);
router.get('/:id/settlements', requireGroupMembership, listSettlements);
router.post('/:id/settlements', requireGroupMembership, recordSettlement);
router.post('/:id/settlements/:settlementId/reverse', requireGroupMembership, reverseSettlement);

// Analytics & Activity
router.get('/:id/analytics', requireGroupMembership, getTripAnalytics);
router.get('/:id/activity', requireGroupMembership, listTripActivity);

export default router;
