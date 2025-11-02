const mongoose = require('mongoose');

const forumReplySchema = new mongoose.Schema({
  discussion: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Discussion',
    required: true
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: true,
    trim: true,
    maxlength: 2000
  },
  parentReply: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ForumReply',
    default: null
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
  mentions: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    username: String
  }],
  isEdited: {
    type: Boolean,
    default: false
  },
  editedAt: {
    type: Date
  },
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
  },
  depth: {
    type: Number,
    default: 0,
    max: 5 // Limit nesting depth
  }
}, {
  timestamps: true
});

// Indexes for better query performance
forumReplySchema.index({ discussion: 1, createdAt: 1 });
forumReplySchema.index({ author: 1 });
forumReplySchema.index({ parentReply: 1 });
forumReplySchema.index({ discussion: 1, parentReply: 1 });

// Virtual for likes count
forumReplySchema.virtual('likesCount').get(function() {
  return this.likes.length;
});

// Virtual for nested replies count
forumReplySchema.virtual('repliesCount').get(function() {
  // This would need to be populated or calculated separately
  return 0;
});

// Method to like/unlike reply
forumReplySchema.methods.toggleLike = function(userId) {
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
forumReplySchema.methods.isLikedBy = function(userId) {
  return this.likes.some(like => like.user.toString() === userId.toString());
};

// Method to edit reply
forumReplySchema.methods.editContent = function(newContent) {
  this.content = newContent;
  this.isEdited = true;
  this.editedAt = new Date();
  return this.save();
};

// Method to add mention
forumReplySchema.methods.addMention = function(userId, username) {
  const existingMention = this.mentions.find(mention => mention.user.toString() === userId.toString());
  
  if (!existingMention) {
    this.mentions.push({ user: userId, username });
    return this.save();
  }
  
  return Promise.resolve(this);
};

// Method to flag for moderation
forumReplySchema.methods.addFlag = function(userId, reason) {
  const existingFlag = this.moderationFlags.find(flag => flag.user.toString() === userId.toString());
  
  if (!existingFlag) {
    this.moderationFlags.push({ user: userId, reason });
    return this.save();
  }
  
  return Promise.resolve(this);
};

// Static method to get threaded replies for a discussion
forumReplySchema.statics.getDiscussionReplies = function(discussionId, options = {}) {
  const { sort = 'oldest', limit = 50 } = options;

  let sortOptions = {};
  switch (sort) {
    case 'newest':
      sortOptions = { createdAt: -1 };
      break;
    case 'popular':
      sortOptions = { 'likes': -1, createdAt: 1 };
      break;
    case 'oldest':
    default:
      sortOptions = { createdAt: 1 };
      break;
  }

  return this.find({ 
    discussion: discussionId, 
    isVisible: true 
  })
  .populate('author', 'name email role')
  .populate('parentReply', 'author content createdAt')
  .sort(sortOptions)
  .limit(limit)
  .lean();
};

// Static method to build threaded reply structure
forumReplySchema.statics.buildThreadedReplies = function(replies) {
  const replyMap = new Map();
  const threadedReplies = [];

  // First pass: create map of all replies
  replies.forEach(reply => {
    reply.children = [];
    replyMap.set(reply._id.toString(), reply);
  });

  // Second pass: build the threaded structure
  replies.forEach(reply => {
    if (reply.parentReply) {
      const parent = replyMap.get(reply.parentReply._id.toString());
      if (parent) {
        parent.children.push(reply);
      } else {
        // Parent not found, treat as top-level
        threadedReplies.push(reply);
      }
    } else {
      // Top-level reply
      threadedReplies.push(reply);
    }
  });

  return threadedReplies;
};

// Pre-save middleware to calculate depth
forumReplySchema.pre('save', async function(next) {
  if (this.isNew && this.parentReply) {
    try {
      const parent = await this.constructor.findById(this.parentReply);
      if (parent) {
        this.depth = Math.min(parent.depth + 1, 5); // Max depth of 5
      }
    } catch (error) {
      console.error('Error calculating reply depth:', error);
    }
  }
  next();
});

// Post-save middleware to update discussion's lastActivity
forumReplySchema.post('save', async function() {
  try {
    const Discussion = mongoose.model('Discussion');
    await Discussion.findByIdAndUpdate(
      this.discussion,
      { 
        lastActivity: new Date(),
        $addToSet: { replies: this._id }
      }
    );
  } catch (error) {
    console.error('Error updating discussion lastActivity:', error);
  }
});

// Method to get reply thread path
forumReplySchema.methods.getThreadPath = async function() {
  const path = [this];
  let current = this;

  while (current.parentReply) {
    try {
      current = await this.constructor.findById(current.parentReply).populate('author', 'name');
      if (current) {
        path.unshift(current);
      } else {
        break;
      }
    } catch (error) {
      break;
    }
  }

  return path;
};

// Method to format for API response
forumReplySchema.methods.toJSON = function() {
  const reply = this.toObject({ virtuals: true });
  
  // Remove sensitive data
  delete reply.moderationFlags;
  
  return reply;
};

// Static method to get reply statistics for a discussion
forumReplySchema.statics.getDiscussionReplyStats = async function(discussionId) {
  const stats = await this.aggregate([
    { $match: { discussion: mongoose.Types.ObjectId(discussionId), isVisible: true } },
    {
      $group: {
        _id: null,
        totalReplies: { $sum: 1 },
        totalLikes: { $sum: { $size: '$likes' } },
        uniqueAuthors: { $addToSet: '$author' },
        avgDepth: { $avg: '$depth' },
        maxDepth: { $max: '$depth' }
      }
    }
  ]);

  if (stats.length === 0) {
    return {
      totalReplies: 0,
      totalLikes: 0,
      uniqueAuthors: 0,
      avgDepth: 0,
      maxDepth: 0
    };
  }

  const result = stats[0];
  return {
    totalReplies: result.totalReplies,
    totalLikes: result.totalLikes,
    uniqueAuthors: result.uniqueAuthors.length,
    avgDepth: Math.round(result.avgDepth * 100) / 100,
    maxDepth: result.maxDepth
  };
};

module.exports = mongoose.model('ForumReply', forumReplySchema);