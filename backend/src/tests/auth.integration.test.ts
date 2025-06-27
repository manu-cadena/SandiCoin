import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import { database } from '../config/database';
import authRoutes from '../routes/authRoutes';

// Set test environment variables
process.env.JWT_SECRET =
  'test-jwt-secret-for-testing-at-least-32-characters-long';
process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = 'mongodb://localhost:27017/sandicoin-test';

/**
 * Integration tests for authentication system
 * Tests the complete auth flow: register -> login -> protected routes
 */

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/api/auth', authRoutes);

describe('Authentication Integration Tests', () => {
  let accessToken: string;
  let userEmail: string;

  beforeAll(async () => {
    // Test database connection will use environment variable set above
    await database.connect();
  });

  afterAll(async () => {
    // Cleanup test database
    await database.disconnect();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user', async () => {
      userEmail = `test-${Date.now()}@example.com`;

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          firstName: 'Test',
          lastName: 'User',
          email: userEmail,
          password: 'password123',
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe(userEmail);
      expect(response.body.data.accessToken).toBeDefined();
      expect(response.body.data.wallet).toBeDefined();
      expect(response.body.data.wallet.publicKey).toBeDefined();
      expect(response.body.data.wallet.balance).toBe(1000); // Starting balance

      accessToken = response.body.data.accessToken;
    });

    it('should reject duplicate email registration', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          firstName: 'Test',
          lastName: 'User',
          email: userEmail, // Same email as previous test
          password: 'password123',
        })
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('already exists');
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          firstName: 'Test',
          // Missing required fields
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Validation failed');
      expect(response.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: 'lastName',
            msg: expect.stringContaining('Last name')
          })
        ])
      );
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: userEmail,
          password: 'password123',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe(userEmail);
      expect(response.body.data.accessToken).toBeDefined();
    });

    it('should reject invalid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: userEmail,
          password: 'wrongpassword',
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid email or password');
    });
  });

  describe('GET /api/auth/profile (Protected Route)', () => {
    it('should get user profile with valid token', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe(userEmail);
      expect(response.body.data.user.walletPublicKey).toBeDefined();
    });

    it('should reject request without token', async () => {
      const response = await request(app).get('/api/auth/profile').expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Access token required');
    });

    it('should reject request with invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid or expired token');
    });
  });

  describe('Role-based Authorization', () => {
    it('should allow access to user routes', async () => {
      // User role should be able to access general protected routes
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.data.user.role).toBe('user');
    });

    it('should deny access to admin-only routes for regular users', async () => {
      const response = await request(app)
        .get('/api/auth/admin-only')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Access denied');
    });
  });
});
