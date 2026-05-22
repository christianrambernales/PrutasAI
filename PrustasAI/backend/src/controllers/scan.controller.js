const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const Scan = require('../models/Scan');
const { getRemedy } = require('../utils/remedyDB');
const { getAdvisory } = require('../utils/advisory');

/**
 * Upload image and run full detection pipeline
 * POST /api/scan
 */
exports.scanImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image uploaded.' });
    }

    const language = req.user.preferredLanguage || 'en';
    const imagePath = req.file.path;

    // Send image to ML service for processing
    const formData = new FormData();
    formData.append('image', fs.createReadStream(imagePath));

    let mlResult;
    try {
      const mlResponse = await axios.post(
        `${process.env.ML_SERVICE_URL}/api/predict`,
        formData,
        {
          headers: formData.getHeaders(),
          timeout: 60000, // 60s timeout for ML processing
          maxContentLength: Infinity,
          maxBodyLength: Infinity
        }
      );
      mlResult = mlResponse.data;
    } catch (mlError) {
      console.error('[PrutasAI] ML Service error:', mlError.message);
      return res.status(503).json({
        error: 'ML service unavailable. Please try again later.'
      });
    }

    // Look up remedy from the validated database
    let remedy = { treatment: '', timing: '', dosage: '', prevention: '' };
    let advisory = '';

    if (!mlResult.is_healthy && mlResult.disease) {
      remedy = getRemedy(
        mlResult.fruit_type,
        mlResult.disease,
        mlResult.severity,
        language
      ) || remedy;
    }

    // Get environmental advisory
    advisory = getAdvisory(mlResult.fruit_type, 'general', language) || '';

    // Save scan result to database
    const scan = await Scan.create({
      user: req.user._id,
      originalImage: imagePath,
      encircledImage: mlResult.encircled_image_path || null,
      heatmapImage: mlResult.heatmap_image_path || null,
      fruitType: mlResult.fruit_type,
      fruitConfidence: mlResult.fruit_confidence,
      disease: mlResult.disease || 'healthy',
      diseaseConfidence: mlResult.disease_confidence || 0,
      isHealthy: mlResult.is_healthy,
      detectionRegion: mlResult.detection_region || {},
      severity: mlResult.is_healthy ? 'healthy' : mlResult.severity,
      severityPercentage: mlResult.severity_percentage || 0,
      remedy,
      advisory,
      language
    });

    res.status(201).json({
      message: 'Scan completed successfully.',
      scan: {
        id: scan._id,
        fruitType: scan.fruitType,
        fruitConfidence: scan.fruitConfidence,
        disease: scan.disease,
        diseaseConfidence: scan.diseaseConfidence,
        isHealthy: scan.isHealthy,
        severity: scan.severity,
        severityPercentage: scan.severityPercentage,
        remedy: scan.remedy,
        advisory: scan.advisory,
        encircledImage: scan.encircledImage,
        heatmapImage: scan.heatmapImage,
        createdAt: scan.createdAt
      }
    });
  } catch (error) {
    console.error('[PrutasAI] Scan error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get scan history (paginated)
 * GET /api/history?page=1&limit=20
 */
exports.getHistory = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const [scans, total] = await Promise.all([
      Scan.find({ user: req.user._id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Scan.countDocuments({ user: req.user._id })
    ]);

    res.json({
      scans,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get single scan by ID
 * GET /api/history/:id
 */
exports.getScanById = async (req, res) => {
  try {
    const scan = await Scan.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!scan) {
      return res.status(404).json({ error: 'Scan not found.' });
    }

    res.json({ scan });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Delete a scan
 * DELETE /api/history/:id
 */
exports.deleteScan = async (req, res) => {
  try {
    const scan = await Scan.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id
    });

    if (!scan) {
      return res.status(404).json({ error: 'Scan not found.' });
    }

    // Clean up uploaded files
    const filesToDelete = [scan.originalImage, scan.encircledImage, scan.heatmapImage]
      .filter(Boolean);

    for (const filePath of filesToDelete) {
      try {
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      } catch (e) { /* ignore cleanup errors */ }
    }

    res.json({ message: 'Scan deleted.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
