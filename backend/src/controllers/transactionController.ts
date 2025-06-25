import { Request, Response, NextFunction } from 'express';
import { Transaction } from '../models/Transaction';
import { Wallet } from '../models/Wallet';
import { User } from '../models/User';
import { blockchainService } from '../services/blockchainService';
import { logger } from '../utils/logger';

// Use shared instances
const { blockchain, transactionPool } = blockchainService;

/**
 * Helper function to extract user-friendly amount from transaction
 */
const extractTransactionAmount = (transaction: any, userAddress: string, userRole: string) => {
  const { outputMap } = transaction;
  
  if (userRole === 'sender') {
    // For sender: find the amount sent to others (exclude their own change)
    const sentAmounts = Object.entries(outputMap)
      .filter(([address]) => address !== userAddress)
      .map(([, amount]) => amount as number);
    
    return {
      amount: sentAmounts.reduce((sum, amount) => sum + amount, 0),
      type: 'sent',
      recipients: Object.keys(outputMap).filter(addr => addr !== userAddress).length
    };
  } else {
    // For recipient: find the amount received by user
    const receivedAmount = outputMap[userAddress] || 0;
    
    return {
      amount: receivedAmount,
      type: 'received',
      recipients: 1
    };
  }
};

/**
 * Create a new transaction
 */
export const createTransaction = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { recipient, amount } = req.body;
    const user = req.user;
    const userAddress = user.walletPublicKey;

    // Validation
    if (!recipient || !amount) {
      res.status(400).json({
        success: false,
        message: 'Recipient and amount are required',
      });
      return;
    }

    if (typeof amount !== 'number' || amount <= 0) {
      res.status(400).json({
        success: false,
        message: 'Amount must be a positive number',
      });
      return;
    }

    // Find recipient user by email OR public key
    let recipientUser;
    let recipientAddress;
    
    // Check if recipient looks like a Bitcoin-style address (starts with 1)
    if (recipient.match(/^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/)) {
      // It's a public key/address
      recipientAddress = recipient;
      recipientUser = await User.findOne({ walletPublicKey: recipient });
      
      if (!recipientUser) {
        // Allow transactions to external addresses (not in our user database)
        logger.info(`Transaction to external address: ${recipient}`);
      }
    } else {
      // It's an email address
      recipientUser = await User.findOne({ email: recipient });
      if (!recipientUser) {
        res.status(404).json({
          success: false,
          message: 'Recipient user not found',
        });
        return;
      }
      recipientAddress = recipientUser.walletPublicKey!;
    }

    // Get user's wallet keys from database
    const userWithWallet = await User.findById(user._id).select('+walletPrivateKey +walletCryptoPublicKey');
    
    let userWallet: Wallet;
    if (!userWithWallet?.walletPrivateKey) {
      // Fallback for existing users without stored private keys
      // In production, users would sign transactions client-side
      logger.warn(`User ${user.email} missing private key, using system wallet for demo`);
      userWallet = new Wallet();
      userWallet.publicKey = userAddress; // Override to match user's address
    } else {
      // Create wallet using user's actual stored keys
      userWallet = new Wallet({
        publicKey: userAddress,
        privateKey: userWithWallet.walletPrivateKey,
        cryptoPublicKey: userWithWallet.walletCryptoPublicKey,
      });
    }

    // Calculate current balance from blockchain
    const currentBalance = Wallet.calculateBalance({
      address: userAddress,
      chain: blockchain.chain,
    });

    logger.info(
      `User ${user.email} balance check: ${currentBalance}, requested amount: ${amount}`
    );

    if (amount > currentBalance) {
      res.status(400).json({
        success: false,
        message: `Insufficient balance. Available: ${currentBalance} SandiCoins`,
      });
      return;
    }

    // Check for existing transaction from this user
    const existingTransaction = transactionPool.existingTransaction({
      inputAddress: userAddress,
    });

    let transaction;

    if (existingTransaction) {
      // Update existing transaction
      existingTransaction.update({
        senderWallet: userWallet,
        recipient: recipientAddress,
        amount,
      });
      transaction = existingTransaction;
    } else {
      // Create new transaction
      transaction = Transaction.createTransaction({
        senderWallet: userWallet,
        recipient: recipientAddress,
        amount,
      });
    }

    // Add to transaction pool
    transactionPool.setTransaction(transaction);
    
    // Import networkService to broadcast transaction
    const { networkService } = await import('../server');
    if (networkService) {
      networkService.broadcastTransaction(transaction);
      logger.info('Transaction broadcasted to network');
    } else {
      logger.warn('Network service not available - transaction not broadcasted');
    }

    logger.info(
      `Transaction created: ${amount} SandiCoins from ${user.email} to ${recipient}`
    );

    res.status(201).json({
      success: true,
      message: 'Transaction created successfully',
      data: {
        transaction: {
          ...transaction.toJSON(),
          // Add clear transaction details for user clarity
          actualAmount: amount, // The amount actually being sent
          recipient: recipientAddress,
          sender: userAddress,
        },
        currentBalance,
        pendingTransactions: transactionPool.getTransactionCount(),
      },
    });
  } catch (error) {
    logger.error('Create transaction failed:', error);
    next(error);
  }
};

/**
 * Get all transactions for current user
 */
export const getTransactions = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = req.user;
    const userAddress = user.walletPublicKey;
    const userTransactions: any[] = [];

    logger.info(
      `Getting transactions for user: ${
        user.email
      }, address: ${userAddress?.substring(0, 50)}...`
    );

    // Scan blockchain for user's transactions
    for (let i = 1; i < blockchain.chain.length; i++) {
      const block = blockchain.chain[i];

      for (const transaction of block.data) {
        let isUserTransaction = false;
        let userRole = '';

        // Check if user was sender
        if (transaction.input?.address === userAddress) {
          isUserTransaction = true;
          userRole = 'sender';
        }

        // Check if user was recipient (only if not already sender)
        if (transaction.outputMap && transaction.outputMap[userAddress] && userRole !== 'sender') {
          isUserTransaction = true;
          userRole = 'recipient';
        }

        if (isUserTransaction) {
          const amountInfo = extractTransactionAmount(transaction, userAddress, userRole);
          
          userTransactions.push({
            ...transaction,
            blockIndex: i,
            blockHash: block.hash,
            timestamp: block.timestamp,
            userRole,
            status: 'confirmed',
            // Add clear amount information
            actualAmount: amountInfo.amount,
            amountType: amountInfo.type,
            recipientCount: amountInfo.recipients,
          });
        }
      }
    }

    // Add pending transactions from pool
    const allPendingTransactions = transactionPool.getAllTransactions();
    logger.info(
      `Total pending transactions in pool: ${allPendingTransactions.length}`
    );

    const pendingTransactions = allPendingTransactions
      .filter((tx) => {
        const isSender = tx.input.address === userAddress;
        const isRecipient = tx.outputMap[userAddress] !== undefined;

        logger.info(
          `Checking pending tx ${tx.id.substring(0,8)}: sender=${isSender}, recipient=${isRecipient}`
        );
        logger.info(
          `  TX Address: '${tx.input.address}'`
        );
        logger.info(
          `  User Address: '${userAddress}'`
        );
        logger.info(
          `  Addresses match: ${tx.input.address === userAddress}`
        );

        return isSender || isRecipient;
      })
      .map((tx) => {
        const userRole = tx.input.address === userAddress ? 'sender' : 'recipient';
        const amountInfo = extractTransactionAmount(tx, userAddress, userRole);
        
        return {
          ...tx.toJSON(),
          status: 'pending',
          userRole,
          // Add clear amount information
          actualAmount: amountInfo.amount,
          amountType: amountInfo.type,
          recipientCount: amountInfo.recipients,
        };
      });

    logger.info(
      `Found ${pendingTransactions.length} pending transactions for user`
    );

    res.json({
      success: true,
      data: {
        confirmed: userTransactions,
        pending: pendingTransactions,
        total: userTransactions.length + pendingTransactions.length,
        debug: {
          userAddress: userAddress?.substring(0, 50) + '...',
          totalPendingInPool: allPendingTransactions.length,
          userPendingFound: pendingTransactions.length,
        },
      },
    });
  } catch (error) {
    logger.error('Get transactions failed:', error);
    next(error);
  }
};

/**
 * Get transaction by ID
 */
export const getTransactionById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    // Search in transaction pool first
    const pendingTransaction = transactionPool.getTransaction(id);
    if (pendingTransaction) {
      res.json({
        success: true,
        data: {
          transaction: pendingTransaction.toJSON(),
          status: 'pending',
        },
      });
      return;
    }

    // Search in blockchain
    for (let i = 1; i < blockchain.chain.length; i++) {
      const block = blockchain.chain[i];
      const transaction = block.data.find((tx: any) => tx.id === id);

      if (transaction) {
        res.json({
          success: true,
          data: {
            transaction: transaction.toJSON(),
            status: 'confirmed',
            blockIndex: i,
            blockHash: block.hash,
          },
        });
        return;
      }
    }

    res.status(404).json({
      success: false,
      message: 'Transaction not found',
    });
  } catch (error) {
    logger.error('Get transaction by ID failed:', error);
    next(error);
  }
};

/**
 * Get transaction pool
 */
export const getTransactionPool = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const allTransactions = transactionPool.getAllTransactions();
    const validTransactions = transactionPool.validTransactions();

    res.json({
      success: true,
      data: {
        transactions: allTransactions.map((tx) => tx.toJSON()),
        valid: validTransactions.length,
        invalid: allTransactions.length - validTransactions.length,
        total: allTransactions.length,
      },
    });
  } catch (error) {
    logger.error('Get transaction pool failed:', error);
    next(error);
  }
};

/**
 * Get wallet balance
 */
export const getWalletBalance = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = req.user;

    const balance = Wallet.calculateBalance({
      address: user.walletPublicKey,
      chain: blockchain.chain,
    });

    res.json({
      success: true,
      data: {
        balance,
        address: user.walletPublicKey,
        pendingTransactions: transactionPool.existingTransaction({
          inputAddress: user.walletPublicKey,
        })
          ? 1
          : 0,
      },
    });
  } catch (error) {
    logger.error('Get wallet balance failed:', error);
    next(error);
  }
};

/**
 * Debug function to verify transaction matching logic
 */
export const debugUserTransactions = async (req: Request, res: Response) => {
  const user = req.user;
  const userAddress = user.walletPublicKey;
  
  // Get all transactions from pool
  const allPoolTransactions = transactionPool.getAllTransactions();
  
  // Check exact matches
  const matches = allPoolTransactions.map(tx => ({
    txId: tx.id.substring(0, 8),
    txInputAddress: tx.input.address.substring(0, 50),
    userAddress: userAddress.substring(0, 50),
    exactMatch: tx.input.address === userAddress,
    outputKeys: Object.keys(tx.outputMap).map(k => k.substring(0, 50))
  }));
  
  res.json({ matches, totalInPool: allPoolTransactions.length });
};
