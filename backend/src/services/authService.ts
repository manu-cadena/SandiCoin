import { User, IUser } from '../models/User';
import { Wallet } from '../models/Wallet';
import { generateTokenPair, verifyToken } from '../utils/jwt';
import { logger } from '../utils/logger';

/**
 * Authentication Service for SandiCoin
 * Contains business logic for user authentication operations
 */

export interface RegisterData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role?: 'user' | 'admin' | 'miner';
}

export interface LoginData {
  email: string;
  password: string;
}

export interface AuthResult {
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
    walletPublicKey?: string;
    lastLogin?: Date;
    createdAt: Date;
  };
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  wallet?: {
    publicKey: string;
    balance: number;
  };
}

export default class AuthService {
  /**
   * Register a new user with automatic wallet creation
   */
  static async registerUser(userData: RegisterData): Promise<AuthResult> {
    const { firstName, lastName, email, password, role } = userData;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Create cryptocurrency wallet for the user
    const wallet = new Wallet();

    // Create new user
    const newUserData: Partial<IUser> = {
      firstName,
      lastName,
      email,
      password,
      role: role || 'user',
      walletPublicKey: wallet.publicKey,
    };

    const newUser = await User.create(newUserData);
    logger.info(`New user registered: ${email}`);

    // Generate tokens
    const { accessToken, refreshToken } = generateTokenPair(newUser);

    return {
      user: {
        id: newUser._id.toString(),
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        email: newUser.email,
        role: newUser.role,
        walletPublicKey: newUser.walletPublicKey,
        createdAt: newUser.createdAt,
      },
      accessToken: accessToken.token,
      refreshToken: refreshToken.token,
      expiresAt: accessToken.expiresAt,
      wallet: {
        publicKey: wallet.publicKey,
        balance: wallet.balance,
      },
    };
  }

  /**
   * Authenticate user login
   */
  static async loginUser(loginData: LoginData): Promise<AuthResult> {
    const { email, password } = loginData;

    // Find user with password field included
    const user = await (User as any).findByEmailWithPassword(email);

    if (!user) {
      throw new Error('Invalid email or password');
    }

    // Check if user account is active
    if (!user.isActive) {
      throw new Error('Account is deactivated. Please contact support.');
    }

    // Compare password
    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      throw new Error('Invalid email or password');
    }

    // Update last login
    await user.updateLastLogin();
    logger.info(`User logged in: ${email}`);

    // Generate tokens
    const { accessToken, refreshToken } = generateTokenPair(user);

    return {
      user: {
        id: user._id.toString(),
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        walletPublicKey: user.walletPublicKey,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt,
      },
      accessToken: accessToken.token,
      refreshToken: refreshToken.token,
      expiresAt: accessToken.expiresAt,
    };
  }

  /**
   * Refresh access token
   */
  static async refreshUserToken(
    refreshToken: string
  ): Promise<{ accessToken: string; refreshToken: string; expiresAt: Date }> {
    // Verify refresh token
    const decoded = verifyToken(refreshToken);

    if (decoded.type !== 'refresh') {
      throw new Error('Invalid refresh token type');
    }

    // Find user
    const user = await User.findById(decoded.userId);

    if (!user || !user.isActive) {
      throw new Error('User not found or account deactivated');
    }

    // Generate new tokens
    const { accessToken, refreshToken: newRefreshToken } =
      generateTokenPair(user);

    return {
      accessToken: accessToken.token,
      refreshToken: newRefreshToken.token,
      expiresAt: accessToken.expiresAt,
    };
  }

  /**
   * Get user by ID
   */
  static async getUserById(userId: string): Promise<IUser | null> {
    return await User.findById(userId);
  }

  /**
   * Validate registration data
   */
  static validateRegistrationData(data: any): string[] {
    const errors: string[] = [];

    if (
      !data.firstName ||
      typeof data.firstName !== 'string' ||
      data.firstName.trim().length === 0
    ) {
      errors.push('First name is required');
    }

    if (
      !data.lastName ||
      typeof data.lastName !== 'string' ||
      data.lastName.trim().length === 0
    ) {
      errors.push('Last name is required');
    }

    if (
      !data.email ||
      typeof data.email !== 'string' ||
      data.email.trim().length === 0
    ) {
      errors.push('Email is required');
    }

    if (
      !data.password ||
      typeof data.password !== 'string' ||
      data.password.length < 8
    ) {
      errors.push('Password must be at least 8 characters long');
    }

    if (data.role && !['user', 'admin', 'miner'].includes(data.role)) {
      errors.push('Role must be user, admin, or miner');
    }

    return errors;
  }

  /**
   * Validate login data
   */
  static validateLoginData(data: any): string[] {
    const errors: string[] = [];

    if (
      !data.email ||
      typeof data.email !== 'string' ||
      data.email.trim().length === 0
    ) {
      errors.push('Email is required');
    }

    if (
      !data.password ||
      typeof data.password !== 'string' ||
      data.password.length === 0
    ) {
      errors.push('Password is required');
    }

    return errors;
  }
}
