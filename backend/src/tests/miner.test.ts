import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Miner } from '../models/Miner';
import { Blockchain } from '../models/Blockchain';
import { TransactionPool } from '../models/TransactionPool';
import { Transaction } from '../models/Transaction';
import { Wallet } from '../models/Wallet';

describe('Miner', () => {
  let miner: Miner;
  let blockchain: Blockchain;
  let transactionPool: TransactionPool;
  let wallet: Wallet;
  let mockNetworkService: any;

  beforeEach(() => {
    blockchain = new Blockchain();
    transactionPool = new TransactionPool();
    wallet = new Wallet();

    // Mock network service for broadcasting
    mockNetworkService = {
      broadcastBlockchain: vi.fn(),
      broadcastTransaction: vi.fn(),
      getNetworkStats: vi.fn().mockReturnValue({
        connectedNodes: 2,
        nodeId: 'test-node',
        serverPort: 5001,
        peerNodes: ['ws://localhost:5002'],
      }),
    };

    miner = new Miner({
      blockchain,
      transactionPool,
      wallet,
      networkService: mockNetworkService,
    });
  });

  describe('constructor', () => {
    it('should create a miner with required properties', () => {
      expect(miner.blockchain).toBe(blockchain);
      expect(miner.transactionPool).toBe(transactionPool);
      expect(miner.wallet).toBe(wallet);
      expect(miner.networkService).toBe(mockNetworkService);
    });
  });

  describe('mineTransactions()', () => {
    let senderWallet: Wallet;
    let transaction: Transaction;

    beforeEach(() => {
      senderWallet = new Wallet();
      transaction = Transaction.createTransaction({
        senderWallet,
        recipient: 'recipient-address',
        amount: 50,
      });
      transactionPool.setTransaction(transaction);
    });

    it('should mine a block with valid transactions', () => {
      const result = miner.mineTransactions();

      expect(result.success).toBe(true);
      expect(result.block).toBeDefined();
      expect(result.message).toContain('Successfully mined block');
    });

    it('should add mining reward transaction', () => {
      const originalLength = blockchain.chain.length;

      miner.mineTransactions();

      const newBlock = blockchain.chain[blockchain.chain.length - 1];
      const rewardTransaction = newBlock.data.find(
        (tx: any) => tx.input.address === '*authorized-reward*'
      );

      expect(rewardTransaction).toBeDefined();
      expect(rewardTransaction.outputMap[wallet.publicKey]).toBe(50); // Default mining reward
    });

    it('should include valid transactions in mined block', () => {
      miner.mineTransactions();

      const newBlock = blockchain.chain[blockchain.chain.length - 1];
      expect(newBlock.data).toContain(transaction);
    });

    it('should clear processed transactions from pool', () => {
      expect(transactionPool.getTransactionCount()).toBe(1);

      miner.mineTransactions();

      expect(transactionPool.getTransactionCount()).toBe(0);
    });

    it('should broadcast chain to network', () => {
      miner.mineTransactions();

      expect(mockNetworkService.broadcastBlockchain).toHaveBeenCalled();
    });

    it('should return error when no valid transactions', () => {
      transactionPool.clearAll();

      const result = miner.mineTransactions();

      expect(result.success).toBe(false);
      expect(result.message).toBe('No valid transactions to mine');
    });

    it('should handle mining errors gracefully', () => {
      // Mock blockchain.addBlock to throw error
      const originalAddBlock = blockchain.addBlock;
      blockchain.addBlock = vi.fn().mockImplementation(() => {
        throw new Error('Mining failed');
      });

      const result = miner.mineTransactions();

      expect(result.success).toBe(false);
      expect(result.message).toContain('Mining failed');

      // Restore original method
      blockchain.addBlock = originalAddBlock;
    });
  });

  describe('mineBlock()', () => {
    let transactions: Transaction[];

    beforeEach(() => {
      transactions = [];

      // Create multiple transactions
      for (let i = 0; i < 3; i++) {
        const senderWallet = new Wallet();
        const transaction = Transaction.createTransaction({
          senderWallet,
          recipient: `recipient-${i}`,
          amount: 30,
        });
        transactions.push(transaction);
      }
    });

    it('should mine block with specific transactions', () => {
      const newBlock = miner.mineBlock(transactions);

      expect(newBlock).toBeDefined();
      expect(newBlock.data).toHaveLength(4); // 3 transactions + 1 reward
    });

    it('should add reward transaction if not present', () => {
      const newBlock = miner.mineBlock(transactions);

      const rewardTransaction = newBlock.data.find(
        (tx: any) => tx.input.address === '*authorized-reward*'
      );

      expect(rewardTransaction).toBeDefined();
    });

    it('should not add duplicate reward transaction', () => {
      const rewardTransaction = Transaction.rewardTransaction({
        minerWallet: wallet,
      });
      const transactionsWithReward = [...transactions, rewardTransaction];

      const newBlock = miner.mineBlock(transactionsWithReward);

      const rewardTransactions = newBlock.data.filter(
        (tx: any) => tx.input.address === '*authorized-reward*'
      );

      expect(rewardTransactions).toHaveLength(1);
    });

    it('should throw error for empty transaction array', () => {
      expect(() => miner.mineBlock([])).toThrow('Cannot mine empty block');
    });

    it('should throw error for invalid transactions', () => {
      const invalidTransaction = transactions[0];
      invalidTransaction.input.signature = 'invalid-signature';

      expect(() => miner.mineBlock(transactions)).toThrow(
        'Cannot mine block with 1 invalid transactions'
      );
    });
  });

  describe('calculateBalance()', () => {
    it('should calculate miner balance from blockchain', () => {
      const initialBalance = miner.calculateBalance();
      expect(initialBalance).toBe(1000); // Starting balance

      // Mine a block to get reward
      const senderWallet = new Wallet();
      const transaction = Transaction.createTransaction({
        senderWallet,
        recipient: 'recipient',
        amount: 30,
      });
      transactionPool.setTransaction(transaction);

      miner.mineTransactions();

      const newBalance = miner.calculateBalance();
      expect(newBalance).toBe(1050); // 1000 + 50 mining reward
    });
  });

  describe('getMiningStats()', () => {
    beforeEach(() => {
      // Mine a couple of blocks
      for (let i = 0; i < 2; i++) {
        const senderWallet = new Wallet();
        const transaction = Transaction.createTransaction({
          senderWallet,
          recipient: `recipient-${i}`,
          amount: 25,
        });
        transactionPool.setTransaction(transaction);
        miner.mineTransactions();
      }
    });

    it('should return comprehensive mining statistics', () => {
      const stats = miner.getMiningStats();

      expect(stats.totalBlocks).toBe(2); // Excluding genesis
      expect(stats.totalTransactions).toBe(4); // 2 regular + 2 reward transactions
      expect(stats.minerTransactions).toBe(2); // 2 mining rewards
      expect(stats.currentBalance).toBe(1100); // 1000 + (2 * 50 rewards)
      expect(stats.pendingTransactions).toBe(0); // Pool should be empty
    });
  });

  describe('getPendingTransactions()', () => {
    beforeEach(() => {
      // Add mix of valid and invalid transactions
      for (let i = 0; i < 5; i++) {
        const senderWallet = new Wallet();
        const transaction = Transaction.createTransaction({
          senderWallet,
          recipient: `recipient-${i}`,
          amount: 20,
        });

        // Make some transactions invalid
        if (i % 2 === 0) {
          transaction.input.signature = 'invalid-signature';
        }

        transactionPool.setTransaction(transaction);
      }
    });

    it('should return pending transaction information', () => {
      const pendingInfo = miner.getPendingTransactions();

      expect(pendingInfo.total).toBe(5);
      expect(pendingInfo.valid).toBe(2); // Only odd-indexed transactions are valid
      expect(pendingInfo.invalid).toBe(3);
      expect(pendingInfo.transactions).toHaveLength(2); // Only valid transactions shown
    });

    it('should format transaction info correctly', () => {
      // Clear pool and add one clean transaction
      transactionPool.clearAll();

      const senderWallet = new Wallet();
      const transaction = Transaction.createTransaction({
        senderWallet,
        recipient: 'alice',
        amount: 100,
      });
      transactionPool.setTransaction(transaction);

      const pendingInfo = miner.getPendingTransactions();
      const txInfo = pendingInfo.transactions[0];

      expect(txInfo.id).toBe(transaction.id);
      expect(txInfo.from).toContain('...'); // Truncated address
      expect(txInfo.amount).toBe(1000); // Total amount (including change)
      expect(txInfo.recipients).toBe(1); // One recipient (excluding sender change)
    });
  });

  describe('miner without pubsub', () => {
    beforeEach(() => {
      miner = new Miner({
        blockchain,
        transactionPool,
        wallet,
        // No pubsub provided
      });
    });

    it('should mine successfully without network broadcasting', () => {
      const senderWallet = new Wallet();
      const transaction = Transaction.createTransaction({
        senderWallet,
        recipient: 'recipient',
        amount: 50,
      });
      transactionPool.setTransaction(transaction);

      const result = miner.mineTransactions();

      expect(result.success).toBe(true);
      expect(result.block).toBeDefined();
    });
  });
});
