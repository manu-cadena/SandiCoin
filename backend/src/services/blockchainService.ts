import { Blockchain } from '../models/Blockchain';
import { TransactionPool } from '../models/TransactionPool';

/**
 * Singleton service to manage shared blockchain and transaction pool instances
 * Ensures all controllers use the same data
 */

class BlockchainService {
  private static instance: BlockchainService;
  private _blockchain: Blockchain;
  private _transactionPool: TransactionPool;

  private constructor() {
    this._blockchain = new Blockchain();
    this._transactionPool = new TransactionPool();
  }

  public static getInstance(): BlockchainService {
    if (!BlockchainService.instance) {
      BlockchainService.instance = new BlockchainService();
    }
    return BlockchainService.instance;
  }

  public get blockchain(): Blockchain {
    return this._blockchain;
  }

  public get transactionPool(): TransactionPool {
    return this._transactionPool;
  }

  // Initialize with any startup data if needed
  public async initialize(): Promise<void> {
    // Could load blockchain from database here
    // For now, just ensure genesis block exists
    if (this._blockchain.getLength() === 0) {
      // This shouldn't happen as Blockchain constructor creates genesis
      console.log('Blockchain initialized with genesis block');
    }
  }

  // Get current statistics
  public getStats() {
    return {
      blockchainLength: this._blockchain.getLength(),
      pendingTransactions: this._transactionPool.getTransactionCount(),
      validPendingTransactions:
        this._transactionPool.validTransactions().length,
    };
  }
}

// Export singleton instance - Fixed export
export const blockchainService = BlockchainService.getInstance();
