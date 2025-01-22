const mongoose = require('mongoose');

const urlSchema = new mongoose.Schema({
  longUrl: { type: String, required: true },
  shortUrl: { type: String, required: true, unique: true },
  customAlias: { type: String },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  topic: { type: String },
  clicks: { type: Number, default: 0 }
}, { timestamps: true });


const URL = new mongoose.model("URL", urlSchema);
module.exports = URL;
