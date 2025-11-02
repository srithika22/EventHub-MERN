const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
  },
  password: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ['participant', 'organizer'],
    default: 'participant',
    required: true,
  },
  phone: {
    type: String,
    default: ''
  },
  bio: {
    type: String,
    default: ''
  },
  organization: {
    type: String,
    default: ''
  },
  website: {
    type: String,
    default: ''
  },
  preferences: {
    emailNotifications: { type: Boolean, default: true },
    smsNotifications: { type: Boolean, default: false },
    marketingEmails: { type: Boolean, default: true },
    eventReminders: { type: Boolean, default: true },
    participantUpdates: { type: Boolean, default: true }
  },
  security: {
    twoFactorAuth: { type: Boolean, default: false },
    loginAlerts: { type: Boolean, default: true },
    passwordLastChanged: { type: Date, default: Date.now }
  },
  organizationDetails: {
    name: { type: String, default: '' },
    type: { 
      type: String, 
      enum: ['company', 'nonprofit', 'government', 'education', 'individual'],
      default: 'company'
    },
    address: { type: String, default: '' },
    taxId: { type: String, default: '' },
    website: { type: String, default: '' }
  },
  networkingProfile: {
    bio: { type: String, default: '' },
    jobTitle: { type: String, default: '' },
    company: { type: String, default: '' },
    skills: [{ type: String }],
    interests: [{ type: String }],
    industry: { type: String, default: '' },
    linkedinUrl: { type: String, default: '' },
    twitterUrl: { type: String, default: '' },
    websiteUrl: { type: String, default: '' },
    availableForNetworking: { type: Boolean, default: false },
    lookingFor: { type: String, default: '' },
    canOffer: { type: String, default: '' }
  }
}, {
  timestamps: true
});

// This function hashes the password before saving a new user
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// This function helps compare passwords during login
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model('User', userSchema);
module.exports = User;