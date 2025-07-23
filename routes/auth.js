const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { sendOTPEmail } = require('../utils/email');
const router = express.Router();

// const express = require('express');
// const jwt = require('jsonwebtoken');
// const { body, validationResult } = requ  ire('express-validator');
// const User = require('../models/User');
// const { sendOTPEmail } = require('../utils/email');
// Admin/staff login (separate route)
router.post('/admin-login', [
  body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
  body('password').notEmpty().withMessage('Password is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation error', errors: errors.array() });
    }

    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Only allow admin/staff
    if (!(user.role === 'admin' || user.role === 'staff')) {
      return res.status(403).json({ message: 'Not an admin/staff account' });
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate token
    const token = generateToken(user._id);

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        isVerified: user.isVerified
      }
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ message: 'Admin login failed' });
  }
});


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

// Register user
router.post('/signup', [
  body('name').trim().isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
  body('secret').optional().isString(),
  body('department').optional().isString()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation error', errors: errors.array() });
    }

    const { name, email, password, secret, department, phone } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    // Secret for admin/staff registration
    const ADMIN_SECRET = process.env.ADMIN_SECRET || '123456';
    let role = 'user';
    let dept = null;
    if (secret && secret === ADMIN_SECRET) {
      // If department is provided, register as staff, else as admin
      if (department) {
        role = 'staff';
        dept = department;
      } else {
        role = 'admin';
        dept = null;
      }
    }

    // Create new user

    const user = new User({
      name,
      email,
      password,
      role,
      department: dept,
      phone: phone || null
    });

    await user.save();

    // Generate token
    const token = generateToken(user._id);

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        isVerified: user.isVerified
      }
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ message: 'Registration failed' });
  }
});

// Login user
router.post('/login', [
  body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
  body('password').notEmpty().withMessage('Password is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation error', errors: errors.array() });
    }

    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate token
    const token = generateToken(user._id);

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Login failed' });
  }
});

// Request OTP for login
router.post('/request-otp', [
  body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation error', errors: errors.array() });
    }

    const { email } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Generate OTP
    const otp = user.generateOTP();
    await user.save();

    // Send OTP email
    try {
      await sendOTPEmail(user.email, otp, 'Login OTP');
      res.json({ message: 'OTP sent successfully' });
    } catch (emailError) {
      console.error('Email error:', emailError);
      res.status(500).json({ message: 'Failed to send OTP email' });
    }
  } catch (error) {
    console.error('Request OTP error:', error);
    res.status(500).json({ message: 'Failed to request OTP' });
  }
});

// Login with OTP
router.post('/login-otp', [
  body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
  body('otp').isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation error', errors: errors.array() });
    }

    const { email, otp } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Verify OTP
    const isOTPValid = user.verifyOTP(otp);
    if (!isOTPValid) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    await user.save();

    // Generate token
    const token = generateToken(user._id);

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified
      }
    });
  } catch (error) {
    console.error('Login OTP error:', error);
    res.status(500).json({ message: 'Login failed' });
  }
});

// Request OTP for signup
router.post('/request-signup-otp', [
  body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
  body('name').trim().isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation error', errors: errors.array() });
    }

    const { email, name } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    // Create temporary user for OTP
    const user = new User({
      name,
      email,
      password: 'temporary' // Will be updated during OTP verification
    });

    // Generate OTP
    const otp = user.generateOTP();
    await user.save();

    // Send OTP email
    try {
      await sendOTPEmail(user.email, otp, 'Signup OTP');
      res.json({ message: 'OTP sent successfully' });
    } catch (emailError) {
      console.error('Email error:', emailError);
      res.status(500).json({ message: 'Failed to send OTP email' });
    }
  } catch (error) {
    console.error('Request signup OTP error:', error);
    res.status(500).json({ message: 'Failed to request OTP' });
  }
});

// Signup with OTP
router.post('/signup-otp', [
  body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
  body('name').trim().isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters'),
  body('otp').isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation error', errors: errors.array() });
    }

    const { email, name, otp } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Verify OTP
    const isOTPValid = user.verifyOTP(otp);
    if (!isOTPValid) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    // Update user details
    user.name = name;
    user.password = 'temporary'; // User will need to set password later
    await user.save();

    // Generate token
    const token = generateToken(user._id);

    res.json({
      message: 'Account created successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified
      }
    });
  } catch (error) {
    console.error('Signup OTP error:', error);
    res.status(500).json({ message: 'Signup failed' });
  }
});

// Get current user
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ message: 'Access token required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    const user = await User.findById(decoded.userId).select('-password');

    if (!user) {
      return res.status(401).json({ message: 'Invalid token' });
    }

    res.json({ user });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(401).json({ message: 'Invalid token' });
  }
});

module.exports = router; 