const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const authMiddleware = require('../middleware/auth');
const Event = require('../models/Event');
const Registration = require('../models/Registration');
const EventReview = require('../models/EventReview');

async function buildReviewSummary(eventId) {
  const [summary] = await EventReview.aggregate([
    { $match: { event: new mongoose.Types.ObjectId(eventId) } },
    {
      $group: {
        _id: '$event',
        averageRating: { $avg: '$rating' },
        reviewCount: { $sum: 1 }
      }
    }
  ]);

  if (!summary) {
    return { averageRating: 0, reviewCount: 0 };
  }

  return {
    averageRating: Number(summary.averageRating.toFixed(1)),
    reviewCount: summary.reviewCount
  };
}

router.get('/events/:eventId', async (req, res) => {
  try {
    const { eventId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(eventId)) {
      return res.status(400).json({ message: 'Invalid event ID' });
    }

    const summary = await buildReviewSummary(eventId);
    const reviews = await EventReview.find({ event: eventId })
      .populate('participant', 'name avatarUrl')
      .sort({ createdAt: -1 })
      .limit(20);

    res.json({ summary, reviews });
  } catch (error) {
    console.error('Error fetching event reviews:', error);
    res.status(500).json({ message: 'Server error fetching reviews', error: error.message });
  }
});

router.post('/events/:eventId', authMiddleware, async (req, res) => {
  try {
    const { eventId } = req.params;
    const participantId = req.user.id;
    const { rating, comment } = req.body;

    if (!mongoose.Types.ObjectId.isValid(eventId)) {
      return res.status(400).json({ message: 'Invalid event ID' });
    }

    const numericRating = Number(rating);
    if (!Number.isInteger(numericRating) || numericRating < 1 || numericRating > 5) {
      return res.status(400).json({ message: 'Rating must be an integer between 1 and 5' });
    }

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    const registration = await Registration.findOne({
      event: eventId,
      participant: participantId,
      status: { $in: ['confirmed', 'attended'] }
    });

    if (!registration) {
      return res.status(403).json({ message: 'Only registered attendees can leave a review.' });
    }

    const review = await EventReview.findOneAndUpdate(
      { event: eventId, participant: participantId },
      {
        rating: numericRating,
        comment: comment ? String(comment).trim() : ''
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).populate('participant', 'name avatarUrl');

    const summary = await buildReviewSummary(eventId);

    res.status(201).json({
      message: 'Review saved successfully',
      review,
      summary
    });
  } catch (error) {
    console.error('Error saving event review:', error);
    res.status(500).json({ message: 'Server error saving review', error: error.message });
  }
});

module.exports = router;