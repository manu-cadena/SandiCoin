import jwt, { SignOptions } from 'jsonwebtoken';
import { IUser } from '../models/User';

// Type for JWT expiration values
type ExpiresIn = string | number;

/**
 * JWT utilities for SandiCoin authentication
 * Handles token generation, verification, and payload management
 */

// JWT payload interface
export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  type?: 'access' | 'refresh'; // Add type field
  iat?: number; // Issued at
  exp?: number; // Expires at
}

// Token generation result
export interface TokenResult {
  token: string;
  expiresIn: string;
  expiresAt: Date;
}

// JWT configuration with validation
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '30d';

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

// Validate JWT expiration formats
const validateExpirationFormat = (value: string, name: string): void => {
  const validFormats = /^(\d+(?:\.\d+)?)(ms|s|m|h|d|w|y)$|^\d+$/;
  if (!validFormats.test(value)) {
    throw new Error(
      `${name} must be a valid time format (e.g., '7d', '24h', '60m')`
    );
  }
};

validateExpirationFormat(JWT_EXPIRES_IN, 'JWT_EXPIRES_IN');
validateExpirationFormat(JWT_REFRESH_EXPIRES_IN, 'JWT_REFRESH_EXPIRES_IN');

// Create a guaranteed non-null secret
const VERIFIED_JWT_SECRET: string = JWT_SECRET;

/**
 * Generate JWT access token for a user
 */
export const generateAccessToken = (user: IUser): TokenResult => {
  const payload: JWTPayload = {
    userId: user._id.toString(),
    email: user.email,
    role: user.role,
    type: 'access',
  };

  // @ts-ignore - TypeScript overload issue, works fine at runtime
  const token = jwt.sign(payload, VERIFIED_JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
    issuer: 'sandicoin-api',
    subject: user._id.toString(),
  });

  // Calculate expiration date
  const decoded = jwt.decode(token) as any;
  const expiresAt = new Date(decoded.exp * 1000);

  return {
    token,
    expiresIn: JWT_EXPIRES_IN,
    expiresAt,
  };
};

/**
 * Generate JWT refresh token for a user
 */
export const generateRefreshToken = (user: IUser): TokenResult => {
  const payload = {
    userId: user._id.toString(),
    type: 'refresh',
  };

  // @ts-ignore - TypeScript overload issue, works fine at runtime
  const token = jwt.sign(payload, VERIFIED_JWT_SECRET, {
    expiresIn: JWT_REFRESH_EXPIRES_IN,
    issuer: 'sandicoin-api',
    subject: user._id.toString(),
  });

  const decoded = jwt.decode(token) as any;
  const expiresAt = new Date(decoded.exp * 1000);

  return {
    token,
    expiresIn: JWT_REFRESH_EXPIRES_IN,
    expiresAt,
  };
};

/**
 * Verify and decode JWT token
 */
export const verifyToken = (token: string): JWTPayload => {
  try {
    const options = {
      issuer: 'sandicoin-api',
    };

    const decoded = jwt.verify(
      token,
      VERIFIED_JWT_SECRET,
      options
    ) as JWTPayload;

    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Token has expired');
    } else if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid token');
    } else {
      throw new Error('Token verification failed');
    }
  }
};

/**
 * Extract token from Authorization header
 */
export const extractTokenFromHeader = (authHeader?: string): string | null => {
  if (!authHeader) return null;

  // Expected format: "Bearer <token>"
  const parts = authHeader.split(' ');

  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }

  return parts[1];
};

/**
 * Check if token is expired (without verifying signature)
 */
export const isTokenExpired = (token: string): boolean => {
  try {
    const decoded = jwt.decode(token) as any;

    if (!decoded || !decoded.exp) {
      return true;
    }

    const currentTime = Math.floor(Date.now() / 1000);
    return decoded.exp < currentTime;
  } catch (error) {
    return true;
  }
};

/**
 * Get token expiration time
 */
export const getTokenExpiration = (token: string): Date | null => {
  try {
    const decoded = jwt.decode(token) as any;

    if (!decoded || !decoded.exp) {
      return null;
    }

    return new Date(decoded.exp * 1000);
  } catch (error) {
    return null;
  }
};

/**
 * Generate both access and refresh tokens
 */
export const generateTokenPair = (
  user: IUser
): {
  accessToken: TokenResult;
  refreshToken: TokenResult;
} => {
  return {
    accessToken: generateAccessToken(user),
    refreshToken: generateRefreshToken(user),
  };
};

/**
 * Validate token payload structure
 */
export const isValidTokenPayload = (payload: any): payload is JWTPayload => {
  return (
    payload &&
    typeof payload.userId === 'string' &&
    typeof payload.email === 'string' &&
    typeof payload.role === 'string'
  );
};
