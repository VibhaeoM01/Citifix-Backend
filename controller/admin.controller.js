const Complaint = require('../models/Complaint');
const User = require('../models/User');
const { sendComplaintNotification } = require('../utils/email');

exports.getAllComplaints = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, category, urgency, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
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
};

exports.getStats = async (req, res) => {
  try {
    const stats = await Complaint.getStats();
    const categoryStats = await Complaint.getByCategory();
    const urgencyStats = await Complaint.getByUrgency();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentComplaints = await Complaint.countDocuments({ createdAt: { $gte: sevenDaysAgo } });
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
};

exports.markComplaintNoted = async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id).populate('user', 'name email');
    if (!complaint) {
      return res.status(404).json({ message: 'Complaint not found' });
    }
    await complaint.markAsNoted();
    try {
      await sendComplaintNotification(complaint.user.email, {
        category: complaint.category,
        urgency: complaint.urgency,
        location: complaint.location
      });
    } catch (emailError) {
      console.error('Failed to send notification email:', emailError);
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
};

exports.updateComplaintStatus = async (req, res) => {
  try {
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
};

exports.getComplaintsByCategory = async (req, res) => {
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
};

exports.getComplaintsByUrgency = async (req, res) => {
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
};

exports.searchComplaints = async (req, res) => {
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
};

exports.getUserStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const verifiedUsers = await User.countDocuments({ isVerified: true });
    const adminUsers = await User.countDocuments({ role: 'admin' });
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
      { $sort: { complaintCount: -1 } },
      { $limit: 10 }
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
};

exports.getAllUsers = async (req, res) => {
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
};

exports.updateUserRole = async (req, res) => {
  try {
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
};
