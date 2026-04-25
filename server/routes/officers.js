const express = require('express');
const User = require('../models/User');
const { authRequired, allowRoles } = require('../middleware/auth');

const router = express.Router();

router.get('/', authRequired, allowRoles('admin', 'officer'), async (req, res) => {
  try {
    const officers = await User.find({ role: 'officer' })
      .select('-passwordHash')
      .sort({ createdAt: -1 });

    return res.json({ officers });
  } catch (error) {
    return res.status(500).json({ message: 'Could not load officers.', error: error.message });
  }
});

router.post('/', authRequired, allowRoles('admin'), async (req, res) => {
  try {
    const { name, email, password = 'password123', ward = '', phone = '' } = req.body;

    if (!name || !email) {
      return res.status(400).json({ message: 'Name and email are required.' });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ message: 'Officer already exists for this email.' });
    }

    const passwordHash = await User.hashPassword(password);

    const officer = await User.create({
      name,
      email: email.toLowerCase(),
      passwordHash,
      role: 'officer',
      ward,
      phone
    });

    return res.status(201).json({
      officer: {
        id: officer._id,
        name: officer.name,
        email: officer.email,
        role: officer.role,
        ward: officer.ward,
        phone: officer.phone
      }
    });
  } catch (error) {
    return res.status(500).json({ message: 'Could not create officer.', error: error.message });
  }
});

module.exports = router;
