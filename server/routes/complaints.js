const express = require('express');
const Complaint = require('../models/Complaint');
const User = require('../models/User');
const { authRequired, allowRoles } = require('../middleware/auth');

const router = express.Router();

async function generateTrackingId() {
  const year = new Date().getFullYear();

  while (true) {
    const suffix = Math.floor(1000 + Math.random() * 9000);
    const trackingId = `CMP-${year}-${suffix}`;
    const exists = await Complaint.exists({ trackingId });
    if (!exists) return trackingId;
  }
}

router.post('/', authRequired, async (req, res) => {
  try {
    const {
      title,
      description,
      category,
      priority = 'Medium',
      ward,
      location,
      contactPhone = '',
      contactEmail = ''
    } = req.body;

    if (!title || !description || !category || !ward || !location) {
      return res.status(400).json({ message: 'Title, description, category, ward, and location are required.' });
    }

    const trackingId = await generateTrackingId();
    const firstOfficer = await User.findOne({ role: 'officer', ward }).select('_id');

    const complaint = await Complaint.create({
      trackingId,
      title,
      description,
      category,
      priority,
      ward,
      location,
      contactPhone,
      contactEmail,
      submittedBy: req.user.id,
      assignedTo: firstOfficer ? firstOfficer._id : null,
      timeline: [{ status: 'Open', note: 'Complaint submitted.' }]
    });

    const populated = await Complaint.findById(complaint._id)
      .populate('submittedBy', 'name email')
      .populate('assignedTo', 'name email role ward');

    return res.status(201).json({ complaint: populated });
  } catch (error) {
    return res.status(500).json({ message: 'Could not create complaint.', error: error.message });
  }
});

router.get('/', authRequired, async (req, res) => {
  try {
    const { q = '', status, category, priority, ward, limit = 50 } = req.query;
    const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 100);

    const filter = {};

    if (req.user.role === 'citizen') {
      filter.submittedBy = req.user.id;
    }

    if (status && status !== 'All') filter.status = status;
    if (category && category !== 'All') filter.category = category;
    if (priority && priority !== 'All') filter.priority = priority;
    if (ward && ward !== 'All') filter.ward = ward;

    if (q) {
      filter.$or = [
        { trackingId: { $regex: q, $options: 'i' } },
        { title: { $regex: q, $options: 'i' } },
        { category: { $regex: q, $options: 'i' } },
        { location: { $regex: q, $options: 'i' } }
      ];
    }

    const complaints = await Complaint.find(filter)
      .sort({ createdAt: -1 })
      .limit(safeLimit)
      .populate('submittedBy', 'name email')
      .populate('assignedTo', 'name email role ward');

    return res.json({ complaints });
  } catch (error) {
    return res.status(500).json({ message: 'Could not fetch complaints.', error: error.message });
  }
});

router.get('/track/:trackingId', async (req, res) => {
  try {
    const complaint = await Complaint.findOne({ trackingId: req.params.trackingId })
      .populate('submittedBy', 'name')
      .populate('assignedTo', 'name role');

    if (!complaint) {
      return res.status(404).json({ message: 'No complaint found for this tracking ID.' });
    }

    return res.json({ complaint });
  } catch (error) {
    return res.status(500).json({ message: 'Could not track complaint.', error: error.message });
  }
});

router.get('/:id', authRequired, async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id)
      .populate('submittedBy', 'name email')
      .populate('assignedTo', 'name email role ward');

    if (!complaint) {
      return res.status(404).json({ message: 'Complaint not found.' });
    }

    if (req.user.role === 'citizen' && complaint.submittedBy._id.toString() !== req.user.id) {
      return res.status(403).json({ message: 'You can only view your own complaints.' });
    }

    return res.json({ complaint });
  } catch (error) {
    return res.status(500).json({ message: 'Could not load complaint details.', error: error.message });
  }
});

router.patch('/:id/status', authRequired, allowRoles('officer', 'admin'), async (req, res) => {
  try {
    const { status, note = '', assignedTo } = req.body;

    if (!status) {
      return res.status(400).json({ message: 'Status is required.' });
    }

    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) {
      return res.status(404).json({ message: 'Complaint not found.' });
    }

    complaint.status = status;

    if (assignedTo) {
      complaint.assignedTo = assignedTo;
    }

    if (status === 'Escalated') {
      complaint.escalationLevel = Math.min(4, (complaint.escalationLevel || 1) + 1);
    }

    complaint.timeline.push({
      status,
      note: note || `Status changed to ${status}.`
    });

    await complaint.save();

    const populated = await Complaint.findById(complaint._id)
      .populate('submittedBy', 'name email')
      .populate('assignedTo', 'name email role ward');

    return res.json({ complaint: populated });
  } catch (error) {
    return res.status(500).json({ message: 'Could not update complaint status.', error: error.message });
  }
});

module.exports = router;
