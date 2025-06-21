import { Router } from 'express';
import { authenticate, authorize } from '../middleware/authMiddleware';
import {
  getBlockchain,
  getBlockByHash,
  getBlockByIndex,
  mineBlock,
  getBlockchainStats,
} from '../controllers/blockchainController';

/**
 * Blockchain routes for SandiCoin
 */

const router = Router();

// Public blockchain routes (anyone can view)
router.get('/', getBlockchain);
router.get('/stats', getBlockchainStats);
router.get('/hash/:hash', getBlockByHash);
router.get('/block/:index', getBlockByIndex);

// Protected mining routes (require authentication)
router.post('/mine', authenticate, authorize('miner', 'admin'), mineBlock);

export default router;
