const express = require('express');
const router = express.Router();
const Session = require('../models/Session');
const Event = require('../models/Event');
const Speaker = require('../models/Speaker');
const authMiddleware = require('../middleware/auth');

// @route   POST /api/sessions
// @desc    Create a new session
// @access  Private (Organizer only)
router.post('/', authMiddleware, async (req, res) => {
  try {
    const {
      title, description, type, startTime, endTime, location,
      speakers, eventId, category, tags, skillLevel, prerequisites,
      learningObjectives, capacity, registrationRequired, materials
    } = req.body;

    // Verify the event exists and user is the organizer
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    if (event.organizer.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to add sessions to this event' });
    }

    // Validate session times
    const sessionStart = new Date(startTime);
    const sessionEnd = new Date(endTime);
    
    if (sessionStart >= sessionEnd) {
      return res.status(400).json({ message: 'Session end time must be after start time' });
    }

    // Check for speaker conflicts
    if (speakers && speakers.length > 0) {
      const speakerConflicts = await Session.find({
        speakers: { $in: speakers },
        $or: [
          {
            startTime: { $lte: sessionStart },
            endTime: { $gt: sessionStart }
          },
          {
            startTime: { $lt: sessionEnd },
            endTime: { $gte: sessionEnd }
          },
          {
            startTime: { $gte: sessionStart },
            endTime: { $lte: sessionEnd }
          }
        ]
      }).populate('speakers', 'name');

      if (speakerConflicts.length > 0) {
        return res.status(400).json({ 
          message: 'Speaker scheduling conflict detected',
          conflicts: speakerConflicts
        });
      }
    }

    const session = new Session({
      title,
      description,
      type,
      startTime: sessionStart,
      endTime: sessionEnd,
      location,
      speakers,
      event: eventId,
      organizer: req.user.id,
      category,
      tags,
      skillLevel,
      prerequisites,
      learningObjectives,
      capacity,
      registrationRequired,
      materials
    });

    await session.save();

    // Add session to event agenda
    await Event.findByIdAndUpdate(eventId, {
      $push: { 'agenda.sessions': session._id },
      $set: { 'agenda.enabled': true }
    });

    const populatedSession = await Session.findById(session._id)
      .populate('speakers', 'name title company profileImage')
      .populate('event', 'title');

    res.status(201).json({
      message: 'Session created successfully',
      session: populatedSession
    });
  } catch (error) {
    console.error('Error creating session:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/sessions/event/:eventId
// @desc    Get all sessions for an event
// @access  Public
router.get('/event/:eventId', async (req, res) => {
  try {
    const { eventId } = req.params;
    const { date, type, speaker } = req.query;
    
    let query = { event: eventId };
    
    // Add filters
    if (type) query.type = type;
    if (speaker) query.speakers = speaker;
    
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
    
    const sessions = await Session.find(query)
      .populate('speakers', 'name title company profileImage isKeynoteSpeaker')
      .populate('event', 'title')
      .sort({ startTime: 1 });
    
    res.json({
      success: true,
      sessions
    });
  } catch (error) {
    console.error('Error fetching sessions:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/sessions/:id
// @desc    Get session by ID
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const session = await Session.findById(req.params.id)
      .populate('speakers', 'name title company profileImage bio socialLinks expertise')
      .populate('event', 'title date location organizer')
      .populate('registrations.participant', 'name email');
    
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }
    
    res.json({
      success: true,
      session
    });
  } catch (error) {
    console.error('Error fetching session:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   PUT /api/sessions/:id
// @desc    Update session
// @access  Private (Organizer only)
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const session = await Session.findById(req.params.id);
    
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }
    
    // Check if user is the organizer
    if (session.organizer.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to update this session' });
    }
    
    // If updating times, validate new times
    if (req.body.startTime || req.body.endTime) {
      const newStartTime = new Date(req.body.startTime || session.startTime);
      const newEndTime = new Date(req.body.endTime || session.endTime);
      
      if (newStartTime >= newEndTime) {
        return res.status(400).json({ message: 'Session end time must be after start time' });
      }
    }
    
    const updatedSession = await Session.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    ).populate('speakers', 'name title company profileImage');
    
    res.json({
      message: 'Session updated successfully',
      session: updatedSession
    });
  } catch (error) {
    console.error('Error updating session:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   DELETE /api/sessions/:id
// @desc    Delete session
// @access  Private (Organizer only)
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const session = await Session.findById(req.params.id);
    
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }
    
    // Check if user is the organizer
    if (session.organizer.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to delete this session' });
    }
    
    // Remove session from event agenda
    await Event.findByIdAndUpdate(session.event, {
      $pull: { 'agenda.sessions': session._id }
    });
    
    await Session.findByIdAndDelete(req.params.id);
    
    res.json({ message: 'Session deleted successfully' });
  } catch (error) {
    console.error('Error deleting session:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   POST /api/sessions/:id/register
// @desc    Register for a session
// @access  Private (Participant only)
router.post('/:id/register', authMiddleware, async (req, res) => {
  try {
    const session = await Session.findById(req.params.id);
    
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }
    
    if (!session.registrationRequired) {
      return res.status(400).json({ message: 'Registration not required for this session' });
    }
    
    await session.registerParticipant(req.user.id);
    
    const updatedSession = await Session.findById(req.params.id)
      .populate('speakers', 'name title company');
    
    res.json({
      message: 'Successfully registered for session',
      session: updatedSession,
      availableSpots: updatedSession.availableSpots,
      waitlisted: updatedSession.availableSpots === 0
    });
  } catch (error) {
    console.error('Error registering for session:', error);
    if (error.message === 'Already registered for this session') {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   PUT /api/sessions/:id/attendance
// @desc    Mark attendance for session
// @access  Private (Organizer only)
router.put('/:id/attendance', authMiddleware, async (req, res) => {
  try {
    const { participantId, attended } = req.body;
    const session = await Session.findById(req.params.id);
    
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }
    
    // Check if user is the organizer
    if (session.organizer.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to mark attendance' });
    }
    
    await session.markAttendance(participantId, attended);
    
    res.json({
      message: `Attendance ${attended ? 'marked' : 'unmarked'} successfully`
    });
  } catch (error) {
    console.error('Error marking attendance:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   POST /api/sessions/:id/feedback
// @desc    Add feedback for session
// @access  Private (Participant only, after attendance)
router.post('/:id/feedback', authMiddleware, async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const session = await Session.findById(req.params.id);
    
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }
    
    if (rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    }
    
    await session.addFeedback(req.user.id, rating, comment);
    
    res.json({
      message: 'Feedback added successfully'
    });
  } catch (error) {
    console.error('Error adding feedback:', error);
    if (error.message.includes('not registered') || error.message.includes('after attending')) {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/sessions/agenda/:eventId
// @desc    Get event agenda grouped by date
// @access  Public
router.get('/agenda/:eventId', async (req, res) => {
  try {
    const { eventId } = req.params;
    
    const sessions = await Session.find({ event: eventId })
      .populate('speakers', 'name title company profileImage isKeynoteSpeaker')
      .sort({ startTime: 1 });
    
    // Group sessions by date
    const agenda = {};
    sessions.forEach(session => {
      const dateKey = session.startTime.toISOString().split('T')[0];
      if (!agenda[dateKey]) {
        agenda[dateKey] = [];
      }
      agenda[dateKey].push(session);
    });
    
    res.json({
      success: true,
      agenda
    });
  } catch (error) {
    console.error('Error fetching agenda:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/sessions/my-sessions/:eventId
// @desc    Get user's registered sessions for an event
// @access  Private
router.get('/my-sessions/:eventId', authMiddleware, async (req, res) => {
  try {
    const { eventId } = req.params;
    
    const sessions = await Session.find({
      event: eventId,
      'registrations.participant': req.user.id
    })
    .populate('speakers', 'name title company profileImage')
    .sort({ startTime: 1 });
    
    // Add user's registration status to each session
    const sessionsWithStatus = sessions.map(session => {
      const userRegistration = session.registrations.find(
        reg => reg.participant.toString() === req.user.id
      );
      
      return {
        ...session.toObject(),
        userStatus: userRegistration ? userRegistration.status : null,
        userFeedback: userRegistration ? userRegistration.feedback : null
      };
    });
    
    res.json({
      success: true,
      sessions: sessionsWithStatus
    });
  } catch (error) {
    console.error('Error fetching user sessions:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;