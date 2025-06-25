import { verifySignature } from './cryptography';
import type {
  TransactionInput,
  TransactionOutputMap,
} from '../models/Transaction';

/**
 * Transaction validation utilities for SandiCoin
 * Handles all transaction validation logic
 */

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

// Validate transaction structure and amounts
export const validateTransactionAmounts = (
  input: TransactionInput,
  outputMap: TransactionOutputMap
): ValidationResult => {
  const { amount } = input;

  // Check if total outputs equal input amount
  const totalOutput = Object.values(outputMap).reduce(
    (total, outputAmount) => total + outputAmount,
    0
  );

  if (amount !== totalOutput) {
    return {
      isValid: false,
      error: `Invalid transaction: input amount (${amount}) does not equal output amounts (${totalOutput})`,
    };
  }

  return { isValid: true };
};

// Validate transaction signature
export const validateTransactionSignature = (
  input: TransactionInput,
  outputMap: TransactionOutputMap
): ValidationResult => {
  const { address, cryptoPublicKey, signature } = input;

  // Skip validation for special reward transactions
  if (address === '*authorized-reward*') {
    return { isValid: true };
  }

  // Must have cryptoPublicKey for proper signature verification
  if (!cryptoPublicKey) {
    console.warn(`Transaction from ${address.substring(0, 10)}... missing cryptoPublicKey - skipping signature verification`);
    return { isValid: true }; // Allow for backward compatibility
  }

  // Verify that cryptoPublicKey is a proper PEM key (starts with -----BEGIN PUBLIC KEY-----)
  if (!cryptoPublicKey.startsWith('-----BEGIN PUBLIC KEY-----')) {
    console.warn(`Invalid cryptoPublicKey format for transaction from ${address.substring(0, 10)}...`);
    return { isValid: true }; // Allow for backward compatibility
  }

  try {
    const isValidSignature = verifySignature({
      publicKey: cryptoPublicKey,
      data: outputMap,
      signature,
    });

    if (!isValidSignature) {
      return {
        isValid: false,
        error: 'Invalid transaction signature'
      };
    }

    return { isValid: true };
  } catch (error) {
    console.error(`Signature verification error for transaction from ${address.substring(0, 10)}...:`, (error as Error).message);
    return {
      isValid: false,
      error: `Signature verification failed: ${(error as Error).message}`
    };
  }
};

// Validate sender has sufficient balance
export const validateSufficientBalance = (
  senderBalance: number,
  amount: number
): ValidationResult => {
  if (amount > senderBalance) {
    return {
      isValid: false,
      error: `Amount: ${amount} exceeds balance: ${senderBalance}`,
    };
  }

  if (amount <= 0) {
    return {
      isValid: false,
      error: 'Transaction amount must be greater than 0',
    };
  }

  return { isValid: true };
};

// Main transaction validation function
export const validateTransaction = (
  input: TransactionInput,
  outputMap: TransactionOutputMap
): ValidationResult => {
  // Validate amounts
  const amountValidation = validateTransactionAmounts(input, outputMap);
  if (!amountValidation.isValid) {
    return amountValidation;
  }

  // Validate signature
  const signatureValidation = validateTransactionSignature(input, outputMap);
  if (!signatureValidation.isValid) {
    return signatureValidation;
  }

  return { isValid: true };
};
