const express = require('express');
const { body, validationResult } = require('express-validator');
const nodemailer = require('nodemailer');
const router = express.Router();

// Create transporter for contact emails
const contactTransporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Submit contact form
router.post('/', [
  body('name').trim().isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
  body('subject').trim().isLength({ min: 5, max: 100 }).withMessage('Subject must be between 5 and 100 characters'),
  body('message').trim().isLength({ min: 10, max: 1000 }).withMessage('Message must be between 10 and 1000 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation error', errors: errors.array() });
    }

    const { name, email, subject, message } = req.body;

    // Send email to admin
    const adminMailOptions = {
      from: process.env.EMAIL_USER,
      to: process.env.ADMIN_EMAIL || process.env.EMAIL_USER,
      subject: `Contact Form: ${subject}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 2rem; text-align: center;">
            <h1 style="margin: 0; font-size: 2rem;">🏙️ Smart City</h1>
            <p style="margin: 0.5rem 0 0 0; opacity: 0.9;">Contact Form Submission</p>
          </div>
          
          <div style="padding: 2rem; background: #f8fafc;">
            <h2 style="color: #1e293b; margin-bottom: 1rem;">New Contact Message</h2>
            
            <div style="background: white; border-radius: 12px; padding: 1.5rem; margin: 1.5rem 0;">
              <h3 style="color: #1e293b; margin: 0 0 1rem 0;">Message Details</h3>
              <p style="color: #64748b; margin: 0.5rem 0;"><strong>From:</strong> ${name} (${email})</p>
              <p style="color: #64748b; margin: 0.5rem 0;"><strong>Subject:</strong> ${subject}</p>
              <p style="color: #64748b; margin: 0.5rem 0;"><strong>Date:</strong> ${new Date().toLocaleString()}</p>
            </div>
            
            <div style="background: white; border-radius: 12px; padding: 1.5rem; margin: 1.5rem 0;">
              <h3 style="color: #1e293b; margin: 0 0 1rem 0;">Message</h3>
              <p style="color: #64748b; line-height: 1.6; margin: 0;">${message.replace(/\n/g, '<br>')}</p>
            </div>
          </div>
          
          <div style="background: #1e293b; color: white; padding: 1.5rem; text-align: center;">
            <p style="margin: 0; font-size: 0.9rem; opacity: 0.8;">
              © 2024 Smart City Complaint System. All rights reserved.
            </p>
          </div>
        </div>
      `
    };

    // Send confirmation email to user
    const userMailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Thank you for contacting Smart City',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 2rem; text-align: center;">
            <h1 style="margin: 0; font-size: 2rem;">🏙️ Smart City</h1>
            <p style="margin: 0.5rem 0 0 0; opacity: 0.9;">Thank you for your message</p>
          </div>
          
          <div style="padding: 2rem; background: #f8fafc;">
            <h2 style="color: #1e293b; margin-bottom: 1rem;">Message Received</h2>
            <p style="color: #64748b; margin-bottom: 1.5rem;">
              Dear ${name},
            </p>
            <p style="color: #64748b; margin-bottom: 1.5rem;">
              Thank you for contacting the Smart City Complaint System. We have received your message and will get back to you as soon as possible.
            </p>
            
            <div style="background: white; border-radius: 12px; padding: 1.5rem; margin: 1.5rem 0;">
              <h3 style="color: #1e293b; margin: 0 0 1rem 0;">Your Message</h3>
              <p style="color: #64748b; margin: 0.5rem 0;"><strong>Subject:</strong> ${subject}</p>
              <p style="color: #64748b; margin: 0.5rem 0;"><strong>Message:</strong></p>
              <p style="color: #64748b; line-height: 1.6; margin: 0.5rem 0;">${message.replace(/\n/g, '<br>')}</p>
            </div>
            
            <p style="color: #64748b; font-size: 0.9rem;">
              If you have any urgent concerns, please use our complaint registration system for faster response.
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

    // Send both emails
    await Promise.all([
      contactTransporter.sendMail(adminMailOptions),
      contactTransporter.sendMail(userMailOptions)
    ]);

    res.json({ 
      message: 'Message sent successfully! We will get back to you soon.',
      success: true
    });
  } catch (error) {
    console.error('Contact form error:', error);
    res.status(500).json({ 
      message: 'Failed to send message. Please try again later.',
      success: false
    });
  }
});

module.exports = router; 