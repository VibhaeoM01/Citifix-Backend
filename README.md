# Smart City Complaint System - Backend

This is the Express.js backend for the Smart City Complaint System, providing RESTful APIs for user authentication, complaint management, and admin functionality.

## Features

- **User Authentication**: JWT-based authentication with email OTP support
- **Complaint Management**: Submit, view, and manage complaints with photo uploads
- **ML Integration**: Automatic categorization and urgency prediction using AI
- **Admin Dashboard**: Comprehensive admin panel for complaint management
- **Email Notifications**: Automated email notifications for OTP and complaint updates
- **File Upload**: Secure image upload with validation
- **Statistics**: Detailed analytics and reporting

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT + bcryptjs
- **File Upload**: Multer
- **Email**: Nodemailer
- **Validation**: Express-validator
- **Security**: Helmet, CORS, Rate limiting

## Prerequisites

- Node.js (v16 or higher)
- MongoDB (local or cloud)
- Python Flask ML server (for AI features)

## Installation

1. **Clone the repository**
   ```bash
   cd backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   Create a `.env` file in the backend directory:
   ```env
   # Server Configuration
   PORT=5001
   NODE_ENV=development

   # Database Configuration
   MONGODB_URI=mongodb://localhost:27017/smart-city-complaints

   # JWT Configuration
   JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

   # Email Configuration
   EMAIL_SERVICE=gmail
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASS=your-app-password
   ADMIN_EMAIL=admin@smartcity.gov

   # ML API Configuration
   ML_API_URL=http://localhost:5000

   # Frontend URL (for CORS)
   FRONTEND_URL=http://localhost:3000
   ```

4. **Start the server**
   ```bash
   # Development mode
   npm run dev

   # Production mode
   npm start
   ```

## API Endpoints

### Authentication (`/api/auth`)

- `POST /signup` - Register new user
- `POST /login` - User login
- `POST /request-otp` - Request OTP for login
- `POST /login-otp` - Login with OTP
- `POST /request-signup-otp` - Request OTP for signup
- `POST /signup-otp` - Signup with OTP
- `GET /me` - Get current user

### Complaints (`/api/complaints`)

- `POST /` - Submit new complaint (requires auth)
- `GET /my-complaints` - Get user's complaints (requires auth)
- `GET /:id` - Get specific complaint (requires auth)
- `PATCH /:id/status` - Update complaint status (requires auth)
- `DELETE /:id` - Delete complaint (requires auth)

### Admin (`/api/admin`)

- `GET /complaints` - Get all complaints with filters
- `GET /stats` - Get complaint statistics
- `PUT /complaints/:id/noted` - Mark complaint as noted
- `PUT /complaints/:id/status` - Update complaint status
- `GET /complaints/category/:category` - Get complaints by category
- `GET /complaints/urgency/:urgency` - Get complaints by urgency
- `GET /complaints/search` - Search complaints
- `GET /users/stats` - Get user statistics
- `GET /users` - Get all users
- `PUT /users/:id/role` - Update user role

### Contact (`/api/contact`)

- `POST /` - Submit contact form

## Database Models

### User Model
- `name`: String (required)
- `email`: String (required, unique)
- `password`: String (required, hashed)
- `role`: String (enum: 'user', 'admin')
- `isVerified`: Boolean
- `otp`: Object (code, expiresAt)
- `complaints`: Array of Complaint IDs

### Complaint Model
- `user`: ObjectId (ref: User)
- `photo`: String (file path)
- `description`: String (required)
- `location`: String (required)
- `coordinates`: Object (lat, lng)
- `category`: String (enum of categories)
- `urgency`: String (enum: 'low', 'medium', 'high')
- `status`: String (enum: 'pending', 'noted', 'in-progress', 'resolved', 'rejected')
- `mlResults`: Object (caption, predictedCategory, predictedUrgency, confidence)
- `adminNotes`: String
- `resolvedAt`: Date
- `resolvedBy`: ObjectId (ref: User)

## ML Integration

The backend integrates with a Python Flask ML server for:
- Image captioning
- Complaint categorization
- Urgency prediction

If the ML server is unavailable, the system falls back to keyword-based analysis.

## Security Features

- JWT token authentication
- Password hashing with bcrypt
- Rate limiting
- Input validation
- File upload restrictions
- CORS protection
- Helmet security headers

## Email Features

- OTP delivery for authentication
- Complaint status notifications
- Contact form confirmations
- Admin notifications

## File Upload

- Supported formats: JPEG, JPG, PNG, GIF
- Maximum size: 5MB
- Stored in `uploads/` directory
- Automatic cleanup on deletion

## Error Handling

- Comprehensive error logging
- User-friendly error messages
- Validation error responses
- Graceful fallbacks for ML features

## Development

### Running in Development Mode
```bash
npm run dev
```

### Testing ML Connection
The backend automatically tests ML API connectivity on startup.

### Logs
Check console output for detailed logs including:
- Database connection status
- ML API connectivity
- Email delivery status
- Error details

## Production Deployment

1. Set `NODE_ENV=production`
2. Use a strong JWT secret
3. Configure MongoDB connection string
4. Set up email credentials
5. Configure ML API URL
6. Set up proper CORS origins
7. Use HTTPS in production

## Contributing

1. Follow the existing code style
2. Add proper error handling
3. Include input validation
4. Update documentation
5. Test thoroughly

## License

MIT License - see LICENSE file for details 