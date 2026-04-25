require('dotenv').config();

const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');

const User = require('./models/User');
const Complaint = require('./models/Complaint');
const Category = require('./models/Category');

const authRoutes = require('./routes/authRoutes');
const complaintRoutes = require('./routes/complaintRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const officerRoutes = require('./routes/officerRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const adminRoutes = require('./routes/adminRoutes');
const { complaintUploadErrorHandler } = require('./middleware/uploadMiddleware');

const app = express();
let initPromise = null;

app.use(cors());
app.use(express.json());

function getInitPromise() {
  if (!initPromise) {
    initPromise = (async () => {
      await connectDB(process.env.MONGODB_URI);
      await seedCategories();
      await seedDemoUsers();
      await seedDemoComplaints();
    })().catch((error) => {
      initPromise = null;
      throw error;
    });
  }
  return initPromise;
}

app.use(async (_req, res, next) => {
  try {
    await getInitPromise();
    return next();
  } catch (error) {
    return res.status(500).json({ message: 'Initialization failed', error: error.message });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/officers', officerRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/admin', adminRoutes);

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, timestamp: new Date().toISOString() });
});

app.use(complaintUploadErrorHandler);

app.use((_req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

app.use((error, _req, res, _next) => {
  return res.status(500).json({ message: 'Internal server error', error: error.message });
});

async function seedDemoUsers() {
  if (String(process.env.SEED_DEMO_USERS).toLowerCase() !== 'true') return;

  const demos = [
    {
      name: 'Rajesh Kumar',
      firstName: 'Rajesh',
      lastName: 'Kumar',
      email: 'citizen@civic.gov',
      role: 'citizen',
      ward: 'Ward 7',
      phone: '9999999999',
      password: 'password123'
    },
    {
      name: 'Ravi Kumar',
      firstName: 'Ravi',
      lastName: 'Kumar',
      email: 'officer@civic.gov',
      officialEmail: 'officer@civic.gov',
      employeeId: 'EMP-0042',
      role: 'officer',
      phone: '8888888888',
      department: 'Roads',
      designation: 'Level 2',
      zoneWardAssigned: 'Ward 7',
      password: 'password123'
    },
    {
      name: 'Admin User',
      email: 'admin@civic.gov',
      employeeId: 'ADMIN-0001',
      role: 'admin',
      ward: 'Central',
      password: 'password123'
    }
  ];

  for (const d of demos) {
    const passwordHash = await User.hashPassword(d.password);
    const setPayload = {
      name: d.name,
      firstName: d.firstName || '',
      lastName: d.lastName || '',
      email: d.email,
      role: d.role,
      ward: d.ward,
      phone: d.phone || '',
      department: d.department || '',
      designation: d.designation || '',
      zoneWardAssigned: d.zoneWardAssigned || '',
      passwordHash
    };

    const unsetPayload = {};
    if (d.officialEmail) {
      setPayload.officialEmail = d.officialEmail;
    } else {
      unsetPayload.officialEmail = '';
    }

    if (d.employeeId) {
      setPayload.employeeId = d.employeeId;
    } else {
      unsetPayload.employeeId = '';
    }

    await User.findOneAndUpdate(
      { email: d.email },
      {
        $set: setPayload,
        ...(Object.keys(unsetPayload).length > 0 ? { $unset: unsetPayload } : {})
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true
      }
    );
  }
}

async function seedDemoComplaints() {
  if (String(process.env.SEED_DEMO_USERS).toLowerCase() !== 'true') return;

  const count = await Complaint.countDocuments();
  if (count > 0) return;

  const citizen = await User.findOne({ email: 'citizen@civic.gov' });
  const officer = await User.findOne({ email: 'officer@civic.gov' });
  if (!citizen) return;

  const year = new Date().getFullYear();
  await Complaint.insertMany([
    {
      trackingId: `CMP-${year}-2101`,
      title: 'Pothole on MG Road',
      description: 'Large pothole causing traffic delays and minor accidents.',
      category: 'Road',
      priority: 'High',
      status: 'In Progress',
      ward: 'Ward 7 - MG Road',
      location: 'Near bus stop, MG Road',
      submittedBy: citizen._id,
      assignedTo: officer ? officer._id : null,
      timeline: [{ status: 'Open', note: 'Complaint submitted' }, { status: 'In Progress', note: 'Assigned to ward officer' }]
    },
    {
      trackingId: `CMP-${year}-2102`,
      title: 'Water Supply Disruption',
      description: 'No water supply for over 10 hours in Sector 14.',
      category: 'Water',
      priority: 'Critical',
      status: 'Escalated',
      ward: 'Sector 14',
      location: 'Sector 14 Colony',
      escalationLevel: 2,
      submittedBy: citizen._id,
      assignedTo: officer ? officer._id : null,
      timeline: [{ status: 'Open', note: 'Complaint submitted' }, { status: 'Escalated', note: 'Escalated to level 2' }]
    }
  ]);
}

async function seedCategories() {
  const defaults = [
    { name: 'Roads', description: 'Road damage, potholes, or blockage' },
    { name: 'Water', description: 'Water supply, leakage, or contamination' },
    { name: 'Sanitation', description: 'Cleanliness, sewage, and hygiene issues' },
    { name: 'Electricity', description: 'Street lights and electrical faults' },
    { name: 'Drainage', description: 'Drain blockage and overflow' },
    { name: 'Solid Waste', description: 'Garbage collection and disposal issues' }
  ];

  for (const item of defaults) {
    await Category.findOneAndUpdate(
      { name: item.name },
      { $setOnInsert: { ...item, isActive: true } },
      { upsert: true, new: true }
    );
  }
}

async function startLocalServer() {
  try {
    await getInitPromise();

    const port = Number(process.env.PORT || 5000);
    app.listen(port, () => {
      console.log(`Backend running on http://localhost:${port}`);
    });
  } catch (error) {
    console.error('Failed to start backend:', error);
  }
}
module.exports = app;

if (process.env.VERCEL !== '1') {
  startLocalServer();
}
