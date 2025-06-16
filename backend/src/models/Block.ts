import crypto from 'crypto';

// Interface for Block properties
export interface BlockData {
  timestamp: number;
  lastHash: string;
  hash: string;
  data: any[]; // Will contain transactions
  nonce: number;
  difficulty: number;
}

// Interface for mining parameters
interface MineBlockParams {
  lastBlock: Block;
  data: any[];
}

export class Block {
  public timestamp: number;
  public lastHash: string;
  public hash: string;
  public data: any[];
  public nonce: number;
  public difficulty: number;

  constructor(blockData: BlockData) {
    this.timestamp = blockData.timestamp;
    this.lastHash = blockData.lastHash;
    this.hash = blockData.hash;
    this.data = blockData.data;
    this.nonce = blockData.nonce;
    this.difficulty = blockData.difficulty;
  }

  // Create the genesis block (first block in chain)
  static genesis(): Block {
    const genesisTime = 1;
    return new Block({
      timestamp: genesisTime,
      lastHash: '-----',
      hash: 'genesis-hash',
      data: [],
      nonce: 0,
      difficulty: parseInt(process.env.MINING_DIFFICULTY || '4'),
    });
  }

  // Mine a new block with proof of work
  static mineBlock({ lastBlock, data }: MineBlockParams): Block {
    let hash: string;
    let timestamp: number;
    const lastHash = lastBlock.hash;
    let { difficulty } = lastBlock;
    let nonce = 0;

    // Proof of work algorithm
    do {
      nonce++;
      timestamp = Date.now();
      difficulty = Block.adjustDifficulty({
        originalBlock: lastBlock,
        timestamp,
      });
      hash = Block.hash(timestamp, lastHash, data, nonce, difficulty);
    } while (hash.substring(0, difficulty) !== '0'.repeat(difficulty));

    return new Block({
      timestamp,
      lastHash,
      hash,
      data,
      nonce,
      difficulty,
    });
  }

  // Create hash for block
  static hash(
    timestamp: number,
    lastHash: string,
    data: any[],
    nonce: number,
    difficulty: number
  ): string {
    return crypto
      .createHash('sha256')
      .update(
        `${timestamp}${lastHash}${JSON.stringify(data)}${nonce}${difficulty}`
      )
      .digest('hex');
  }

  // Get hash of current block
  blockHash(): string {
    return Block.hash(
      this.timestamp,
      this.lastHash,
      this.data,
      this.nonce,
      this.difficulty
    );
  }

  // Adjust mining difficulty based on mine rate
  static adjustDifficulty({
    originalBlock,
    timestamp,
  }: {
    originalBlock: Block;
    timestamp: number;
  }): number {
    const { difficulty } = originalBlock;
    const mineRate = parseInt(process.env.MINE_RATE || '1000');

    // Prevent difficulty from going below 1
    if (difficulty < 1) return 1;

    // If mining took longer than expected, decrease difficulty
    if (timestamp - originalBlock.timestamp > mineRate) {
      return difficulty - 1;
    }

    // If mining was faster than expected, increase difficulty
    return difficulty + 1;
  }

  // Convert block to JSON for storage/transmission
  toJSON() {
    return {
      timestamp: this.timestamp,
      lastHash: this.lastHash,
      hash: this.hash,
      data: this.data,
      nonce: this.nonce,
      difficulty: this.difficulty,
    };
  }
}
