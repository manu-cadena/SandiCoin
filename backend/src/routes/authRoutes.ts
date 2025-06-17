import { Router } from 'express';
import {
  register,
  login,
  logout,
  refreshToken,
  getProfile,
} from '../controllers/authController';
import { authenticate, authorize } from '../middleware/authMiddleware';

/**
 * Authentication routes for SandiCoin
 */

const router = Router();

// Public routes
router.post('/register', register);
router.post('/login', login);
router.post('/refresh-token', refreshToken);
router.post('/logout', logout);

// Protected routes
router.get('/profile', authenticate, getProfile);

// Admin only routes
router.get('/admin-only', authenticate, authorize('admin'), (req, res) => {
  res.json({
    success: true,
    message: 'Welcome admin!',
    data: {
      user: req.user?.email,
      role: req.user?.role,
    },
  });
});

// Miner only routes
router.get('/miner-only', authenticate, authorize('miner'), (req, res) => {
  res.json({
    success: true,
    message: 'Welcome miner!',
    data: {
      user: req.user?.email,
      role: req.user?.role,
      canMine: true,
    },
  });
});

export default router;
