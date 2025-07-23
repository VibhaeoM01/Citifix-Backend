const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { body, validationResult } = require('express-validator');
const Complaint = require('../models/Complaint');
const User = require('../models/User');
const { authenticateToken, requireVerification } = require('../middleware/auth');
const { callMLAPI } = require('../utils/mlIntegration');

const router = express.Router();
// Get complaints by department/category for staff/admin
router.get('/department/:dept', authenticateToken, async (req, res) => {
  try {
    // Only allow staff/admin
    if (!['admin', 'staff'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied' });
    }
    const dept = req.params.dept;
    // Map department to complaint category
    // You may want to adjust this mapping as per your needs
    const categoryMap = {
      'Roads': 'Road Issues',
      'Water': 'Water Supply',
      'Electricity': 'Electricity',
      'Sanitation': 'Sanitation',
      'Other': 'Other'
    };
    const category = categoryMap[dept] || dept;
    const complaints = await Complaint.find({ category }).sort({ createdAt: -1 });
    res.json({ complaints });
  } catch (error) {
    console.error('Get department complaints error:', error);
    res.status(500).json({ message: 'Failed to fetch department complaints' });
  }
});


// Configure multer for file upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'complaint-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  }
});

// Submit a new complaint
router.post('/', 
  authenticateToken,
  // requireVerification, // OTP/email verification temporarily disabled
  upload.single('photo'),
  [
    body('description').trim().isLength({ min: 10, max: 1000 }).withMessage('Description must be between 10 and 1000 characters'),
    body('location').trim().notEmpty().withMessage('Location is required')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ message: 'Validation error', errors: errors.array() });
      }

      if (!req.file) {
        return res.status(400).json({ message: 'Photo is required' });
      }

      const { description, location } = req.body;
      const photoUrl = `/uploads/${req.file.filename}`;

      // Call ML API for analysis
      let mlResults = null;
      try {
        mlResults = await callMLAPI(req.file.path, description);
      } catch (mlError) {
        console.error('ML API error:', mlError);
        // Continue without ML results if API fails
        mlResults = {
          caption: 'Image analysis unavailable',
          predictedCategory: 'Other',
          predictedUrgency: 'medium',
          confidence: 0
        };
      }

      // Create complaint
      const complaint = new Complaint({
        user: req.user._id,
        photo: photoUrl,
        description,
        location,
        category: mlResults.predictedCategory,
        urgency: mlResults.predictedUrgency,
        mlResults: {
          caption: mlResults.caption,
          predictedCategory: mlResults.predictedCategory,
          predictedUrgency: mlResults.predictedUrgency,
          confidence: mlResults.confidence
        }
      });

      await complaint.save();

      // Update user's complaints array
      await User.findByIdAndUpdate(
        req.user._id,
        { $push: { complaints: complaint._id } }
      );

      res.status(201).json({
        message: 'Complaint submitted successfully',
        complaint: {
          id: complaint._id,
          category: complaint.category,
          urgency: complaint.urgency,
          status: complaint.status,
          createdAt: complaint.createdAt
        },
        mlResults: {
          category: mlResults.predictedCategory,
          urgency: mlResults.predictedUrgency,
          caption: mlResults.caption
        }
      });
    } catch (error) {
      console.error('Submit complaint error:', error);
      res.status(500).json({ message: 'Failed to submit complaint' });
    }
  }
);

// Get user's complaints
router.get('/my-complaints', authenticateToken, async (req, res) => {
  try {
    const complaints = await Complaint.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .select('-mlResults');

    res.json({ complaints });
  } catch (error) {
    console.error('Get user complaints error:', error);
    res.status(500).json({ message: 'Failed to fetch complaints' });
  }
});

// Get a specific complaint
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id)
      .populate('user', 'name email')
      .populate('resolvedBy', 'name');

    if (!complaint) {
      return res.status(404).json({ message: 'Complaint not found' });
    }

    // Check if user owns the complaint or is admin
    if (complaint.user._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json({ complaint });
  } catch (error) {
    console.error('Get complaint error:', error);
    res.status(500).json({ message: 'Failed to fetch complaint' });
  }
});

// Update complaint status (user can only update their own complaints)
router.patch('/:id/status', authenticateToken, async (req, res) => {
  try {
    const { status } = req.body;
    const complaint = await Complaint.findById(req.params.id);

    if (!complaint) {
      return res.status(404).json({ message: 'Complaint not found' });
    }

    // Check if user owns the complaint
    if (complaint.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Only allow certain status updates for users
    const allowedStatuses = ['pending', 'resolved'];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    complaint.status = status;
    if (status === 'resolved') {
      complaint.resolvedAt = new Date();
    }

    await complaint.save();

    res.json({
      message: 'Complaint status updated successfully',
      complaint: {
        id: complaint._id,
        status: complaint.status,
        updatedAt: complaint.updatedAt
      }
    });
  } catch (error) {
    console.error('Update complaint status error:', error);
    res.status(500).json({ message: 'Failed to update complaint status' });
  }
});

// Delete complaint (user can only delete their own complaints)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id);

    if (!complaint) {
      return res.status(404).json({ message: 'Complaint not found' });
    }

    // Check if user owns the complaint
    if (complaint.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Delete photo file
    if (complaint.photo) {
      const photoPath = path.join(__dirname, '..', complaint.photo);
      if (fs.existsSync(photoPath)) {
        fs.unlinkSync(photoPath);
      }
    }

    await Complaint.findByIdAndDelete(req.params.id);

    // Remove from user's complaints array
    await User.findByIdAndUpdate(
      req.user._id,
      { $pull: { complaints: req.params.id } }
    );

    res.json({ message: 'Complaint deleted successfully' });
  } catch (error) {
    console.error('Delete complaint error:', error);
    res.status(500).json({ message: 'Failed to delete complaint' });
  }
});

module.exports = router; 