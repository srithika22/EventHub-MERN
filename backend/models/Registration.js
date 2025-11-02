const mongoose = require('mongoose');

const registrationSchema = new mongoose.Schema({
  event: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: true,
  },
  participant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  ticketTypeName: {
    type: String,
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    default: 1,
    min: 1
  },
  attendeeInfo: {
    name: {
      type: String,
      required: true
    },
    email: {
      type: String,
      required: true
    },
    phone: {
      type: String
    },
    address: {
      type: String
    },
    organization: {
      type: String
    },
    specialRequirements: {
      type: String
    }
  },
  preferences: {
    subscribeNewsletter: {
      type: Boolean,
      default: false
    }
  },
  status: {
    type: String,
    enum: ['confirmed', 'canceled', 'attended'],
    default: 'confirmed'
  },
  ticketCode: {
    type: String
  }
}, { timestamps: true });

// Generate a unique ticket code before saving
registrationSchema.pre('save', function(next) {
  if (!this.ticketCode) {
    this.ticketCode = Math.random().toString(36).substring(2, 10).toUpperCase();
  }
  next();
});

// Prevent a user from registering for the same event twice
registrationSchema.index({ event: 1, participant: 1 }, { unique: true });

module.exports = mongoose.model('Registration', registrationSchema);