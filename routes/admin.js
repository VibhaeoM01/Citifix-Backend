const express = require('express');
const { body, validationResult } = require('express-validator');
const Complaint = require('../models/Complaint');
const User = require('../models/User');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { sendComplaintNotification } = require('../utils/email');
const router = express.Router();

// Apply admin middleware to all routes
router.use(authenticateToken, requireAdmin);

// Get all complaints with pagination and filters
router.get('/complaints', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      status, 
      category, 
      urgency,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const filter = {};
    if (status) filter.status = status;
    if (category) filter.category = category;
    if (urgency) filter.urgency = urgency;

    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const complaints = await Complaint.find(filter)
      .populate('user', 'name email')
      .populate('resolvedBy', 'name')
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const total = await Complaint.countDocuments(filter);

    res.json({
      complaints,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Get complaints error:', error);
    res.status(500).json({ message: 'Failed to fetch complaints' });
  }
});

// Get complaint statistics
router.get('/stats', async (req, res) => {
  try {
    const stats = await Complaint.getStats();
    const categoryStats = await Complaint.getByCategory();
    const urgencyStats = await Complaint.getByUrgency();

    // Get recent complaints (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const recentComplaints = await Complaint.countDocuments({
      createdAt: { $gte: sevenDaysAgo }
    });

    res.json({
      ...stats,
      recentComplaints,
      categoryStats,
      urgencyStats
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ message: 'Failed to fetch statistics' });
  }
});

// Mark complaint as noted and send notification
router.put('/complaints/:id/noted', async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id)
      .populate('user', 'name email');

    if (!complaint) {
      return res.status(404).json({ message: 'Complaint not found' });
    }

    // Mark as noted
    await complaint.markAsNoted();

    // Send notification email
    try {
      await sendComplaintNotification(complaint.user.email, {
        category: complaint.category,
        urgency: complaint.urgency,
        location: complaint.location
      });
    } catch (emailError) {
      console.error('Failed to send notification email:', emailError);
      // Continue even if email fails
    }

    res.json({
      message: 'Complaint marked as noted and notification sent',
      complaint: {
        id: complaint._id,
        status: complaint.status,
        updatedAt: complaint.updatedAt
      }
    });
  } catch (error) {
    console.error('Mark as noted error:', error);
    res.status(500).json({ message: 'Failed to mark complaint as noted' });
  }
});

// Update complaint status
router.put('/complaints/:id/status', [
  body('status').isIn(['pending', 'noted', 'in-progress', 'resolved', 'rejected']).withMessage('Invalid status'),
  body('adminNotes').optional().isLength({ max: 500 }).withMessage('Admin notes cannot exceed 500 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation error', errors: errors.array() });
    }

    const { status, adminNotes } = req.body;
    const complaint = await Complaint.findById(req.params.id);

    if (!complaint) {
      return res.status(404).json({ message: 'Complaint not found' });
    }

    complaint.status = status;
    complaint.adminNotes = adminNotes;

    if (status === 'resolved') {
      complaint.resolvedAt = new Date();
      complaint.resolvedBy = req.user._id;
    }

    await complaint.save();

    res.json({
      message: 'Complaint status updated successfully',
      complaint: {
        id: complaint._id,
        status: complaint.status,
        adminNotes: complaint.adminNotes,
        updatedAt: complaint.updatedAt
      }
    });
  } catch (error) {
    console.error('Update complaint status error:', error);
    res.status(500).json({ message: 'Failed to update complaint status' });
  }
});

// Get complaints by category
router.get('/complaints/category/:category', async (req, res) => {
  try {
    const { category } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const complaints = await Complaint.find({ category })
      .populate('user', 'name email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const total = await Complaint.countDocuments({ category });

    res.json({
      complaints,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total,
      category
    });
  } catch (error) {
    console.error('Get complaints by category error:', error);
    res.status(500).json({ message: 'Failed to fetch complaints' });
  }
});

// Get complaints by urgency
router.get('/complaints/urgency/:urgency', async (req, res) => {
  try {
    const { urgency } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const complaints = await Complaint.find({ urgency })
      .populate('user', 'name email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const total = await Complaint.countDocuments({ urgency });

    res.json({
      complaints,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total,
      urgency
    });
  } catch (error) {
    console.error('Get complaints by urgency error:', error);
    res.status(500).json({ message: 'Failed to fetch complaints' });
  }
});

// Search complaints
router.get('/complaints/search', async (req, res) => {
  try {
    const { q, page = 1, limit = 10 } = req.query;

    if (!q) {
      return res.status(400).json({ message: 'Search query is required' });
    }

    const searchFilter = {
      $or: [
        { description: { $regex: q, $options: 'i' } },
        { location: { $regex: q, $options: 'i' } },
        { category: { $regex: q, $options: 'i' } }
      ]
    };

    const complaints = await Complaint.find(searchFilter)
      .populate('user', 'name email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const total = await Complaint.countDocuments(searchFilter);

    res.json({
      complaints,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total,
      query: q
    });
  } catch (error) {
    console.error('Search complaints error:', error);
    res.status(500).json({ message: 'Failed to search complaints' });
  }
});

// Get user statistics
router.get('/users/stats', async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const verifiedUsers = await User.countDocuments({ isVerified: true });
    const adminUsers = await User.countDocuments({ role: 'admin' });

    // Users with most complaints
    const topUsers = await User.aggregate([
      {
        $lookup: {
          from: 'complaints',
          localField: '_id',
          foreignField: 'user',
          as: 'complaints'
        }
      },
      {
        $project: {
          name: 1,
          email: 1,
          complaintCount: { $size: '$complaints' }
        }
      },
      {
        $sort: { complaintCount: -1 }
      },
      {
        $limit: 10
      }
    ]);

    res.json({
      totalUsers,
      verifiedUsers,
      adminUsers,
      topUsers
    });
  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({ message: 'Failed to fetch user statistics' });
  }
});

// Get all users
router.get('/users', async (req, res) => {
  try {
    const { page = 1, limit = 10, role } = req.query;

    const filter = {};
    if (role) filter.role = role;

    const users = await User.find(filter)
      .select('-password -otp')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const total = await User.countDocuments(filter);

    res.json({
      users,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Failed to fetch users' });
  }
});

// Update user role
router.put('/users/:id/role', [
  body('role').isIn(['user', 'admin']).withMessage('Invalid role')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation error', errors: errors.array() });
    }

    const { role } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.role = role;
    await user.save();

    res.json({
      message: 'User role updated successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Update user role error:', error);
    res.status(500).json({ message: 'Failed to update user role' });
  }
});

module.exports = router; 