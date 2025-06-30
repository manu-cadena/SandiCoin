import axios, { AxiosError } from 'axios';
import type {
  AxiosInstance,
  InternalAxiosRequestConfig,
  AxiosResponse,
} from 'axios';
import { handleApiError } from '../types/errors';

// Types for API responses
export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: 'user' | 'miner';
}

export interface AuthResponse {
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
    walletPublicKey: string;
    createdAt: string;
  };
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  wallet: {
    publicKey: string;
    balance: number;
  };
}

export interface TransactionRequest {
  recipient: string;
  amount: number;
}

export interface Transaction {
  id: string;
  sender: string;
  recipient: string;
  amount: number;
  timestamp: string;
  signature: string;
  status: 'pending' | 'confirmed';
}

export interface Block {
  index: number;
  timestamp: string;
  data: Transaction[];
  previousHash: string;
  hash: string;
  nonce: number;
  difficulty: number;
}

export interface BlockchainStats {
  totalBlocks: number;
  totalTransactions: number;
  difficulty: number;
  pendingTransactions: number;
}

export interface MiningStats {
  isCurrentlyMining: boolean;
  lastMinedBlock?: Block;
  totalBlocksMined: number;
  averageMiningTime: number;
}

export interface NetworkStats {
  connectedPeers: number;
  totalTransactions: number;
  networkHashRate: number;
  blockchainHeight: number;
}

class ApiService {
  private api: AxiosInstance;
  private baseURL: string;
  private maxRetries: number = 3;
  private retryDelay: number = 1000; // 1 second
  private availableNodes: string[] = [
    'http://localhost:3000/api',
    'http://localhost:3001/api', 
    'http://localhost:3002/api',
    'http://localhost:3003/api'
  ];
  private currentNodeIndex: number = 0;

  constructor() {
    // Your SandiCoin backend URL - configurable for different environments
    // Support multiple nodes for failover resilience
    this.baseURL = import.meta.env.VITE_API_URL || this.getAvailableNodeUrl();

    this.api = axios.create({
      baseURL: this.baseURL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor to include auth token
    this.api.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        const token = this.getStorageItem('sandicoin_token');
        if (token) {
          config.headers = config.headers || {};
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error: AxiosError) => {
        return Promise.reject(error);
      }
    );

    // Add response interceptor for error handling
    this.api.interceptors.response.use(
      (response: AxiosResponse) => {
        return response;
      },
      (error: AxiosError) => {
        // Handle common errors
        if (error.response?.status === 401) {
          // Token expired or invalid
          this.removeStorageItem('sandicoin_token');
          this.removeStorageItem('sandicoin_user');
          // Don't redirect automatically - let components handle it
          console.log('🔐 Token expired, please login again');
        }
        return Promise.reject(error);
      }
    );
  }

  // ===== NODE FAILOVER LOGIC =====

  /**
   * Get the next available node URL for failover
   */
  private getAvailableNodeUrl(): string {
    return this.availableNodes[this.currentNodeIndex];
  }

  /**
   * Switch to the next available node
   */
  private switchToNextNode(): void {
    this.currentNodeIndex = (this.currentNodeIndex + 1) % this.availableNodes.length;
    const newBaseURL = this.availableNodes[this.currentNodeIndex];
    
    console.log(`🔄 Switching to node: ${newBaseURL}`);
    
    // Update the axios instance with new base URL
    this.api.defaults.baseURL = newBaseURL;
    this.baseURL = newBaseURL;
  }

  /**
   * Check if error indicates node is down and we should failover
   */
  private shouldFailover(error: unknown): boolean {
    if (error instanceof Error) {
      const axiosError = error as AxiosError;
      // Failover on connection refused, timeout, or network errors
      return axiosError.code === 'ECONNREFUSED' || 
             axiosError.code === 'ETIMEDOUT' ||
             axiosError.code === 'ERR_NETWORK' ||
             axiosError.code === 'ERR_CONNECTION_REFUSED' ||
             axiosError.message.includes('CONNECTION_REFUSED') ||
             axiosError.message.includes('Network Error');
    }
    return false;
  }

  // ===== RETRY LOGIC =====

  private async retryRequest<T>(
    requestFn: () => Promise<T>,
    retries: number = this.maxRetries
  ): Promise<T> {
    try {
      return await requestFn();
    } catch (error) {
      // Don't retry authentication errors or client errors (4xx)
      if (error instanceof Error) {
        const axiosError = error as AxiosError;
        if (axiosError.response?.status && axiosError.response.status >= 400 && axiosError.response.status < 500) {
          throw handleApiError(error);
        }
      }

      // Check if we should failover to next node
      if (this.shouldFailover(error) && retries === this.maxRetries) {
        console.log(`🔄 Node appears to be down, attempting failover...`);
        this.switchToNextNode();
        // Try with the new node immediately
        try {
          return await requestFn();
        } catch (failoverError) {
          console.log(`❌ Failover attempt failed, continuing with retry logic`);
        }
      }

      if (retries > 0) {
        console.log(`Request failed, retrying in ${this.retryDelay}ms... (${retries} retries left)`);
        await new Promise(resolve => setTimeout(resolve, this.retryDelay));
        return this.retryRequest(requestFn, retries - 1);
      }

      throw handleApiError(error);
    }
  }

  // ===== AUTHENTICATION METHODS =====

  async register(
    userData: RegisterRequest
  ): Promise<ApiResponse<AuthResponse>> {
    const response = await this.api.post('/auth/register', userData);
    return response.data;
  }

  async login(credentials: LoginRequest): Promise<ApiResponse<AuthResponse>> {
    const response = await this.api.post('/auth/login', credentials);
    return response.data;
  }

  async logout(): Promise<ApiResponse> {
    const response = await this.api.post('/auth/logout');
    return response.data;
  }

  // ===== TRANSACTION METHODS =====

  async createTransaction(
    transactionData: TransactionRequest
  ): Promise<ApiResponse<Transaction>> {
    const response = await this.api.post('/transactions', transactionData);
    return response.data;
  }

  async getUserTransactions(): Promise<ApiResponse<Transaction[]>> {
    const response = await this.api.get('/transactions');
    return response.data;
  }

  async getWalletBalance(): Promise<ApiResponse<{ balance: number; address?: string }>> {
    return this.retryRequest(async () => {
      const response = await this.api.get('/transactions/wallet/balance');
      return response.data;
    });
  }

  async getPendingTransactions(): Promise<ApiResponse<Transaction[]>> {
    const response = await this.api.get('/transactions/pool/pending');
    return response.data;
  }

  // ===== BLOCKCHAIN METHODS =====

  async getBlockchain(): Promise<ApiResponse<Block[]>> {
    return this.retryRequest(async () => {
      const response = await this.api.get('/blockchain');
      return response.data;
    });
  }

  async getBlockchainStats(): Promise<ApiResponse<BlockchainStats>> {
    return this.retryRequest(async () => {
      const response = await this.api.get('/blockchain/stats');
      return response.data;
    });
  }

  // ===== MINING METHODS =====

  async mineTransactions(): Promise<ApiResponse<Block>> {
    const response = await this.api.post('/mining/mine');
    return response.data;
  }

  async getMiningStats(): Promise<ApiResponse<MiningStats>> {
    const response = await this.api.get('/mining/stats');
    return response.data;
  }

  // ===== NETWORK METHODS =====

  async getNetworkStats(): Promise<ApiResponse<NetworkStats>> {
    const response = await this.api.get('/network/stats');
    return response.data;
  }

  // ===== UTILITY METHODS =====

  private getStorageItem(key: string): string | null {
    if (typeof window !== 'undefined') {
      try {
        return localStorage.getItem(key);
      } catch (error) {
        console.warn('LocalStorage access failed:', error);
        return null;
      }
    }
    return null;
  }

  private setStorageItem(key: string, value: string): void {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(key, value);
      } catch (error) {
        console.warn('LocalStorage write failed:', error);
      }
    }
  }

  private removeStorageItem(key: string): void {
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(key);
      } catch (error) {
        console.warn('LocalStorage remove failed:', error);
      }
    }
  }

  setAuthToken(token: string): void {
    this.setStorageItem('sandicoin_token', token);
  }

  removeAuthToken(): void {
    this.removeStorageItem('sandicoin_token');
    this.removeStorageItem('sandicoin_user');
  }

  getAuthToken(): string | null {
    return this.getStorageItem('sandicoin_token');
  }

  isAuthenticated(): boolean {
    const token = this.getAuthToken();
    return !!token;
  }

  // ===== NODE STATUS METHODS =====

  getCurrentNode(): string {
    return this.baseURL;
  }

  getAvailableNodes(): string[] {
    return [...this.availableNodes];
  }

  getCurrentNodeIndex(): number {
    return this.currentNodeIndex;
  }
}

// Export a singleton instance
export const apiService = new ApiService();
export default apiService;
