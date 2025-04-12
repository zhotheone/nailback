const mongoose = require('mongoose');

const ScheduleSchema = new mongoose.Schema({
  dayOfWeek: {
    type: Number,
    required: true,
    min: 0, // 0 = Неділя, 1 = Понеділок, ..., 6 = Субота
    max: 6
  },
  timeTable: {
    1: { type: String }, // час у форматі ГГ:ХХ
    2: { type: String },
    3: { type: String },
    4: { type: String }
  },
  isWeekend: { type: Boolean, default: false }
}, {
  timestamps: true
});

module.exports = mongoose.model('Schedule', ScheduleSchema);
