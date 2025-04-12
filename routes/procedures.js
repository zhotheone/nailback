const express = require('express');
const router = express.Router();
const Procedure = require('../models/Procedure');
const winston = require('winston');
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/procedures.log' })
  ]
});
const NodeCache = require('node-cache');
const cache = new NodeCache({ stdTTL: 300 });

// Cache middleware
const cacheMiddleware = (duration) => (req, res, next) => {
  const key = `__express__${req.originalUrl || req.url}`;
  const cachedBody = cache.get(key);
  
  if (cachedBody) {
    logger.info(`Cache hit for ${key}`);
    return res.send(cachedBody);
  } else {
    logger.info(`Cache miss for ${key}`);
    res.sendResponse = res.send;
    res.send = (body) => {
      cache.set(key, body, duration);
      res.sendResponse(body);
    };
    next();
  }
};

// GET all procedures
router.get('/', cacheMiddleware(300), async (req, res) => {
  try {
    logger.info('Fetching all procedures');
    const procedures = await Procedure.find();
    res.json(procedures);
  } catch (err) {
    logger.error(`Error fetching procedures: ${err.message}`);
    res.status(500).json({ message: err.message });
  }
});

// GET specific procedure
router.get('/:id', cacheMiddleware(300), async (req, res) => {
  try {
    logger.info(`Fetching procedure with id: ${req.params.id}`);
    const procedure = await Procedure.findById(req.params.id);
    if (!procedure) {
      logger.warn(`Procedure not found with id: ${req.params.id}`);
      return res.status(404).json({ message: 'Procedure not found' });
    }
    res.json(procedure);
  } catch (err) {
    logger.error(`Error fetching procedure: ${err.message}`);
    res.status(500).json({ message: err.message });
  }
});

// POST create procedure
router.post('/', async (req, res) => {
  try {
    logger.info('Creating new procedure', { data: req.body });
    const procedure = new Procedure(req.body);
    const newProcedure = await procedure.save();
    cache.flushAll(); // Invalidate cache when data changes
    res.status(201).json(newProcedure);
  } catch (err) {
    logger.error(`Error creating procedure: ${err.message}`);
    res.status(400).json({ message: err.message });
  }
});

// PUT update procedure
router.put('/:id', async (req, res) => {
  try {
    logger.info(`Updating procedure with id: ${req.params.id}`, { data: req.body });
    const procedure = await Procedure.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!procedure) {
      logger.warn(`Procedure not found with id: ${req.params.id}`);
      return res.status(404).json({ message: 'Procedure not found' });
    }
    cache.flushAll(); // Invalidate cache when data changes
    res.json(procedure);
  } catch (err) {
    logger.error(`Error updating procedure: ${err.message}`);
    res.status(400).json({ message: err.message });
  }
});

// DELETE procedure
router.delete('/:id', async (req, res) => {
  try {
    logger.info(`Deleting procedure with id: ${req.params.id}`);
    const procedure = await Procedure.findByIdAndDelete(req.params.id);
    if (!procedure) {
      logger.warn(`Procedure not found with id: ${req.params.id}`);
      return res.status(404).json({ message: 'Procedure not found' });
    }
    cache.flushAll(); // Invalidate cache when data changes
    res.json({ message: 'Procedure deleted' });
  } catch (err) {
    logger.error(`Error deleting procedure: ${err.message}`);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
