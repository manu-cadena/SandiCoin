import { Transaction } from './Transaction';

/**
 * Transaction Pool (Mempool) for SandiCoin
 * Manages pending transactions before they are mined into blocks
 */
export class TransactionPool {
  public transactionMap: { [key: string]: Transaction };

  constructor() {
    this.transactionMap = {};
  }

  // Add transaction to the pool
  setTransaction(transaction: Transaction): void {
    this.transactionMap[transaction.id] = transaction;
  }

  // Check if transaction exists in pool (by sender address)
  existingTransaction({
    inputAddress,
  }: {
    inputAddress: string;
  }): Transaction | undefined {
    const transactions = Object.values(this.transactionMap);

    return transactions.find(
      (transaction) => transaction.input.address === inputAddress
    );
  }

  // Get all valid transactions for mining
  validTransactions(): Transaction[] {
    return Object.values(this.transactionMap).filter((transaction) =>
      Transaction.validateTransaction(transaction)
    );
  }

  // Clear specific transactions (after they've been mined)
  clearTransactions({ chain }: { chain: any[] }): void {
    // Look through the blockchain for transactions that are now mined
    for (let i = 1; i < chain.length; i++) {
      const block = chain[i];

      for (let transaction of block.data) {
        if (this.transactionMap[transaction.id]) {
          delete this.transactionMap[transaction.id];
        }
      }
    }
  }

  // Clear all transactions (for testing/reset)
  clearAll(): void {
    this.transactionMap = {};
  }

  // Replace entire transaction map (for network sync)
  setMap(transactionMap: { [key: string]: Transaction }): void {
    this.transactionMap = transactionMap;
  }

  // Get transaction by ID
  getTransaction(id: string): Transaction | undefined {
    return this.transactionMap[id];
  }

  // Get all transactions as array
  getAllTransactions(): Transaction[] {
    return Object.values(this.transactionMap);
  }

  // Get transaction count
  getTransactionCount(): number {
    return Object.keys(this.transactionMap).length;
  }

  // Check if pool is empty
  isEmpty(): boolean {
    return this.getTransactionCount() === 0;
  }

  // Convert to JSON for network transmission
  toJSON() {
    return {
      transactionMap: Object.fromEntries(
        Object.entries(this.transactionMap).map(([id, transaction]) => [
          id,
          transaction.toJSON(),
        ])
      ),
      count: this.getTransactionCount(),
    };
  }

  // Create from JSON (for network sync)
  static fromJSON(data: any): TransactionPool {
    const pool = new TransactionPool();

    if (data.transactionMap) {
      Object.entries(data.transactionMap).forEach(
        ([id, transactionData]: [string, any]) => {
          pool.transactionMap[id] = new Transaction(transactionData);
        }
      );
    }

    return pool;
  }
}
