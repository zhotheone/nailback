const mongoose = require('mongoose');

const ProcedureSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  timeToComplete: { type: Number, required: true } // у хвилинах
}, {
  timestamps: true
});

module.exports = mongoose.model('Procedure', ProcedureSchema);
