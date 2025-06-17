import { describe, it, expect, beforeEach } from 'vitest';
import { Wallet } from '../models/Wallet';

describe('Wallet', () => {
  let wallet: Wallet;

  beforeEach(() => {
    wallet = new Wallet();
  });

  it('should have a starting balance', () => {
    expect(wallet.balance).toBe(1000); // Default starting balance
  });

  it('should have a public key', () => {
    expect(wallet.publicKey).toBeDefined();
    expect(typeof wallet.publicKey).toBe('string');
  });

  describe('signing data', () => {
    const data = { amount: 50, recipient: 'test-recipient' };

    it('should sign data and return a signature', () => {
      const signature = wallet.sign(data);

      expect(signature).toBeDefined();
      expect(typeof signature).toBe('string');
      expect(signature.length).toBeGreaterThan(0);
    });

    it('should create different signatures for different data', () => {
      const data1 = { amount: 50 };
      const data2 = { amount: 100 };

      const signature1 = wallet.sign(data1);
      const signature2 = wallet.sign(data2);

      expect(signature1).not.toBe(signature2);
    });
  });
});
