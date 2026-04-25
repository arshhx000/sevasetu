const Complaint = require('../models/Complaint');
const User = require('../models/User');
const Category = require('../models/Category');
const { MAX_COMPLAINT_IMAGES } = require('../middleware/uploadMiddleware');

function getExpectedResolutionDate(priority, baseDate = new Date()) {
  const dayOffsetByPriority = {
    Low: 10,
    Medium: 7,
    High: 4,
    Critical: 2
  };
  const offset = dayOffsetByPriority[priority] || dayOffsetByPriority.Medium;
  const expected = new Date(baseDate);
  expected.setDate(expected.getDate() + offset);
  return expected;
}

async function generateTrackingId() {
  const year = new Date().getFullYear();
  while (true) {
    const suffix = Math.floor(1000 + Math.random() * 9000);
    const trackingId = `CMP-${year}-${suffix}`;
    const exists = await Complaint.exists({ trackingId });
    if (!exists) return trackingId;
  }
}

exports.createComplaint = async (req, res) => {
  try {
    const { title, description, category, priority = 'Medium', ward, location, contactPhone = '', contactEmail = '' } = req.body;
    const files = Array.isArray(req.files) ? req.files : [];

    if (files.length === 0) {
      return res.status(400).json({ message: 'At least one image is required' });
    }

    if (files.length > MAX_COMPLAINT_IMAGES) {
      return res.status(400).json({ message: `Maximum ${MAX_COMPLAINT_IMAGES} images are allowed` });
    }

    const imageUrls = files
      .map((file) => file.path || file.secure_url)
      .filter(Boolean);

    if (imageUrls.length === 0) {
      return res.status(400).json({ message: 'Image upload failed. Please try again.' });
    }

    const categoryExists = await Category.exists({ name: category, isActive: true });
    if (!categoryExists) {
      return res.status(400).json({ message: 'Selected complaint category is invalid or inactive' });
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
      images: imageUrls,
      submittedBy: req.user.id,
      assignedTo: firstOfficer ? firstOfficer._id : null,
      expectedResolutionDate: getExpectedResolutionDate(priority),
      timeline: [{ status: 'Open', note: 'Complaint submitted' }]
    });

    const populated = await Complaint.findById(complaint._id).populate('submittedBy', 'name email').populate('assignedTo', 'name role ward');
    return res.status(201).json({ complaint: populated });
  } catch (error) {
    return res.status(500).json({ message: 'Could not create complaint', error: error.message });
  }
};

exports.getComplaints = async (req, res) => {
  try {
    const { q = '', status, category, priority, ward, fromDate, toDate, limit = 50 } = req.query;
    const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 100);

    const filter = {};
    if (req.user.role === 'citizen') filter.submittedBy = req.user.id;

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

    if (fromDate || toDate) {
      const dateFilter = {};
      if (fromDate) {
        const parsedFrom = new Date(fromDate);
        if (!Number.isNaN(parsedFrom.getTime())) {
          dateFilter.$gte = parsedFrom;
        }
      }
      if (toDate) {
        const parsedTo = new Date(toDate);
        if (!Number.isNaN(parsedTo.getTime())) {
          parsedTo.setHours(23, 59, 59, 999);
          dateFilter.$lte = parsedTo;
        }
      }
      if (Object.keys(dateFilter).length > 0) {
        filter.createdAt = dateFilter;
      }
    }

    const complaints = await Complaint.find(filter)
      .sort({ createdAt: -1 })
      .limit(safeLimit)
      .populate('submittedBy', 'name email')
      .populate('assignedTo', 'name role ward');

    return res.json({ complaints });
  } catch (error) {
    return res.status(500).json({ message: 'Could not fetch complaints', error: error.message });
  }
};

exports.trackComplaint = async (req, res) => {
  try {
    const complaint = await Complaint.findOne({ trackingId: req.params.trackingId }).populate('submittedBy', 'name email').populate('assignedTo', 'name role ward');

    if (!complaint) return res.status(404).json({ message: 'No complaint found for this tracking ID' });
    return res.json({ complaint });
  } catch (error) {
    return res.status(500).json({ message: 'Could not track complaint', error: error.message });
  }
};

exports.getComplaintById = async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id).populate('submittedBy', 'name email').populate('assignedTo', 'name role ward');

    if (!complaint) return res.status(404).json({ message: 'Complaint not found' });
    if (req.user.role === 'citizen' && complaint.submittedBy._id.toString() !== req.user.id) {
      return res.status(403).json({ message: 'You can only view your own complaints' });
    }
    return res.json({ complaint });
  } catch (error) {
    return res.status(500).json({ message: 'Could not load complaint details', error: error.message });
  }
};

exports.updateComplaint = async (req, res) => {
  try {
    const { title, description, category, priority, ward, location, status, assignedTo, note } = req.body;
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) return res.status(404).json({ message: 'Complaint not found' });

    if (req.user.role === 'citizen' && complaint.submittedBy.toString() !== req.user.id) {
      return res.status(403).json({ message: 'You can only update your own complaints' });
    }

    if (title !== undefined) complaint.title = title;
    if (description !== undefined) complaint.description = description;
    if (category !== undefined) {
      const categoryExists = await Category.exists({ name: category, isActive: true });
      if (!categoryExists) {
        return res.status(400).json({ message: 'Selected complaint category is invalid or inactive' });
      }
      complaint.category = category;
    }
    if (priority !== undefined) {
      complaint.priority = priority;
      if (complaint.status !== 'Resolved') {
        complaint.expectedResolutionDate = getExpectedResolutionDate(priority, complaint.createdAt || new Date());
      }
    }
    if (ward !== undefined) complaint.ward = ward;
    if (location !== undefined) complaint.location = location;
    if (status !== undefined) complaint.status = status;
    if (assignedTo !== undefined) {
      if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Only admin can reassign complaints' });
      }

      if (!assignedTo) {
        complaint.assignedTo = null;
      } else {
        const officer = await User.findOne({ _id: assignedTo, role: 'officer', isActive: true }).select('_id');
        if (!officer) {
          return res.status(400).json({ message: 'Assigned officer not found or inactive' });
        }
        complaint.assignedTo = officer._id;
      }
    }

    if (status === 'Escalated') {
      complaint.escalationLevel = Math.min(4, (complaint.escalationLevel || 1) + 1);
    }

    if (status === 'Resolved') {
      complaint.resolvedAt = new Date();
    } else if (status && complaint.status !== 'Resolved') {
      complaint.resolvedAt = null;
      complaint.expectedResolutionDate = complaint.expectedResolutionDate || getExpectedResolutionDate(complaint.priority, complaint.createdAt || new Date());
    }

    complaint.timeline.push({ status: complaint.status, note: note || `Updated to ${complaint.status}` });
    await complaint.save();

    const populated = await Complaint.findById(complaint._id).populate('submittedBy', 'name email').populate('assignedTo', 'name role ward');
    return res.json({ complaint: populated });
  } catch (error) {
    return res.status(500).json({ message: 'Could not update complaint', error: error.message });
  }
};

exports.respondToOfficerRequest = async (req, res) => {
  try {
    const { message } = req.body;
    const complaint = await Complaint.findById(req.params.id);

    if (!complaint) return res.status(404).json({ message: 'Complaint not found' });
    if (complaint.submittedBy.toString() !== req.user.id) {
      return res.status(403).json({ message: 'You can only respond on your own complaints' });
    }

    const cleanMessage = String(message || '').trim();
    if (!cleanMessage) {
      return res.status(400).json({ message: 'Response message is required' });
    }

    complaint.timeline.push({ status: complaint.status, note: `Citizen details: ${cleanMessage}` });

    if (complaint.status === 'Pending') {
      complaint.status = 'In Progress';
      complaint.timeline.push({ status: complaint.status, note: 'Citizen provided requested details.' });
    }

    await complaint.save();

    const populated = await Complaint.findById(complaint._id).populate('submittedBy', 'name email').populate('assignedTo', 'name role ward');

    return res.json({ complaint: populated });
  } catch (error) {
    return res.status(500).json({ message: 'Could not submit additional details', error: error.message });
  }
};

exports.deleteComplaint = async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) return res.status(404).json({ message: 'Complaint not found' });

    const isOwner = complaint.submittedBy.toString() === req.user.id;
    const canDelete = req.user.role === 'admin' || req.user.role === 'officer' || isOwner;
    if (!canDelete) return res.status(403).json({ message: 'Forbidden to delete this complaint' });

    await complaint.deleteOne();
    return res.json({ message: 'Complaint deleted' });
  } catch (error) {
    return res.status(500).json({ message: 'Could not delete complaint', error: error.message });
  }
};
