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

// Protected mining routes (miners and admins only) - FIXED: Apply middleware per route
// POST /api/mining/mine - Mine pending transactions
router.post('/mine', authenticate, mineTransactions);

// GET /api/mining/stats - Get mining statistics  
router.get('/stats', authenticate, getMiningStats);

// GET /api/mining/pending - Get pending transactions ready for mining
router.get('/pending', authenticate, getPendingTransactions);

export default router;
