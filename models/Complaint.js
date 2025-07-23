const mongoose = require('mongoose');

const complaintSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  photo: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true,
    maxlength: [1000, 'Description cannot be more than 1000 characters']
  },
  location: {
    type: String,
    required: [true, 'Location is required'],
    trim: true
  },
  coordinates: {
    lat: Number,
    lng: Number
  },
  category: {
    type: String,
    required: true,
    enum: [
      'Road Issues',
      'Water Supply',
      'Electricity',
      'Sanitation',
      'Street Lighting',
      'Public Transport',
      'Parks & Recreation',
      'Noise Pollution',
      'Air Pollution',
      'Waste Management',
      'Traffic Management',
      'Public Safety',
      'Healthcare',
      'Education',
      'Other'
    ]
  },
  urgency: {
    type: String,
    required: true,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  status: {
    type: String,
    enum: ['pending', 'noted', 'in-progress', 'resolved', 'rejected'],
    default: 'pending'
  },
  mlResults: {
    caption: String,
    predictedCategory: String,
    predictedUrgency: String,
    confidence: Number
  },
  adminNotes: {
    type: String,
    trim: true,
    maxlength: [500, 'Admin notes cannot be more than 500 characters']
  },
  resolvedAt: Date,
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for better query performance
complaintSchema.index({ user: 1, createdAt: -1 });
complaintSchema.index({ status: 1, urgency: 1 });
complaintSchema.index({ category: 1 });
complaintSchema.index({ location: 'text', description: 'text' });

// Virtual for time since creation
complaintSchema.virtual('timeSinceCreation').get(function() {
  return Date.now() - this.createdAt;
});

// Method to mark as noted
complaintSchema.methods.markAsNoted = function() {
  this.status = 'noted';
  this.updatedAt = new Date();
  return this.save();
};

// Method to mark as resolved
complaintSchema.methods.markAsResolved = function(adminId, notes) {
  this.status = 'resolved';
  this.resolvedAt = new Date();
  this.resolvedBy = adminId;
  this.adminNotes = notes;
  this.updatedAt = new Date();
  return this.save();
};

// Static method to get statistics
complaintSchema.statics.getStats = async function() {
  const stats = await this.aggregate([
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        pending: {
          $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
        },
        resolved: {
          $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] }
        },
        highUrgency: {
          $sum: { $cond: [{ $eq: ['$urgency', 'high'] }, 1, 0] }
        }
      }
    }
  ]);
  
  return stats[0] || { total: 0, pending: 0, resolved: 0, highUrgency: 0 };
};

// Static method to get complaints by category
complaintSchema.statics.getByCategory = async function() {
  return await this.aggregate([
    {
      $group: {
        _id: '$category',
        count: { $sum: 1 }
      }
    },
    { $sort: { count: -1 } }
  ]);
};

// Static method to get complaints by urgency
complaintSchema.statics.getByUrgency = async function() {
  return await this.aggregate([
    {
      $group: {
        _id: '$urgency',
        count: { $sum: 1 }
      }
    },
    { $sort: { count: -1 } }
  ]);
};

module.exports = mongoose.model('Complaint', complaintSchema); 