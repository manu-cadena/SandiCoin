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
        const {
          user: userData,
          wallet: walletData,
          accessToken,
        } = response.data;

        // Store token and user data
        apiService.setAuthToken(accessToken);

        // Update state
        setUser(userData);
        setWallet(walletData);

        console.log('✅ Login successful for:', userData.email);
        console.log('💰 Wallet balance:', walletData.balance);
      } else {
        throw new Error(response.message || 'Login failed');
      }
    } catch (err: unknown) {
      console.error('❌ Login error:', err);
      const errorMessage =
        err instanceof Error
          ? err.message
          : typeof err === 'object' && err !== null && 'response' in err
          ? (err as ApiError).response?.data?.message || 'Login failed'
          : 'Login failed';
      setError(errorMessage);
      throw new Error(errorMessage);
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
      const errorMessage =
        err instanceof Error
          ? err.message
          : typeof err === 'object' && err !== null && 'response' in err
          ? (err as ApiError).response?.data?.message || 'Registration failed'
          : 'Registration failed';
      setError(errorMessage);
      throw new Error(errorMessage);
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

      // Refresh wallet balance
      const balanceResponse = await apiService.getWalletBalance();
      if (balanceResponse.success && wallet) {
        setWallet((prev) =>
          prev ? { ...prev, balance: balanceResponse.data.balance } : null
        );
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

        if (token) {
          console.log('🔄 Found stored token, verifying...');

          try {
            // Try to fetch wallet balance to verify token is still valid
            const balanceResponse = await apiService.getWalletBalance();

            if (balanceResponse.success) {
              // Token is valid, try to restore user from stored data
              const storedUserData = localStorage.getItem('sandicoin_user');

              if (storedUserData) {
                const userData = JSON.parse(storedUserData);
                setUser(userData);
                setWallet({
                  publicKey: userData.walletPublicKey,
                  balance: balanceResponse.data.balance,
                });
                console.log('✅ Auth state restored successfully');
              }
            }
          } catch {
            console.log('❌ Token validation failed, clearing auth data');
            logout();
          }
        } else {
          console.log('ℹ️ No stored token found');
        }
      } catch (err) {
        console.error('❌ Auth initialization error:', err);
        logout();
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
