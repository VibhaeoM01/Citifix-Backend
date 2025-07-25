const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const Admin = require('../models/Admin');
const { sendOTPEmail } = require('../utils/email');
const router = express.Router();

// const express = require('express');
// const jwt = require('jsonwebtoken');
// const { body, validationResult } = requ  ire('express-validator');
// const User = require('../models/User');
// const { sendOTPEmail } = require('../utils/email');

const authController = require('../controller/auth.controller');

// Admin registration
router.post(
  '/admin-register',
  [
    body('name').trim().isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters'),
    body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
    body('phone').notEmpty().withMessage('Phone is required'),
    body('department').isString().notEmpty().withMessage('Department is required'),
    body('secret').isString().notEmpty().withMessage('Secret is required')
  ],
  authController.registerAdmin
);

// Admin login
router.post(
  '/admin-login',
  [
    body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
    body('password').notEmpty().withMessage('Password is required')
  ],
  authController.loginAdmin
);


// const router = express.Router();

// Check admin/staff secret number and user existence
router.post('/check-secret', async (req, res) => {
  const { secret } = req.body;
  const ADMIN_SECRET = process.env.ADMIN_SECRET || '123456';
  if (!secret || secret !== ADMIN_SECRET) {
    return res.status(403).json({ valid: false, message: 'Invalid secret number' });
  }
  // Check if user exists for this secret (for demo, always new user)
  // In real app, you might check for a user with a special flag or email
  // Here, just return isNewUser: true
  return res.json({ valid: true, isNewUser: true });
});

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET || 'your-secret-key',
    { expiresIn: '7d' }
  );
};

const userController = require('../controller/user.controller');

// Register user
router.post(
  '/signup',
  [
    body('name').trim().isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters'),
    body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
    body('secret').optional().isString(),
    body('department').optional().isString()
  ],
  userController.signup
);

// Login user
router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
    body('password').notEmpty().withMessage('Password is required')
  ],
  userController.login
);

// Request OTP for login
router.post(
  '/request-otp',
  [body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email')],
  userController.requestOtp
);

// Login with OTP
router.post(
  '/login-otp',
  [
    body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
    body('otp').isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits')
  ],
  userController.loginOtp
);

// Request OTP for signup
router.post(
  '/request-signup-otp',
  [
    body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
    body('name').trim().isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters')
  ],
  userController.requestSignupOtp
);

// Signup with OTP
router.post(
  '/signup-otp',
  [
    body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
    body('name').trim().isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters'),
    body('otp').isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits')
  ],
  userController.signupOtp
);

// Get current user
router.get('/me', userController.getMe);

module.exports = router; 