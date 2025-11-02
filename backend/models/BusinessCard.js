const mongoose = require('mongoose');

const businessCardSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  event: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  jobTitle: {
    type: String,
    trim: true
  },
  company: {
    type: String,
    trim: true
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  phone: {
    type: String,
    trim: true
  },
  website: {
    type: String,
    trim: true
  },
  linkedin: {
    type: String,
    trim: true
  },
  twitter: {
    type: String,
    trim: true
  },
  bio: {
    type: String,
    trim: true,
    maxlength: 500
  },
  profileImage: {
    type: String,
    trim: true
  },
  qrCode: {
    type: String,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  exchanges: [{
    exchangedWith: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    exchangedAt: {
      type: Date,
      default: Date.now
    },
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event'
    }
  }]
}, {
  timestamps: true
});

// Index for better query performance
businessCardSchema.index({ user: 1, event: 1 }, { unique: true });
businessCardSchema.index({ event: 1 });
businessCardSchema.index({ user: 1 });

// Virtual for QR code data
businessCardSchema.virtual('qrCodeData').get(function() {
  return `${process.env.CLIENT_URL || 'http://localhost:3000'}/business-card/${this._id}`;
});

// Method to add exchange
businessCardSchema.methods.addExchange = function(userId, eventId) {
  // Check if exchange already exists
  const existingExchange = this.exchanges.find(
    exchange => exchange.exchangedWith.toString() === userId.toString() && 
                exchange.eventId.toString() === eventId.toString()
  );
  
  if (!existingExchange) {
    this.exchanges.push({
      exchangedWith: userId,
      eventId: eventId,
      exchangedAt: new Date()
    });
  }
  
  return this.save();
};

// Method to get exchanges for a specific event
businessCardSchema.methods.getEventExchanges = function(eventId) {
  return this.exchanges.filter(
    exchange => exchange.eventId.toString() === eventId.toString()
  );
};

// Static method to find cards by event
businessCardSchema.statics.findByEvent = function(eventId) {
  return this.find({ event: eventId, isActive: true })
    .populate('user', 'name email role')
    .sort({ createdAt: -1 });
};

// Static method to find user's card for specific event
businessCardSchema.statics.findUserCardForEvent = function(userId, eventId) {
  return this.findOne({ user: userId, event: eventId, isActive: true })
    .populate('user', 'name email role');
};

// Method to get card statistics
businessCardSchema.methods.getStats = function() {
  return {
    totalExchanges: this.exchanges.length,
    uniqueConnections: [...new Set(this.exchanges.map(ex => ex.exchangedWith.toString()))].length,
    lastExchange: this.exchanges.length > 0 ? 
      Math.max(...this.exchanges.map(ex => ex.exchangedAt.getTime())) : null
  };
};

// Pre-save middleware to generate QR code data
businessCardSchema.pre('save', function(next) {
  if (this.isNew || this.isModified('name') || this.isModified('email')) {
    // QR code will be generated on the frontend using the card ID
    this.qrCode = `business-card-${this._id}`;
  }
  next();
});

// Method to format card for vCard export
businessCardSchema.methods.toVCard = function() {
  const vCard = `BEGIN:VCARD
VERSION:3.0
FN:${this.name}
${this.company ? `ORG:${this.company}` : ''}
${this.jobTitle ? `TITLE:${this.jobTitle}` : ''}
EMAIL:${this.email}
${this.phone ? `TEL:${this.phone}` : ''}
${this.website ? `URL:${this.website}` : ''}
${this.linkedin ? `X-SOCIALPROFILE;TYPE=linkedin:${this.linkedin}` : ''}
${this.twitter ? `X-SOCIALPROFILE;TYPE=twitter:${this.twitter}` : ''}
${this.bio ? `NOTE:${this.bio}` : ''}
END:VCARD`;

  return vCard.split('\n').filter(line => line.trim() !== '').join('\n');
};

// Method to sanitize card data for public sharing
businessCardSchema.methods.toPublicJSON = function() {
  return {
    _id: this._id,
    name: this.name,
    jobTitle: this.jobTitle,
    company: this.company,
    email: this.email,
    phone: this.phone,
    website: this.website,
    linkedin: this.linkedin,
    twitter: this.twitter,
    bio: this.bio,
    profileImage: this.profileImage,
    qrCodeData: this.qrCodeData,
    createdAt: this.createdAt
  };
};

module.exports = mongoose.model('BusinessCard', businessCardSchema);