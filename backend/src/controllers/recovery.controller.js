const RecoverySession = require('../models/RecoverySession');
const Scan = require('../models/Scan');

/**
 * Start a new recovery session from an existing scan
 * POST /api/recovery
 */
exports.startSession = async (req, res) => {
  try {
    const { scanId } = req.body;

    const scan = await Scan.findOne({ _id: scanId, user: req.user._id });
    if (!scan) {
      return res.status(404).json({ error: 'Scan not found.' });
    }
    if (scan.isHealthy) {
      return res.status(400).json({ error: 'Cannot start recovery for a healthy scan.' });
    }

    // Check for existing active session for same scan
    const existing = await RecoverySession.findOne({
      initialScan: scanId,
      status: 'active'
    });
    if (existing) {
      return res.status(400).json({
        error: 'Active recovery session already exists for this scan.',
        sessionId: existing._id
      });
    }

    const session = await RecoverySession.create({
      user: req.user._id,
      initialScan: scanId,
      fruitType: scan.fruitType,
      disease: scan.disease,
      checkpoints: [{
        day: 1,
        scan: scan._id,
        severity: scan.severity,
        severityPercentage: scan.severityPercentage,
        encircledImage: scan.encircledImage,
        heatmapImage: scan.heatmapImage,
        scannedAt: scan.createdAt
      }]
    });

    res.status(201).json({
      message: 'Recovery session started.',
      session: {
        id: session._id,
        fruitType: session.fruitType,
        disease: session.disease,
        startDate: session.startDate,
        expectedDay5: session.expectedDay5,
        expectedDay10: session.expectedDay10,
        checkpoints: session.checkpoints,
        progressStatus: session.progressStatus
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * List user's recovery sessions
 * GET /api/recovery?status=active
 */
exports.getSessions = async (req, res) => {
  try {
    const filter = { user: req.user._id };
    if (req.query.status) filter.status = req.query.status;

    const sessions = await RecoverySession.find(filter)
      .sort({ createdAt: -1 })
      .populate('initialScan', 'fruitType disease severity originalImage')
      .lean();

    res.json({ sessions });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get recovery report (structured Day 1/5/10 view)
 * GET /api/recovery/:id
 */
exports.getReport = async (req, res) => {
  try {
    const session = await RecoverySession.findOne({
      _id: req.params.id,
      user: req.user._id
    })
      .populate('initialScan')
      .populate('checkpoints.scan')
      .lean();

    if (!session) {
      return res.status(404).json({ error: 'Recovery session not found.' });
    }

    res.json({ session });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Add follow-up scan (Day 5 or Day 10)
 * POST /api/recovery/:id/follow-up
 */
exports.addFollowUp = async (req, res) => {
  try {
    const { scanId } = req.body;

    const session = await RecoverySession.findOne({
      _id: req.params.id,
      user: req.user._id,
      status: 'active'
    });

    if (!session) {
      return res.status(404).json({ error: 'Active recovery session not found.' });
    }

    const scan = await Scan.findOne({ _id: scanId, user: req.user._id });
    if (!scan) {
      return res.status(404).json({ error: 'Scan not found.' });
    }

    // Determine which day this follow-up is for
    const existingDays = session.checkpoints.map(cp => cp.day);
    let nextDay;
    if (!existingDays.includes(5)) {
      nextDay = 5;
    } else if (!existingDays.includes(10)) {
      nextDay = 10;
    } else {
      return res.status(400).json({ error: 'All checkpoints (Day 1, 5, 10) already completed.' });
    }

    // Determine progress status by comparing with previous checkpoint
    const prevCheckpoint = session.checkpoints[session.checkpoints.length - 1];
    let progressStatus = 'stable';

    if (scan.isHealthy) {
      progressStatus = 'resolved';
    } else if (scan.disease !== session.disease) {
      progressStatus = 'new_disease_found';
    } else if (scan.severityPercentage < prevCheckpoint.severityPercentage) {
      progressStatus = 'improving';
    } else if (scan.severityPercentage > prevCheckpoint.severityPercentage) {
      progressStatus = 'worsening';
    }

    session.checkpoints.push({
      day: nextDay,
      scan: scan._id,
      severity: scan.severity,
      severityPercentage: scan.severityPercentage,
      encircledImage: scan.encircledImage,
      heatmapImage: scan.heatmapImage,
      scannedAt: new Date()
    });

    session.progressStatus = progressStatus;

    // Auto-complete if Day 10 is done or disease is resolved
    if (nextDay === 10 || progressStatus === 'resolved') {
      session.status = 'completed';
      session.completedAt = new Date();
    }

    await session.save();

    res.json({
      message: `Day ${nextDay} follow-up recorded.`,
      progressStatus: session.progressStatus,
      session: {
        id: session._id,
        status: session.status,
        checkpoints: session.checkpoints,
        progressStatus: session.progressStatus
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Mark session as resolved or abandoned
 * PATCH /api/recovery/:id/resolve
 */
exports.resolveSession = async (req, res) => {
  try {
    const { status } = req.body; // 'completed' or 'abandoned'

    if (!['completed', 'abandoned'].includes(status)) {
      return res.status(400).json({ error: 'Status must be "completed" or "abandoned".' });
    }

    const session = await RecoverySession.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id, status: 'active' },
      {
        status,
        progressStatus: status === 'completed' ? 'resolved' : session?.progressStatus,
        completedAt: new Date()
      },
      { new: true }
    );

    if (!session) {
      return res.status(404).json({ error: 'Active recovery session not found.' });
    }

    res.json({ message: `Session marked as ${status}.`, session });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
