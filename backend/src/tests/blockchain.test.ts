import { describe, it, expect, beforeEach } from 'vitest';
import { Block } from '../models/Block';
import { Blockchain } from '../models/Blockchain';

describe('Block', () => {
  describe('genesis()', () => {
    it('should create a genesis block', () => {
      const genesisBlock = Block.genesis();

      expect(genesisBlock.timestamp).toBe(1);
      expect(genesisBlock.lastHash).toBe('-----');
      expect(genesisBlock.hash).toBe('genesis-hash');
      expect(genesisBlock.data).toEqual([]);
      expect(genesisBlock.nonce).toBe(0);
      expect(genesisBlock.difficulty).toBeGreaterThan(0);
    });
  });

  describe('mineBlock()', () => {
    it('should mine a block', () => {
      const lastBlock = Block.genesis();
      const data = ['test transaction'];
      const minedBlock = Block.mineBlock({ lastBlock, data });

      expect(minedBlock.lastHash).toBe(lastBlock.hash);
      expect(minedBlock.data).toEqual(data);
      expect(minedBlock.hash.length).toBe(64); // SHA256 length
      expect(minedBlock.nonce).toBeGreaterThan(0);
    });

    it('should create hash with leading zeros based on difficulty', () => {
      const lastBlock = Block.genesis();
      const data = ['test'];
      const minedBlock = Block.mineBlock({ lastBlock, data });

      expect(minedBlock.hash.substring(0, minedBlock.difficulty)).toBe(
        '0'.repeat(minedBlock.difficulty)
      );
    });
  });
});

describe('Blockchain', () => {
  let blockchain: Blockchain;

  beforeEach(() => {
    blockchain = new Blockchain();
  });

  it('should start with genesis block', () => {
    expect(blockchain.chain[0]).toEqual(Block.genesis());
  });

  it('should add a new block', () => {
    const data = ['test transaction'];
    const newBlock = blockchain.addBlock(data);

    expect(blockchain.chain.length).toBe(2);
    expect(blockchain.chain[1]).toBe(newBlock);
    expect(newBlock.data).toEqual(data);
  });

  describe('isValidChain()', () => {
    beforeEach(() => {
      blockchain.addBlock(['transaction 1']);
      blockchain.addBlock(['transaction 2']);
    });

    it('should return true for valid chain', () => {
      expect(Blockchain.isValidChain(blockchain.chain)).toBe(true);
    });

    it('should return false for invalid genesis block', () => {
      blockchain.chain[0].hash = 'bad-hash';
      expect(Blockchain.isValidChain(blockchain.chain)).toBe(false);
    });

    it('should return false for broken chain link', () => {
      blockchain.chain[1].lastHash = 'bad-hash';
      expect(Blockchain.isValidChain(blockchain.chain)).toBe(false);
    });
  });
});
