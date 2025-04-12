/**
 * Authentication middleware using JWT to protect routes
 */

const jwt = require('jsonwebtoken');
const User = require('../models/User');
const rateLimit = require('express-rate-limit');

// Setup rate limiter for login attempts
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Max 10 requests per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts, please try again later' }
});

// JWT secret from environment or fallback
const JWT_SECRET = process.env.JWT_SECRET || 'savika-nail-app-jwt-secret-key-change-in-production';
const JWT_EXPIRY = '24h'; // Token expires in 24 hours

/**
 * Middleware to check if user is authenticated using JWT
 */
const isAuthenticated = async (req, res, next) => {
  // Skip authentication for login route and other public routes
  if (req.path === '/login' || 
      req.path === '/api/auth/login' || 
      req.path === '/api/auth/status') {
    return next();
  }

  try {
    // Get token from authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'Unauthorized - No token provided',
        message: 'Authentication required'
      });
    }
    
    // Extract the token
    const token = authHeader.split(' ')[1];
    
    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Check if user exists
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({ 
        error: 'Unauthorized - Invalid token',
        message: 'User not found'
      });
    }
    
    // Attach user to request object
    req.user = user;
    
    // Continue to the next middleware or route handler
    next();
  } catch (error) {
    console.error('Authentication error:', error.message);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'Unauthorized - Token expired',
        message: 'Your session has expired, please login again'
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        error: 'Unauthorized - Invalid token',
        message: 'Invalid authentication token'
      });
    }
    
    res.status(500).json({ 
      error: 'Server error during authentication',
      message: 'An unexpected error occurred'
    });
  }
};

/**
 * Login handler
 */
const login = async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // Validate input
    if (!username || !password) {
      return res.status(400).json({ 
        success: false, 
        error: 'Username and password are required' 
      });
    }
    
    // Find the user
    const user = await User.findOne({ username });
    
    // Check if user exists
    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }
    
    // Check if account is locked
    if (user.lockUntil && user.lockUntil > new Date()) {
      const minutesLeft = Math.ceil((user.lockUntil - new Date()) / (60 * 1000));
      return res.status(401).json({ 
        success: false, 
        error: `Account is temporarily locked. Try again in ${minutesLeft} minutes.` 
      });
    }
    
    // Check if password matches
    const isMatch = await user.comparePassword(password);
    
    if (!isMatch) {
      // Increment login attempts
      await user.incrementLoginAttempts();
      
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }
    
    // Reset login attempts on successful login
    await user.resetLoginAttempts();
    
    // Update last login time
    await User.findByIdAndUpdate(user._id, {
      lastLogin: new Date()
    });
    
    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user._id,
        username: user.username,
        role: user.role
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRY }
    );
    
    // Send success response with token
    res.json({ 
      success: true,
      token,
      user: {
        username: user.username,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, error: 'Server error during login' });
  }
};

/**
 * Logout handler - Client side only for JWT
 * Just a skeleton since JWT logout is handled on the client by removing the token
 */
const logout = (req, res) => {
  // With JWT, logout is handled on client side by removing the token
  // This endpoint exists just for API consistency
  res.json({ success: true, message: 'Logout successful' });
};

/**
 * Generate a new token from an existing valid token
 * This extends the user's session without requiring re-login
 */
const refreshToken = async (req, res) => {
  try {
    // User should already be authenticated by isAuthenticated middleware
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        error: 'Authentication required' 
      });
    }
    
    // Generate a new token
    const newToken = jwt.sign(
      { 
        userId: req.user._id,
        username: req.user.username,
        role: req.user.role
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRY }
    );
    
    res.json({
      success: true,
      token: newToken
    });
  } catch (error) {
    console.error('Error refreshing token:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to refresh token' 
    });
  }
};

// Export all functions
module.exports = {
  isAuthenticated,
  login,
  loginLimiter,
  logout,
  refreshToken
};
