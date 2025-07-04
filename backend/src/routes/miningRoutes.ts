import { Router } from 'express';
import { authenticate } from '../middleware/authMiddleware';
import {
  mineTransactions,
  getMiningStats,
  getPendingTransactions,
} from '../controllers/miningController';

/**
 * Mining routes for SandiCoin - COMPLETELY REWRITTEN FOR AUTHENTICATION FIX
 */

const router = Router();

// ===== PROTECTED ROUTES - AUTHENTICATION REQUIRED =====
// ALL MINING ROUTES REQUIRE VALID BEARER TOKEN

// POST /api/mining/mine - Mine pending transactions
router.post('/mine', authenticate, mineTransactions);

// GET /api/mining/stats - Get mining statistics  
router.get('/stats', authenticate, getMiningStats);

// GET /api/mining/pending - Get pending transactions ready for mining
router.get('/pending', authenticate, getPendingTransactions);

export default router;