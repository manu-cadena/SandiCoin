import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from 'react';
import apiService, {
  type LoginRequest,
  type RegisterRequest,
} from '../services/api';
import { 
  handleApiError, 
  isAuthError, 
  isNetworkError, 
  isValidationError, 
  getErrorMessage 
} from '../types/errors';

// Custom error type for API errors
interface ApiError {
  response?: {
    data?: {
      message?: string;
    };
  };
  message?: string;
}

// Types for authentication context
export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  walletPublicKey: string;
  createdAt: string;
}

export interface Wallet {
  publicKey: string;
  balance: number;
}

export interface AuthContextType {
  // State
  user: User | null;
  wallet: Wallet | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  login: (credentials: LoginRequest) => Promise<void>;
  register: (userData: RegisterRequest) => Promise<void>;
  logout: () => void;
  clearError: () => void;
  refreshUserData: () => Promise<void>;
}

// Create the context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider component props
interface AuthProviderProps {
  children: ReactNode;
}

// Authentication Provider Component
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  // State for authentication
  const [user, setUser] = useState<User | null>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Computed state
  const isAuthenticated = !!user && !!apiService.getAuthToken();

  // ===== AUTHENTICATION ACTIONS =====

  const login = async (credentials: LoginRequest): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);

      console.log('🔐 Attempting login for:', credentials.email);

      const response = await apiService.login(credentials);

      if (response.success && response.data) {
        const { user: userData, accessToken } = response.data;

        // Store token
        apiService.setAuthToken(accessToken);

        // Update user state
        setUser(userData);

        console.log('✅ Login successful for:', userData.email);

        // Fetch wallet balance separately since it's not in login response
        try {
          const balanceResponse = await apiService.getWalletBalance();
          if (balanceResponse.success) {
            setWallet({
              publicKey:
                balanceResponse.data.address || userData.walletPublicKey,
              balance: balanceResponse.data.balance,
            });
            console.log(
              '💰 Wallet balance loaded:',
              balanceResponse.data.balance
            );
          }
        } catch (balanceError) {
          console.warn('⚠️ Could not load wallet balance:', balanceError);
          // Set default wallet data
          setWallet({
            publicKey: userData.walletPublicKey,
            balance: 0,
          });
        }
      } else {
        throw new Error(response.message || 'Login failed');
      }
    } catch (err: unknown) {
      console.error('❌ Login error:', err);
      
      // Use our enhanced error handling
      const processedError = handleApiError(err);
      let userFriendlyMessage: string;

      if (isAuthError(processedError)) {
        // Handle authentication-specific errors
        if (processedError.message.toLowerCase().includes('invalid') || 
            processedError.message.toLowerCase().includes('incorrect')) {
          userFriendlyMessage = 'Invalid email or password. Please check your credentials and try again.';
        } else {
          userFriendlyMessage = 'Authentication failed. Please check your email and password.';
        }
      } else if (isNetworkError(processedError)) {
        userFriendlyMessage = 'Unable to connect to the server. Please check your internet connection and try again.';
      } else if (isValidationError(processedError)) {
        userFriendlyMessage = processedError.message;
      } else {
        // For any other 401 status or generic errors
        if (processedError.message.includes('401') || processedError.message.includes('Unauthorized')) {
          userFriendlyMessage = 'Invalid email or password. Please check your credentials and try again.';
        } else {
          userFriendlyMessage = processedError.message || 'Login failed. Please try again.';
        }
      }

      setError(userFriendlyMessage);
      throw new Error(userFriendlyMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (userData: RegisterRequest): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);

      console.log('📝 Attempting registration for:', userData.email);

      const response = await apiService.register(userData);

      if (response.success && response.data) {
        const { user: newUser, wallet: newWallet, accessToken } = response.data;

        // Store token and user data
        apiService.setAuthToken(accessToken);

        // Update state
        setUser(newUser);
        setWallet(newWallet);

        console.log('✅ Registration successful for:', newUser.email);
        console.log('🎉 New wallet created with balance:', newWallet.balance);
      } else {
        throw new Error(response.message || 'Registration failed');
      }
    } catch (err: unknown) {
      console.error('❌ Registration error:', err);
      
      // Use our enhanced error handling
      const processedError = handleApiError(err);
      let userFriendlyMessage: string;

      if (isValidationError(processedError)) {
        // Handle validation errors (duplicate email, weak password, etc.)
        if (processedError.message.toLowerCase().includes('email') && 
            processedError.message.toLowerCase().includes('exists')) {
          userFriendlyMessage = 'An account with this email already exists. Please use a different email or try logging in.';
        } else if (processedError.message.toLowerCase().includes('password')) {
          userFriendlyMessage = 'Password does not meet requirements. Please ensure it is at least 8 characters long.';
        } else {
          userFriendlyMessage = processedError.message;
        }
      } else if (isNetworkError(processedError)) {
        userFriendlyMessage = 'Unable to connect to the server. Please check your internet connection and try again.';
      } else {
        // Handle other errors
        if (processedError.message.toLowerCase().includes('duplicate') || 
            processedError.message.toLowerCase().includes('already exists')) {
          userFriendlyMessage = 'An account with this email already exists. Please use a different email or try logging in.';
        } else {
          userFriendlyMessage = processedError.message || 'Registration failed. Please try again.';
        }
      }

      setError(userFriendlyMessage);
      throw new Error(userFriendlyMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = (): void => {
    console.log('👋 Logging out user');

    // Clear all auth data
    apiService.removeAuthToken();
    setUser(null);
    setWallet(null);
    setError(null);

    console.log('✅ Logout complete');
  };

  const refreshUserData = async (): Promise<void> => {
    try {
      if (!isAuthenticated) return;

      console.log('🔄 Refreshing wallet balance...');

      // Refresh wallet balance
      const balanceResponse = await apiService.getWalletBalance();
      if (balanceResponse.success) {
        setWallet((prev) =>
          prev
            ? {
                ...prev,
                balance: balanceResponse.data.balance,
                publicKey: balanceResponse.data.address || prev.publicKey,
              }
            : null
        );
        console.log('💰 Balance updated:', balanceResponse.data.balance);
      }
    } catch (err) {
      console.error('Failed to refresh user data:', err);
    }
  };

  const clearError = (): void => {
    setError(null);
  };

  // ===== INITIALIZATION EFFECT =====

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        setIsLoading(true);

        // Check if user has valid token
        const token = apiService.getAuthToken();
        const storedUserData = localStorage.getItem('sandicoin_user');

        if (token && storedUserData) {
          console.log('🔄 Found stored auth data, verifying...');

          try {
            // Parse stored user data first
            const userData = JSON.parse(storedUserData);

            // Try to fetch wallet balance to verify token is still valid
            const balanceResponse = await apiService.getWalletBalance();

            if (balanceResponse.success) {
              // Token is valid, restore full auth state
              setUser(userData);
              setWallet({
                publicKey:
                  balanceResponse.data.address || userData.walletPublicKey,
                balance: balanceResponse.data.balance,
              });
              console.log('✅ Auth state restored successfully');
              console.log('💰 Current balance:', balanceResponse.data.balance);
            } else {
              // Token invalid, clear auth data
              console.log('❌ Token validation failed, clearing auth data');
              logout();
            }
          } catch (err: any) {
            // If it's a network error, keep user logged in but show 0 balance
            if (
              err.code === 'NETWORK_ERROR' ||
              err.message?.includes('Network Error')
            ) {
              console.log(
                '⚠️ Network error during auth check, keeping user logged in'
              );
              const userData = JSON.parse(storedUserData);
              setUser(userData);
              setWallet({
                publicKey: userData.walletPublicKey,
                balance: 0,
              });
            } else {
              // Authentication failed, clear everything
              console.log('❌ Auth validation failed, clearing auth data');
              logout();
            }
          }
        } else {
          console.log('ℹ️ No stored auth data found');
        }
      } catch (err) {
        console.error('❌ Auth initialization error:', err);
        // Don't logout on initialization errors - might be network issues
        console.log('⚠️ Keeping user logged in despite initialization error');
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  // Store user data when user changes
  useEffect(() => {
    if (user) {
      localStorage.setItem('sandicoin_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('sandicoin_user');
    }
  }, [user]);

  // ===== CONTEXT VALUE =====

  const contextValue: AuthContextType = {
    // State
    user,
    wallet,
    isAuthenticated,
    isLoading,
    error,

    // Actions
    login,
    register,
    logout,
    clearError,
    refreshUserData,
  };

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
};

// ===== CUSTOM HOOK =====

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default useAuth;
