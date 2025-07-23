
const nodemailer = require('nodemailer');

// Create transporter
const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Send OTP email
const sendOTPEmail = async (email, otp, type) => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: `Smart City Complaint System - ${type}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 2rem; text-align: center;">
            <h1 style="margin: 0; font-size: 2rem;">🏙️ Smart City</h1>
            <p style="margin: 0.5rem 0 0 0; opacity: 0.9;">Complaint Management System</p>
          </div>
          
          <div style="padding: 2rem; background: #f8fafc;">
            <h2 style="color: #1e293b; margin-bottom: 1rem;">Your ${type}</h2>
            <p style="color: #64748b; margin-bottom: 1.5rem;">
              You have requested a ${type.toLowerCase()} for your Smart City Complaint System account.
            </p>
            
            <div style="background: white; border: 2px dashed #667eea; border-radius: 12px; padding: 2rem; text-align: center; margin: 1.5rem 0;">
              <h3 style="color: #1e293b; margin: 0 0 1rem 0; font-size: 1.5rem;">Your OTP Code</h3>
              <div style="background: #667eea; color: white; font-size: 2rem; font-weight: bold; padding: 1rem; border-radius: 8px; letter-spacing: 0.5rem; font-family: monospace;">
                ${otp}
              </div>
            </div>
            
            <p style="color: #64748b; font-size: 0.9rem; margin-top: 1.5rem;">
              <strong>Important:</strong>
              <ul style="margin: 0.5rem 0; padding-left: 1.5rem;">
                <li>This OTP is valid for 10 minutes only</li>
                <li>Do not share this OTP with anyone</li>
                <li>If you didn't request this OTP, please ignore this email</li>
              </ul>
            </p>
          </div>
          
          <div style="background: #1e293b; color: white; padding: 1.5rem; text-align: center;">
            <p style="margin: 0; font-size: 0.9rem; opacity: 0.8;">
              © 2024 Smart City Complaint System. All rights reserved.
            </p>
          </div>
        </div>
      `
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('OTP email sent successfully:', result.messageId);
    return result;
  } catch (error) {
    console.error('Error sending OTP email:', error);
    throw error;
  }
};

// Send complaint notification email
const sendComplaintNotification = async (email, complaintData) => {
module.exports = {
  sendOTPEmail,
  sendComplaintNotification
};
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Your Complaint Has Been Noted - Smart City',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 2rem; text-align: center;">
            <h1 style="margin: 0; font-size: 2rem;">🏙️ Smart City</h1>
            <p style="margin: 0.5rem 0 0 0; opacity: 0.9;">Complaint Management System</p>
          </div>
          
          <div style="padding: 2rem; background: #f8fafc;">
            <h2 style="color: #1e293b; margin-bottom: 1rem;">Complaint Status Update</h2>
            <p style="color: #64748b; margin-bottom: 1.5rem;">
              Your complaint has been noted and will be resolved shortly. Thank you for helping improve our city.
            </p>
            
            <div style="background: white; border-radius: 12px; padding: 1.5rem; margin: 1.5rem 0; border-left: 4px solid #10b981;">
              <h3 style="color: #1e293b; margin: 0 0 1rem 0;">Complaint Details</h3>
              <p style="color: #64748b; margin: 0.5rem 0;"><strong>Category:</strong> ${complaintData.category}</p>
              <p style="color: #64748b; margin: 0.5rem 0;"><strong>Urgency:</strong> ${complaintData.urgency}</p>
              <p style="color: #64748b; margin: 0.5rem 0;"><strong>Location:</strong> ${complaintData.location}</p>
              <p style="color: #64748b; margin: 0.5rem 0;"><strong>Status:</strong> <span style="color: #3b82f6; font-weight: bold;">Noted</span></p>
            </div>
            
            <p style="color: #64748b; font-size: 0.9rem;">
              We will keep you updated on the progress of your complaint. You can also check the status through your account dashboard.
            </p>
          </div>
          
          <div style="background: #1e293b; color: white; padding: 1.5rem; text-align: center;">
            <p style="margin: 0; font-size: 0.9rem; opacity: 0.8;">
              © 2024 Smart City Complaint System. All rights reserved.
            </p>
          </div>
        </div>
      `
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('Complaint notification email sent successfully:', result.messageId);
    return result;
  } catch (error) {
    console.error('Error sending complaint notification email:', error);
    throw error;
  }
};