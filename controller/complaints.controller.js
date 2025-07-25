const Complaint = require('../models/Complaint');
const User = require('../models/User');
const { callMLAPI } = require('../utils/mlIntegration');
const path = require('path');
const fs = require('fs');

exports.getComplaintsByDepartment = async (req, res) => {
  try {
    console.log('DEBUG getComplaintsByDepartment req.user:', req.user);
    if (!req.user || !['admin', 'staff'].includes(req.user.role)) {
      console.log('DEBUG Access denied: req.user or role missing');
      return res.status(403).json({ message: 'Access denied' });
    }
    const dept = req.params.dept;
    const categoryMap = {
      'Roads': 'Road Issues',
      'Water': 'Water Supply',
      'Electricity': 'Electricity',
      'Sanitation': 'Sanitation',
      'Other': 'Other'
    };
    const category = categoryMap[dept] || dept;
    console.log('DEBUG getComplaintsByDepartment category:', category);
    const complaints = await Complaint.find({ category }).sort({ createdAt: -1 });
    console.log('DEBUG getComplaintsByDepartment complaints found:', complaints.length);
    res.json({ complaints });
  } catch (error) {
    console.error('Get department complaints error:', error);
    res.status(500).json({ message: 'Failed to fetch department complaints' });
  }
};

exports.submitComplaint = async (req, res) => {
  try {
    const { validationResult } = require('express-validator');
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation error', errors: errors.array() });
    }
    if (!req.file) {
      return res.status(400).json({ message: 'Photo is required' });
    }
    const { description, location } = req.body;
    const photoUrl = `/uploads/${req.file.filename}`;
    let mlResults = null;
    try {
      mlResults = await callMLAPI(req.file.path, description);
    } catch (mlError) {
      console.error('ML API error:', mlError);
      mlResults = {
        caption: 'Image analysis unavailable',
        predictedCategory: 'Other',
        predictedUrgency: 'medium',
        confidence: 0
      };
    }
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
};

exports.getMyComplaints = async (req, res) => {
  try {
    const complaints = await Complaint.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .select('-mlResults');
    res.json({ complaints });
  } catch (error) {
    console.error('Get user complaints error:', error);
    res.status(500).json({ message: 'Failed to fetch complaints' });
  }
};

exports.getComplaintById = async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id)
      .populate('user', 'name email')
      .populate('resolvedBy', 'name');
    if (!complaint) {
      return res.status(404).json({ message: 'Complaint not found' });
    }
    if (complaint.user._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }
    res.json({ complaint });
  } catch (error) {
    console.error('Get complaint error:', error);
    res.status(500).json({ message: 'Failed to fetch complaint' });
  }
};

exports.updateComplaintStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) {
      return res.status(404).json({ message: 'Complaint not found' });
    }
    if (complaint.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
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
};

exports.deleteComplaint = async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) {
      return res.status(404).json({ message: 'Complaint not found' });
    }
    if (complaint.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    if (complaint.photo) {
      const photoPath = path.join(__dirname, '..', complaint.photo);
      if (fs.existsSync(photoPath)) {
        fs.unlinkSync(photoPath);
      }
    }
    await Complaint.findByIdAndDelete(req.params.id);
    await User.findByIdAndUpdate(
      req.user._id,
      { $pull: { complaints: req.params.id } }
    );
    res.json({ message: 'Complaint deleted successfully' });
  } catch (error) {
    console.error('Delete complaint error:', error);
    res.status(500).json({ message: 'Failed to delete complaint' });
  }
};
