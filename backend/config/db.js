const mongoose = require('mongoose');

async function connectDB(uri) {
  if (!uri) throw new Error('MONGODB_URI is required.');

  const options = { serverSelectionTimeoutMS: 10000 };
  if (String(process.env.MONGODB_TLS_INSECURE || '').toLowerCase() === 'true') {
    options.tlsAllowInvalidCertificates = true;
    console.warn('MongoDB TLS certificate validation is disabled (development only).');
  }

  await mongoose.connect(uri, options);
  console.log('MongoDB connected');
}

module.exports = connectDB;
