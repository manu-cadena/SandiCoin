import { Transaction } from './Transaction';
import { generateKeyPair, signData } from '../utils/cryptography';

export class Wallet {
  public balance: number;
  public publicKey: string;        // Bitcoin-style address for transactions
  public cryptoPublicKey: string;  // Real PEM public key for signature verification
  private privateKey: string;

  constructor(existingKeys?: { publicKey: string; privateKey: string; cryptoPublicKey?: string }) {
    this.balance = parseInt(process.env.STARTING_BALANCE || '1000'); // Starting coins for new users

    if (existingKeys) {
      // Use provided keys (backward compatibility)
      this.publicKey = existingKeys.publicKey;
      this.privateKey = existingKeys.privateKey;
      this.cryptoPublicKey = existingKeys.cryptoPublicKey || existingKeys.publicKey; // Fallback for old data
    } else {
      // Generate new cryptographic key pair
      const keyPair = generateKeyPair();
      this.publicKey = keyPair.bitcoinAddress;      // Use Bitcoin address for transactions
      this.cryptoPublicKey = keyPair.publicKey;     // Store real public key for crypto
      this.privateKey = keyPair.privateKey;
    }
  }

  // Get private key (for storing in database - demo purposes only)
  getPrivateKey(): string {
    return this.privateKey;
  }

  // 🔐 CRYPTOGRAPHIC SIGNING - The heart of security!
  sign(data: any): string {
    return signData(data, this.privateKey);
  }

  // Create a new transaction from this wallet
  createTransaction({
    amount,
    recipient,
    chain,
  }: {
    amount: number;
    recipient: string;
    chain?: any[]; // Blockchain data to calculate current balance
  }): Transaction {
    // If blockchain is provided, calculate current balance
    if (chain) {
      this.balance = Wallet.calculateBalance({
        address: this.publicKey,
        chain,
      });
    }

    // Create and return the transaction
    return Transaction.createTransaction({
      senderWallet: this,
      recipient,
      amount,
    });
  }

  // Calculate wallet balance by scanning the entire blockchain
  static calculateBalance({
    address,
    chain,
  }: {
    address: string;
    chain: any[];
  }): number {
    let hasConductedTransaction = false;
    let outputsTotal = 0;

    // Scan blockchain from newest to oldest
    for (let i = chain.length - 1; i > 0; i--) {
      const block = chain[i];

      // Look at each transaction in the block
      for (let transaction of block.data) {
        // If this address was the sender of a transaction
        if (transaction.input && transaction.input.address === address) {
          hasConductedTransaction = true;
        }

        // If this address received coins in any transaction
        const addressOutput =
          transaction.outputMap && transaction.outputMap[address];
        if (addressOutput) {
          outputsTotal += addressOutput;
        }
      }

      // If we found where this address sent money, stop looking further back
      // (because the input.amount already includes their balance at that time)
      if (hasConductedTransaction) {
        break;
      }
    }

    // Return calculated balance or starting balance if no transactions found
    return hasConductedTransaction
      ? outputsTotal
      : parseInt(process.env.STARTING_BALANCE || '1000') + outputsTotal;
  }

  // Get wallet info for display
  toString(): string {
    return `Wallet -
      publicKey: ${this.publicKey.substring(0, 50)}...
      balance: ${this.balance}`;
  }

  // Convert to JSON (without private key for security!)
  toJSON() {
    return {
      publicKey: this.publicKey,
      balance: this.balance,
    };
  }
}
