// Load environment variables from .env file if in development
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

// Function to validate required environment variables
const validateEnv = () => {
  const requiredVars = ['JWT_SECRET'];
  const missing = requiredVars.filter(envVar => !process.env[envVar]);
  
  if (missing.length > 0) {
    console.error(`Error: Missing required environment variables: ${missing.join(', ')}`);
    console.error('Please set these variables in your .env file or environment');
    
    // In production, we should exit the process
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    } else {
      console.warn('Running in development mode with missing environment variables. This would cause an error in production.');
    }
  }
};

// Validate environment variables
validateEnv();

module.exports = {
  // Server configuration
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Database configuration
  database: {
    url: process.env.MONGODB_URI || 'mongodb://localhost:27017/nailapp',
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true
    }
  },
  
  // JWT configuration
  jwt: {
    // No fallback for secret in production
    secret: process.env.JWT_SECRET,
    expiresIn: '24h', // Token expires in 24 hours
    refreshExpiresIn: '7d' // Refresh token expires in 7 days
  },
  
  // CORS configuration
  cors: {
    origins: process.env.NODE_ENV === 'production' 
      ? [process.env.FRONTEND_URL || 'https://yourproductiondomain.com']
      : ['http://localhost:3000', 'http://127.0.0.1:3000'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }
};
