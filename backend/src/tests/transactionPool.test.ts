import { describe, it, expect, beforeEach } from 'vitest';
import { TransactionPool } from '../models/TransactionPool';
import { Transaction } from '../models/Transaction';
import { Wallet } from '../models/Wallet';
import { Blockchain } from '../models/Blockchain';

describe('TransactionPool', () => {
  let transactionPool: TransactionPool;
  let transaction: Transaction;
  let senderWallet: Wallet;

  beforeEach(() => {
    transactionPool = new TransactionPool();
    senderWallet = new Wallet();
    transaction = Transaction.createTransaction({
      senderWallet,
      recipient: 'recipient-address',
      amount: 50,
    });
  });

  describe('setTransaction()', () => {
    it('should add a transaction', () => {
      transactionPool.setTransaction(transaction);

      expect(transactionPool.transactionMap[transaction.id]).toBe(transaction);
    });
  });

  describe('existingTransaction()', () => {
    it('should return existing transaction given an input address', () => {
      transactionPool.setTransaction(transaction);

      expect(
        transactionPool.existingTransaction({
          inputAddress: senderWallet.publicKey,
        })
      ).toBe(transaction);
    });

    it('should return undefined if no transaction exists', () => {
      expect(
        transactionPool.existingTransaction({
          inputAddress: 'non-existent-address',
        })
      ).toBeUndefined();
    });
  });

  describe('validTransactions()', () => {
    let validTransactions: Transaction[];

    beforeEach(() => {
      validTransactions = [];

      // Create mix of valid and invalid transactions
      for (let i = 0; i < 10; i++) {
        transaction = Transaction.createTransaction({
          senderWallet,
          recipient: `recipient-${i}`,
          amount: 30,
        });

        // Make some transactions invalid
        if (i % 3 === 0) {
          // Invalid: corrupt outputMap
          transaction.outputMap[senderWallet.publicKey] = 999999;
        } else if (i % 3 === 1) {
          // Invalid: bad signature
          transaction.input.signature = 'bad-signature';
        } else {
          // Valid transaction
          validTransactions.push(transaction);
        }

        transactionPool.setTransaction(transaction);
      }
    });

    it('should return valid transactions only', () => {
      expect(transactionPool.validTransactions()).toEqual(validTransactions);
    });
  });

  describe('clearTransactions()', () => {
    it('should clear transactions that appear in the blockchain', () => {
      const blockchain = new Blockchain();
      const expectedTransactionMap: { [key: string]: Transaction } = {};

      // Create transactions and add some to blockchain
      for (let i = 0; i < 6; i++) {
        const transaction = Transaction.createTransaction({
          senderWallet: new Wallet(),
          recipient: `recipient-${i}`,
          amount: 20,
        });

        transactionPool.setTransaction(transaction);

        // Add every other transaction to blockchain (simulate mining)
        if (i % 2 === 0) {
          blockchain.addBlock([transaction]);
        } else {
          // Keep track of transactions that should remain in pool
          expectedTransactionMap[transaction.id] = transaction;
        }
      }

      transactionPool.clearTransactions({ chain: blockchain.chain });

      expect(transactionPool.transactionMap).toEqual(expectedTransactionMap);
    });
  });

  describe('pool management', () => {
    beforeEach(() => {
      // Add some transactions to pool
      for (let i = 0; i < 3; i++) {
        const wallet = new Wallet();
        const transaction = Transaction.createTransaction({
          senderWallet: wallet,
          recipient: `recipient-${i}`,
          amount: 20,
        });
        transactionPool.setTransaction(transaction);
      }
    });

    it('should get transaction count', () => {
      expect(transactionPool.getTransactionCount()).toBe(3);
    });

    it('should check if pool is empty', () => {
      expect(transactionPool.isEmpty()).toBe(false);

      transactionPool.clearAll();
      expect(transactionPool.isEmpty()).toBe(true);
    });

    it('should get all transactions as array', () => {
      const transactions = transactionPool.getAllTransactions();
      expect(transactions).toHaveLength(3);
      expect(transactions[0]).toBeInstanceOf(Transaction);
    });

    it('should clear all transactions', () => {
      transactionPool.clearAll();
      expect(transactionPool.getTransactionCount()).toBe(0);
      expect(transactionPool.isEmpty()).toBe(true);
    });
  });

  describe('network synchronization', () => {
    let originalPool: TransactionPool;
    let newPool: TransactionPool;

    beforeEach(() => {
      originalPool = new TransactionPool();

      // Add transactions to original pool
      for (let i = 0; i < 3; i++) {
        const wallet = new Wallet();
        const transaction = Transaction.createTransaction({
          senderWallet: wallet,
          recipient: `recipient-${i}`,
          amount: 30,
        });
        originalPool.setTransaction(transaction);
      }
    });

    it('should serialize to JSON', () => {
      const json = originalPool.toJSON();

      expect(json.count).toBe(3);
      expect(json.transactionMap).toBeDefined();
      expect(Object.keys(json.transactionMap)).toHaveLength(3);
    });

    it('should create from JSON', () => {
      const json = originalPool.toJSON();
      newPool = TransactionPool.fromJSON(json);

      expect(newPool.getTransactionCount()).toBe(
        originalPool.getTransactionCount()
      );
      expect(Object.keys(newPool.transactionMap)).toEqual(
        Object.keys(originalPool.transactionMap)
      );
    });

    it('should replace transaction map', () => {
      newPool = new TransactionPool();
      newPool.setMap(originalPool.transactionMap);

      expect(newPool.transactionMap).toEqual(originalPool.transactionMap);
    });
  });

  describe('double spending prevention', () => {
    it('should update existing transaction instead of creating duplicate', () => {
      // Alice creates first transaction
      const firstTransaction = Transaction.createTransaction({
        senderWallet,
        recipient: 'bob',
        amount: 30,
      });

      transactionPool.setTransaction(firstTransaction);
      expect(transactionPool.getTransactionCount()).toBe(1);

      // Alice tries to create another transaction
      const existingTx = transactionPool.existingTransaction({
        inputAddress: senderWallet.publicKey,
      });

      expect(existingTx).toBe(firstTransaction);

      // Should update existing instead of creating new
      if (existingTx) {
        existingTx.update({
          senderWallet,
          recipient: 'charlie',
          amount: 20,
        });

        transactionPool.setTransaction(existingTx);
      }

      // Still only one transaction in pool
      expect(transactionPool.getTransactionCount()).toBe(1);

      // But now it sends to both Bob AND Charlie
      const updatedTx = transactionPool.getAllTransactions()[0];
      expect(updatedTx.outputMap['bob']).toBe(30);
      expect(updatedTx.outputMap['charlie']).toBe(20);
      expect(updatedTx.outputMap[senderWallet.publicKey]).toBe(950); // 1000 - 30 - 20
    });
  });
});
