const mongoose = require('mongoose');

/**
 * Recovery checkpoint schema for Day 1, Day 5, Day 10 structured monitoring
 */
const checkpointSchema = new mongoose.Schema({
  day: {
    type: Number,
    required: true,
    enum: [1, 5, 10]
  },
  scan: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Scan',
    required: true
  },
  severity: {
    type: String,
    enum: ['healthy', 'early', 'moderate', 'severe'],
    required: true
  },
  severityPercentage: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  // Encircled image and heatmap for this checkpoint
  encircledImage: String,
  heatmapImage: String,
  // Notes from comparison with previous checkpoint
  notes: {
    en: { type: String, default: '' },
    fil: { type: String, default: '' }
  },
  scannedAt: {
    type: Date,
    default: Date.now
  }
}, { _id: true });

const recoverySessionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  // Initial scan that started this recovery session
  initialScan: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Scan',
    required: true
  },
  fruitType: {
    type: String,
    enum: ['mango', 'capsicum', 'banana', 'papaya', 'orange'],
    required: true
  },
  disease: {
    type: String,
    required: true
  },
  // Structured Day 1 / Day 5 / Day 10 checkpoints
  checkpoints: [checkpointSchema],
  // Overall progress status
  progressStatus: {
    type: String,
    enum: ['improving', 'worsening', 'stable', 'new_disease_found', 'resolved'],
    default: 'stable'
  },
  // Session status
  status: {
    type: String,
    enum: ['active', 'completed', 'abandoned'],
    default: 'active'
  },
  // Start date (Day 1)
  startDate: {
    type: Date,
    default: Date.now
  },
  // Expected follow-up dates
  expectedDay5: {
    type: Date
  },
  expectedDay10: {
    type: Date
  },
  completedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Auto-calculate expected follow-up dates
recoverySessionSchema.pre('save', function (next) {
  if (this.isNew) {
    const start = this.startDate || new Date();
    this.expectedDay5 = new Date(start.getTime() + 4 * 24 * 60 * 60 * 1000);  // Day 5
    this.expectedDay10 = new Date(start.getTime() + 9 * 24 * 60 * 60 * 1000); // Day 10
  }
  next();
});

module.exports = mongoose.model('RecoverySession', recoverySessionSchema);
