const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Poll = require('../models/Poll');
const PollResponse = require('../models/PollResponse');
const Event = require('../models/Event');
const auth = require('../middleware/auth');

// Simple test route
router.get('/test', (req, res) => {
  res.json({ message: 'Polling routes are working', timestamp: new Date() });
});

// Middleware to validate eventId
const validateEventId = (req, res, next) => {
  const { eventId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(eventId)) {
    console.log('Invalid eventId format:', eventId);
    return res.status(400).json({ message: 'Invalid event ID format' });
  }
  next();
};

// Get all polls for an event
router.get('/:eventId/polls', validateEventId, auth, async (req, res) => {
  try {
    const { eventId } = req.params;
    console.log('All polls request for eventId:', eventId, 'user:', req.user?.id);
    
    if (!req.user || !req.user.id) {
      console.log('No user ID found in request');
      return res.status(400).json({ message: 'User ID not found' });
    }
    
    // Verify user has access to the event
    const event = await Event.findById(eventId);
    if (!event) {
      console.log('Event not found:', eventId);
      return res.status(404).json({ message: 'Event not found' });
    }
    
    console.log('Event found:', event.title);
    
    const polls = await Poll.find({ event: eventId })
      .populate('creator', 'name email')
      .sort({ createdAt: -1 });
    
    console.log('Found', polls.length, 'polls for event');
    
    // Get user responses for each poll
    const pollsWithUserResponses = await Promise.all(polls.map(async (poll) => {
      const userResponse = await PollResponse.findOne({
        poll: poll._id,
        voter: req.user.id
      });
      
      return {
        ...poll.toObject(),
        userResponse: userResponse ? userResponse.response : null
      };
    }));

    console.log('Returning', pollsWithUserResponses.length, 'polls with user responses');
    res.json({ polls: pollsWithUserResponses });
  } catch (error) {
    console.error('Error fetching polls:', error);
    console.error('Stack trace:', error.stack);
    res.status(500).json({ 
      message: 'Server error',
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});// Get active polls for an event
router.get('/:eventId/active', validateEventId, auth, async (req, res) => {
  try {
    const { eventId } = req.params;
    console.log('Active polls request for eventId:', eventId, 'user:', req.user?.id);
    
    if (!req.user || !req.user.id) {
      console.log('No user ID found in request');
      return res.status(400).json({ message: 'User ID not found' });
    }
    
    // Verify event exists
    const event = await Event.findById(eventId);
    if (!event) {
      console.log('Event not found:', eventId);
      return res.status(404).json({ message: 'Event not found' });
    }
    
    console.log('Event found:', event.title);
    
    const polls = await Poll.find({ 
      event: eventId, 
      isActive: true,
      $or: [
        { endTime: { $exists: false } },
        { endTime: null },
        { endTime: { $gt: new Date() } }
      ]
    })
    .populate('creator', 'name email')
    .sort({ startTime: -1 });
    
    // Auto-deactivate expired polls
    const currentTime = new Date();
    const expiredPolls = polls.filter(poll => 
      poll.endTime && poll.endTime <= currentTime
    );
    
    for (let poll of expiredPolls) {
      await poll.deactivate();
    }
    
    // Filter out expired polls
    const activePolls = polls.filter(poll => 
      !poll.endTime || poll.endTime > currentTime
    );
    
    console.log('Found', activePolls.length, 'active polls');
    
    // Get user responses for active polls
    const pollsWithUserResponses = await Promise.all(activePolls.map(async (poll) => {
      const userResponse = await PollResponse.findOne({
        poll: poll._id,
        voter: req.user.id
      });
      
      return {
        ...poll.toObject(),
        userResponse: userResponse ? userResponse.response : null
      };
    }));

    console.log('Returning', pollsWithUserResponses.length, 'polls with user responses');
    res.json({ polls: pollsWithUserResponses });
  } catch (error) {
    console.error('Error fetching active polls:', error);
    console.error('Stack trace:', error.stack);
    res.status(500).json({ 
      message: 'Server error',
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});// Create a new poll
router.post('/:eventId/polls', validateEventId, auth, async (req, res) => {
  try {
    const { eventId } = req.params;
    const { question, type, options, allowMultiple, isAnonymous, timeLimit, description } = req.body;
    console.log('Create poll request for eventId:', eventId, 'user:', req.user?.id);
    console.log('Poll data:', { question, type, options, allowMultiple, isAnonymous, timeLimit, description });
    
    if (!req.user || !req.user.id) {
      console.log('No user ID found in request');
      return res.status(400).json({ message: 'User ID not found' });
    }
    
    // Verify user is organizer of the event
    const event = await Event.findById(eventId);
    if (!event) {
      console.log('Event not found:', eventId);
      return res.status(404).json({ message: 'Event not found' });
    }
    
    console.log('Event found:', event.title, 'organizer:', event.organizer, 'requester:', req.user.id);
    
    if (event.organizer.toString() !== req.user.id && req.user.role !== 'organizer') {
      console.log('Access denied - not organizer. Event organizer:', event.organizer, 'User:', req.user.id, 'User role:', req.user.role);
      return res.status(403).json({ message: 'Only event organizers can create polls' });
    }
    
    // Validate poll data
    if (!question || !type) {
      return res.status(400).json({ message: 'Question and type are required' });
    }
    
    if ((type === 'single_choice' || type === 'multiple_choice') && (!options || options.length < 2)) {
      return res.status(400).json({ message: 'At least 2 options are required for choice polls' });
    }
    
    const poll = new Poll({
      event: eventId,
      creator: req.user.id,
      question,
      type,
      options: options || [],
      allowMultiple: type === 'multiple_choice' ? allowMultiple : false,
      isAnonymous,
      isActive: true, // Make polls active by default when created by organizers
      timeLimit: timeLimit || 0,
      description
    });
    
    // Initialize results structure
    await poll.initializeResults();
    
    const savedPoll = await poll.populate('creator', 'name email');
    
    // Emit real-time poll creation event
    const io = req.app.get('io');
    if (io) {
      io.to(`event-${eventId}`).emit('poll-created', savedPoll);
    }
    
    console.log('Poll created successfully:', savedPoll._id);
    res.status(201).json({ poll: savedPoll });
  } catch (error) {
    console.error('Error creating poll:', error);
    console.error('Stack trace:', error.stack);
    res.status(500).json({ 
      message: 'Server error',
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Vote on a poll
router.post('/:eventId/polls/:pollId/vote', auth, async (req, res) => {
  try {
    const { eventId, pollId } = req.params;
    const { selectedOptions, rating, textResponse } = req.body;
    
    const poll = await Poll.findOne({ _id: pollId, event: eventId });
    if (!poll) {
      return res.status(404).json({ message: 'Poll not found' });
    }
    
    if (!poll.isActive) {
      return res.status(400).json({ message: 'Poll is not active' });
    }
    
    if (poll.endTime && poll.endTime <= new Date()) {
      await poll.deactivate();
      return res.status(400).json({ message: 'Poll has expired' });
    }
    
    // Check if user already voted
    const existingResponse = await PollResponse.findOne({
      poll: pollId,
      voter: req.user.id
    });
    
    if (existingResponse) {
      // Update existing response
      if (poll.type === 'single_choice' || poll.type === 'multiple_choice') {
        existingResponse.response.selectedOptions = selectedOptions;
      } else if (poll.type === 'rating') {
        existingResponse.response.rating = rating;
      } else if (poll.type === 'text') {
        existingResponse.response.textResponse = textResponse;
      }
      
      await existingResponse.save();
    } else {
      // Create new response
      const response = {
        selectedOptions: selectedOptions || [],
        rating: rating || null,
        textResponse: textResponse || null
      };
      
      const pollResponse = new PollResponse({
        poll: pollId,
        voter: req.user.id,
        event: eventId,
        response,
        isAnonymous: poll.isAnonymous,
        ipAddress: req.ip
      });
      
      // Validate response
      if (!pollResponse.validateResponse(poll.type, poll.options, poll.allowMultiple)) {
        return res.status(400).json({ message: 'Invalid response format' });
      }
      
      await pollResponse.save();
    }
    
    // Update poll results
    await updatePollResults(pollId);
    
    const updatedPoll = await Poll.findById(pollId);
    
    // Emit real-time poll update
    const io = req.app.get('io');
    if (io) {
      io.to(`event-${eventId}`).emit('poll-updated', { 
        pollId, 
        results: updatedPoll.results,
        totalVotes: updatedPoll.totalVotes 
      });
    }
    
    res.json({ 
      message: 'Vote recorded successfully',
      poll: updatedPoll,
      response: existingResponse || pollResponse
    });
  } catch (error) {
    console.error('Error recording vote:', error);
    if (error.code === 11000) {
      res.status(400).json({ message: 'You have already voted on this poll' });
    } else {
      res.status(500).json({ message: 'Server error' });
    }
  }
});

// Activate a poll
router.post('/:eventId/polls/:pollId/activate', auth, async (req, res) => {
  try {
    const { eventId, pollId } = req.params;
    
    const poll = await Poll.findOne({ _id: pollId, event: eventId });
    if (!poll) {
      return res.status(404).json({ message: 'Poll not found' });
    }
    
    // Verify user is organizer
    const event = await Event.findById(eventId);
    if (event.organizer.toString() !== req.user.id && req.user.role !== 'organizer') {
      return res.status(403).json({ message: 'Only event organizers can activate polls' });
    }
    
    await poll.activate();
    
    res.json({ message: 'Poll activated successfully', poll });
  } catch (error) {
    console.error('Error activating poll:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Deactivate a poll
router.post('/:eventId/polls/:pollId/deactivate', auth, async (req, res) => {
  try {
    const { eventId, pollId } = req.params;
    
    const poll = await Poll.findOne({ _id: pollId, event: eventId });
    if (!poll) {
      return res.status(404).json({ message: 'Poll not found' });
    }
    
    // Verify user is organizer
    const event = await Event.findById(eventId);
    if (event.organizer.toString() !== req.user.id && req.user.role !== 'organizer') {
      return res.status(403).json({ message: 'Only event organizers can deactivate polls' });
    }
    
    await poll.deactivate();
    
    res.json({ message: 'Poll deactivated successfully', poll });
  } catch (error) {
    console.error('Error deactivating poll:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get poll analytics
router.get('/:eventId/polls/:pollId/analytics', auth, async (req, res) => {
  try {
    const { eventId, pollId } = req.params;
    
    const poll = await Poll.findOne({ _id: pollId, event: eventId })
      .populate('creator', 'name email');
    
    if (!poll) {
      return res.status(404).json({ message: 'Poll not found' });
    }
    
    // Verify user is organizer
    const event = await Event.findById(eventId);
    if (event.organizer.toString() !== req.user.id && req.user.role !== 'organizer') {
      return res.status(403).json({ message: 'Only event organizers can view analytics' });
    }
    
    const statistics = await PollResponse.getPollStatistics(pollId);
    
    // Get text responses if applicable
    let textResponses = [];
    if (poll.type === 'text') {
      const responses = await PollResponse.find({ poll: pollId })
        .populate('voter', 'name email')
        .sort({ submittedAt: -1 });
      
      textResponses = responses.map(r => ({
        text: r.response.textResponse,
        submittedAt: r.submittedAt,
        voter: r.isAnonymous ? null : {
          id: r.voter._id,
          name: r.voter.name,
          email: r.voter.email
        }
      }));
    }
    
    res.json({
      poll,
      statistics: {
        ...statistics,
        textResponses
      }
    });
  } catch (error) {
    console.error('Error fetching poll analytics:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete a poll
router.delete('/:eventId/polls/:pollId', auth, async (req, res) => {
  try {
    const { eventId, pollId } = req.params;
    
    const poll = await Poll.findOne({ _id: pollId, event: eventId });
    if (!poll) {
      return res.status(404).json({ message: 'Poll not found' });
    }
    
    // Verify user is organizer
    const event = await Event.findById(eventId);
    if (event.organizer.toString() !== req.user.id && req.user.role !== 'organizer') {
      return res.status(403).json({ message: 'Only event organizers can delete polls' });
    }
    
    // Delete all responses for this poll
    await PollResponse.deleteMany({ poll: pollId });
    
    // Delete the poll
    await Poll.findByIdAndDelete(pollId);
    
    res.json({ message: 'Poll deleted successfully' });
  } catch (error) {
    console.error('Error deleting poll:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Helper function to update poll results
async function updatePollResults(pollId) {
  try {
    const poll = await Poll.findById(pollId);
    const responses = await PollResponse.find({ poll: pollId });
    
    const results = [];
    let totalVotes = 0;
    const uniqueVoters = new Set();
    
    if (poll.type === 'rating') {
      // Initialize rating results
      for (let rating = 1; rating <= 5; rating++) {
        results.push({ rating, votes: 0 });
      }
      
      responses.forEach(response => {
        if (response.response.rating) {
          const ratingIndex = response.response.rating - 1;
          results[ratingIndex].votes++;
          totalVotes++;
          uniqueVoters.add(response.voter.toString());
        }
      });
    } else if (poll.type === 'single_choice' || poll.type === 'multiple_choice') {
      // Initialize option results
      poll.options.forEach((_, index) => {
        results.push({ optionIndex: index, votes: 0 });
      });
      
      responses.forEach(response => {
        if (response.response.selectedOptions) {
          response.response.selectedOptions.forEach(optionIndex => {
            if (optionIndex >= 0 && optionIndex < results.length) {
              results[optionIndex].votes++;
              totalVotes++;
            }
          });
          uniqueVoters.add(response.voter.toString());
        }
      });
    } else if (poll.type === 'text') {
      totalVotes = responses.length;
      responses.forEach(response => {
        uniqueVoters.add(response.voter.toString());
      });
    }
    
    poll.results = results;
    poll.totalVotes = totalVotes;
    poll.uniqueVoters = uniqueVoters.size;
    
    await poll.save();
  } catch (error) {
    console.error('Error updating poll results:', error);
  }
}

// Get all responses for a specific poll (organizer only)
router.get('/:eventId/polls/:pollId/responses', validateEventId, auth, async (req, res) => {
  try {
    const { eventId, pollId } = req.params;
    
    // Verify user is organizer of the event
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }
    
    const isOrganizer = event.organizer.toString() === req.user.id || req.user.role === 'organizer';
    if (!isOrganizer) {
      return res.status(403).json({ message: 'Only event organizers can view poll responses' });
    }
    
    // Verify poll belongs to this event
    const poll = await Poll.findOne({ _id: pollId, event: eventId });
    if (!poll) {
      return res.status(404).json({ message: 'Poll not found in this event' });
    }
    
    const responses = await PollResponse.find({ poll: pollId })
      .populate('voter', 'name email')
      .sort({ createdAt: -1 });
    
    res.json({ 
      success: true,
      responses: responses.map(response => ({
        _id: response._id,
        selectedOptions: response.selectedOptions || response.response, // Handle both formats
        textResponse: response.textResponse,
        rating: response.rating,
        voter: poll.isAnonymous ? null : response.voter,
        createdAt: response.createdAt,
        updatedAt: response.updatedAt
      }))
    });
  } catch (error) {
    console.error('Error fetching poll responses:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get user's responses for all polls in an event
router.get('/:eventId/my-responses', validateEventId, auth, async (req, res) => {
  try {
    const { eventId } = req.params;
    
    const responses = await PollResponse.find({
      event: eventId,
      voter: req.user.id
    }).populate('poll', 'question type options');
    
    res.json({ responses });
  } catch (error) {
    console.error('Error fetching user responses:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// End a poll (organizer only)
router.put('/:eventId/polls/:pollId/end', validateEventId, auth, async (req, res) => {
  try {
    const { eventId, pollId } = req.params;
    
    // Verify user is organizer of the event
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }
    
    if (event.organizer.toString() !== req.user.id && req.user.role !== 'organizer') {
      return res.status(403).json({ message: 'Only event organizers can end polls' });
    }
    
    const poll = await Poll.findOne({ _id: pollId, event: eventId });
    if (!poll) {
      return res.status(404).json({ message: 'Poll not found' });
    }
    
    poll.isActive = false;
    poll.endTime = new Date();
    await poll.save();
    
    // Emit real-time event
    const io = req.app.get('io');
    if (io) {
      io.to(`event-${eventId}`).emit('poll-ended', pollId);
    }
    
    res.json({ message: 'Poll ended successfully', poll });
  } catch (error) {
    console.error('Error ending poll:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get poll analytics (organizer only)
router.get('/:eventId/analytics', validateEventId, auth, async (req, res) => {
  try {
    const { eventId } = req.params;
    
    // Verify user is organizer of the event
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }
    
    if (event.organizer.toString() !== req.user.id && req.user.role !== 'organizer') {
      return res.status(403).json({ message: 'Only event organizers can view analytics' });
    }
    
    const polls = await Poll.find({ event: eventId });
    const responses = await PollResponse.find({ event: eventId });
    
    const analytics = {
      totalPolls: polls.length,
      activePolls: polls.filter(poll => poll.isActive).length,
      totalVotes: responses.length,
      uniqueVoters: new Set(responses.map(r => r.voter.toString())).size,
      averageVotesPerPoll: polls.length > 0 ? Math.round(responses.length / polls.length) : 0,
      pollsWithVotes: polls.filter(poll => poll.totalVotes > 0).length,
      responseRate: polls.length > 0 ? Math.round((polls.filter(poll => poll.totalVotes > 0).length / polls.length) * 100) : 0,
      polls: polls.map(poll => ({
        _id: poll._id,
        question: poll.question,
        type: poll.type,
        totalVotes: poll.totalVotes || 0,
        uniqueVoters: poll.uniqueVoters || 0,
        createdAt: poll.createdAt,
        isActive: poll.isActive,
        results: poll.results
      }))
    };
    
    res.json({ analytics });
  } catch (error) {
    console.error('Error fetching poll analytics:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;