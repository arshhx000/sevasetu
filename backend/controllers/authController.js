const jwt = require('jsonwebtoken');
const User = require('../models/User');

function signToken(user) {
  return jwt.sign(
    { id: user._id.toString(), email: user.email, role: user.role, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

function serializeUser(user) {
  return {
    id: user._id,
    name: user.name,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    officialEmail: user.officialEmail,
    employeeId: user.employeeId,
    role: user.role,
    ward: user.ward,
    zoneWardAssigned: user.zoneWardAssigned,
    phone: user.phone,
    department: user.department,
    designation: user.designation
  };
}

function cleanText(value) {
  return String(value || '').trim();
}

function buildName(parts) {
  return parts.map((part) => cleanText(part)).filter(Boolean).join(' ');
}

exports.register = async (req, res) => {
  try {
    const { role = 'citizen' } = req.body;

    if (role === 'admin') {
      return res.status(403).json({ message: 'Admin accounts cannot be self-registered' });
    }

    if (role === 'citizen') {
      const { firstName, lastName, email, phone, ward, password, confirmPassword, termsAccepted } = req.body;
      const cleanFirstName = cleanText(firstName);
      const cleanLastName = cleanText(lastName);
      const cleanEmail = cleanText(email).toLowerCase();
      const cleanPhone = cleanText(phone);
      const cleanWard = cleanText(ward);

      if (!cleanFirstName || !cleanLastName || !cleanEmail || !cleanPhone || !cleanWard || !cleanText(password)) {
        return res.status(400).json({ message: 'Please complete all required citizen signup fields' });
      }

      if (password !== confirmPassword) {
        return res.status(400).json({ message: 'Passwords do not match' });
      }

      if (!termsAccepted) {
        return res.status(400).json({ message: 'You must accept the terms and conditions' });
      }

      const existing = await User.findOne({ $or: [{ email: cleanEmail }, { phone: cleanPhone }] });
      if (existing) return res.status(409).json({ message: 'User already exists with this email or phone' });

      const passwordHash = await User.hashPassword(password);
      const user = await User.create({
        firstName: cleanFirstName,
        lastName: cleanLastName,
        name: buildName([cleanFirstName, cleanLastName]),
        email: cleanEmail,
        passwordHash,
        role,
        ward: cleanWard,
        phone: cleanPhone,
        termsAcceptedAt: new Date()
      });

      const token = signToken(user);
      return res.status(201).json({ token, user: serializeUser(user) });
    }

    if (role === 'officer') {
      const {
        fullName,
        employeeId,
        officialEmail,
        phone,
        department,
        designation,
        zoneWardAssigned,
        password,
        confirmPassword,
        termsAccepted
      } = req.body;
      const cleanFullName = cleanText(fullName);
      const cleanEmployeeId = cleanText(employeeId).toUpperCase();
      const cleanOfficialEmail = cleanText(officialEmail).toLowerCase();
      const cleanPhone = cleanText(phone);
      const cleanDepartment = cleanText(department);
      const cleanDesignation = cleanText(designation);
      const cleanZoneWardAssigned = cleanText(zoneWardAssigned);

      if (!cleanFullName || !cleanEmployeeId || !cleanOfficialEmail || !cleanPhone || !cleanDepartment || !cleanDesignation || !cleanZoneWardAssigned || !cleanText(password)) {
        return res.status(400).json({ message: 'Please complete all required officer signup fields' });
      }

      if (!cleanOfficialEmail.endsWith('.gov.in')) {
        return res.status(400).json({ message: 'Official email must use the .gov.in domain' });
      }

      if (password !== confirmPassword) {
        return res.status(400).json({ message: 'Passwords do not match' });
      }

      if (!termsAccepted) {
        return res.status(400).json({ message: 'You must accept the terms and conditions' });
      }

      const existing = await User.findOne({
        $or: [{ employeeId: cleanEmployeeId }, { email: cleanOfficialEmail }, { officialEmail: cleanOfficialEmail }, { phone: cleanPhone }]
      });
      if (existing) return res.status(409).json({ message: 'User already exists with this employee ID, email, or phone' });

      const passwordHash = await User.hashPassword(password);
      const user = await User.create({
        name: cleanFullName,
        employeeId: cleanEmployeeId,
        officialEmail: cleanOfficialEmail,
        email: cleanOfficialEmail,
        passwordHash,
        role,
        phone: cleanPhone,
        department: cleanDepartment,
        designation: cleanDesignation,
        zoneWardAssigned: cleanZoneWardAssigned,
        termsAcceptedAt: new Date()
      });

      const token = signToken(user);
      return res.status(201).json({ token, user: serializeUser(user) });
    }

    return res.status(400).json({ message: 'Unsupported role for registration' });
  } catch (error) {
    return res.status(500).json({ message: 'Registration failed', error: error.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { identifier, password, role, department } = req.body;
    const cleanIdentifier = cleanText(identifier);
    const cleanRole = cleanText(role);

    if (!cleanIdentifier || !cleanText(password) || !cleanRole) {
      return res.status(400).json({ message: 'Identifier, role, and password are required' });
    }

    let user = null;
    if (cleanRole === 'citizen') {
      user = await User.findOne({
        role: 'citizen',
        $or: [{ email: cleanIdentifier.toLowerCase() }, { phone: cleanIdentifier }]
      });
    } else if (cleanRole === 'officer') {
      user = await User.findOne({
        role: 'officer',
        $or: [
          { employeeId: cleanIdentifier.toUpperCase() },
          { email: cleanIdentifier.toLowerCase() },
          { officialEmail: cleanIdentifier.toLowerCase() }
        ]
      });
    } else if (cleanRole === 'admin') {
      user = await User.findOne({
        role: 'admin',
        $or: [
          { employeeId: cleanIdentifier.toUpperCase() },
          { email: cleanIdentifier.toLowerCase() },
          { officialEmail: cleanIdentifier.toLowerCase() }
        ]
      });
    } else {
      return res.status(400).json({ message: 'Unsupported role for login' });
    }

    if (!user) return res.status(401).json({ message: 'Invalid credentials' });
    if (user.role === 'officer' && !user.isActive) {
      return res.status(403).json({ message: 'Officer account is deactivated. Contact admin.' });
    }

    const isValid = await user.comparePassword(password);
    if (!isValid) return res.status(401).json({ message: 'Invalid credentials' });

    if (cleanRole === 'officer' && department && cleanText(department) && user.department !== cleanText(department)) {
      return res.status(403).json({ message: 'Department does not match this officer account' });
    }

    const token = signToken(user);
    return res.json({ token, user: serializeUser(user) });
  } catch (error) {
    return res.status(500).json({ message: 'Login failed', error: error.message });
  }
};

exports.me = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-passwordHash');
    if (!user) return res.status(404).json({ message: 'User not found' });
    return res.json({ user });
  } catch (error) {
    return res.status(500).json({ message: 'Could not load profile', error: error.message });
  }
};
