// models/adminModel.js
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const adminSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    minlength: [3, 'Username must be at least 3 characters']
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email']
  },
  password: {
    type: String,
    required: true,
    minlength: [6, 'Password must be at least 6 characters']
  },
  fullName: {
    type: String,
    required: true,
    trim: true
  },
  lastLogin: {
    type: Date
  },
  isActive: {
    type: Boolean,
    default: true
  },
  resetCode: String,
  resetCodeExpire: Date,

}, { timestamps: true });

// 🔒 Hash password before saving
adminSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// 🔐 Compare entered password with stored hash
adminSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// 🧠 Prevent creation of more than one admin
adminSchema.pre('save', async function (next) {
  const existingAdmin = await mongoose.model('Admin').countDocuments();
  if (existingAdmin > 0 && this.isNew) {
    const err = new Error('Only one admin account is allowed.');
    return next(err);
  }
  next();
});

adminSchema.methods.generateResetCode = function() {
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  this.resetCode = code;
  this.resetCodeExpire = Date.now() + 10 * 60 * 1000; // 10 minutes
  return code;
};


export default mongoose.model('Admin', adminSchema);
