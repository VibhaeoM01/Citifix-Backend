const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

// ML API configuration
const ML_API_BASE_URL = process.env.ML_API_URL || 'http://localhost:5000';

// Call ML API for image analysis
const callMLAPI = async (imagePath, description) => {
  try {
    const formData = new FormData();
    formData.append('image', fs.createReadStream(imagePath));
    formData.append('description', description);

    const response = await axios.post(`${ML_API_BASE_URL}/analyze`, formData, {
      headers: {
        ...formData.getHeaders(),
      },
      timeout: 30000, // 30 seconds timeout
    });

    if (response.status === 200) {
      return {
        caption: response.data.caption || 'No caption generated',
        predictedCategory: response.data.category || 'Other',
        predictedUrgency: response.data.urgency || 'medium',
        confidence: response.data.confidence || 0.5
      };
    } else {
      throw new Error('ML API returned non-200 status');
    }
  } catch (error) {
    console.error('ML API call failed:', error.message);
    
    // Fallback to basic analysis based on description
    return analyzeDescription(description);
  }
};

// Fallback analysis based on description keywords
const analyzeDescription = (description) => {
  const text = description.toLowerCase();
  
  // Category detection
  let category = 'Other';
  if (text.includes('road') || text.includes('pothole') || text.includes('street')) {
    category = 'Road Issues';
  } else if (text.includes('water') || text.includes('supply') || text.includes('pipe')) {
    category = 'Water Supply';
  } else if (text.includes('electric') || text.includes('power') || text.includes('light')) {
    category = 'Electricity';
  } else if (text.includes('sanitation') || text.includes('sewage') || text.includes('drain')) {
    category = 'Sanitation';
  } else if (text.includes('light') || text.includes('street light')) {
    category = 'Street Lighting';
  } else if (text.includes('transport') || text.includes('bus') || text.includes('metro')) {
    category = 'Public Transport';
  } else if (text.includes('park') || text.includes('garden') || text.includes('recreation')) {
    category = 'Parks & Recreation';
  } else if (text.includes('noise') || text.includes('sound')) {
    category = 'Noise Pollution';
  } else if (text.includes('air') || text.includes('pollution') || text.includes('smoke')) {
    category = 'Air Pollution';
  } else if (text.includes('waste') || text.includes('garbage') || text.includes('trash')) {
    category = 'Waste Management';
  } else if (text.includes('traffic') || text.includes('congestion')) {
    category = 'Traffic Management';
  } else if (text.includes('safety') || text.includes('security') || text.includes('crime')) {
    category = 'Public Safety';
  } else if (text.includes('health') || text.includes('hospital') || text.includes('medical')) {
    category = 'Healthcare';
  } else if (text.includes('school') || text.includes('education') || text.includes('college')) {
    category = 'Education';
  }

  // Urgency detection
  let urgency = 'medium';
  const urgentKeywords = ['emergency', 'urgent', 'critical', 'dangerous', 'broken', 'damaged', 'leak', 'fire', 'accident'];
  const lowUrgencyKeywords = ['suggestion', 'improvement', 'maintenance', 'upgrade', 'beautification'];
  
  if (urgentKeywords.some(keyword => text.includes(keyword))) {
    urgency = 'high';
  } else if (lowUrgencyKeywords.some(keyword => text.includes(keyword))) {
    urgency = 'low';
  }

  return {
    caption: `Complaint about ${category.toLowerCase()}`,
    predictedCategory: category,
    predictedUrgency: urgency,
    confidence: 0.6
  };
};

// Test ML API connection
const testMLConnection = async () => {
  try {
    const response = await axios.get(`${ML_API_BASE_URL}/health`, {
      timeout: 5000
    });
    console.log('ML API is running:', response.data);
    return true;
  } catch (error) {
    console.log('ML API is not available:', error.message);
    return false;
  }
};

// Get ML model statistics
const getMLStats = async () => {
  try {
    const response = await axios.get(`${ML_API_BASE_URL}/stats`, {
      timeout: 10000
    });
    return response.data;
  } catch (error) {
    console.error('Failed to get ML stats:', error.message);
    return null;
  }
};

module.exports = {
  callMLAPI,
  testMLConnection,
  getMLStats,
  analyzeDescription
}; 