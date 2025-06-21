import { Request, Response, NextFunction } from 'express';
import { Miner } from '../models/Miner';
import { Wallet } from '../models/Wallet';
import { User } from '../models/User';
import { blockchainService } from '../services/blockchainService';
import { networkService } from '../server';
import { logger } from '../utils/logger';

// Use shared instances
const { blockchain, transactionPool } = blockchainService;

/**
 * Mine pending transactions
 */
export const mineTransactions = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = req.user;

    // Use the user's actual wallet for mining rewards
    const userWithWallet = await User.findById(user._id).select(
      '+walletPrivateKey'
    );

    let minerWallet: Wallet;
    if (!userWithWallet?.walletPrivateKey) {
      // Fallback for existing users without stored private keys
      logger.warn(
        `Miner ${user.email} missing private key, using system wallet for demo`
      );
      minerWallet = new Wallet();
      minerWallet.publicKey = user.walletPublicKey; // Override to match user's address
    } else {
      // Create wallet using user's actual stored keys
      minerWallet = new Wallet({
        publicKey: user.walletPublicKey,
        privateKey: userWithWallet.walletPrivateKey,
      });
    }

    // Create miner instance with network service
    const miner = new Miner({
      blockchain,
      transactionPool,
      wallet: minerWallet,
      networkService, // Include network service for broadcasting
    });

    // Mine pending transactions
    const result = miner.mineTransactions();

    if (!result.success) {
      res.status(400).json({
        success: false,
        message: result.message,
      });
      return;
    }

    logger.info(`Transactions mined by ${user.email}: ${result.block?.hash}`);

    // Get network stats if available
    const networkStats = networkService?.getNetworkStats();

    res.status(201).json({
      success: true,
      message: result.message,
      data: {
        block: result.block?.toJSON(),
        blockIndex: blockchain.chain.length - 1,
        miner: {
          email: user.email,
          walletAddress: minerWallet.publicKey,
          reward: parseInt(process.env.MINING_REWARD || '50'),
        },
        stats: {
          transactionsProcessed: result.block?.data.length || 0,
          chainLength: blockchain.getLength(),
          pendingTransactions: transactionPool.getTransactionCount(),
        },
        network: {
          enabled: !!networkService,
          broadcastSent: !!networkService,
          connectedNodes: networkStats?.connectedNodes || 0,
          ...networkStats,
        },
      },
    });
  } catch (error) {
    logger.error('Mine transactions failed:', error);
    next(error);
  }
};

/**
 * Get mining statistics for current user
 */
export const getMiningStats = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = req.user;

    // Create temporary miner to get stats
    const minerWallet = new Wallet();
    const miner = new Miner({
      blockchain,
      transactionPool,
      wallet: minerWallet,
      networkService,
    });

    const stats = miner.getMiningStats();
    const pendingInfo = miner.getPendingTransactions();

    // Calculate user-specific mining stats
    let userMinedBlocks = 0;
    let userTotalRewards = 0;

    for (let i = 1; i < blockchain.chain.length; i++) {
      const block = blockchain.chain[i];

      // Check for reward transactions that might belong to this user
      for (const transaction of block.data) {
        if (
          transaction.input?.address === '*authorized-reward*' &&
          transaction.outputMap?.[user.walletPublicKey]
        ) {
          userMinedBlocks++;
          userTotalRewards += transaction.outputMap[user.walletPublicKey];
        }
      }
    }

    // Get network stats
    const networkStats = networkService?.getNetworkStats();

    res.json({
      success: true,
      data: {
        user: {
          email: user.email,
          role: user.role,
          blocksMinedByUser: userMinedBlocks,
          totalRewardsEarned: userTotalRewards,
          currentBalance: miner.calculateBalance(),
        },
        network: {
          totalBlocks: stats.totalBlocks,
          totalTransactions: stats.totalTransactions,
          pendingTransactions: stats.pendingTransactions,
          networkEnabled: !!networkService,
          connectedNodes: networkStats?.connectedNodes || 0,
          serverPort: networkStats?.serverPort || null,
          peerNodes: networkStats?.peerNodes || [],
        },
        pending: {
          valid: pendingInfo.valid,
          invalid: pendingInfo.invalid,
          total: pendingInfo.total,
          readyForMining: pendingInfo.valid > 0,
        },
        mining: {
          currentDifficulty: blockchain.getLatestBlock().difficulty,
          blockReward: parseInt(process.env.MINING_REWARD || '50'),
          targetBlockTime: parseInt(process.env.MINE_RATE || '1000'),
        },
      },
    });
  } catch (error) {
    logger.error('Get mining stats failed:', error);
    next(error);
  }
};

/**
 * Helper function to extract actual transaction amount (same as transaction controller)
 */
const extractTransactionAmount = (transaction: any, senderAddress: string) => {
  const { outputMap } = transaction;

  // Find the amount sent to others (exclude sender's change)
  const sentAmounts = Object.entries(outputMap)
    .filter(([address]) => address !== senderAddress)
    .map(([, amount]) => amount as number);

  return sentAmounts.reduce((sum, amount) => sum + amount, 0);
};

/**
 * Get pending transactions ready for mining
 */
export const getPendingTransactions = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const validTransactions = transactionPool.validTransactions();
    const allTransactions = transactionPool.getAllTransactions();
    const invalidTransactions = allTransactions.filter(
      (tx) => !validTransactions.includes(tx)
    );

    // Calculate potential mining reward
    const miningReward = parseInt(process.env.MINING_REWARD || '50');
    const totalFees = validTransactions.reduce((total, tx) => {
      // In a real system, you might charge transaction fees
      return total; // For now, no fees
    }, 0);

    // Get network information
    const networkStats = networkService?.getNetworkStats();

    res.json({
      success: true,
      data: {
        valid: {
          count: validTransactions.length,
          transactions: validTransactions.map((tx) => ({
            id: tx.id,
            from: tx.input.address.substring(0, 10) + '...',
            to: Object.keys(tx.outputMap).filter(
              (addr) => addr !== tx.input.address
            ),
            amount: extractTransactionAmount(tx, tx.input.address),
            timestamp: tx.input.timestamp,
          })),
        },
        invalid: {
          count: invalidTransactions.length,
          transactions: invalidTransactions.map((tx) => ({
            id: tx.id,
            reason: 'Validation failed', // Could be more specific
          })),
        },
        mining: {
          canMine: validTransactions.length > 0,
          potentialReward: miningReward + totalFees,
          estimatedBlockSize: validTransactions.length + 1, // +1 for reward transaction
        },
        network: {
          enabled: !!networkService,
          connectedNodes: networkStats?.connectedNodes || 0,
          willBroadcast: !!networkService && validTransactions.length > 0,
        },
      },
    });
  } catch (error) {
    logger.error('Get pending transactions failed:', error);
    next(error);
  }
};
