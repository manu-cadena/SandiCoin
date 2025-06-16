import { Block } from './Block';

export class Blockchain {
  public chain: Block[];

  constructor() {
    this.chain = [Block.genesis()];
  }

  // Add a new block to the chain
  addBlock(data: any[]): Block {
    const newBlock = Block.mineBlock({
      lastBlock: this.chain[this.chain.length - 1],
      data,
    });

    this.chain.push(newBlock);
    return newBlock;
  }

  // Replace the current chain with a new one (for network sync)
  replaceChain(newChain: Block[]): boolean {
    // New chain must be longer
    if (newChain.length <= this.chain.length) {
      console.log('Received chain is not longer than current chain');
      return false;
    }

    // New chain must be valid
    if (!Blockchain.isValidChain(newChain)) {
      console.log('Received chain is not valid');
      return false;
    }

    console.log('Replacing blockchain with new chain');
    this.chain = newChain;
    return true;
  }

  // Validate entire blockchain
  static isValidChain(chain: Block[]): boolean {
    // Check genesis block
    if (JSON.stringify(chain[0]) !== JSON.stringify(Block.genesis())) {
      return false;
    }

    // Validate each subsequent block
    for (let i = 1; i < chain.length; i++) {
      const block = chain[i];
      const lastBlock = chain[i - 1];

      // Check if block's lastHash matches previous block's hash
      if (block.lastHash !== lastBlock.hash) {
        console.log('Invalid lastHash');
        return false;
      }

      // Verify block's hash
      const validHash = Block.hash(
        block.timestamp,
        block.lastHash,
        block.data,
        block.nonce,
        block.difficulty
      );

      if (block.hash !== validHash) {
        console.log('Invalid hash');
        return false;
      }

      // Check difficulty adjustment (prevent malicious difficulty manipulation)
      const lastDifficulty = lastBlock.difficulty;
      if (Math.abs(lastDifficulty - block.difficulty) > 1) {
        console.log('Invalid difficulty adjustment');
        return false;
      }

      // Verify proof of work
      if (
        block.hash.substring(0, block.difficulty) !==
        '0'.repeat(block.difficulty)
      ) {
        console.log('Invalid proof of work');
        return false;
      }
    }

    return true;
  }

  // Get the latest block
  getLatestBlock(): Block {
    return this.chain[this.chain.length - 1];
  }

  // Get chain length
  getLength(): number {
    return this.chain.length;
  }

  // Convert blockchain to JSON for storage/transmission
  toJSON() {
    return {
      chain: this.chain.map((block) => block.toJSON()),
      length: this.chain.length,
    };
  }

  // Create blockchain from JSON (for loading from database)
  static fromJSON(data: any): Blockchain {
    const blockchain = new Blockchain();

    if (data.chain && data.chain.length > 1) {
      blockchain.chain = data.chain.map(
        (blockData: any) => new Block(blockData)
      );
    }

    return blockchain;
  }
}
