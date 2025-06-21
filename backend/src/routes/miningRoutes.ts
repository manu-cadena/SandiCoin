import { Router } from 'express';
import { authenticate, authorize } from '../middleware/authMiddleware';
import {
  mineTransactions,
  getMiningStats,
  getPendingTransactions,
} from '../controllers/miningController';

/**
 * Mining routes for SandiCoin
 */

const router = Router();

// Protected mining routes (miners and admins only)
router.use(authenticate);
router.use(authorize('miner', 'admin'));

// POST /api/mining/mine - Mine pending transactions
router.post('/mine', mineTransactions);

// GET /api/mining/stats - Get mining statistics
router.get('/stats', getMiningStats);

// GET /api/mining/pending - Get pending transactions ready for mining
router.get('/pending', getPendingTransactions);

export default router;
