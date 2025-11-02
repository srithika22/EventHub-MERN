const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Message = require('../models/Message');
const User = require('../models/User');
const Event = require('../models/Event');
const auth = require('../middleware/auth');

// Get messages for an event (group chat)
router.get('/event/:eventId', auth, async (req, res) => {
  try {
    const { eventId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    // Verify user has access to the event
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    const messages = await Message.find({ 
      event: eventId, 
      type: 'event',
      deletedAt: null 
    })
      .populate('sender', 'name email avatar')
      .populate('replyTo', 'content sender')
      .populate('mentions', 'name')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    // Mark messages as read for current user
    const unreadMessages = messages.filter(msg => 
      !msg.readBy.some(read => read.user.toString() === req.user.id) &&
      msg.sender._id.toString() !== req.user.id
    );

    await Promise.all(unreadMessages.map(msg => msg.markAsRead(req.user.id)));

    res.json({ 
      messages: messages.reverse(),
      hasMore: messages.length === limit,
      currentPage: page
    });
  } catch (error) {
    console.error('Error fetching event messages:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get private messages between two users
router.get('/private/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    const messages = await Message.find({
      type: 'private',
      deletedAt: null,
      $or: [
        { sender: req.user.id, recipient: userId },
        { sender: userId, recipient: req.user.id }
      ]
    })
      .populate('sender', 'name email avatar')
      .populate('recipient', 'name email avatar')
      .populate('replyTo', 'content sender')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    // Mark messages as read for current user
    const unreadMessages = messages.filter(msg => 
      !msg.readBy.some(read => read.user.toString() === req.user.id) &&
      msg.sender._id.toString() !== req.user.id
    );

    await Promise.all(unreadMessages.map(msg => msg.markAsRead(req.user.id)));

    res.json({ 
      messages: messages.reverse(),
      hasMore: messages.length === limit,
      currentPage: page
    });
  } catch (error) {
    console.error('Error fetching private messages:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Send a message
router.post('/send', auth, async (req, res) => {
  try {
    const { content, type, eventId, recipientId, replyToId, mentions } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ message: 'Message content is required' });
    }

    const messageData = {
      content: content.trim(),
      sender: req.user.id,
      type,
      mentions: mentions || []
    };

    if (type === 'event') {
      if (!eventId) {
        return res.status(400).json({ message: 'Event ID is required for event messages' });
      }
      
      // Verify event exists
      const event = await Event.findById(eventId);
      if (!event) {
        return res.status(404).json({ message: 'Event not found' });
      }
      
      messageData.event = eventId;
    } else if (type === 'private') {
      if (!recipientId) {
        return res.status(400).json({ message: 'Recipient ID is required for private messages' });
      }
      
      // Verify recipient exists
      const recipient = await User.findById(recipientId);
      if (!recipient) {
        return res.status(404).json({ message: 'Recipient not found' });
      }
      
      messageData.recipient = recipientId;
    }

    if (replyToId) {
      const originalMessage = await Message.findById(replyToId);
      if (originalMessage) {
        messageData.replyTo = replyToId;
      }
    }

    const message = new Message(messageData);
    await message.save();

    await message.populate([
      { path: 'sender', select: 'name email avatar' },
      { path: 'recipient', select: 'name email avatar' },
      { path: 'replyTo', select: 'content sender' },
      { path: 'mentions', select: 'name' }
    ]);

    // Emit real-time event
    const io = req.app.get('io');
    if (type === 'event') {
      io.to(`event-${eventId}`).emit('new-message', message);
    } else if (type === 'private') {
      io.to(`chat-${[req.user.id, recipientId].sort().join('-')}`).emit('new-message', message);
    }

    res.status(201).json({ message });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get conversation list for user
router.get('/conversations', auth, async (req, res) => {
  try {
    // Get recent conversations (both private and group)
    const conversations = await Message.aggregate([
      {
        $match: {
          $or: [
            { sender: new mongoose.Types.ObjectId(req.user.id) },
            { recipient: new mongoose.Types.ObjectId(req.user.id) }
          ],
          type: 'private',
          deletedAt: null
        }
      },
      {
        $addFields: {
          otherUser: {
            $cond: {
              if: { $eq: ['$sender', new mongoose.Types.ObjectId(req.user.id)] },
              then: '$recipient',
              else: '$sender'
            }
          }
        }
      },
      {
        $sort: { createdAt: -1 }
      },
      {
        $group: {
          _id: '$otherUser',
          lastMessage: { $first: '$$ROOT' },
          unreadCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $ne: ['$sender', new mongoose.Types.ObjectId(req.user.id)] },
                    { $not: { $in: [new mongoose.Types.ObjectId(req.user.id), '$readBy.user'] } }
                  ]
                },
                1,
                0
              ]
            }
          }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      {
        $unwind: '$user'
      },
      {
        $project: {
          user: {
            _id: '$user._id',
            name: '$user.name',
            email: '$user.email',
            avatar: '$user.avatar'
          },
          lastMessage: {
            content: '$lastMessage.content',
            createdAt: '$lastMessage.createdAt',
            isFromMe: { $eq: ['$lastMessage.sender', new mongoose.Types.ObjectId(req.user.id)] }
          },
          unreadCount: 1
        }
      },
      {
        $sort: { 'lastMessage.createdAt': -1 }
      }
    ]);

    res.json({ conversations });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Edit a message
router.put('/:messageId', auth, async (req, res) => {
  try {
    const { messageId } = req.params;
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ message: 'Message content is required' });
    }

    const message = await Message.findOne({ 
      _id: messageId, 
      sender: req.user.id,
      deletedAt: null 
    });

    if (!message) {
      return res.status(404).json({ message: 'Message not found or unauthorized' });
    }

    // Only allow editing within 15 minutes
    const editTimeLimit = 15 * 60 * 1000; // 15 minutes
    if (Date.now() - message.createdAt.getTime() > editTimeLimit) {
      return res.status(400).json({ message: 'Message can only be edited within 15 minutes' });
    }

    message.content = content.trim();
    message.isEdited = true;
    message.editedAt = new Date();
    await message.save();

    await message.populate([
      { path: 'sender', select: 'name email avatar' },
      { path: 'recipient', select: 'name email avatar' },
      { path: 'replyTo', select: 'content sender' }
    ]);

    // Emit real-time event
    const io = req.app.get('io');
    if (message.type === 'event') {
      io.to(`event-${message.event}`).emit('message-edited', message);
    } else if (message.type === 'private') {
      const chatId = [message.sender._id, message.recipient._id].sort().join('-');
      io.to(`chat-${chatId}`).emit('message-edited', message);
    }

    res.json({ message });
  } catch (error) {
    console.error('Error editing message:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete a message
router.delete('/:messageId', auth, async (req, res) => {
  try {
    const { messageId } = req.params;

    const message = await Message.findOne({ 
      _id: messageId, 
      sender: req.user.id,
      deletedAt: null 
    });

    if (!message) {
      return res.status(404).json({ message: 'Message not found or unauthorized' });
    }

    message.deletedAt = new Date();
    await message.save();

    // Emit real-time event
    const io = req.app.get('io');
    if (message.type === 'event') {
      io.to(`event-${message.event}`).emit('message-deleted', { messageId });
    } else if (message.type === 'private') {
      const chatId = [message.sender, message.recipient].sort().join('-');
      io.to(`chat-${chatId}`).emit('message-deleted', { messageId });
    }

    res.json({ message: 'Message deleted successfully' });
  } catch (error) {
    console.error('Error deleting message:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Add reaction to message
router.post('/:messageId/react', auth, async (req, res) => {
  try {
    const { messageId } = req.params;
    const { emoji } = req.body;

    if (!emoji) {
      return res.status(400).json({ message: 'Emoji is required' });
    }

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    // Check if user already reacted with this emoji
    const existingReaction = message.reactions.find(
      reaction => reaction.user.toString() === req.user.id && reaction.emoji === emoji
    );

    if (existingReaction) {
      // Remove reaction
      message.reactions = message.reactions.filter(
        reaction => !(reaction.user.toString() === req.user.id && reaction.emoji === emoji)
      );
    } else {
      // Add reaction
      message.reactions.push({
        user: req.user.id,
        emoji
      });
    }

    await message.save();

    // Emit real-time event
    const io = req.app.get('io');
    if (message.type === 'event') {
      io.to(`event-${message.event}`).emit('message-reaction', { 
        messageId, 
        reactions: message.reactions 
      });
    } else if (message.type === 'private') {
      const chatId = [message.sender, message.recipient].sort().join('-');
      io.to(`chat-${chatId}`).emit('message-reaction', { 
        messageId, 
        reactions: message.reactions 
      });
    }

    res.json({ reactions: message.reactions });
  } catch (error) {
    console.error('Error adding reaction:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get unread message count
router.get('/unread-count', auth, async (req, res) => {
  try {
    const { eventId, userId } = req.query;

    let count = 0;
    if (eventId) {
      count = await Message.getUnreadCount(req.user.id, eventId);
    } else if (userId) {
      count = await Message.getUnreadCount(req.user.id, null, userId);
    } else {
      // Get total unread count
      count = await Message.countDocuments({
        $and: [
          { 'readBy.user': { $ne: req.user.id } },
          { sender: { $ne: req.user.id } },
          { deletedAt: null },
          {
            $or: [
              { recipient: req.user.id },
              { type: 'event' } // Include event messages where user is a participant
            ]
          }
        ]
      });
    }

    res.json({ count });
  } catch (error) {
    console.error('Error getting unread count:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/messages/:eventId/analytics
// @desc    Get messaging analytics for an event (organizer only)
// @access  Private
router.get('/:eventId/analytics', auth, async (req, res) => {
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

    // Get all messages for the event
    const eventMessages = await Message.find({ event: eventId, type: 'event' })
      .populate('sender', 'name')
      .sort({ createdAt: -1 });

    const privateMessages = await Message.find({ event: eventId, type: 'private' })
      .populate('sender', 'name')
      .sort({ createdAt: -1 });

    // Calculate analytics
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const analytics = {
      totalMessages: eventMessages.length + privateMessages.length,
      eventMessages: eventMessages.length,
      privateMessages: privateMessages.length,
      messagesSentToday: eventMessages.filter(m => new Date(m.createdAt) >= today).length,
      activeChats: await Message.distinct('conversationId', { 
        event: eventId, 
        type: 'private',
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      }).then(conversations => conversations.length),
      totalReactions: eventMessages.reduce((sum, m) => sum + (m.reactions?.length || 0), 0) +
                     privateMessages.reduce((sum, m) => sum + (m.reactions?.length || 0), 0),
      mostActiveUsers: eventMessages.reduce((acc, m) => {
        const senderId = m.sender._id.toString();
        acc[senderId] = {
          name: m.sender.name,
          count: (acc[senderId]?.count || 0) + 1
        };
        return acc;
      }, {}),
      messageFrequency: eventMessages.reduce((acc, m) => {
        const hour = new Date(m.createdAt).getHours();
        acc[hour] = (acc[hour] || 0) + 1;
        return acc;
      }, {}),
      recentMessages: eventMessages.slice(0, 10).map(m => ({
        sender: m.sender.name,
        preview: m.content.substring(0, 100) + (m.content.length > 100 ? '...' : ''),
        timestamp: m.createdAt,
        hasReactions: (m.reactions?.length || 0) > 0
      }))
    };

    // Convert mostActiveUsers object to sorted array
    analytics.mostActiveUsers = Object.values(analytics.mostActiveUsers)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    res.json({
      success: true,
      analytics
    });
  } catch (error) {
    console.error('Error fetching messaging analytics:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;