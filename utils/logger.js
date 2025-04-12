const winston = require('winston');

// Configure logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
  ],
});

// Only add file transports in development environment
if (process.env.NODE_ENV !== 'production') {
  const path = require('path');
  const logDir = path.join(__dirname, '..', 'logs');
  
  try {
    require('fs').mkdirSync(logDir, { recursive: true });
    logger.add(new winston.transports.File({ 
      filename: path.join(logDir, 'error.log'), 
      level: 'error' 
    }));
    logger.add(new winston.transports.File({ 
      filename: path.join(logDir, 'combined.log')
    }));
  } catch (error) {
    console.error('Failed to set up file logging:', error);
    // Continue without file logging
  }
}

module.exports = logger;
