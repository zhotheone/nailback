const mongoose = require('mongoose');

const ClientSchema = new mongoose.Schema({
  name: { type: String, required: true },
  surName: { type: String, required: true },
  phoneNum: { type: String, required: true },
  instagram: { type: String },
  trustRating: { type: Number, default: 5, min: 1, max: 5 }
}, {
  timestamps: true
});

module.exports = mongoose.model('Client', ClientSchema);
