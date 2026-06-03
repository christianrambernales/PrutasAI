const mongoose = require('mongoose');

const scanSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  // Original uploaded image path
  originalImage: {
    type: String,
    required: true
  },
  // Image with encircled disease region overlay
  encircledImage: {
    type: String,
    default: null
  },
  // Grad-CAM XAI heatmap overlay image
  heatmapImage: {
    type: String,
    default: null
  },
  // Stage 1: Fruit classification result
  fruitType: {
    type: String,
    enum: ['mango', 'capsicum', 'banana', 'papaya', 'orange', 'unknown'],
    required: true
  },
  fruitConfidence: {
    type: Number,
    min: 0,
    max: 1,
    required: true
  },
  // Stage 2: Disease detection result
  disease: {
    type: String,
    required: true  // 'healthy' if no disease detected
  },
  diseaseConfidence: {
    type: Number,
    min: 0,
    max: 1,
    default: 0
  },
  isHealthy: {
    type: Boolean,
    default: false
  },
  // Bounding box / detection region
  detectionRegion: {
    x: { type: Number, default: 0 },
    y: { type: Number, default: 0 },
    width: { type: Number, default: 0 },
    height: { type: Number, default: 0 }
  },
  // Severity classification
  severity: {
    type: String,
    enum: ['healthy', 'early', 'moderate', 'severe'],
    default: 'healthy'
  },
  severityPercentage: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  // Remedy recommendation
  remedy: {
    treatment: { type: String, default: '' },
    timing: { type: String, default: '' },
    dosage: { type: String, default: '' },
    prevention: { type: String, default: '' }
  },
  // Environmental advisory
  advisory: {
    type: String,
    default: ''
  },
  // Language the results were generated in
  language: {
    type: String,
    enum: ['en', 'fil'],
    default: 'en'
  }
}, {
  timestamps: true
});

// Index for efficient history queries
scanSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('Scan', scanSchema);
