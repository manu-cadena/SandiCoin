import { Request, Response, NextFunction } from 'express';
import { Miner } from '../models/Miner';
import { Wallet } from '../models/Wallet';
import { blockchainService } from '../services/blockchainService';
import { logger } from '../utils/logger';

// Use shared instances
const { blockchain, transactionPool } = blockchainService;

/**
 * Get entire blockchain
 */
export const getBlockchain = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    res.json({
      success: true,
      data: {
        blockchain: blockchain.toJSON(),
        length: blockchain.getLength(),
        latestBlock: blockchain.getLatestBlock().toJSON(),
      },
    });
  } catch (error) {
    logger.error('Get blockchain failed:', error);
    next(error);
  }
};

/**
 * Get block by hash
 */
export const getBlockByHash = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { hash } = req.params;

    const block = blockchain.chain.find((block) => block.hash === hash);

    if (!block) {
      res.status(404).json({
        success: false,
        message: 'Block not found',
      });
      return;
    }

    res.json({
      success: true,
      data: {
        block: block.toJSON(),
        index: blockchain.chain.indexOf(block),
        isLatest: block === blockchain.getLatestBlock(),
      },
    });
  } catch (error) {
    logger.error('Get block by hash failed:', error);
    next(error);
  }
};

/**
 * Get block by index
 */
export const getBlockByIndex = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const index = parseInt(req.params.index);

    if (isNaN(index) || index < 0 || index >= blockchain.chain.length) {
      res.status(400).json({
        success: false,
        message: 'Invalid block index',
      });
      return;
    }

    const block = blockchain.chain[index];

    res.json({
      success: true,
      data: {
        block: block.toJSON(),
        index,
        isGenesis: index === 0,
        isLatest: index === blockchain.chain.length - 1,
      },
    });
  } catch (error) {
    logger.error('Get block by index failed:', error);
    next(error);
  }
};

/**
 * Mine a new block with custom data
 */
export const mineBlock = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { data } = req.body;
    const user = req.user;

    if (!data || !Array.isArray(data)) {
      res.status(400).json({
        success: false,
        message: 'Data must be an array',
      });
      return;
    }

    // Create miner wallet from user
    const minerWallet = new Wallet();

    // Create miner instance
    const miner = new Miner({
      blockchain,
      transactionPool,
      wallet: minerWallet,
    });

    // Mine block with custom data
    const newBlock = miner.mineBlock(data);

    logger.info(`Block mined by ${user.email}: ${newBlock.hash}`);

    res.status(201).json({
      success: true,
      message: 'Block mined successfully',
      data: {
        block: newBlock.toJSON(),
        blockIndex: blockchain.chain.length - 1,
        miner: user.email,
        reward: parseInt(process.env.MINING_REWARD || '50'),
      },
    });
  } catch (error) {
    logger.error('Mine block failed:', error);
    next(error);
  }
};

/**
 * Get blockchain statistics
 */
export const getBlockchainStats = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const chain = blockchain.chain;
    const totalBlocks = chain.length;

    // Calculate total transactions
    let totalTransactions = 0;
    let totalRewards = 0;
    let totalVolume = 0;

    for (let i = 1; i < chain.length; i++) {
      const block = chain[i];
      totalTransactions += block.data.length;

      // Calculate volume and rewards
      for (const transaction of block.data) {
        // Type check and cast transaction
        if (transaction && typeof transaction === 'object') {
          const tx = transaction as any; // Cast to avoid TypeScript issues

          if (tx.input?.address === '*authorized-reward*') {
            if (tx.outputMap && typeof tx.outputMap === 'object') {
              const rewardAmount = Object.values(tx.outputMap)[0] as number;
              totalRewards += rewardAmount || 0;
            }
          } else if (tx.outputMap && typeof tx.outputMap === 'object') {
            // Sum all outputs except sender's change
            const outputs = Object.entries(tx.outputMap) as [string, number][];
            for (const [address, amount] of outputs) {
              if (address !== tx.input?.address && typeof amount === 'number') {
                totalVolume += amount;
              }
            }
          }
        }
      }
    }

    // Calculate average block time
    let totalTime = 0;
    if (chain.length > 1) {
      for (let i = 1; i < chain.length; i++) {
        totalTime += chain[i].timestamp - chain[i - 1].timestamp;
      }
    }
    const avgBlockTime = chain.length > 1 ? totalTime / (chain.length - 1) : 0;

    // Get current difficulty
    const currentDifficulty = blockchain.getLatestBlock().difficulty;

    // Pending transactions
    const pendingTxCount = transactionPool.getTransactionCount();
    const validPendingTx = transactionPool.validTransactions().length;

    res.json({
      success: true,
      data: {
        blockchain: {
          totalBlocks,
          totalTransactions,
          totalVolume,
          totalRewards,
          currentDifficulty,
          avgBlockTimeMs: Math.round(avgBlockTime),
          latestBlockHash: blockchain.getLatestBlock().hash,
        },
        network: {
          pendingTransactions: pendingTxCount,
          validPendingTransactions: validPendingTx,
          invalidPendingTransactions: pendingTxCount - validPendingTx,
        },
        mining: {
          currentReward: parseInt(process.env.MINING_REWARD || '50'),
          targetBlockTime: parseInt(process.env.MINE_RATE || '1000'),
        },
      },
    });
  } catch (error) {
    logger.error('Get blockchain stats failed:', error);
    next(error);
  }
};
