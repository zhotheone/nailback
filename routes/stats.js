const express = require('express');
const router = express.Router();
const Appointment = require('../models/Appointment');
const Client = require('../models/Client');
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
    new winston.transports.File({ filename: 'logs/stats.log' })
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

// GET overall stats
router.get('/', cacheMiddleware(300), async (req, res) => {
  try {
    logger.info('Fetching overall statistics');
    
    const totalClients = await Client.countDocuments();
    const totalProcedures = await Procedure.countDocuments();
    const totalAppointments = await Appointment.countDocuments();
    
    const completedAppointments = await Appointment.countDocuments({ status: 'completed' });
    const pendingAppointments = await Appointment.countDocuments({ status: 'pending' });
    const cancelledAppointments = await Appointment.countDocuments({ status: 'cancelled' });
    
    // Calculate revenue from completed appointments
    const revenueData = await Appointment.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: null, totalRevenue: { $sum: '$finalPrice' } } }
    ]);
    
    const totalRevenue = revenueData.length > 0 ? revenueData[0].totalRevenue : 0;
    
    // Most popular procedures
    const popularProcedures = await Appointment.aggregate([
      { $group: { 
        _id: '$procedureId', 
        count: { $sum: 1 }
      }},
      { $sort: { count: -1 } },
      { $limit: 5 },
      { $lookup: {
        from: 'procedures',
        localField: '_id',
        foreignField: '_id',
        as: 'procedureDetails'
      }},
      { $unwind: '$procedureDetails' },
      { $project: {
        _id: 1,
        count: 1,
        name: '$procedureDetails.name',
        price: '$procedureDetails.price'
      }}
    ]);
    
    // Most frequent clients
    const frequentClients = await Appointment.aggregate([
      { $group: { 
        _id: '$clientId', 
        count: { $sum: 1 }
      }},
      { $sort: { count: -1 } },
      { $limit: 5 },
      { $lookup: {
        from: 'clients',
        localField: '_id',
        foreignField: '_id',
        as: 'clientDetails'
      }},
      { $unwind: '$clientDetails' },
      { $project: {
        _id: 1,
        count: 1,
        name: '$clientDetails.name',
        surName: '$clientDetails.surName',
        trustRating: '$clientDetails.trustRating'
      }}
    ]);
    
    res.json({
      totalClients,
      totalProcedures,
      appointments: {
        total: totalAppointments,
        completed: completedAppointments,
        pending: pendingAppointments,
        cancelled: cancelledAppointments
      },
      revenue: {
        total: totalRevenue,
        average: totalRevenue / (completedAppointments || 1)
      },
      popularProcedures,
      frequentClients
    });
  } catch (err) {
    logger.error(`Error fetching statistics: ${err.message}`);
    res.status(500).json({ message: err.message });
  }
});

// GET monthly revenue stats
router.get('/monthly-revenue', cacheMiddleware(300), async (req, res) => {
  try {
    logger.info('Fetching monthly revenue statistics');
    
    const monthlyRevenue = await Appointment.aggregate([
      { $match: { status: 'completed' } },
      { $group: {
        _id: { 
          year: { $year: '$time' },
          month: { $month: '$time' }
        },
        totalRevenue: { $sum: '$finalPrice' },
        count: { $sum: 1 }
      }},
      { $sort: { '_id.year': -1, '_id.month': -1 } },
      { $limit: 12 }
    ]);
    
    res.json(monthlyRevenue);
  } catch (err) {
    logger.error(`Error fetching monthly revenue: ${err.message}`);
    res.status(500).json({ message: err.message });
  }
});

// GET client retention stats
router.get('/client-retention', cacheMiddleware(300), async (req, res) => {
  try {
    logger.info('Fetching client retention statistics');
    
    const returnClients = await Appointment.aggregate([
      { $group: {
        _id: '$clientId',
        appointmentCount: { $sum: 1 },
        firstAppointment: { $min: '$time' },
        lastAppointment: { $max: '$time' }
      }},
      { $match: { appointmentCount: { $gt: 1 } } },
      { $lookup: {
        from: 'clients',
        localField: '_id',
        foreignField: '_id',
        as: 'clientDetails'
      }},
      { $unwind: '$clientDetails' },
      { $project: {
        _id: 1,
        appointmentCount: 1,
        firstAppointment: 1,
        lastAppointment: 1,
        name: '$clientDetails.name',
        surName: '$clientDetails.surName',
        trustRating: '$clientDetails.trustRating',
        daysSinceLastAppointment: {
          $dateDiff: {
            startDate: '$lastAppointment',
            endDate: '$$NOW',
            unit: 'day'
          }
        }
      }},
      { $sort: { appointmentCount: -1 } }
    ]);
    
    res.json(returnClients);
  } catch (err) {
    logger.error(`Error fetching client retention: ${err.message}`);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
