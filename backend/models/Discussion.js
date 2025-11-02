const mongoose = require('mongoose');

const discussionSchema = new mongoose.Schema({
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
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  content: {
    type: String,
    required: true,
    trim: true,
    maxlength: 5000
  },
  category: {
    type: String,
    enum: ['general', 'announcements', 'networking', 'feedback', 'technical', 'social'],
    default: 'general'
  },
  isPinned: {
    type: Boolean,
    default: false
  },
  isLocked: {
    type: Boolean,
    default: false
  },
  likes: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    likedAt: {
      type: Date,
      default: Date.now
    }
  }],
  reactions: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    reaction: {
      type: String,
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  replies: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ForumReply'
  }],
  views: {
    type: Number,
    default: 0
  },
  lastActivity: {
    type: Date,
    default: Date.now
  },
  tags: [{
    type: String,
    trim: true
  }],
  moderationFlags: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reason: String,
    flaggedAt: {
      type: Date,
      default: Date.now
    }
  }],
  isVisible: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes for better query performance
discussionSchema.index({ event: 1, createdAt: -1 });
discussionSchema.index({ event: 1, category: 1 });
discussionSchema.index({ event: 1, isPinned: -1, lastActivity: -1 });
discussionSchema.index({ author: 1 });
discussionSchema.index({ title: 'text', content: 'text' });

// Virtual for likes count
discussionSchema.virtual('likesCount').get(function() {
  return this.likes.length;
});

// Virtual for replies count
discussionSchema.virtual('repliesCount').get(function() {
  return this.replies.length;
});

// Virtual for category display name
discussionSchema.virtual('categoryName').get(function() {
  const categoryNames = {
    general: 'General',
    announcements: 'Announcements',
    networking: 'Networking',
    feedback: 'Feedback',
    technical: 'Technical Support',
    social: 'Social'
  };
  return categoryNames[this.category] || 'General';
});

// Method to like/unlike discussion
discussionSchema.methods.toggleLike = function(userId) {
  const existingLike = this.likes.find(like => like.user.toString() === userId.toString());
  
  if (existingLike) {
    // Unlike - remove the like
    this.likes = this.likes.filter(like => like.user.toString() !== userId.toString());
  } else {
    // Like - add the like
    this.likes.push({ user: userId });
  }
  
  return this.save();
};

// Method to check if user has liked
discussionSchema.methods.isLikedBy = function(userId) {
  return this.likes.some(like => like.user.toString() === userId.toString());
};

// Method to add reply
discussionSchema.methods.addReply = function(replyId) {
  this.replies.push(replyId);
  this.lastActivity = new Date();
  return this.save();
};

// Method to increment views
discussionSchema.methods.incrementViews = function() {
  this.views += 1;
  return this.save();
};

// Method to pin/unpin discussion (organizer only)
discussionSchema.methods.togglePin = function() {
  this.isPinned = !this.isPinned;
  return this.save();
};

// Method to lock/unlock discussion (organizer only)
discussionSchema.methods.toggleLock = function() {
  this.isLocked = !this.isLocked;
  return this.save();
};

// Method to flag for moderation
discussionSchema.methods.addFlag = function(userId, reason) {
  const existingFlag = this.moderationFlags.find(flag => flag.user.toString() === userId.toString());
  
  if (!existingFlag) {
    this.moderationFlags.push({ user: userId, reason });
    return this.save();
  }
  
  return Promise.resolve(this);
};

// Static method to get discussions by event with pagination
discussionSchema.statics.getEventDiscussions = function(eventId, options = {}) {
  const {
    category = 'all',
    sort = 'recent',
    search = '',
    page = 1,
    limit = 20
  } = options;

  let query = { event: eventId, isVisible: true };
  
  // Category filter
  if (category !== 'all') {
    query.category = category;
  }
  
  // Search filter
  if (search) {
    query.$text = { $search: search };
  }

  // Sort options
  let sortOptions = {};
  switch (sort) {
    case 'popular':
      sortOptions = { 'likes': -1, lastActivity: -1 };
      break;
    case 'replies':
      sortOptions = { 'replies': -1, lastActivity: -1 };
      break;
    case 'recent':
    default:
      sortOptions = { isPinned: -1, lastActivity: -1 };
      break;
  }

  return this.find(query)
    .populate('author', 'name email role')
    .populate('event', 'title')
    .sort(sortOptions)
    .limit(limit * page)
    .skip((page - 1) * limit)
    .lean();
};

// Static method to get discussion statistics
discussionSchema.statics.getEventStats = async function(eventId) {
  const stats = await this.aggregate([
    { $match: { event: mongoose.Types.ObjectId(eventId), isVisible: true } },
    {
      $group: {
        _id: null,
        totalDiscussions: { $sum: 1 },
        totalLikes: { $sum: { $size: '$likes' } },
        totalReplies: { $sum: { $size: '$replies' } },
        totalViews: { $sum: '$views' },
        categoryCounts: {
          $push: '$category'
        }
      }
    }
  ]);

  if (stats.length === 0) {
    return {
      totalDiscussions: 0,
      totalLikes: 0,
      totalReplies: 0,
      totalViews: 0,
      categoryCounts: {}
    };
  }

  const result = stats[0];
  
  // Count discussions by category
  const categoryCounts = {};
  result.categoryCounts.forEach(category => {
    categoryCounts[category] = (categoryCounts[category] || 0) + 1;
  });

  return {
    totalDiscussions: result.totalDiscussions,
    totalLikes: result.totalLikes,
    totalReplies: result.totalReplies,
    totalViews: result.totalViews,
    categoryCounts
  };
};

// Static method to get trending discussions
discussionSchema.statics.getTrendingDiscussions = function(eventId, limit = 5) {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  
  return this.find({
    event: eventId,
    isVisible: true,
    createdAt: { $gte: oneDayAgo }
  })
  .populate('author', 'name email')
  .sort({ 
    views: -1, 
    'likes': -1, 
    'replies': -1 
  })
  .limit(limit)
  .lean();
};

// Pre-save middleware to update lastActivity
discussionSchema.pre('save', function(next) {
  if (this.isModified('likes') || this.isModified('replies')) {
    this.lastActivity = new Date();
  }
  next();
});

// Method to format for API response
discussionSchema.methods.toJSON = function() {
  const discussion = this.toObject({ virtuals: true });
  
  // Remove sensitive data
  delete discussion.moderationFlags;
  
  return discussion;
};

module.exports = mongoose.model('Discussion', discussionSchema);