import { Router } from 'express';
import { body } from 'express-validator';
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

// Validation rules for registration
const registerValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long'),
  body('firstName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters'),
  body('lastName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters'),
];

// Validation rules for login
const loginValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
];

// Public routes
router.post('/register', registerValidation, register);
router.post('/login', loginValidation, login);
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
