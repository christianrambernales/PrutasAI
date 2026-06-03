const mongoose = require('mongoose');

const diseaseSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  // Display names in both languages
  displayName: {
    en: { type: String, required: true },
    fil: { type: String, required: true }
  },
  fruitType: {
    type: String,
    enum: ['mango', 'capsicum', 'banana', 'papaya', 'orange'],
    required: true,
    index: true
  },
  description: {
    en: { type: String, default: '' },
    fil: { type: String, default: '' }
  },
  symptoms: {
    en: [{ type: String }],
    fil: [{ type: String }]
  },
  causes: {
    en: { type: String, default: '' },
    fil: { type: String, default: '' }
  },
  // Reference images for comparison
  referenceImages: [{
    url: String,
    caption: {
      en: String,
      fil: String
    }
  }],
  // Remedies by severity level (agriculturist-validated)
  remedies: {
    early: {
      treatment: { en: String, fil: String },
      timing: { en: String, fil: String },
      dosage: { en: String, fil: String },
      prevention: { en: String, fil: String }
    },
    moderate: {
      treatment: { en: String, fil: String },
      timing: { en: String, fil: String },
      dosage: { en: String, fil: String },
      prevention: { en: String, fil: String }
    },
    severe: {
      treatment: { en: String, fil: String },
      timing: { en: String, fil: String },
      dosage: { en: String, fil: String },
      prevention: { en: String, fil: String }
    }
  }
}, {
  timestamps: true
});

// Compound index for fruit+disease lookups
diseaseSchema.index({ fruitType: 1, name: 1 });

module.exports = mongoose.model('Disease', diseaseSchema);
