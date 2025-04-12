const express = require('express');
const router = express.Router();
const Client = require('../models/Client');
const winston = require('winston');
const logger = winston.createLogger({
  // Same logger config as server.js
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/clients.log' })
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

// GET all clients
router.get('/', cacheMiddleware(300), async (req, res) => {
  try {
    logger.info('Fetching all clients');
    const clients = await Client.find();
    res.json(clients);
  } catch (err) {
    logger.error(`Error fetching clients: ${err.message}`);
    res.status(500).json({ message: err.message });
  }
});

// GET specific client
router.get('/:id', cacheMiddleware(300), async (req, res) => {
  try {
    logger.info(`Fetching client with id: ${req.params.id}`);
    const client = await Client.findById(req.params.id);
    if (!client) {
      logger.warn(`Client not found with id: ${req.params.id}`);
      return res.status(404).json({ message: 'Client not found' });
    }
    res.json(client);
  } catch (err) {
    logger.error(`Error fetching client: ${err.message}`);
    res.status(500).json({ message: err.message });
  }
});

// POST create client
router.post('/', async (req, res) => {
  try {
    logger.info('Creating new client', { data: req.body });
    const client = new Client(req.body);
    const newClient = await client.save();
    cache.flushAll(); // Invalidate cache when data changes
    res.status(201).json(newClient);
  } catch (err) {
    logger.error(`Error creating client: ${err.message}`);
    res.status(400).json({ message: err.message });
  }
});

// PUT update client
router.put('/:id', async (req, res) => {
  try {
    logger.info(`Updating client with id: ${req.params.id}`, { data: req.body });
    const client = await Client.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!client) {
      logger.warn(`Client not found with id: ${req.params.id}`);
      return res.status(404).json({ message: 'Client not found' });
    }
    cache.flushAll(); // Invalidate cache when data changes
    res.json(client);
  } catch (err) {
    logger.error(`Error updating client: ${err.message}`);
    res.status(400).json({ message: err.message });
  }
});

// DELETE client
router.delete('/:id', async (req, res) => {
  try {
    logger.info(`Deleting client with id: ${req.params.id}`);
    const client = await Client.findByIdAndDelete(req.params.id);
    if (!client) {
      logger.warn(`Client not found with id: ${req.params.id}`);
      return res.status(404).json({ message: 'Client not found' });
    }
    cache.flushAll(); // Invalidate cache when data changes
    res.json({ message: 'Client deleted' });
  } catch (err) {
    logger.error(`Error deleting client: ${err.message}`);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
