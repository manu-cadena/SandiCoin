import { describe, it, expect, beforeEach } from 'vitest';
import { Transaction } from '../models/Transaction';
import { Wallet } from '../models/Wallet';

describe('Transaction', () => {
  let senderWallet: Wallet;
  let recipientAddress: string;
  let amount: number;
  let transaction: Transaction;

  beforeEach(() => {
    senderWallet = new Wallet();
    recipientAddress = 'recipient-public-key';
    amount = 50;
    transaction = Transaction.createTransaction({
      senderWallet,
      recipient: recipientAddress,
      amount,
    });
  });

  it('should have an id', () => {
    expect(transaction.id).toBeDefined();
    expect(typeof transaction.id).toBe('string');
  });

  it('should have an input object', () => {
    expect(transaction.input).toBeDefined();
    expect(transaction.input.timestamp).toBeDefined();
    expect(transaction.input.amount).toBe(senderWallet.balance);
    expect(transaction.input.address).toBe(senderWallet.publicKey);
    expect(transaction.input.signature).toBeDefined();
  });

  it('should have an output map', () => {
    expect(transaction.outputMap).toBeDefined();
    expect(transaction.outputMap[recipientAddress]).toBe(amount);
    expect(transaction.outputMap[senderWallet.publicKey]).toBe(
      senderWallet.balance - amount
    );
  });

  describe('when amount exceeds balance', () => {
    it('should throw an error', () => {
      expect(() => {
        Transaction.createTransaction({
          senderWallet,
          recipient: recipientAddress,
          amount: 99999, // More than starting balance
        });
      }).toThrow('Amount: 99999 exceeds balance: 1000');
    });
  });

  describe('validation', () => {
    it('should validate a correct transaction', () => {
      expect(Transaction.validateTransaction(transaction)).toBe(true);
    });

    describe('when input amount does not equal output amounts', () => {
      it('should return false', () => {
        transaction.outputMap[senderWallet.publicKey] = 999999; // Invalid change amount
        expect(Transaction.validateTransaction(transaction)).toBe(false);
      });
    });

    describe('when signature is invalid', () => {
      it('should return false', () => {
        transaction.input.signature = 'invalid-signature';
        expect(Transaction.validateTransaction(transaction)).toBe(false);
      });
    });
  });

  describe('updating a transaction', () => {
    let originalSignature: string;
    let originalSenderOutput: number;
    let nextRecipient: string;
    let nextAmount: number;

    beforeEach(() => {
      originalSignature = transaction.input.signature;
      originalSenderOutput = transaction.outputMap[senderWallet.publicKey];
      nextRecipient = 'next-recipient';
      nextAmount = 50;

      transaction.update({
        senderWallet,
        recipient: nextRecipient,
        amount: nextAmount,
      });
    });

    it('should output the amount to the next recipient', () => {
      expect(transaction.outputMap[nextRecipient]).toBe(nextAmount);
    });

    it('should subtract the amount from original sender output', () => {
      expect(transaction.outputMap[senderWallet.publicKey]).toBe(
        originalSenderOutput - nextAmount
      );
    });

    it('should maintain total amount balance', () => {
      const totalOutput = Object.values(transaction.outputMap).reduce(
        (total, amount) => total + amount,
        0
      );

      expect(totalOutput).toBe(senderWallet.balance);
    });

    it('should re-sign the transaction', () => {
      expect(transaction.input.signature).not.toBe(originalSignature);
    });

    describe('when amount exceeds remaining balance', () => {
      it('should throw an error', () => {
        expect(() => {
          transaction.update({
            senderWallet,
            recipient: 'another-recipient',
            amount: 99999,
          });
        }).toThrow('Amount exceeds remaining balance');
      });
    });
  });

  describe('reward transaction', () => {
    let minerWallet: Wallet;
    let rewardTransaction: Transaction;

    beforeEach(() => {
      minerWallet = new Wallet();
      rewardTransaction = Transaction.rewardTransaction({ minerWallet });
    });

    it('should create a reward transaction', () => {
      expect(rewardTransaction.input.address).toBe('*authorized-reward*');
      expect(rewardTransaction.input.signature).toBe('*reward-signature*');
    });

    it('should reward the miner', () => {
      expect(rewardTransaction.outputMap[minerWallet.publicKey]).toBe(50); // Default mining reward
    });
  });
});
