const mongoose = require('mongoose');

async function connectDB(uri) {
  if (!uri) {
    throw new Error('MONGODB_URI is required.');
  }

  mongoose.set('strictQuery', true);

  const connectOptions = { serverSelectionTimeoutMS: 10000 };
  const insecureTls = String(process.env.MONGODB_TLS_INSECURE || '').toLowerCase() === 'true';

  if (insecureTls) {
    connectOptions.tlsAllowInvalidCertificates = true;    console.warn('MongoDB TLS certificate validation is disabled (MONGODB_TLS_INSECURE=true). Use only for local development.');
  }

  await mongoose.connect(uri, connectOptions);
  console.log('MongoDB connected');
}

module.exports = connectDB;

