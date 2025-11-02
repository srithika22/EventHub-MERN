const express = require('express');
const router = express.Router();
const Speaker = require('../models/Speaker');
const Event = require('../models/Event');
const authMiddleware = require('../middleware/auth');

// @route   POST /api/speakers
// @desc    Create a new speaker
// @access  Private (Organizer only)
router.post('/', authMiddleware, async (req, res) => {
  try {
    const {
      name, email, bio, title, company, profileImage,
      socialLinks, expertise, experience, achievements,
      speakingTopics, eventId, isKeynoteSpeaker, speakerFee,
      availability, contactPreferences
    } = req.body;

    // Verify the event exists and user is the organizer
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    if (event.organizer.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to add speakers to this event' });
    }

    // Check if speaker already exists for this event
    const existingSpeaker = await Speaker.findOne({ email, event: eventId });
    if (existingSpeaker) {
      return res.status(400).json({ message: 'Speaker already exists for this event' });
    }

    const speaker = new Speaker({
      name,
      email,
      bio,
      title,
      company,
      profileImage,
      socialLinks,
      expertise,
      experience,
      achievements,
      speakingTopics,
      event: eventId,
      organizer: req.user.id,
      isKeynoteSpeaker,
      speakerFee,
      availability,
      contactPreferences
    });

    await speaker.save();

    // Add speaker to event
    await Event.findByIdAndUpdate(eventId, {
      $push: { speakers: speaker._id }
    });

    res.status(201).json({
      message: 'Speaker added successfully',
      speaker
    });
  } catch (error) {
    console.error('Error creating speaker:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/speakers/event/:eventId
// @desc    Get all speakers for an event
// @access  Public
router.get('/event/:eventId', async (req, res) => {
  try {
    const { eventId } = req.params;
    
    const speakers = await Speaker.findByEvent(eventId);
    
    res.json({
      success: true,
      speakers
    });
  } catch (error) {
    console.error('Error fetching speakers:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/speakers/:id
// @desc    Get speaker by ID
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const speaker = await Speaker.findById(req.params.id)
      .populate('event', 'title date location')
      .populate('organizer', 'name email');
    
    if (!speaker) {
      return res.status(404).json({ message: 'Speaker not found' });
    }
    
    res.json({
      success: true,
      speaker
    });
  } catch (error) {
    console.error('Error fetching speaker:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   PUT /api/speakers/:id
// @desc    Update speaker
// @access  Private (Organizer only)
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const speaker = await Speaker.findById(req.params.id);
    
    if (!speaker) {
      return res.status(404).json({ message: 'Speaker not found' });
    }
    
    // Check if user is the organizer
    if (speaker.organizer.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to update this speaker' });
    }
    
    const updatedSpeaker = await Speaker.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );
    
    res.json({
      message: 'Speaker updated successfully',
      speaker: updatedSpeaker
    });
  } catch (error) {
    console.error('Error updating speaker:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   DELETE /api/speakers/:id
// @desc    Delete speaker
// @access  Private (Organizer only)
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const speaker = await Speaker.findById(req.params.id);
    
    if (!speaker) {
      return res.status(404).json({ message: 'Speaker not found' });
    }
    
    // Check if user is the organizer
    if (speaker.organizer.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to delete this speaker' });
    }
    
    // Remove speaker from event
    await Event.findByIdAndUpdate(speaker.event, {
      $pull: { speakers: speaker._id }
    });
    
    await Speaker.findByIdAndDelete(req.params.id);
    
    res.json({ message: 'Speaker deleted successfully' });
  } catch (error) {
    console.error('Error deleting speaker:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   PUT /api/speakers/:id/status
// @desc    Update speaker status (confirm, decline, etc.)
// @access  Private (Speaker or Organizer)
router.put('/:id/status', authMiddleware, async (req, res) => {
  try {
    const { status } = req.body;
    const speaker = await Speaker.findById(req.params.id);
    
    if (!speaker) {
      return res.status(404).json({ message: 'Speaker not found' });
    }
    
    // Check if user is the organizer or the speaker (by email match)
    const user = req.user;
    const isOrganizer = speaker.organizer.toString() === user.id;
    const isSpeaker = speaker.email === user.email;
    
    if (!isOrganizer && !isSpeaker) {
      return res.status(403).json({ message: 'Not authorized to update speaker status' });
    }
    
    speaker.status = status;
    await speaker.save();
    
    res.json({
      message: 'Speaker status updated successfully',
      speaker
    });
  } catch (error) {
    console.error('Error updating speaker status:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   POST /api/speakers/:id/rate
// @desc    Rate a speaker
// @access  Private (Participant only, after event)
router.post('/:id/rate', authMiddleware, async (req, res) => {
  try {
    const { rating } = req.body;
    const speaker = await Speaker.findById(req.params.id);
    
    if (!speaker) {
      return res.status(404).json({ message: 'Speaker not found' });
    }
    
    if (rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    }
    
    await speaker.updateRating(rating);
    
    res.json({
      message: 'Speaker rated successfully',
      speaker: {
        id: speaker._id,
        rating: speaker.rating,
        totalRatings: speaker.totalRatings
      }
    });
  } catch (error) {
    console.error('Error rating speaker:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/speakers/organizer/:organizerId
// @desc    Get all speakers for an organizer across all events
// @access  Private (Organizer only)
router.get('/organizer/:organizerId', authMiddleware, async (req, res) => {
  try {
    const { organizerId } = req.params;
    
    // Check if user is requesting their own speakers
    if (organizerId !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to view these speakers' });
    }
    
    const speakers = await Speaker.find({ organizer: organizerId })
      .populate('event', 'title date location status')
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      speakers
    });
  } catch (error) {
    console.error('Error fetching organizer speakers:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;