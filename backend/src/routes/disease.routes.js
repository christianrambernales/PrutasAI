const express = require('express');
const router = express.Router();
const diseaseController = require('../controllers/disease.controller');
const { authenticate } = require('../middleware/auth');

router.get('/', authenticate, diseaseController.getAllDiseases);
router.get('/fruits', authenticate, diseaseController.getSupportedFruits);
router.get('/:id', authenticate, diseaseController.getDiseaseById);

module.exports = router;
