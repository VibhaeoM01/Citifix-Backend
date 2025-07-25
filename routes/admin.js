const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const adminController = require('../controller/admin.controller');

const router = express.Router();

// Apply admin middleware to all routes
router.use(authenticateToken, requireAdmin);

// Get all complaints with pagination and filters
router.get('/complaints', adminController.getAllComplaints);

// Get complaint statistics
router.get('/stats', adminController.getStats);

// Mark complaint as noted and send notification
router.put('/complaints/:id/noted', adminController.markComplaintNoted);

// Update complaint status
router.put(
  '/complaints/:id/status',
  [
    body('status').isIn(['pending', 'noted', 'in-progress', 'resolved', 'rejected']).withMessage('Invalid status'),
    body('adminNotes').optional().isLength({ max: 500 }).withMessage('Admin notes cannot exceed 500 characters')
  ],
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation error', errors: errors.array() });
    }
    next();
  },
  adminController.updateComplaintStatus
);

// Get complaints by category
router.get('/complaints/category/:category', adminController.getComplaintsByCategory);

// Get complaints by urgency
router.get('/complaints/urgency/:urgency', adminController.getComplaintsByUrgency);

// Search complaints
router.get('/complaints/search', adminController.searchComplaints);

// Get user statistics
router.get('/users/stats', adminController.getUserStats);

// Get all users
router.get('/users', adminController.getAllUsers);

// Update user role
router.put(
  '/users/:id/role',
  [body('role').isIn(['user', 'admin']).withMessage('Invalid role')],
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation error', errors: errors.array() });
    }
    next();
  },
  adminController.updateUserRole
);

module.exports = router;