import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import AuthService from '../services/authService';
import { logger } from '../utils/logger';

/**
 * Authentication Controller for SandiCoin
 * Handles HTTP requests and responses for authentication
 */

/**
 * Register a new user
 */
export const register = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Check express-validator results
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
      return;
    }

    // Additional custom validation from AuthService
    const validationErrors = AuthService.validateRegistrationData(req.body);
    if (validationErrors.length > 0) {
      res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validationErrors,
      });
      return;
    }

    // Register user
    const result = await AuthService.registerUser(req.body);

    // Set secure HTTP-only cookie for refresh token
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    });

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: result.user,
        accessToken: result.accessToken,
        expiresAt: result.expiresAt,
        wallet: result.wallet,
      },
    });
  } catch (error) {
    if ((error as Error).message === 'User with this email already exists') {
      res.status(409).json({
        success: false,
        message: (error as Error).message,
      });
      return;
    }

    logger.error('Registration failed:', error);
    next(error);
  }
};

/**
 * Login user
 */
export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Check express-validator results
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
      return;
    }

    // Additional custom validation from AuthService
    const validationErrors = AuthService.validateLoginData(req.body);
    if (validationErrors.length > 0) {
      res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validationErrors,
      });
      return;
    }

    // Login user
    const result = await AuthService.loginUser(req.body);

    // Set secure HTTP-only cookie for refresh token
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    });

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: result.user,
        accessToken: result.accessToken,
        expiresAt: result.expiresAt,
      },
    });
  } catch (error) {
    const errorMessage = (error as Error).message;

    if (
      errorMessage.includes('Invalid email or password') ||
      errorMessage.includes('Account is deactivated')
    ) {
      res.status(401).json({
        success: false,
        message: errorMessage,
      });
      return;
    }

    logger.error('Login failed:', error);
    next(error);
  }
};

/**
 * Refresh access token
 */
export const refreshToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const refreshToken = req.cookies?.refreshToken;

    if (!refreshToken) {
      res.status(401).json({
        success: false,
        message: 'Refresh token not provided',
      });
      return;
    }

    // Refresh token
    const result = await AuthService.refreshUserToken(refreshToken);

    // Update refresh token cookie
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    });

    res.status(200).json({
      success: true,
      message: 'Token refreshed successfully',
      data: {
        accessToken: result.accessToken,
        expiresAt: result.expiresAt,
      },
    });
  } catch (error) {
    logger.error('Token refresh failed:', error);
    res.status(401).json({
      success: false,
      message: 'Invalid or expired refresh token',
    });
  }
};

/**
 * Logout user
 */
export const logout = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Clear refresh token cookie
    res.clearCookie('refreshToken');

    res.status(200).json({
      success: true,
      message: 'Logout successful',
    });
  } catch (error) {
    logger.error('Logout failed:', error);
    next(error);
  }
};

/**
 * Get current user profile
 */
export const getProfile = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // User is attached to request by auth middleware
    const user = (req as any).user;

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.role,
          walletPublicKey: user.walletPublicKey,
          isActive: user.isActive,
          lastLogin: user.lastLogin,
          createdAt: user.createdAt,
        },
      },
    });
  } catch (error) {
    logger.error('Get profile failed:', error);
    next(error);
  }
};
