const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true,
    maxlength: 2000
  },
  type: {
    type: String,
    enum: ['keynote', 'workshop', 'panel', 'presentation', 'networking', 'breakout', 'qa', 'demo'],
    required: true
  },
  startTime: {
    type: Date,
    required: true
  },
  endTime: {
    type: Date,
    required: true
  },
  location: {
    venue: {
      type: String,
      trim: true
    },
    room: {
      type: String,
      trim: true
    },
    floor: {
      type: String,
      trim: true
    },
    isVirtual: {
      type: Boolean,
      default: false
    },
    virtualLink: {
      type: String,
      trim: true
    },
    capacity: {
      type: Number,
      default: 0
    }
  },
  speakers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Speaker'
  }],
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
  category: {
    type: String,
    trim: true
  },
  tags: [{
    type: String,
    trim: true
  }],
  skillLevel: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced', 'all'],
    default: 'all'
  },
  prerequisites: [{
    type: String,
    trim: true
  }],
  learningObjectives: [{
    type: String,
    trim: true
  }],
  materials: [{
    name: {
      type: String,
      trim: true
    },
    url: {
      type: String,
      trim: true
    },
    type: {
      type: String,
      enum: ['slides', 'document', 'video', 'link', 'resource']
    }
  }],
  registrations: [{
    participant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    registeredAt: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['registered', 'attended', 'cancelled', 'waitlisted'],
      default: 'registered'
    },
    feedback: {
      rating: {
        type: Number,
        min: 1,
        max: 5
      },
      comment: {
        type: String,
        trim: true,
        maxlength: 500
      },
      submittedAt: {
        type: Date
      }
    }
  }],
  capacity: {
    type: Number,
    default: 0
  },
  registrationRequired: {
    type: Boolean,
    default: false
  },
  waitlistEnabled: {
    type: Boolean,
    default: true
  },
  isRecorded: {
    type: Boolean,
    default: false
  },
  recordingUrl: {
    type: String,
    trim: true
  },
  liveStreamUrl: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['scheduled', 'live', 'completed', 'cancelled'],
    default: 'scheduled'
  },
  analytics: {
    totalRegistrations: {
      type: Number,
      default: 0
    },
    actualAttendees: {
      type: Number,
      default: 0
    },
    avgRating: {
      type: Number,
      default: 0
    },
    totalFeedback: {
      type: Number,
      default: 0
    },
    engagementScore: {
      type: Number,
      default: 0
    }
  },
  resources: [{
    title: {
      type: String,
      trim: true
    },
    description: {
      type: String,
      trim: true
    },
    url: {
      type: String,
      trim: true
    },
    type: {
      type: String,
      enum: ['presentation', 'handout', 'recording', 'reference', 'tool']
    },
    isDownloadable: {
      type: Boolean,
      default: true
    }
  }]
}, {
  timestamps: true
});

// Indexes for better query performance
sessionSchema.index({ event: 1, startTime: 1 });
sessionSchema.index({ speakers: 1 });
sessionSchema.index({ 'registrations.participant': 1 });
sessionSchema.index({ type: 1 });
sessionSchema.index({ status: 1 });

// Virtual for session duration
sessionSchema.virtual('duration').get(function() {
  if (this.startTime && this.endTime) {
    return Math.ceil((this.endTime - this.startTime) / (1000 * 60)); // Duration in minutes
  }
  return 0;
});

// Virtual for available spots
sessionSchema.virtual('availableSpots').get(function() {
  if (this.capacity > 0) {
    const registered = this.registrations.filter(reg => 
      reg.status === 'registered' || reg.status === 'attended'
    ).length;
    return Math.max(0, this.capacity - registered);
  }
  return null; // Unlimited capacity
});

// Virtual for waitlist count
sessionSchema.virtual('waitlistCount').get(function() {
  return this.registrations.filter(reg => reg.status === 'waitlisted').length;
});

// Method to register participant
sessionSchema.methods.registerParticipant = function(participantId) {
  const existingRegistration = this.registrations.find(
    reg => reg.participant.toString() === participantId.toString()
  );
  
  if (existingRegistration) {
    throw new Error('Already registered for this session');
  }
  
  const registration = {
    participant: participantId,
    status: this.availableSpots > 0 ? 'registered' : 'waitlisted'
  };
  
  this.registrations.push(registration);
  this.analytics.totalRegistrations += 1;
  
  return this.save();
};

// Method to update attendance
sessionSchema.methods.markAttendance = function(participantId, attended = true) {
  const registration = this.registrations.find(
    reg => reg.participant.toString() === participantId.toString()
  );
  
  if (!registration) {
    throw new Error('Participant not registered for this session');
  }
  
  registration.status = attended ? 'attended' : 'registered';
  
  if (attended) {
    this.analytics.actualAttendees = this.registrations.filter(
      reg => reg.status === 'attended'
    ).length;
  }
  
  return this.save();
};

// Method to add feedback
sessionSchema.methods.addFeedback = function(participantId, rating, comment) {
  const registration = this.registrations.find(
    reg => reg.participant.toString() === participantId.toString()
  );
  
  if (!registration) {
    throw new Error('Participant not registered for this session');
  }
  
  if (registration.status !== 'attended') {
    throw new Error('Can only provide feedback after attending session');
  }
  
  registration.feedback = {
    rating,
    comment,
    submittedAt: new Date()
  };
  
  // Update analytics
  this.analytics.totalFeedback += 1;
  const allRatings = this.registrations
    .map(reg => reg.feedback?.rating)
    .filter(rating => rating !== undefined);
  
  this.analytics.avgRating = allRatings.length > 0 
    ? allRatings.reduce((sum, rating) => sum + rating, 0) / allRatings.length 
    : 0;
  
  return this.save();
};

// Static method to find sessions by event
sessionSchema.statics.findByEvent = function(eventId, date) {
  const query = { event: eventId };
  if (date) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    query.startTime = {
      $gte: startOfDay,
      $lte: endOfDay
    };
  }
  
  return this.find(query)
    .populate('speakers', 'name title company profileImage')
    .sort({ startTime: 1 });
};

// Static method to find sessions by speaker
sessionSchema.statics.findBySpeaker = function(speakerId) {
  return this.find({ speakers: speakerId })
    .populate('event', 'title date location')
    .sort({ startTime: 1 });
};

module.exports = mongoose.model('Session', sessionSchema);