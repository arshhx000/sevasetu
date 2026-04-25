const express = require('express');
const Complaint = require('../models/Complaint');
const { authRequired } = require('../middleware/auth');

const router = express.Router();

router.get('/stats', authRequired, async (req, res) => {
  try {
    const baseFilter = req.user.role === 'citizen' ? { submittedBy: req.user.id } : {};

    const [total, pending, criticalEscalated, resolved, recent] = await Promise.all([
      Complaint.countDocuments(baseFilter),
      Complaint.countDocuments({ ...baseFilter, status: { $in: ['Open', 'In Progress', 'Pending'] } }),
      Complaint.countDocuments({ ...baseFilter, $or: [{ priority: 'Critical' }, { status: 'Escalated' }] }),
      Complaint.countDocuments({ ...baseFilter, status: 'Resolved' }),
      Complaint.find(baseFilter).sort({ createdAt: -1 }).limit(5)
        .populate('submittedBy', 'name')
        .populate('assignedTo', 'name role')
    ]);

    return res.json({
      stats: {
        total,
        pending,
        criticalEscalated,
        resolved
      },
      recent
    });
  } catch (error) {
    return res.status(500).json({ message: 'Could not load dashboard stats.', error: error.message });
  }
});

module.exports = router;
