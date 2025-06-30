import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useErrorHandler } from '../hooks/useErrorHandler';
import { handleApiError } from '../types/errors';
import apiService from '../services/api';

interface SendTransactionFormProps {
  onTransactionCreated?: (successData?: {
    amount: number;
    recipient: string;
    recipientType: 'email' | 'address';
    transactionId: string;
    status: string;
  }) => void;
  onCancel?: () => void;
}

const SendTransactionForm: React.FC<SendTransactionFormProps> = ({
  onTransactionCreated,
  onCancel,
}) => {
  const { wallet, refreshUserData } = useAuth();
  const { showError } = useErrorHandler();

  // Form state
  const [formData, setFormData] = useState({
    recipient: '',
    amount: '',
  });

  const [recipientType, setRecipientType] = useState<'email' | 'address'>(
    'email'
  );

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{
    amount: number;
    recipient: string;
    recipientType: 'email' | 'address';
    transactionId: string;
    status: string;
  } | null>(null);

  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Clear error when user starts typing
    if (error) {
      setError(null);
    }
    if (success) {
      setSuccess(null);
    }
  };

  // Validate Bitcoin-style address format
  const isValidWalletAddress = (address: string): boolean => {
    // Basic Bitcoin address validation
    // Addresses typically start with 1, 3, or bc1
    const addressRegex =
      /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$|^bc1[a-z0-9]{39,59}$/;
    return addressRegex.test(address);
  };

  // Validate form
  const validateForm = (): string | null => {
    if (!formData.recipient.trim()) {
      return recipientType === 'email'
        ? 'Recipient email is required'
        : 'Recipient wallet address is required';
    }

    if (recipientType === 'email' && !formData.recipient.includes('@')) {
      return 'Please enter a valid email address';
    }

    if (recipientType === 'address') {
      if (formData.recipient.length < 26 || formData.recipient.length > 35) {
        return 'Wallet address must be 26-35 characters long';
      }
      if (!isValidWalletAddress(formData.recipient)) {
        return 'Invalid wallet address format. Must start with 1 or 3 and contain only valid characters';
      }
    }

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      return 'Please enter a valid amount greater than 0';
    }

    const amount = parseFloat(formData.amount);
    const availableBalance = wallet?.balance || 0;

    if (amount > availableBalance) {
      return `Insufficient balance. Available: ${availableBalance} SandiCoins`;
    }

    return null;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Validate form
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const amount = parseFloat(formData.amount);

      console.log('💸 Creating transaction:', {
        recipient: formData.recipient,
        amount: amount,
      });

      const response = await apiService.createTransaction({
        recipient: formData.recipient.trim(),
        amount: amount,
      });

      if (response.success) {
        console.log('✅ Transaction created successfully');

        // Create detailed success message
        const transactionDetails = response.data;
        setSuccess({
          amount: amount,
          recipient: formData.recipient,
          recipientType: recipientType,
          transactionId: transactionDetails?.id || 'N/A',
          status: 'pending',
        });

        // Clear form
        setFormData({
          recipient: '',
          amount: '',
        });

        // Refresh user balance
        await refreshUserData();

        // Close the send transaction modal immediately and pass success data
        if (onTransactionCreated) {
          onTransactionCreated({
            amount: amount,
            recipient: formData.recipient,
            recipientType: recipientType,
            transactionId: transactionDetails?.id || 'N/A',
            status: 'pending',
          });
        }
      }
    } catch (err: unknown) {
      console.error('❌ Transaction creation failed:', err);

      // Use enhanced error handling
      const apiError = handleApiError(err);
      
      // Show both local error and global toast for better visibility
      setError(apiError.message);
      showError(apiError.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const availableBalance = wallet?.balance || 0;

  return (
    <div className='card'>

      {/* Balance Display */}
      <div className='card mb-4' style={{ backgroundColor: '#f0fdf4' }}>
        <div className='flex justify-between items-center'>
          <span className='font-bold'>Available Balance:</span>
          <span className='text-lg font-bold' style={{ color: '#166534' }}>
            {availableBalance} SandiCoins
          </span>
        </div>
      </div>

      {/* Remove the success message from here - it will be shown as a separate popup */}

      {/* Error Message */}
      {error && (
        <div
          className='card mb-4'
          style={{
            backgroundColor: '#fef2f2',
            border: '2px solid #dc2626',
            color: '#991b1b',
          }}>
          <div className='flex items-center gap-2'>
            <span style={{ fontSize: '20px' }}>❌</span>
            <strong>{error}</strong>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className='flex flex-col gap-4'>
        {/* Recipient Type Toggle */}
        <div>
          <label className='font-bold mb-2' style={{ display: 'block' }}>
            Send To
          </label>
          <div className='flex gap-2 mb-3'>
            <button
              type='button'
              onClick={() => {
                setRecipientType('email');
                setFormData((prev) => ({ ...prev, recipient: '' }));
              }}
              className={
                recipientType === 'email'
                  ? 'btn btn-primary'
                  : 'btn btn-outline'
              }
              style={{
                fontSize: '14px',
                padding: '6px 12px',
                flex: 1,
              }}
              disabled={isLoading}>
              📧 Email Address
            </button>
            <button
              type='button'
              onClick={() => {
                setRecipientType('address');
                setFormData((prev) => ({ ...prev, recipient: '' }));
              }}
              className={
                recipientType === 'address'
                  ? 'btn btn-primary'
                  : 'btn btn-outline'
              }
              style={{
                fontSize: '14px',
                padding: '6px 12px',
                flex: 1,
              }}
              disabled={isLoading}>
              🔑 Wallet Address
            </button>
          </div>
        </div>

        {/* Recipient Field */}
        <div>
          <label
            htmlFor='recipient'
            className='font-bold mb-2'
            style={{ display: 'block' }}>
            {recipientType === 'email'
              ? 'Recipient Email Address'
              : 'Recipient Wallet Address'}
          </label>
          <input
            type={recipientType === 'email' ? 'email' : 'text'}
            id='recipient'
            name='recipient'
            value={formData.recipient}
            onChange={handleInputChange}
            className='input'
            placeholder={
              recipientType === 'email'
                ? "Enter recipient's email (e.g., bob@example.com)"
                : 'Enter wallet address (e.g., 1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa)'
            }
            required
            disabled={isLoading}
          />
          <small style={{ color: 'var(--sandicoin-secondary)' }}>
            {recipientType === 'email'
              ? 'The recipient must be a registered SandiCoin user'
              : 'Enter a valid SandiCoin wallet address'}
          </small>
        </div>

        {/* Amount Field */}
        <div>
          <label
            htmlFor='amount'
            className='font-bold mb-2'
            style={{ display: 'block' }}>
            Amount (SandiCoins)
          </label>
          <div style={{ position: 'relative' }}>
            <input
              type='number'
              id='amount'
              name='amount'
              value={formData.amount}
              onChange={handleInputChange}
              className='input'
              placeholder='0.00'
              min='0.01'
              step='0.01'
              required
              disabled={isLoading}
            />
            <div
              style={{
                position: 'absolute',
                right: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--sandicoin-secondary)',
                fontSize: '14px',
                pointerEvents: 'none',
              }}>
              🪙
            </div>
          </div>
          <div className='flex justify-between mt-2'>
            <small style={{ color: 'var(--sandicoin-secondary)' }}>
              Minimum: 0.01 SandiCoins
            </small>
            <small style={{ color: 'var(--sandicoin-secondary)' }}>
              Max: {availableBalance} SandiCoins
            </small>
          </div>
        </div>

        {/* Quick Amount Buttons */}
        <div>
          <label className='font-bold mb-2' style={{ display: 'block' }}>
            Quick Amounts
          </label>
          <div className='flex gap-2 justify-center'>
            {[10, 25, 50, 100].map((amount) => (
              <button
                key={amount}
                type='button'
                onClick={() =>
                  setFormData((prev) => ({
                    ...prev,
                    amount: amount.toString(),
                  }))
                }
                className='btn btn-outline'
                style={{ fontSize: '12px', padding: '6px 12px' }}
                disabled={isLoading || amount > availableBalance}>
                {amount}
              </button>
            ))}
            <button
              type='button'
              onClick={() =>
                setFormData((prev) => ({
                  ...prev,
                  amount: availableBalance.toString(),
                }))
              }
              className='btn btn-outline'
              style={{ fontSize: '12px', padding: '6px 12px' }}
              disabled={isLoading || availableBalance <= 0}>
              Max
            </button>
          </div>
        </div>

        {/* Submit Button */}
        <div className='flex gap-4'>
          <button
            type='submit'
            className='btn btn-primary'
            disabled={isLoading || !formData.recipient || !formData.amount}
            style={{
              opacity:
                isLoading || !formData.recipient || !formData.amount ? 0.6 : 1,
              cursor:
                isLoading || !formData.recipient || !formData.amount
                  ? 'not-allowed'
                  : 'pointer',
              flex: 1,
            }}>
            {isLoading ? (
              <span className='flex items-center justify-center gap-2'>
                🔄 Sending...
              </span>
            ) : (
              <span className='flex items-center justify-center gap-2'>
                💸 Send SandiCoins
              </span>
            )}
          </button>

          {onCancel && (
            <button
              type='button'
              onClick={onCancel}
              className='btn btn-secondary'
              disabled={isLoading}
              style={{ minWidth: '100px' }}>
              Cancel
            </button>
          )}
        </div>
      </form>

      {/* Transaction Info */}
      <div className='card mt-4' style={{ backgroundColor: '#f8fafc' }}>
        <h3 className='font-bold mb-2'>📋 Transaction Details</h3>
        <small style={{ color: 'var(--sandicoin-secondary)' }}>
          • Transactions are added to the pending pool
          <br />
          • They will be confirmed when the next block is mined
          <br />
          • Your available balance updates immediately
          <br />• Mining reward: 50 SandiCoins per block
        </small>
      </div>
    </div>
  );
};

export default SendTransactionForm;
