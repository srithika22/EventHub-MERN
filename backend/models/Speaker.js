const mongoose = require('mongoose');

const speakerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  bio: {
    type: String,
    trim: true,
    maxlength: 1000
  },
  title: {
    type: String,
    trim: true
  },
  company: {
    type: String,
    trim: true
  },
  profileImage: {
    type: String,
    trim: true
  },
  socialLinks: {
    linkedin: {
      type: String,
      trim: true
    },
    twitter: {
      type: String,
      trim: true
    },
    website: {
      type: String,
      trim: true
    },
    instagram: {
      type: String,
      trim: true
    }
  },
  expertise: [{
    type: String,
    trim: true
  }],
  experience: {
    type: String,
    trim: true
  },
  achievements: [{
    type: String,
    trim: true
  }],
  speakingTopics: [{
    type: String,
    trim: true
  }],
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  totalRatings: {
    type: Number,
    default: 0
  },
  event: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: true
  },
  organizer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isKeynoteSpeaker: {
    type: Boolean,
    default: false
  },
  speakerFee: {
    amount: {
      type: Number,
      default: 0
    },
    currency: {
      type: String,
      default: 'USD'
    }
  },
  availability: {
    startDate: {
      type: Date
    },
    endDate: {
      type: Date
    },
    preferredTimeSlots: [{
      start: String,
      end: String
    }]
  },
  contactPreferences: {
    phone: {
      type: String,
      trim: true
    },
    preferredContactMethod: {
      type: String,
      enum: ['email', 'phone', 'linkedin', 'other'],
      default: 'email'
    }
  },
  status: {
    type: String,
    enum: ['invited', 'confirmed', 'declined', 'pending'],
    default: 'pending'
  }
}, {
  timestamps: true
});

// Index for better query performance
speakerSchema.index({ event: 1 });
speakerSchema.index({ organizer: 1 });
speakerSchema.index({ email: 1 });
speakerSchema.index({ status: 1 });

// Virtual for full name display
speakerSchema.virtual('displayName').get(function() {
  return this.title ? `${this.name}, ${this.title}` : this.name;
});

// Method to calculate average rating
speakerSchema.methods.updateRating = function(newRating) {
  this.totalRatings += 1;
  this.rating = ((this.rating * (this.totalRatings - 1)) + newRating) / this.totalRatings;
  return this.save();
};

// Static method to find speakers by event
speakerSchema.statics.findByEvent = function(eventId) {
  return this.find({ event: eventId }).sort({ isKeynoteSpeaker: -1, name: 1 });
};

// Pre-save middleware
speakerSchema.pre('save', function(next) {
  // Ensure email is lowercase
  if (this.email) {
    this.email = this.email.toLowerCase();
  }
  next();
});

module.exports = mongoose.model('Speaker', speakerSchema);