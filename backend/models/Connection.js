const mongoose = require('mongoose');

const connectionSchema = new mongoose.Schema({
  requester: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  receiver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  event: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected'],
    default: 'pending'
  },
  message: {
    type: String,
    default: ''
  },
  requestedAt: {
    type: Date,
    default: Date.now
  },
  respondedAt: {
    type: Date
  }
}, { timestamps: true });

// Ensure a user can't send duplicate requests to the same person
connectionSchema.index({ requester: 1, receiver: 1 }, { unique: true });

// Ensure a user can't connect to themselves
connectionSchema.pre('save', function(next) {
  if (this.requester.equals(this.receiver)) {
    const error = new Error('Cannot connect to yourself');
    return next(error);
  }
  next();
});

module.exports = mongoose.model('Connection', connectionSchema);