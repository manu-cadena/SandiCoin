import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';

interface LoginFormProps {
  onSwitchToRegister?: () => void;
}

const LoginForm: React.FC<LoginFormProps> = ({ onSwitchToRegister }) => {
  const { login, isLoading, error, clearError } = useAuth();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const [showPassword, setShowPassword] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (error) {
      clearError();
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!formData.email || !formData.password) {
      return;
    }

    try {
      await login(formData);
      console.log('🎉 Login successful!');
    } catch {
      console.log('❌ Login failed');
    }
  };

  return (
    <div className="card" style={{ maxWidth: '450px', width: '100%' }}>
      <div className="text-center mb-6">
        <h1
          className="text-3xl font-bold"
          style={{ color: 'var(--sandicoin-primary)' }}>
          🪙 SandiCoin
        </h1>
        <p className="text-lg" style={{ color: 'var(--sandicoin-secondary)' }}>
          Sign in to your cryptocurrency wallet
        </p>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start gap-3">
            <span className="text-red-500 text-xl flex-shrink-0">⚠️</span>
            <div>
              <h3 className="text-red-800 font-semibold mb-1">Login Failed</h3>
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block font-medium mb-1">
            Email Address
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleInputChange}
            className="input"
            placeholder="Enter your email address"
            required
            disabled={isLoading}
          />
        </div>

        <div>
          <label htmlFor="password" className="block font-medium mb-1">
            Password
          </label>
          <div style={{ position: 'relative' }}>
            <input
              type={showPassword ? 'text' : 'password'}
              id="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              className="input"
              placeholder="Enter your password"
              required
              disabled={isLoading}
            />
            <button
              type="button"
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
              disabled={isLoading}
              title={showPassword ? 'Hide password' : 'Show password'}>
              {showPassword ? '👁️' : '🔒'}
            </button>
          </div>
        </div>

        <button
          type="submit"
          className="btn btn-primary w-full"
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
            <span className="flex items-center justify-center gap-2">
              🔄 Signing In...
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              🔐 Sign In to Wallet
            </span>
          )}
        </button>
      </form>

      <div className="text-center mt-6">
        <p style={{ color: 'var(--sandicoin-secondary)' }}>
          New to SandiCoin?{' '}
          <button
            type="button"
            onClick={onSwitchToRegister}
            className="text-blue-600 hover:text-blue-800 underline font-medium"
            disabled={isLoading}>
            Create your free account
          </button>
        </p>
      </div>

      <div className="text-center mt-4 p-3 bg-gray-50 rounded">
        <small style={{ color: 'var(--sandicoin-secondary)' }}>
          🔒 Your wallet is secured with industry-standard encryption
        </small>
      </div>
    </div>
  );
};

export default LoginForm;