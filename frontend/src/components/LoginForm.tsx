import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';

interface LoginFormProps {
  onSwitchToRegister?: () => void;
}

const LoginForm: React.FC<LoginFormProps> = ({ onSwitchToRegister }) => {
  const { login, isLoading, error, clearError } = useAuth();

  // Form state
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const [showPassword, setShowPassword] = useState(false);

  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Clear error when user starts typing
    if (error) {
      clearError();
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Basic validation
    if (!formData.email || !formData.password) {
      return;
    }

    try {
      await login(formData);
      // Login successful - useAuth will handle state updates
      console.log('🎉 Login successful!');
    } catch {
      // Error is already handled by useAuth hook
      console.log('❌ Login failed');
    }
  };

  return (
    <div className='card' style={{ maxWidth: '400px', margin: '0 auto' }}>
      <div className='text-center mb-6'>
        <h1
          className='text-3xl font-bold'
          style={{ color: 'var(--sandicoin-primary)' }}>
          🪙 SandiCoin
        </h1>
        <p className='text-lg' style={{ color: 'var(--sandicoin-secondary)' }}>
          Sign in to your cryptocurrency wallet
        </p>
      </div>

      {error && (
        <div
          className='card mb-4'
          style={{
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            color: 'var(--sandicoin-error)',
          }}>
          <strong>Login Failed:</strong> {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className='flex flex-col gap-4'>
        <div>
          <label
            htmlFor='email'
            className='font-bold mb-2'
            style={{ display: 'block' }}>
            Email Address
          </label>
          <input
            type='email'
            id='email'
            name='email'
            value={formData.email}
            onChange={handleInputChange}
            className='input'
            placeholder='Enter your email'
            required
            disabled={isLoading}
          />
        </div>

        <div>
          <label
            htmlFor='password'
            className='font-bold mb-2'
            style={{ display: 'block' }}>
            Password
          </label>
          <div style={{ position: 'relative' }}>
            <input
              type={showPassword ? 'text' : 'password'}
              id='password'
              name='password'
              value={formData.password}
              onChange={handleInputChange}
              className='input'
              placeholder='Enter your password'
              required
              disabled={isLoading}
            />
            <button
              type='button'
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: 'absolute',
                right: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--sandicoin-secondary)',
              }}
              disabled={isLoading}>
              {showPassword ? '👁️' : '🔒'}
            </button>
          </div>
        </div>

        <button
          type='submit'
          className='btn btn-primary'
          disabled={isLoading || !formData.email || !formData.password}
          style={{
            opacity:
              isLoading || !formData.email || !formData.password ? 0.6 : 1,
            cursor:
              isLoading || !formData.email || !formData.password
                ? 'not-allowed'
                : 'pointer',
          }}>
          {isLoading ? (
            <span className='flex items-center justify-center gap-2'>
              🔄 Signing In...
            </span>
          ) : (
            <span className='flex items-center justify-center gap-2'>
              🔐 Sign In
            </span>
          )}
        </button>
      </form>

      {onSwitchToRegister && (
        <div className='text-center mt-6'>
          <p style={{ color: 'var(--sandicoin-secondary)' }}>
            Don't have an account?{' '}
            <button
              type='button'
              onClick={onSwitchToRegister}
              className='btn-outline'
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--sandicoin-primary)',
                textDecoration: 'underline',
                cursor: 'pointer',
                padding: 0,
                font: 'inherit',
              }}
              disabled={isLoading}>
              Create Account
            </button>
          </p>
        </div>
      )}

      <div className='text-center mt-4'>
        <small style={{ color: 'var(--sandicoin-secondary)' }}>
          🔒 Your wallet is secured with industry-standard encryption
        </small>
      </div>
    </div>
  );
};

export default LoginForm;
