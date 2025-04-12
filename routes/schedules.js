const express = require('express');
const router = express.Router();
const Schedule = require('../models/Schedule');

// Get all schedules
router.get('/', async (req, res) => {
  try {
    const schedules = await Schedule.find({});
    res.json(schedules);
  } catch (error) {
    console.error('Error fetching schedules:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get a specific schedule by day
router.get('/:dayOfWeek', async (req, res) => {
  try {
    const dayOfWeek = parseInt(req.params.dayOfWeek);
    const schedule = await Schedule.findOne({ dayOfWeek });
    
    if (!schedule) {
      return res.status(404).json({ message: 'Schedule not found' });
    }
    
    res.json(schedule);
  } catch (error) {
    console.error('Error fetching schedule:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create a new schedule
router.post('/', async (req, res) => {
  try {
    const { dayOfWeek, timeTable, isWeekend } = req.body;
    
    // Check if schedule already exists for this day
    const existingSchedule = await Schedule.findOne({ dayOfWeek });
    if (existingSchedule) {
      return res.status(400).json({ message: 'Schedule already exists for this day' });
    }
    
    const newSchedule = new Schedule({
      dayOfWeek,
      timeTable,
      isWeekend
    });
    
    await newSchedule.save();
    res.status(201).json(newSchedule);
  } catch (error) {
    console.error('Error creating schedule:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update a schedule
router.put('/:id', async (req, res) => {
  try {
    const { dayOfWeek, timeTable, isWeekend } = req.body;
    
    const updatedSchedule = await Schedule.findByIdAndUpdate(
      req.params.id,
      { dayOfWeek, timeTable, isWeekend },
      { new: true }
    );
    
    if (!updatedSchedule) {
      return res.status(404).json({ message: 'Schedule not found' });
    }
    
    res.json(updatedSchedule);
  } catch (error) {
    console.error('Error updating schedule:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete a schedule
router.delete('/:id', async (req, res) => {
  try {
    const deletedSchedule = await Schedule.findByIdAndDelete(req.params.id);
    
    if (!deletedSchedule) {
      return res.status(404).json({ message: 'Schedule not found' });
    }
    
    res.json({ message: 'Schedule deleted successfully' });
  } catch (error) {
    console.error('Error deleting schedule:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
