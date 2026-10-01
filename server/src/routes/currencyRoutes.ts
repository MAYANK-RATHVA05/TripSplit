import { Router } from 'express';
import { getCurrencies } from '../controllers/currencyController.js';

const router = Router();
router.get('/', getCurrencies);

export default router;
