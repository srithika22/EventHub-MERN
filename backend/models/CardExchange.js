const mongoose = require('mongoose');

const cardExchangeSchema = new mongoose.Schema({
  fromCard: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BusinessCard',
    required: true
  },
  toUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  event: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: true
  },
  exchangeMethod: {
    type: String,
    enum: ['qr_scan', 'direct_share', 'proximity', 'manual_add'],
    default: 'qr_scan'
  },
  exchangeLocation: {
    type: String,
    trim: true
  },
  notes: {
    type: String,
    trim: true,
    maxlength: 200
  },
  isRead: {
    type: Boolean,
    default: false
  },
  isFavorite: {
    type: Boolean,
    default: false
  },
  tags: [{
    type: String,
    trim: true
  }],
  followUpReminder: {
    type: Date
  },
  followUpCompleted: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Compound index to prevent duplicate exchanges
cardExchangeSchema.index({ fromCard: 1, toUser: 1, event: 1 }, { unique: true });

// Indexes for better query performance
cardExchangeSchema.index({ toUser: 1, event: 1 });
cardExchangeSchema.index({ event: 1 });
cardExchangeSchema.index({ fromCard: 1 });
cardExchangeSchema.index({ createdAt: -1 });

// Static method to create or update exchange
cardExchangeSchema.statics.createExchange = async function(fromCardId, toUserId, eventId, method = 'qr_scan', additionalData = {}) {
  try {
    // Check if exchange already exists
    const existingExchange = await this.findOne({
      fromCard: fromCardId,
      toUser: toUserId,
      event: eventId
    });

    if (existingExchange) {
      // Update existing exchange with new timestamp and method
      existingExchange.exchangeMethod = method;
      existingExchange.exchangeLocation = additionalData.location || existingExchange.exchangeLocation;
      existingExchange.notes = additionalData.notes || existingExchange.notes;
      existingExchange.updatedAt = new Date();
      
      return await existingExchange.save();
    } else {
      // Create new exchange
      const newExchange = new this({
        fromCard: fromCardId,
        toUser: toUserId,
        event: eventId,
        exchangeMethod: method,
        exchangeLocation: additionalData.location,
        notes: additionalData.notes
      });

      return await newExchange.save();
    }
  } catch (error) {
    if (error.code === 11000) {
      // Duplicate key error - exchange already exists
      throw new Error('Business card already exchanged with this user for this event');
    }
    throw error;
  }
};

// Static method to get user's collected cards for an event
cardExchangeSchema.statics.getUserCollectedCards = function(userId, eventId) {
  return this.find({ toUser: userId, event: eventId })
    .populate({
      path: 'fromCard',
      populate: {
        path: 'user',
        select: 'name email role'
      }
    })
    .populate('event', 'title date')
    .sort({ createdAt: -1 });
};

// Static method to get cards shared by a user for an event
cardExchangeSchema.statics.getUserSharedCards = function(userId, eventId) {
  return this.find({ event: eventId })
    .populate({
      path: 'fromCard',
      match: { user: userId },
      populate: {
        path: 'user',
        select: 'name email role'
      }
    })
    .populate('toUser', 'name email role')
    .populate('event', 'title date')
    .sort({ createdAt: -1 });
};

// Method to mark as read
cardExchangeSchema.methods.markAsRead = function() {
  this.isRead = true;
  return this.save();
};

// Method to toggle favorite
cardExchangeSchema.methods.toggleFavorite = function() {
  this.isFavorite = !this.isFavorite;
  return this.save();
};

// Method to add tags
cardExchangeSchema.methods.addTags = function(newTags) {
  const uniqueTags = [...new Set([...this.tags, ...newTags])];
  this.tags = uniqueTags;
  return this.save();
};

// Method to set follow-up reminder
cardExchangeSchema.methods.setFollowUpReminder = function(reminderDate) {
  this.followUpReminder = reminderDate;
  return this.save();
};

// Static method to get exchanges needing follow-up
cardExchangeSchema.statics.getFollowUpReminders = function(userId) {
  const now = new Date();
  return this.find({
    toUser: userId,
    followUpReminder: { $lte: now },
    followUpCompleted: false
  })
  .populate({
    path: 'fromCard',
    populate: {
      path: 'user',
      select: 'name email'
    }
  })
  .sort({ followUpReminder: 1 });
};

// Method to complete follow-up
cardExchangeSchema.methods.completeFollowUp = function() {
  this.followUpCompleted = true;
  return this.save();
};

// Static method to get exchange statistics for an event
cardExchangeSchema.statics.getEventStats = async function(eventId) {
  const stats = await this.aggregate([
    { $match: { event: mongoose.Types.ObjectId(eventId) } },
    {
      $group: {
        _id: null,
        totalExchanges: { $sum: 1 },
        uniqueCards: { $addToSet: '$fromCard' },
        uniqueUsers: { $addToSet: '$toUser' },
        exchangesByMethod: {
          $push: '$exchangeMethod'
        }
      }
    },
    {
      $project: {
        totalExchanges: 1,
        uniqueCardsCount: { $size: '$uniqueCards' },
        uniqueUsersCount: { $size: '$uniqueUsers' },
        exchangesByMethod: 1
      }
    }
  ]);

  if (stats.length === 0) {
    return {
      totalExchanges: 0,
      uniqueCardsCount: 0,
      uniqueUsersCount: 0,
      exchangesByMethod: {}
    };
  }

  const result = stats[0];
  
  // Count exchanges by method
  const methodCounts = {};
  result.exchangesByMethod.forEach(method => {
    methodCounts[method] = (methodCounts[method] || 0) + 1;
  });

  return {
    totalExchanges: result.totalExchanges,
    uniqueCardsCount: result.uniqueCardsCount,
    uniqueUsersCount: result.uniqueUsersCount,
    exchangesByMethod: methodCounts
  };
};

// Static method to get top networkers for an event
cardExchangeSchema.statics.getTopNetworkers = function(eventId, limit = 10) {
  return this.aggregate([
    { $match: { event: mongoose.Types.ObjectId(eventId) } },
    {
      $group: {
        _id: '$toUser',
        exchangeCount: { $sum: 1 },
        lastExchange: { $max: '$createdAt' }
      }
    },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'userInfo'
      }
    },
    {
      $unwind: '$userInfo'
    },
    {
      $project: {
        _id: 1,
        name: '$userInfo.name',
        email: '$userInfo.email',
        exchangeCount: 1,
        lastExchange: 1
      }
    },
    {
      $sort: { exchangeCount: -1, lastExchange: -1 }
    },
    {
      $limit: limit
    }
  ]);
};

module.exports = mongoose.model('CardExchange', cardExchangeSchema);