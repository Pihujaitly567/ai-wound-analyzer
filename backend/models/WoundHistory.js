const mongoose = require('mongoose');

const CheckinSchema = new mongoose.Schema({
  imagePath: { type: String, required: true },
  heatmapBase64: { type: String },
  date: { type: Date, default: Date.now },
  predictedClass: { type: String },
  userCorrection: { type: String }, // Used for Active Learning
  woundAreaPixels: { type: Number },
  woundAreaCm2: { type: Number },
  confidence: { type: Number },
  category: { type: String }, // 'Healing' or 'Risky'
  notes: { type: String },
  dynamicAnalysis: { type: String },
  remedies: [{ type: String }],
  cleaning: { type: String },
  doctor: { type: String },
  estimatedHealing: { type: String }
});

const WoundHistorySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true }, // e.g. "Left Knee Scrap"
  woundType: { type: String }, // Primary identified type
  status: { type: String, enum: ['Active', 'Healed'], default: 'Active' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  checkins: [CheckinSchema] // timeline of images and ai predictions
});

module.exports = mongoose.model('WoundHistory', WoundHistorySchema);
