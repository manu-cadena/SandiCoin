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
  const { address, signature } = input;

  if (
    !verifySignature({
      publicKey: address,
      data: outputMap,
      signature,
    })
  ) {
    return {
      isValid: false,
      error: 'Invalid transaction: signature verification failed',
    };
  }

  return { isValid: true };
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
