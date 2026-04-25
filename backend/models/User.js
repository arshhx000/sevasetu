const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    firstName: { type: String, default: '', trim: true },
    lastName: { type: String, default: '', trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    officialEmail: { type: String, default: undefined, lowercase: true, trim: true, unique: true, sparse: true },
    employeeId: { type: String, default: undefined, trim: true, unique: true, sparse: true },
    department: { type: String, default: '' },
    designation: { type: String, default: '' },
    zoneWardAssigned: { type: String, default: '' },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['citizen', 'officer', 'admin'], default: 'citizen' },
    ward: { type: String, default: '' },
    phone: { type: String, default: '' },
    termsAcceptedAt: { type: Date, default: null },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

userSchema.methods.comparePassword = function comparePassword(password) {
  return bcrypt.compare(password, this.passwordHash);
};

userSchema.statics.hashPassword = function hashPassword(password) {
  return bcrypt.hash(password, 10);
};

module.exports = mongoose.model('User', userSchema);
