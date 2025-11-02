const express = require('express');
const router = express.Router();
const Discussion = require('../models/Discussion');
const ForumReply = require('../models/ForumReply');
const Event = require('../models/Event');
const authMiddleware = require('../middleware/auth');

// @route   GET /api/forum/:eventId/discussions
// @desc    Get all discussions for an event with real-time support
// @access  Private
router.get('/:eventId/discussions', authMiddleware, async (req, res) => {
  try {
    console.log('Fetching discussions for event:', req.params.eventId);
    
    const { category = 'all', sort = 'recent', search = '', page = 1, limit = 20 } = req.query;
    
    // Verify event exists
    const event = await Event.findById(req.params.eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Build query
    let query = { event: req.params.eventId };
    
    if (category !== 'all') {
      query.category = category;
    }
    
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } }
      ];
    }

    // Build sort
    let sortOption = {};
    switch (sort) {
      case 'popular':
        sortOption = { 'reactions.length': -1, updatedAt: -1 };
        break;
      case 'oldest':
        sortOption = { createdAt: 1 };
        break;
      default: // recent
        sortOption = { isPinned: -1, updatedAt: -1 };
    }

    const discussions = await Discussion.find(query)
      .populate('author', 'name email')
      .populate({
        path: 'reactions.user',
        select: 'name'
      })
      .sort(sortOption)
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    // Add replies count to each discussion
    const discussionsWithStats = await Promise.all(
      discussions.map(async (discussion) => {
        const repliesCount = await ForumReply.countDocuments({ 
          discussion: discussion._id 
        });
        return {
          ...discussion.toObject(),
          repliesCount
        };
      })
    );

    res.json({
      success: true,
      discussions: discussionsWithStats
    });
  } catch (error) {
    console.error('Error fetching discussions:', error);
    res.status(500).json({ message: 'Error fetching discussions', error: error.message });
  }
});

// @route   POST /api/forum/:eventId/discussions
// @desc    Create a new discussion with real-time notification
// @access  Private
router.post('/:eventId/discussions', authMiddleware, async (req, res) => {
  try {
    const eventId = req.params.eventId;
    const { title, content, category = 'general', isPinned = false } = req.body;
    const authorId = req.user.id;

    // Validate input
    if (!title || !content) {
      return res.status(400).json({ message: 'Title and content are required' });
    }

    // Verify event exists
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Check if user can pin discussions (organizer only)
    const isOrganizer = event.organizer.toString() === authorId || req.user.role === 'organizer';
    const canPin = isOrganizer && isPinned;

    const discussion = new Discussion({
      event: eventId,
      author: authorId,
      title: title.trim(),
      content: content.trim(),
      category,
      isPinned: canPin,
      reactions: []
    });

    await discussion.save();
    await discussion.populate('author', 'name email');

    // Emit real-time event
    const io = req.app.get('io');
    if (io) {
      io.to(`event-${eventId}`).emit('forum-discussion-added', discussion);
    }

    res.status(201).json({
      success: true,
      discussion
    });
  } catch (error) {
    console.error('Error creating discussion:', error);
    res.status(500).json({ message: 'Error creating discussion', error: error.message });
  }
});

// @route   GET /api/forum/discussions/:discussionId/replies
// @desc    Get all replies for a discussion
// @access  Private
router.get('/discussions/:discussionId/replies', authMiddleware, async (req, res) => {
  try {
    const discussionId = req.params.discussionId;

    const replies = await ForumReply.find({ discussion: discussionId })
      .populate('author', 'name email')
      .populate('parentReply', 'content author')
      .populate({
        path: 'reactions.user',
        select: 'name'
      })
      .sort({ createdAt: 1 });

    res.json({
      success: true,
      replies
    });
  } catch (error) {
    console.error('Error fetching replies:', error);
    res.status(500).json({ message: 'Error fetching replies', error: error.message });
  }
});

// @route   POST /api/forum/discussions/:discussionId/replies
// @desc    Add a reply to a discussion with real-time notification
// @access  Private
router.post('/discussions/:discussionId/replies', authMiddleware, async (req, res) => {
  try {
    const discussionId = req.params.discussionId;
    const { content, parentReply } = req.body;
    const authorId = req.user.id;

    if (!content || !content.trim()) {
      return res.status(400).json({ message: 'Reply content is required' });
    }

    // Verify discussion exists
    const discussion = await Discussion.findById(discussionId);
    if (!discussion) {
      return res.status(404).json({ message: 'Discussion not found' });
    }

    const reply = new ForumReply({
      discussion: discussionId,
      author: authorId,
      content: content.trim(),
      parentReply: parentReply || null,
      reactions: []
    });

    await reply.save();
    await reply.populate('author', 'name email');
    
    if (parentReply) {
      await reply.populate('parentReply', 'content author');
    }

    // Update discussion's updatedAt
    discussion.updatedAt = new Date();
    await discussion.save();

    // Emit real-time event
    const io = req.app.get('io');
    if (io) {
      io.to(`event-${discussion.event}`).emit('forum-reply-added', reply);
    }

    res.status(201).json({
      success: true,
      reply
    });
  } catch (error) {
    console.error('Error creating reply:', error);
    res.status(500).json({ message: 'Error creating reply', error: error.message });
  }
});

// @route   POST /api/forum/reactions
// @desc    Add or remove reaction to discussion/reply with real-time update
// @access  Private
router.post('/reactions', authMiddleware, async (req, res) => {
  try {
    const { targetId, targetType, reaction } = req.body;
    const userId = req.user.id;

    if (!targetId || !targetType || !reaction) {
      return res.status(400).json({ message: 'Target ID, type, and reaction are required' });
    }

    let targetModel;
    if (targetType === 'discussion') {
      targetModel = Discussion;
    } else if (targetType === 'reply') {
      targetModel = ForumReply;
    } else {
      return res.status(400).json({ message: 'Invalid target type' });
    }

    const target = await targetModel.findById(targetId);
    if (!target) {
      return res.status(404).json({ message: 'Target not found' });
    }

    // Check if user already reacted
    const existingReactionIndex = target.reactions.findIndex(
      r => r.user.toString() === userId
    );

    if (existingReactionIndex > -1) {
      // Update existing reaction or remove if same
      if (target.reactions[existingReactionIndex].reaction === reaction) {
        // Remove reaction
        target.reactions.splice(existingReactionIndex, 1);
      } else {
        // Update reaction
        target.reactions[existingReactionIndex].reaction = reaction;
      }
    } else {
      // Add new reaction
      target.reactions.push({
        user: userId,
        reaction
      });
    }

    await target.save();

    // Get event ID for real-time emission
    let eventId;
    if (targetType === 'discussion') {
      eventId = target.event;
    } else {
      const discussion = await Discussion.findById(target.discussion);
      eventId = discussion.event;
    }

    // Emit real-time event
    const io = req.app.get('io');
    if (io) {
      io.to(`event-${eventId}`).emit('forum-reaction-added', {
        type: targetType,
        targetId,
        reactions: target.reactions
      });
    }

    res.json({
      success: true,
      reactions: target.reactions
    });
  } catch (error) {
    console.error('Error handling reaction:', error);
    res.status(500).json({ message: 'Error handling reaction', error: error.message });
  }
});

// @route   PUT /api/forum/discussions/:discussionId
// @desc    Update a discussion (author or organizer only)
// @access  Private
router.put('/discussions/:discussionId', authMiddleware, async (req, res) => {
  try {
    const discussionId = req.params.discussionId;
    const { title, content, category, isPinned } = req.body;
    const userId = req.user.id;

    const discussion = await Discussion.findById(discussionId).populate('event');
    if (!discussion) {
      return res.status(404).json({ message: 'Discussion not found' });
    }

    // Check permissions
    const isAuthor = discussion.author.toString() === userId;
    const isOrganizer = discussion.event.organizer.toString() === userId || req.user.role === 'organizer';

    if (!isAuthor && !isOrganizer) {
      return res.status(403).json({ message: 'Not authorized to update this discussion' });
    }

    // Update fields
    if (title) discussion.title = title.trim();
    if (content) discussion.content = content.trim();
    if (category) discussion.category = category;
    if (isOrganizer && typeof isPinned === 'boolean') {
      discussion.isPinned = isPinned;
    }

    discussion.updatedAt = new Date();
    await discussion.save();

    // Emit real-time event
    const io = req.app.get('io');
    if (io) {
      io.to(`event-${discussion.event._id}`).emit('forum-discussion-updated', discussion);
    }

    res.json({
      success: true,
      discussion
    });
  } catch (error) {
    console.error('Error updating discussion:', error);
    res.status(500).json({ message: 'Error updating discussion', error: error.message });
  }
});

// @route   DELETE /api/forum/discussions/:discussionId
// @desc    Delete a discussion (author or organizer only)
// @access  Private
router.delete('/discussions/:discussionId', authMiddleware, async (req, res) => {
  try {
    const discussionId = req.params.discussionId;
    const userId = req.user.id;

    const discussion = await Discussion.findById(discussionId).populate('event');
    if (!discussion) {
      return res.status(404).json({ message: 'Discussion not found' });
    }

    // Check permissions
    const isAuthor = discussion.author.toString() === userId;
    const isOrganizer = discussion.event.organizer.toString() === userId || req.user.role === 'organizer';

    if (!isAuthor && !isOrganizer) {
      return res.status(403).json({ message: 'Not authorized to delete this discussion' });
    }

    // Delete all replies first
    await ForumReply.deleteMany({ discussion: discussionId });
    
    // Delete discussion
    await Discussion.findByIdAndDelete(discussionId);

    // Emit real-time event
    const io = req.app.get('io');
    if (io) {
      io.to(`event-${discussion.event._id}`).emit('forum-discussion-deleted', discussionId);
    }

    res.json({
      success: true,
      message: 'Discussion deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting discussion:', error);
    res.status(500).json({ message: 'Error deleting discussion', error: error.message });
  }
});

// @route   PUT /api/forum/replies/:replyId
// @desc    Update a reply (author only)
// @access  Private
router.put('/replies/:replyId', authMiddleware, async (req, res) => {
  try {
    const replyId = req.params.replyId;
    const { content } = req.body;
    const userId = req.user.id;

    if (!content || !content.trim()) {
      return res.status(400).json({ message: 'Content is required' });
    }

    const reply = await ForumReply.findById(replyId);
    if (!reply) {
      return res.status(404).json({ message: 'Reply not found' });
    }

    // Check if user is the author
    if (reply.author.toString() !== userId) {
      return res.status(403).json({ message: 'Not authorized to update this reply' });
    }

    reply.content = content.trim();
    reply.updatedAt = new Date();
    await reply.save();

    // Get event ID for real-time emission
    const discussion = await Discussion.findById(reply.discussion);
    
    // Emit real-time event
    const io = req.app.get('io');
    if (io) {
      io.to(`event-${discussion.event}`).emit('forum-reply-updated', reply);
    }

    res.json({
      success: true,
      reply
    });
  } catch (error) {
    console.error('Error updating reply:', error);
    res.status(500).json({ message: 'Error updating reply', error: error.message });
  }
});

// @route   DELETE /api/forum/replies/:replyId
// @desc    Delete a reply (author or organizer only)
// @access  Private
router.delete('/replies/:replyId', authMiddleware, async (req, res) => {
  try {
    const replyId = req.params.replyId;
    const userId = req.user.id;

    const reply = await ForumReply.findById(replyId);
    if (!reply) {
      return res.status(404).json({ message: 'Reply not found' });
    }

    const discussion = await Discussion.findById(reply.discussion).populate('event');
    
    // Check permissions
    const isAuthor = reply.author.toString() === userId;
    const isOrganizer = discussion.event.organizer.toString() === userId || req.user.role === 'organizer';

    if (!isAuthor && !isOrganizer) {
      return res.status(403).json({ message: 'Not authorized to delete this reply' });
    }

    await ForumReply.findByIdAndDelete(replyId);

    // Emit real-time event
    const io = req.app.get('io');
    if (io) {
      io.to(`event-${discussion.event._id}`).emit('forum-reply-deleted', replyId);
    }

    res.json({
      success: true,
      message: 'Reply deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting reply:', error);
    res.status(500).json({ message: 'Error deleting reply', error: error.message });
  }
});

// @route   GET /api/forum/:eventId/categories
// @desc    Get discussion categories for an event
// @access  Private
router.get('/:eventId/categories', authMiddleware, async (req, res) => {
  try {
    const eventId = req.params.eventId;
    
    const categories = await Discussion.distinct('category', { event: eventId });
    
    // Include default categories
    const defaultCategories = ['general', 'technical', 'networking', 'feedback', 'announcements'];
    const allCategories = [...new Set([...defaultCategories, ...categories])];
    
    res.json({
      success: true,
      categories: allCategories
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ message: 'Error fetching categories', error: error.message });
  }
});

// @route   GET /api/forum/:eventId/analytics
// @desc    Get forum analytics for an event (organizer only)
// @access  Private
router.get('/:eventId/analytics', authMiddleware, async (req, res) => {
  try {
    const eventId = req.params.eventId;
    const userId = req.user.id;

    // Verify user is organizer
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    const isOrganizer = event.organizer.toString() === userId || req.user.role === 'organizer';
    if (!isOrganizer) {
      return res.status(403).json({ message: 'Only organizers can view analytics' });
    }

    const discussions = await Discussion.find({ event: eventId });
    const replies = await ForumReply.find({ 
      discussion: { $in: discussions.map(d => d._id) } 
    });

    const analytics = {
      totalDiscussions: discussions.length,
      totalReplies: replies.length,
      pinnedDiscussions: discussions.filter(d => d.isPinned).length,
      totalReactions: discussions.reduce((sum, d) => sum + (d.reactions?.length || 0), 0) +
                     replies.reduce((sum, r) => sum + (r.reactions?.length || 0), 0),
      categoryBreakdown: discussions.reduce((acc, d) => {
        acc[d.category] = (acc[d.category] || 0) + 1;
        return acc;
      }, {}),
      participationRate: discussions.length > 0 ? 
        Math.round((replies.length / discussions.length) * 100) / 100 : 0,
      mostActiveDiscussions: discussions
        .map(d => ({
          _id: d._id,
          title: d.title,
          repliesCount: replies.filter(r => r.discussion.toString() === d._id.toString()).length,
          reactionsCount: d.reactions?.length || 0
        }))
        .sort((a, b) => (b.repliesCount + b.reactionsCount) - (a.repliesCount + a.reactionsCount))
        .slice(0, 10)
    };

    res.json({
      success: true,
      analytics
    });
  } catch (error) {
    console.error('Error fetching forum analytics:', error);
    res.status(500).json({ message: 'Error fetching analytics', error: error.message });
  }
});

module.exports = router;