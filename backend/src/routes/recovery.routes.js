const express = require('express');
const router = express.Router();
const recoveryController = require('../controllers/recovery.controller');
const { authenticate } = require('../middleware/auth');

router.post('/', authenticate, recoveryController.startSession);
router.get('/', authenticate, recoveryController.getSessions);
router.get('/:id', authenticate, recoveryController.getReport);
router.post('/:id/follow-up', authenticate, recoveryController.addFollowUp);
router.patch('/:id/resolve', authenticate, recoveryController.resolveSession);

module.exports = router;
