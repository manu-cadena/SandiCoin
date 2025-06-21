import { Request, Response, NextFunction } from 'express';
import { verifyToken, extractTokenFromHeader } from '../utils/jwt';
import { User } from '../models/User'; // Direct import instead of AuthService
import { logger } from '../utils/logger';

/**
 * Authentication Middleware for SandiCoin - FIXED VERSION
 * Protects routes and adds user info to request
 */

// Extend Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

/**
 * Authenticate user token and add user to request
 */
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Extract token from Authorization header
    const token = extractTokenFromHeader(req.headers.authorization);

    if (!token) {
      logger.warn('No token provided in request');
      res.status(401).json({
        success: false,
        message: 'Access token required',
      });
      return;
    }

    logger.info(`Token received: ${token.substring(0, 20)}...`);

    // Verify token
    const decoded = verifyToken(token);
    logger.info('Token decoded successfully:', {
      userId: decoded.userId,
      email: decoded.email,
    });

    // Get user directly from database (bypassing AuthService for debugging)
    const user = await User.findById(decoded.userId);

    if (!user) {
      logger.warn(`User not found for ID: ${decoded.userId}`);
      res.status(401).json({
        success: false,
        message: 'User not found',
      });
      return;
    }

    if (!user.isActive) {
      logger.warn(`User account deactivated: ${user.email}`);
      res.status(401).json({
        success: false,
        message: 'Account is deactivated',
      });
      return;
    }

    logger.info(`Authentication successful for user: ${user.email}`);

    // Add user to request object
    req.user = user;
    next();
  } catch (error) {
    logger.error('Authentication failed:', error);

    // More detailed error messages for debugging
    let message = 'Invalid or expired token';
    if (error instanceof Error) {
      if (error.message.includes('jwt expired')) {
        message = 'Token has expired';
      } else if (error.message.includes('invalid signature')) {
        message = 'Invalid token signature';
      } else if (error.message.includes('jwt malformed')) {
        message = 'Malformed token';
      }
    }

    res.status(401).json({
      success: false,
      message,
      debug:
        process.env.NODE_ENV === 'development' && error instanceof Error
          ? error.message
          : undefined,
    });
  }
};

/**
 * Authorize user roles
 */
export const authorize = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    if (!roles.includes(req.user.role)) {
      logger.warn(
        `Access denied for user ${req.user.email}. Required roles: ${roles.join(
          ', '
        )}, User role: ${req.user.role}`
      );
      res.status(403).json({
        success: false,
        message: `Access denied. Required roles: ${roles.join(', ')}`,
      });
      return;
    }

    logger.info(
      `Authorization successful for user ${req.user.email} with role ${req.user.role}`
    );
    next();
  };
};

/**
 * Optional authentication - adds user if token provided
 */
export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = extractTokenFromHeader(req.headers.authorization);

    if (token) {
      const decoded = verifyToken(token);
      const user = await User.findById(decoded.userId);

      if (user && user.isActive) {
        req.user = user;
      }
    }

    next();
  } catch (error) {
    // Silent fail for optional auth
    next();
  }
};
