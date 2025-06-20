import { Router } from 'express';
import { authenticate } from '../middleware/authMiddleware';
import {
  createTransaction,
  getTransactions,
  getTransactionById,
  getTransactionPool,
  getWalletBalance,
  debugUserTransactions,
} from '../controllers/transactionController';
import { blockchainService } from '../services/blockchainService';

/**
 * Transaction routes for SandiCoin - COMPLETELY REWRITTEN FOR AUTHENTICATION FIX
 */

const router = Router();

// DEBUG route - check pool status (no auth required for debugging)
router.get('/debug/pool-status', (req, res) => {
  const { transactionPool, blockchain } = blockchainService;
  const allTransactions = transactionPool.getAllTransactions();
  
  // Get last mined block info
  const lastBlock = blockchain.chain[blockchain.chain.length - 1];
  
  res.json({
    success: true,
    data: {
      pool: {
        totalTransactions: allTransactions.length,
        transactions: allTransactions.map(tx => ({
          id: tx.id.substring(0, 8),
          inputAddress: tx.input.address.substring(0, 50) + '...',
          outputKeys: Object.keys(tx.outputMap).map(k => k.substring(0, 50) + '...'),
          amount: Object.values(tx.outputMap)[0] // First output amount (usually recipient)
        }))
      },
      blockchain: {
        totalBlocks: blockchain.chain.length,
        lastBlockTransactions: lastBlock.data ? lastBlock.data.length : 0,
        lastBlockHash: lastBlock.hash.substring(0, 16) + '...'
      }
    }
  });
});

// DEBUG route - show transaction format comparison
router.get('/debug/transaction-format', (req, res) => {
  res.json({
    success: true,
    data: {
      improvement: "Clear transaction amounts now displayed",
      beforeFix: {
        problem: "Users had to parse complex outputMap to find actual sent/received amount",
        example: {
          userRole: "sender",
          input: { amount: 1000 },
          outputMap: {
            "bob_address": 75,
            "alice_change": 925
          }
        },
        userThinking: "How much did Alice actually send? User had to calculate: 1000 - 925 = 75"
      },
      afterFix: {
        solution: "Clear amount info provided directly",
        example: {
          userRole: "sender", 
          input: { amount: 1000 },
          outputMap: {
            "bob_address": 75,
            "alice_change": 925
          },
          actualAmount: 75,
          amountType: "sent",
          recipientCount: 1
        },
        userExperience: "Alice can immediately see: actualAmount: 75 (sent)"
      }
    }
  });
});

// ===== PROTECTED ROUTES - AUTHENTICATION REQUIRED =====
// ALL ROUTES BELOW REQUIRE VALID BEARER TOKEN

// POST /api/transactions - Create a new transaction
router.post('/', authenticate, createTransaction);

// GET /api/transactions - Get all transactions for current user
router.get('/', authenticate, getTransactions);

// GET /api/transactions/:id - Get specific transaction by ID
router.get('/:id', authenticate, getTransactionById);

// GET /api/transactions/pool/pending - Get pending transactions from pool
router.get('/pool/pending', authenticate, getTransactionPool);

// GET /api/transactions/wallet/balance - Get current wallet balance
router.get('/wallet/balance', authenticate, getWalletBalance);

// DEBUG route - simplified transaction matching test
router.get('/debug/user-matches', authenticate, debugUserTransactions);

// DEBUG route - remove in production
router.get('/debug/pool', authenticate, (req, res) => {
  const { transactionPool } = blockchainService;
  const allTransactions = transactionPool.getAllTransactions();

  interface Transaction {
    id: string;
    input: {
      address: string;
      [key: string]: any;
    };
    outputMap: {
      [address: string]: number;
    };
  }

  interface OutputAddressAmount {
    address: string;
    amount: number;
  }

  interface TransactionResponse {
    success: boolean;
    data: {
      totalTransactions: number;
      transactions: {
        id: string;
        inputAddress: string;
        outputMap: OutputAddressAmount[];
      }[];
    };
  }

  res.json({
    success: true,
    data: {
      totalTransactions: allTransactions.length,
      transactions: allTransactions.map((tx: Transaction) => ({
        id: tx.id,
        inputAddress: tx.input.address.substring(0, 50) + '...',
        outputMap: Object.keys(tx.outputMap).map((addr: string) => ({
          address: addr.substring(0, 50) + '...',
          amount: tx.outputMap[addr],
        })),
      })),
    },
  } as TransactionResponse);
});

export default router;