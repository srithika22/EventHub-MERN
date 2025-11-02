const mongoose = require('mongoose');

const pollSchema = new mongoose.Schema({
  event: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: true
  },
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  question: {
    type: String,
    required: true,
    trim: true,
    maxLength: 500
  },
  description: {
    type: String,
    trim: true,
    maxLength: 1000
  },
  type: {
    type: String,
    enum: ['single_choice', 'multiple_choice', 'rating', 'text'],
    required: true
  },
  options: [{
    type: String,
    trim: true,
    maxLength: 200
  }],
  allowMultiple: {
    type: Boolean,
    default: false
  },
  isAnonymous: {
    type: Boolean,
    default: true
  },
  isActive: {
    type: Boolean,
    default: false
  },
  timeLimit: {
    type: Number, // in minutes, 0 = no limit
    default: 0
  },
  startTime: {
    type: Date
  },
  endTime: {
    type: Date
  },
  results: [{
    optionIndex: Number,
    rating: Number,
    votes: {
      type: Number,
      default: 0
    }
  }],
  totalVotes: {
    type: Number,
    default: 0
  },
  uniqueVoters: {
    type: Number,
    default: 0
  },
  textResponses: [{
    response: String,
    voter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

// Index for better query performance
pollSchema.index({ event: 1, isActive: 1 });
pollSchema.index({ event: 1, creator: 1 });

// Virtual for checking if poll is expired
pollSchema.virtual('isExpired').get(function() {
  if (!this.endTime) return false;
  return new Date() > this.endTime;
});

// Method to activate poll
pollSchema.methods.activate = function() {
  this.isActive = true;
  this.startTime = new Date();
  
  if (this.timeLimit > 0) {
    this.endTime = new Date(Date.now() + this.timeLimit * 60 * 1000);
  }
  
  return this.save();
};

// Method to deactivate poll
pollSchema.methods.deactivate = function() {
  this.isActive = false;
  this.endTime = new Date();
  return this.save();
};

// Method to initialize results structure
pollSchema.methods.initializeResults = function() {
  if (this.type === 'rating') {
    this.results = [1, 2, 3, 4, 5].map(rating => ({
      rating,
      votes: 0
    }));
  } else if (this.type === 'single_choice' || this.type === 'multiple_choice') {
    this.results = this.options.map((_, index) => ({
      optionIndex: index,
      votes: 0
    }));
  }
  return this.save();
};

module.exports = mongoose.model('Poll', pollSchema);