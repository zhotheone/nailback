const express = require('express');
const router = express.Router();
const Appointment = require('../models/Appointment');
const Client = require('../models/Client');
const Procedure = require('../models/Procedure');
const logger = require('../utils/logger'); // Use shared logger
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

// GET all appointments
router.get('/', cacheMiddleware(300), async (req, res) => {
  try {
    logger.info('Fetching all appointments');
    const appointments = await Appointment.find()
      .populate('clientId', 'name surName phoneNum')
      .populate('procedureId', 'name price timeToComplete');
    res.json(appointments);
  } catch (err) {
    logger.error(`Error fetching appointments: ${err.message}`);
    res.status(500).json({ message: err.message });
  }
});

// GET specific appointment
router.get('/:id', cacheMiddleware(300), async (req, res) => {
  try {
    logger.info(`Fetching appointment with id: ${req.params.id}`);
    const appointment = await Appointment.findById(req.params.id)
      .populate('clientId', 'name surName phoneNum')
      .populate('procedureId', 'name price timeToComplete');
    
    if (!appointment) {
      logger.warn(`Appointment not found with id: ${req.params.id}`);
      return res.status(404).json({ message: 'Appointment not found' });
    }
    res.json(appointment);
  } catch (err) {
    logger.error(`Error fetching appointment: ${err.message}`);
    res.status(500).json({ message: err.message });
  }
});

// POST create appointment
router.post('/', async (req, res) => {
  try {
    logger.info('Creating new appointment', { data: req.body });
    
    // Validate client and procedure existence
    const clientExists = await Client.findById(req.body.clientId);
    const procedureExists = await Procedure.findById(req.body.procedureId);
    
    if (!clientExists) {
      logger.warn(`Client with id ${req.body.clientId} not found`);
      return res.status(400).json({ message: 'Client not found' });
    }
    
    if (!procedureExists) {
      logger.warn(`Procedure with id ${req.body.procedureId} not found`);
      return res.status(400).json({ message: 'Procedure not found' });
    }
    
    const appointment = new Appointment(req.body);
    const newAppointment = await appointment.save();
    
    cache.flushAll(); // Invalidate cache when data changes
    
    // Return populated data
    const populatedAppointment = await Appointment.findById(newAppointment._id)
      .populate('clientId', 'name surName phoneNum')
      .populate('procedureId', 'name price timeToComplete');
      
    res.status(201).json(populatedAppointment);
  } catch (err) {
    logger.error(`Error creating appointment: ${err.message}`);
    res.status(400).json({ message: err.message });
  }
});

// PUT update appointment
router.put('/:id', async (req, res) => {
  try {
    logger.info(`Updating appointment with id: ${req.params.id}`, { data: req.body });
    
    // If client or procedure is being updated, validate they exist
    if (req.body.clientId) {
      const clientExists = await Client.findById(req.body.clientId);
      if (!clientExists) {
        return res.status(400).json({ message: 'Client not found' });
      }
    }
    
    if (req.body.procedureId) {
      const procedureExists = await Procedure.findById(req.body.procedureId);
      if (!procedureExists) {
        return res.status(400).json({ message: 'Procedure not found' });
      }
    }
    
    const appointment = await Appointment.findByIdAndUpdate(req.params.id, req.body, { new: true })
      .populate('clientId', 'name surName phoneNum')
      .populate('procedureId', 'name price timeToComplete');
      
    if (!appointment) {
      logger.warn(`Appointment not found with id: ${req.params.id}`);
      return res.status(404).json({ message: 'Appointment not found' });
    }
    
    cache.flushAll(); // Invalidate cache when data changes
    res.json(appointment);
  } catch (err) {
    logger.error(`Error updating appointment: ${err.message}`);
    res.status(400).json({ message: err.message });
  }
});

// DELETE appointment
router.delete('/:id', async (req, res) => {
  try {
    logger.info(`Deleting appointment with id: ${req.params.id}`);
    const appointment = await Appointment.findByIdAndDelete(req.params.id);
    
    if (!appointment) {
      logger.warn(`Appointment not found with id: ${req.params.id}`);
      return res.status(404).json({ message: 'Appointment not found' });
    }
    
    cache.flushAll(); // Invalidate cache when data changes
    res.json({ message: 'Appointment deleted' });
  } catch (err) {
    logger.error(`Error deleting appointment: ${err.message}`);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
