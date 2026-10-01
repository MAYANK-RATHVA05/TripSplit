import { Router } from 'express';
import authRoutes from './authRoutes.js';
import groupRoutes from './groupRoutes.js';
import currencyRoutes from './currencyRoutes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/groups', groupRoutes);
router.use('/currencies', currencyRoutes);

export default router;
