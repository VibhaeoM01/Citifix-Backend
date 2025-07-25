const User = require('../models/User');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const { sendOTPEmail } = require('../utils/email');

const ADMIN_SECRET = process.env.ADMIN_SECRET || '123456';

const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET || 'your-secret-key',
    { expiresIn: '7d' }
  );
};

exports.signup = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation error', errors: errors.array() });
    }
    const { name, email, password, secret, department, phone } = req.body;
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }
    let role = 'user';
    let dept = null;
    if (secret && secret === ADMIN_SECRET) {
      if (department) {
        role = 'staff';
        dept = department;
      } else {
        role = 'admin';
        dept = null;
      }
    }
    const user = new User({
      name,
      email,
      password,
      role,
      department: dept,
      phone: phone || null
    });
    await user.save();
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
};

exports.login = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation error', errors: errors.array() });
    }
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
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
};

exports.requestOtp = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation error', errors: errors.array() });
    }
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    const otp = user.generateOTP();
    await user.save();
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
};

exports.loginOtp = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation error', errors: errors.array() });
    }
    const { email, otp } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    const isOTPValid = user.verifyOTP(otp);
    if (!isOTPValid) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }
    await user.save();
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
};

exports.requestSignupOtp = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation error', errors: errors.array() });
    }
    const { email, name } = req.body;
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }
    const user = new User({
      name,
      email,
      password: 'temporary'
    });
    const otp = user.generateOTP();
    await user.save();
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
};

exports.signupOtp = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation error', errors: errors.array() });
    }
    const { email, name, otp } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    const isOTPValid = user.verifyOTP(otp);
    if (!isOTPValid) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }
    user.name = name;
    user.password = 'temporary';
    await user.save();
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
};

exports.getMe = async (req, res) => {
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
};
