const mongoose = require('mongoose');

const analyticsSchema = new mongoose.Schema({
  urlId: { type: mongoose.Schema.Types.ObjectId, ref: 'URL', required: true },
  userAgent: { type: String, required: true },
  ip: { type: String, required: true },
  geolocation: {
    city: { type: String },
    region: { type: String },
    country: { type: String }
  }
}, { timestamps: true });

const Analytics = new mongoose.model("Analytics", analyticsSchema);
module.exports = Analytics;