import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';

// Types for registration form
interface RegisterFormData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  role: 'user' | 'miner';
}

interface RegisterFormProps {
  onSwitchToLogin?: () => void;
}

const RegisterForm: React.FC<RegisterFormProps> = ({ onSwitchToLogin }) => {
  const { register } = useAuth();

  // Form state
  const [formData, setFormData] = useState<RegisterFormData>({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'user',
  });

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<RegisterFormData>>({});

  // Handle input changes
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Clear field error when user starts typing
    if (fieldErrors[name as keyof RegisterFormData]) {
      setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
    }

    // Clear general error
    if (error) {
      setError(null);
    }
  };

  // Validate individual fields
  const validateField = (
    name: keyof RegisterFormData,
    value: string
  ): string | null => {
    switch (name) {
      case 'firstName':
        return value.trim().length < 2
          ? 'First name must be at least 2 characters'
          : null;

      case 'lastName':
        return value.trim().length < 2
          ? 'Last name must be at least 2 characters'
          : null;

      case 'email':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return !emailRegex.test(value)
          ? 'Please enter a valid email address'
          : null;

      case 'password':
        if (value.length < 8) return 'Password must be at least 8 characters';
        if (!/(?=.*[a-z])/.test(value))
          return 'Password must contain at least one lowercase letter';
        if (!/(?=.*[A-Z])/.test(value))
          return 'Password must contain at least one uppercase letter';
        if (!/(?=.*\d)/.test(value))
          return 'Password must contain at least one number';
        return null;

      case 'confirmPassword':
        return value !== formData.password ? 'Passwords do not match' : null;

      default:
        return null;
    }
  };

  // Validate entire form
  const validateForm = (): boolean => {
    const errors: Partial<RegisterFormData> = {};

    Object.keys(formData).forEach((key) => {
      const fieldName = key as keyof RegisterFormData;
      if (fieldName !== 'role') {
        // Role doesn't need validation
        const error = validateField(fieldName, formData[fieldName]);
        if (error) {
          errors[fieldName] = error;
        }
      }
    });

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Validate form
    if (!validateForm()) {
      setError('Please fix the errors below');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      console.log('📝 Registering user:', {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        role: formData.role,
      });

      await register({
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        role: formData.role,
      });

      console.log('✅ Registration successful, user should be logged in');
    } catch (err: any) {
      console.error('❌ Registration failed:', err);

      let errorMessage = 'Registration failed. Please try again.';

      if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.message) {
        errorMessage = err.message;
      }

      // Handle specific error cases
      if (
        errorMessage.includes('already exists') ||
        errorMessage.includes('duplicate')
      ) {
        errorMessage =
          'An account with this email already exists. Please try logging in instead.';
      }

      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Get field error helper
  const getFieldError = (fieldName: keyof RegisterFormData) => {
    return fieldErrors[fieldName];
  };

  // Check if field has error
  const hasFieldError = (fieldName: keyof RegisterFormData) => {
    return !!fieldErrors[fieldName];
  };

  return (
    <div className='card' style={{ maxWidth: '500px', width: '100%' }}>
      {/* Header */}
      <div className='text-center mb-6'>
        <h1
          className='text-2xl font-bold'
          style={{ color: 'var(--sandicoin-primary)' }}>
          🪙 Join SandiCoin
        </h1>
        <p style={{ color: 'var(--sandicoin-secondary)' }}>
          Create your cryptocurrency wallet account
        </p>
      </div>

      {/* Registration Form */}
      <form onSubmit={handleSubmit} className='space-y-4'>
        {/* Name Fields */}
        <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
          <div>
            <label htmlFor='firstName' className='block font-medium mb-1'>
              First Name *
            </label>
            <input
              type='text'
              id='firstName'
              name='firstName'
              value={formData.firstName}
              onChange={handleInputChange}
              className={`input ${
                hasFieldError('firstName') ? 'border-red-500' : ''
              }`}
              placeholder='Enter your first name'
              required
              disabled={isLoading}
            />
            {getFieldError('firstName') && (
              <p className='text-red-500 text-sm mt-1'>
                {getFieldError('firstName')}
              </p>
            )}
          </div>

          <div>
            <label htmlFor='lastName' className='block font-medium mb-1'>
              Last Name *
            </label>
            <input
              type='text'
              id='lastName'
              name='lastName'
              value={formData.lastName}
              onChange={handleInputChange}
              className={`input ${
                hasFieldError('lastName') ? 'border-red-500' : ''
              }`}
              placeholder='Enter your last name'
              required
              disabled={isLoading}
            />
            {getFieldError('lastName') && (
              <p className='text-red-500 text-sm mt-1'>
                {getFieldError('lastName')}
              </p>
            )}
          </div>
        </div>

        {/* Email Field */}
        <div>
          <label htmlFor='email' className='block font-medium mb-1'>
            Email Address *
          </label>
          <input
            type='email'
            id='email'
            name='email'
            value={formData.email}
            onChange={handleInputChange}
            className={`input ${
              hasFieldError('email') ? 'border-red-500' : ''
            }`}
            placeholder='Enter your email address'
            required
            disabled={isLoading}
          />
          {getFieldError('email') && (
            <p className='text-red-500 text-sm mt-1'>
              {getFieldError('email')}
            </p>
          )}
        </div>

        {/* Role Selection */}
        <div>
          <label htmlFor='role' className='block font-medium mb-1'>
            Account Type
          </label>
          <select
            id='role'
            name='role'
            value={formData.role}
            onChange={handleInputChange}
            className='input'
            disabled={isLoading}>
            <option value='user'>User - Send and receive transactions</option>
            <option value='miner'>Miner - Mine blocks and earn rewards</option>
          </select>
          <small style={{ color: 'var(--sandicoin-secondary)' }}>
            You can mine blocks regardless of your role selection
          </small>
        </div>

        {/* Password Fields */}
        <div>
          <label htmlFor='password' className='block font-medium mb-1'>
            Password *
          </label>
          <input
            type='password'
            id='password'
            name='password'
            value={formData.password}
            onChange={handleInputChange}
            className={`input ${
              hasFieldError('password') ? 'border-red-500' : ''
            }`}
            placeholder='Create a strong password'
            required
            disabled={isLoading}
          />
          {getFieldError('password') && (
            <p className='text-red-500 text-sm mt-1'>
              {getFieldError('password')}
            </p>
          )}
          <small style={{ color: 'var(--sandicoin-secondary)' }}>
            Must be 8+ characters with uppercase, lowercase, and number
          </small>
        </div>

        <div>
          <label htmlFor='confirmPassword' className='block font-medium mb-1'>
            Confirm Password *
          </label>
          <input
            type='password'
            id='confirmPassword'
            name='confirmPassword'
            value={formData.confirmPassword}
            onChange={handleInputChange}
            className={`input ${
              hasFieldError('confirmPassword') ? 'border-red-500' : ''
            }`}
            placeholder='Confirm your password'
            required
            disabled={isLoading}
          />
          {getFieldError('confirmPassword') && (
            <p className='text-red-500 text-sm mt-1'>
              {getFieldError('confirmPassword')}
            </p>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className='bg-red-100 border border-red-300 rounded p-3 text-red-700'>
            ⚠️ {error}
          </div>
        )}

        {/* Submit Button */}
        <button
          type='submit'
          disabled={isLoading}
          className='btn btn-primary w-full'
          style={{
            opacity: isLoading ? 0.6 : 1,
            cursor: isLoading ? 'not-allowed' : 'pointer',
          }}>
          {isLoading ? (
            <span className='flex items-center justify-center gap-2'>
              🔄 Creating Account...
            </span>
          ) : (
            <span className='flex items-center justify-center gap-2'>
              🚀 Create Account & Start Mining
            </span>
          )}
        </button>

        {/* Switch to Login */}
        <div className='text-center'>
          <p style={{ color: 'var(--sandicoin-secondary)' }}>
            Already have an account?{' '}
            <button
              type='button'
              onClick={onSwitchToLogin}
              className='text-blue-600 hover:text-blue-800 underline'
              disabled={isLoading}>
              Sign in here
            </button>
          </p>
        </div>
      </form>

      {/* Information Section */}
      <div className='mt-6 p-4 bg-blue-50 rounded'>
        <h3 className='font-bold text-sm mb-2'>🔒 Your Account Includes:</h3>
        <ul
          className='text-sm space-y-1'
          style={{ color: 'var(--sandicoin-secondary)' }}>
          <li>
            • <strong>1,000 SandiCoins</strong> starting balance
          </li>
          <li>
            • <strong>Secure wallet</strong> with unique address
          </li>
          <li>
            • <strong>Transaction history</strong> tracking
          </li>
          <li>
            • <strong>Mining capabilities</strong> to earn rewards
          </li>
          <li>
            • <strong>P2P network</strong> participation
          </li>
        </ul>
      </div>
    </div>
  );
};

export default RegisterForm;
