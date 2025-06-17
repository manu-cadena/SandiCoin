import { Blockchain } from './Blockchain';
import { TransactionPool } from './TransactionPool';
import { Transaction } from './Transaction';
import { Wallet } from './Wallet';
import { logger } from '../utils/logger';

/**
 * Miner class for SandiCoin
 * Processes transaction pool and mines new blocks
 */
export class Miner {
  public blockchain: Blockchain;
  public transactionPool: TransactionPool;
  public wallet: Wallet;
  public pubsub?: any; // Will be WebSocket/PubSub service for network broadcasting

  constructor({
    blockchain,
    transactionPool,
    wallet,
    pubsub,
  }: {
    blockchain: Blockchain;
    transactionPool: TransactionPool;
    wallet: Wallet;
    pubsub?: any;
  }) {
    this.blockchain = blockchain;
    this.transactionPool = transactionPool;
    this.wallet = wallet;
    this.pubsub = pubsub;
  }

  // Mine a new block with pending transactions
  mineTransactions(): { success: boolean; block?: any; message: string } {
    try {
      // 1. Get valid transactions from pool
      const validTransactions = this.transactionPool.validTransactions();

      if (validTransactions.length === 0) {
        return {
          success: false,
          message: 'No valid transactions to mine',
        };
      }

      logger.mining(`Mining ${validTransactions.length} transactions...`);

      // 2. Add mining reward transaction
      const rewardTransaction = Transaction.rewardTransaction({
        minerWallet: this.wallet,
      });

      // 3. Combine valid transactions with reward
      const transactionsToMine = [...validTransactions, rewardTransaction];

      // 4. Mine new block
      logger.info('Starting proof-of-work...');
      const newBlock = this.blockchain.addBlock(transactionsToMine);

      logger.success('Block mined successfully!');
      logger.info(`Block hash: ${newBlock.hash}`);
      logger.info(
        `Mining reward: ${process.env.MINING_REWARD || 50} SandiCoins`
      );

      // 5. Broadcast new blockchain to network
      if (this.pubsub) {
        this.pubsub.broadcastChain();
        logger.network('New block broadcasted to network');
      }

      // 6. Clear processed transactions from pool
      this.transactionPool.clearTransactions({ chain: this.blockchain.chain });
      logger.info('Transaction pool cleared');

      return {
        success: true,
        block: newBlock,
        message: `Successfully mined block with ${validTransactions.length} transactions`,
      };
    } catch (error) {
      logger.error('Mining failed:', error);
      return {
        success: false,
        message: `Mining failed: ${(error as Error).message}`,
      };
    }
  }

  // Mine a block with specific transactions (for testing)
  mineBlock(transactions: Transaction[]): any {
    if (transactions.length === 0) {
      throw new Error('Cannot mine empty block');
    }

    // Validate all transactions (except reward transactions)
    const invalidTransactions = transactions.filter((tx) => {
      // Skip validation for reward transactions (they use placeholder signatures)
      if (tx.input.address === '*authorized-reward*') {
        return false; // Don't validate reward transactions
      }
      return !Transaction.validateTransaction(tx);
    });

    if (invalidTransactions.length > 0) {
      throw new Error(
        `Cannot mine block with ${invalidTransactions.length} invalid transactions`
      );
    }

    // Add reward transaction if not already present
    const hasReward = transactions.some(
      (tx) => tx.input.address === '*authorized-reward*'
    );

    let transactionsToMine = [...transactions];
    if (!hasReward) {
      const rewardTransaction = Transaction.rewardTransaction({
        minerWallet: this.wallet,
      });
      transactionsToMine.push(rewardTransaction);
    }

    // Mine the block
    const newBlock = this.blockchain.addBlock(transactionsToMine);

    // Clear transactions from pool
    this.transactionPool.clearTransactions({ chain: this.blockchain.chain });

    return newBlock;
  }

  // Calculate current balance for the miner's wallet
  calculateBalance(): number {
    return Wallet.calculateBalance({
      address: this.wallet.publicKey,
      chain: this.blockchain.chain,
    });
  }

  // Get mining statistics
  getMiningStats() {
    const totalBlocks = this.blockchain.getLength();
    const totalTransactions = this.blockchain.chain
      .slice(1) // Skip genesis block
      .reduce((total, block) => total + block.data.length, 0);

    const minerTransactions = this.blockchain.chain
      .slice(1)
      .reduce((count, block) => {
        const minerRewards = block.data.filter(
          (tx: any) => tx.outputMap && tx.outputMap[this.wallet.publicKey]
        );
        return count + minerRewards.length;
      }, 0);

    return {
      totalBlocks: totalBlocks - 1, // Exclude genesis
      totalTransactions,
      minerTransactions,
      currentBalance: this.calculateBalance(),
      pendingTransactions: this.transactionPool.getTransactionCount(),
    };
  }

  // Get pending transactions info
  getPendingTransactions() {
    const validTxs = this.transactionPool.validTransactions();
    const invalidTxs = this.transactionPool
      .getAllTransactions()
      .filter((tx) => !Transaction.validateTransaction(tx));

    return {
      valid: validTxs.length,
      invalid: invalidTxs.length,
      total: this.transactionPool.getTransactionCount(),
      transactions: validTxs.map((tx) => ({
        id: tx.id,
        from: tx.input.address.substring(0, 10) + '...',
        amount: Object.values(tx.outputMap).reduce(
          (sum, amount) => sum + amount,
          0
        ),
        recipients: Object.keys(tx.outputMap).length - 1, // Exclude sender change
      })),
    };
  }
}
