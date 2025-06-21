import { Router } from 'express';
import { authenticate, authorize } from '../middleware/authMiddleware';
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
 * Transaction routes for SandiCoin
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
      },
      improvements: {
        message: "🎯 FIXED: Transaction amounts now clearly displayed!",
        example: {
          before: {
            note: "User had to dig through outputMap to find actual amount",
            response: {
              inputAmount: 1000,
              outputMap: { "recipient": 75, "sender_change": 925 },
              userRole: "sender"
            }
          },
          after: {
            note: "Clear amount info now provided at top level", 
            response: {
              inputAmount: 1000,
              outputMap: { "recipient": 75, "sender_change": 925 },
              userRole: "sender",
              actualAmount: 75,
              amountType: "sent", 
              recipientCount: 1
            }
          }
        }
      },
      instructions: {
        message: "To test the improved transaction display:",
        steps: [
          "1. Create a transaction: POST {{baseUrl}}/api/transactions",
          "2. Check: GET {{baseUrl}}/api/transactions", 
          "3. Look for actualAmount, amountType, recipientCount fields",
          "4. Alice sending 75 will show: actualAmount: 75, amountType: 'sent'"
        ]
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

// Protected transaction routes (require authentication)
router.use(authenticate);

// POST /api/transactions - Create a new transaction
router.post('/', createTransaction);

// GET /api/transactions - Get all transactions for current user
router.get('/', getTransactions);

// GET /api/transactions/:id - Get specific transaction by ID
router.get('/:id', getTransactionById);

// GET /api/transactions/pool/pending - Get pending transactions from pool
router.get('/pool/pending', getTransactionPool);

// GET /api/transactions/wallet/balance - Get current wallet balance
router.get('/wallet/balance', getWalletBalance);

// DEBUG route - simplified transaction matching test
router.get('/debug/user-matches', debugUserTransactions);

// DEBUG route - remove in production
router.get('/debug/pool', (req, res) => {
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
