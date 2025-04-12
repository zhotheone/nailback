const express = require('express');
const router = express.Router();
const { login, logout, loginLimiter, refreshToken } = require('../middleware/auth');

// Login route with rate limiting
router.post('/login', loginLimiter, login);

// Logout route (client-side for JWT)
router.post('/logout', logout);

// Refresh token route
router.post('/refresh-token', refreshToken);

// Authentication status check route
router.get('/status', (req, res) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ authenticated: false });
  }
  
  // We're not verifying the token here to avoid duplicate verification logic
  // The isAuthenticated middleware already handles that for protected routes
  // We just check if token exists in the proper format
  
  return res.json({ 
    authenticated: true,
    message: 'Token exists' 
  });
});

module.exports = router;
