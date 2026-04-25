require('dotenv').config();

const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');

const connectDB = require('./config/db');
const User = require('./models/User');
const Complaint = require('./models/Complaint');
const authRoutes = require('./routes/auth');
const complaintRoutes = require('./routes/complaints');
const dashboardRoutes = require('./routes/dashboard');
const officerRoutes = require('./routes/officers');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/officers', officerRoutes);

app.get('/api/health', (req, res) => {
  res.json({ ok: true, timestamp: new Date().toISOString() });
});

const projectRoot = path.join(__dirname, '..');
const reactBuildRoot = path.join(projectRoot, 'client', 'dist');
const legacyStaticFile = path.join(projectRoot, 'municipality-complaint-system.html');

if (fs.existsSync(reactBuildRoot)) {
  app.use(express.static(reactBuildRoot));

  app.get('/', (req, res) => {
    res.sendFile(path.join(reactBuildRoot, 'index.html'));
  });

  app.get(/^(?!\/api).*/, (req, res) => {
    res.sendFile(path.join(reactBuildRoot, 'index.html'));
  });
} else {
  app.use(express.static(projectRoot));

  app.get('/', (req, res) => {
    res.sendFile(legacyStaticFile);
  });
}

app.use((req, res) => {
  res.status(404).json({ message: 'Route not found.' });
});

async function seedDemoUsers() {
  if (String(process.env.SEED_DEMO_USERS).toLowerCase() !== 'true') {
    return;
  }

  const demoUsers = [
    {
      name: 'Rajesh Kumar',
      email: 'citizen@civic.gov',
      role: 'citizen',
      ward: 'Ward 7',
      password: 'password123'
    },
    {
      name: 'Ravi Kumar',
      email: 'officer@civic.gov',
      role: 'officer',
      ward: 'Ward 7',
      password: 'password123'
    },
    {
      name: 'Admin User',
      email: 'admin@civic.gov',
      role: 'admin',
      ward: 'Central',
      password: 'password123'
    }
  ];

  for (const entry of demoUsers) {
    const exists = await User.findOne({ email: entry.email });
    if (exists) continue;

    const passwordHash = await User.hashPassword(entry.password);
    await User.create({
      name: entry.name,
      email: entry.email,
      role: entry.role,
      ward: entry.ward,
      passwordHash
    });
  }

  console.log('Demo users ensured (citizen/officer/admin).');
}

async function seedDemoComplaints() {
  if (String(process.env.SEED_DEMO_USERS).toLowerCase() !== 'true') {
    return;
  }

  const existingCount = await Complaint.countDocuments();
  if (existingCount > 0) {
    return;
  }

  const citizen = await User.findOne({ email: 'citizen@civic.gov' });
  const officer = await User.findOne({ email: 'officer@civic.gov' });

  if (!citizen) {
    return;
  }

  const now = new Date();
  const demos = [
    {
      trackingId: `CMP-${now.getFullYear()}-2101`,
      title: 'Pothole on MG Road',
      description: 'Large pothole causing traffic delays and minor accidents.',
      category: 'Road',
      priority: 'High',
      status: 'In Progress',
      ward: 'Ward 7 - MG Road',
      location: 'Near bus stop, MG Road',
      escalationLevel: 1
    },
    {
      trackingId: `CMP-${now.getFullYear()}-2102`,
      title: 'Water Supply Disruption',
      description: 'No water supply for over 10 hours in Sector 14.',
      category: 'Water',
      priority: 'Critical',
      status: 'Escalated',
      ward: 'Sector 14',
      location: 'Sector 14 Colony',
      escalationLevel: 2
    },
    {
      trackingId: `CMP-${now.getFullYear()}-2103`,
      title: 'Street Light Not Working',
      description: 'Street light remains off after sunset.',
      category: 'Electrical',
      priority: 'Medium',
      status: 'Open',
      ward: 'Block C',
      location: 'Block C, Nehru Nagar',
      escalationLevel: 1
    }
  ];

  const docs = demos.map((item) => ({
    ...item,
    submittedBy: citizen._id,
    assignedTo: officer ? officer._id : null,
    timeline: [
      { status: 'Open', note: 'Complaint submitted.' },
      { status: item.status, note: `Updated to ${item.status}.` }
    ]
  }));

  await Complaint.insertMany(docs);
  console.log('Demo complaints seeded.');
}

async function startServer() {
  try {
    await connectDB(process.env.MONGODB_URI);
    await seedDemoUsers();
    await seedDemoComplaints();

    const port = Number(process.env.PORT || 5000);
    app.listen(port, () => {
      console.log(`Server running on http://localhost:${port}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
}

startServer();
