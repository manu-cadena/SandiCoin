import { v4 as uuidv4 } from 'uuid';
import { signData } from '../utils/cryptography';
import {
  validateTransaction,
  validateSufficientBalance,
} from '../utils/transactionValidator';

// Transaction input - where money comes from
export interface TransactionInput {
  timestamp: number;
  amount: number; // Sender's balance at time of transaction
  address: string; // Sender's public key/wallet address
  signature: string; // Cryptographic proof sender authorized this
}

// Transaction output map - where money goes to
export interface TransactionOutputMap {
  [recipientAddress: string]: number; // recipient → amount
}

// Main transaction interface
export interface TransactionData {
  id: string;
  input: TransactionInput;
  outputMap: TransactionOutputMap;
}

// Forward declaration to avoid circular imports
export interface WalletInterface {
  balance: number;
  publicKey: string;
  sign(data: any): string;
}

export class Transaction {
  public id: string;
  public input: TransactionInput;
  public outputMap: TransactionOutputMap;

  constructor(transactionData: TransactionData) {
    this.id = transactionData.id;
    this.input = transactionData.input;
    this.outputMap = transactionData.outputMap;
  }

  // Create a new transaction
  static createTransaction({
    senderWallet,
    recipient,
    amount,
  }: {
    senderWallet: WalletInterface;
    recipient: string;
    amount: number;
  }): Transaction {
    // Validation: Check if sender has enough coins
    const balanceValidation = validateSufficientBalance(
      senderWallet.balance,
      amount
    );
    if (!balanceValidation.isValid) {
      throw new Error(balanceValidation.error);
    }

    // Create output map (where money goes)
    const outputMap: TransactionOutputMap = {};
    outputMap[recipient] = amount; // Recipient gets the amount
    outputMap[senderWallet.publicKey] = senderWallet.balance - amount; // Sender gets "change"

    // Create transaction
    const transaction = new Transaction({
      id: uuidv4(),
      input: Transaction.createInput({ senderWallet, outputMap }),
      outputMap,
    });

    return transaction;
  }

  // Create the input part of transaction (with signature)
  static createInput({
    senderWallet,
    outputMap,
  }: {
    senderWallet: WalletInterface;
    outputMap: TransactionOutputMap;
  }): TransactionInput {
    return {
      timestamp: Date.now(),
      amount: senderWallet.balance,
      address: senderWallet.publicKey,
      signature: senderWallet.sign(outputMap), // 🔐 CRYPTOGRAPHIC SIGNATURE!
    };
  }

  // Validate a transaction's signature and amounts
  static validateTransaction(transaction: Transaction): boolean {
    const validation = validateTransaction(
      transaction.input,
      transaction.outputMap
    );

    if (!validation.isValid) {
      console.error(validation.error);
      return false;
    }

    return true;
  }

  // Update an existing transaction (for multiple recipients)
  update({
    senderWallet,
    recipient,
    amount,
  }: {
    senderWallet: WalletInterface;
    recipient: string;
    amount: number;
  }): void {
    // Check if sender has enough remaining balance
    if (amount > this.outputMap[senderWallet.publicKey]) {
      throw new Error('Amount exceeds remaining balance');
    }

    // Update outputs
    if (this.outputMap[recipient]) {
      this.outputMap[recipient] += amount; // Add to existing
    } else {
      this.outputMap[recipient] = amount; // Create new output
    }

    // Reduce sender's change
    this.outputMap[senderWallet.publicKey] -= amount;

    // Re-sign the transaction with new data
    this.input = Transaction.createInput({
      senderWallet,
      outputMap: this.outputMap,
    });
  }

  // Create reward transaction for miners
  static rewardTransaction({
    minerWallet,
  }: {
    minerWallet: WalletInterface;
  }): Transaction {
    const rewardAmount = parseInt(process.env.MINING_REWARD || '50');

    return new Transaction({
      id: uuidv4(),
      input: {
        timestamp: Date.now(),
        amount: rewardAmount,
        address: '*authorized-reward*', // Special address for mining rewards
        signature: '*reward-signature*',
      },
      outputMap: {
        [minerWallet.publicKey]: rewardAmount,
      },
    });
  }

  // Convert to JSON for storage/transmission
  toJSON() {
    return {
      id: this.id,
      input: this.input,
      outputMap: this.outputMap,
    };
  }
}
