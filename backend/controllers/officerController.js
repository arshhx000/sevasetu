const User = require('../models/User');

exports.getOfficers = async (req, res) => {
  try {
    const includeInactive = String(req.query.includeInactive || '').toLowerCase() === 'true';
    const filter = { role: 'officer' };
    if (!includeInactive) {
      filter.isActive = true;
    }

    const officers = await User.find(filter)
      .select('-passwordHash')
      .sort({ createdAt: -1 });
    return res.json({ officers });
  } catch (error) {
    return res.status(500).json({ message: 'Could not load officers', error: error.message });
  }
};

exports.createOfficer = async (req, res) => {
  try {
    const {
      name,
      officialEmail,
      employeeId,
      department = '',
      designation = '',
      zoneWardAssigned = '',
      phone = '',
      password = 'password123'
    } = req.body;
    const cleanName = String(name || '').trim();
    const cleanOfficialEmail = String(officialEmail || '').trim().toLowerCase();
    const cleanEmployeeId = String(employeeId || '').trim().toUpperCase();

    if (!cleanName || !cleanOfficialEmail || !cleanEmployeeId) {
      return res.status(400).json({ message: 'Name, official email, and employee ID are required' });
    }

    if (!cleanOfficialEmail.endsWith('.gov.in')) {
      return res.status(400).json({ message: 'Official email must use the .gov.in domain' });
    }

    const existing = await User.findOne({
      $or: [{ email: cleanOfficialEmail }, { officialEmail: cleanOfficialEmail }, { employeeId: cleanEmployeeId }]
    });
    if (existing) return res.status(409).json({ message: 'Officer already exists with this email or employee ID' });

    const passwordHash = await User.hashPassword(password);
    const officer = await User.create({
      name: cleanName,
      email: cleanOfficialEmail,
      officialEmail: cleanOfficialEmail,
      employeeId: cleanEmployeeId,
      passwordHash,
      role: 'officer',
      ward: zoneWardAssigned,
      phone,
      department,
      designation,
      zoneWardAssigned,
      isActive: true
    });

    return res.status(201).json({
      officer: {
        id: officer._id,
        name: officer.name,
        email: officer.email,
        role: officer.role,
        employeeId: officer.employeeId,
        department: officer.department,
        designation: officer.designation,
        zoneWardAssigned: officer.zoneWardAssigned,
        isActive: officer.isActive
      }
    });
  } catch (error) {
    return res.status(500).json({ message: 'Could not create officer', error: error.message });
  }
};

exports.updateOfficerStatus = async (req, res) => {
  try {
    const { isActive } = req.body;
    if (typeof isActive !== 'boolean') {
      return res.status(400).json({ message: 'isActive must be a boolean' });
    }

    const officer = await User.findOne({ _id: req.params.id, role: 'officer' });
    if (!officer) return res.status(404).json({ message: 'Officer not found' });

    officer.isActive = isActive;
    await officer.save();

    return res.json({ officer });
  } catch (error) {
    return res.status(500).json({ message: 'Could not update officer status', error: error.message });
  }
};
