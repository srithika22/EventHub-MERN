const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  event: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: true
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  asker: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  question: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500
  },
  votes: {
    type: Number,
    default: 0
  },
  voters: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  voterIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  userVotes: {
    type: Map,
    of: String,
    default: new Map()
  },
  status: {
    type: String,
    enum: ['pending', 'answered', 'ignored'],
    default: 'pending'
  },
  category: {
    type: String,
    default: 'general',
    trim: true
  },
  isStarred: {
    type: Boolean,
    default: false
  },
  isAnswered: {
    type: Boolean,
    default: false
  },
  answeredAt: {
    type: Date
  },
  answeredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  answer: {
    type: String,
    default: ''
  }
}, { timestamps: true });

// Index for efficient querying
questionSchema.index({ event: 1, createdAt: -1 });
questionSchema.index({ event: 1, votes: -1 });

module.exports = mongoose.model('Question', questionSchema);