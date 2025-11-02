const express = require('express');
const router = express.Router();
const BusinessCard = require('../models/BusinessCard');
const CardExchange = require('../models/CardExchange');
const User = require('../models/User');
const Event = require('../models/Event');
const auth = require('../middleware/auth');

// @route   GET /api/business-cards/my-card/:eventId
// @desc    Get user's business card for specific event
// @access  Private
router.get('/my-card/:eventId', auth, async (req, res) => {
  try {
    console.log('Fetching business card for user:', req.user.id, 'event:', req.params.eventId);
    
    const businessCard = await BusinessCard.findUserCardForEvent(req.user.id, req.params.eventId);
    
    res.json({
      success: true,
      businessCard: businessCard ? businessCard.toPublicJSON() : null
    });
  } catch (error) {
    console.error('Error fetching business card:', error);
    res.status(500).json({ message: 'Error fetching business card', error: error.message });
  }
});

// @route   POST /api/business-cards/create/:eventId
// @desc    Create new business card for event
// @access  Private
router.post('/create/:eventId', auth, async (req, res) => {
  try {
    console.log('Creating business card for user:', req.user.id, 'event:', req.params.eventId);
    
    const { eventId } = req.params;
    const {
      name,
      jobTitle,
      company,
      email,
      phone,
      website,
      linkedin,
      twitter,
      bio,
      profileImage
    } = req.body;

    // Validate required fields
    if (!name || !email) {
      return res.status(400).json({ message: 'Name and email are required' });
    }

    // Check if user already has a card for this event
    const existingCard = await BusinessCard.findUserCardForEvent(req.user.id, eventId);
    if (existingCard) {
      return res.status(400).json({ message: 'Business card already exists for this event' });
    }

    // Verify event exists and user has access
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Create new business card
    const businessCard = new BusinessCard({
      user: req.user.id,
      event: eventId,
      name,
      jobTitle,
      company,
      email,
      phone,
      website,
      linkedin,
      twitter,
      bio,
      profileImage
    });

    await businessCard.save();
    
    res.status(201).json({
      success: true,
      message: 'Business card created successfully',
      businessCard: businessCard.toPublicJSON()
    });
  } catch (error) {
    console.error('Error creating business card:', error);
    res.status(500).json({ message: 'Error creating business card', error: error.message });
  }
});

// @route   PUT /api/business-cards/update/:cardId
// @desc    Update business card
// @access  Private
router.put('/update/:cardId', auth, async (req, res) => {
  try {
    console.log('Updating business card:', req.params.cardId, 'for user:', req.user.id);
    
    const businessCard = await BusinessCard.findOne({
      _id: req.params.cardId,
      user: req.user.id
    });

    if (!businessCard) {
      return res.status(404).json({ message: 'Business card not found' });
    }

    const {
      name,
      jobTitle,
      company,
      email,
      phone,
      website,
      linkedin,
      twitter,
      bio,
      profileImage
    } = req.body;

    // Validate required fields
    if (!name || !email) {
      return res.status(400).json({ message: 'Name and email are required' });
    }

    // Update fields
    businessCard.name = name;
    businessCard.jobTitle = jobTitle || '';
    businessCard.company = company || '';
    businessCard.email = email;
    businessCard.phone = phone || '';
    businessCard.website = website || '';
    businessCard.linkedin = linkedin || '';
    businessCard.twitter = twitter || '';
    businessCard.bio = bio || '';
    businessCard.profileImage = profileImage || '';

    await businessCard.save();

    res.json({
      success: true,
      message: 'Business card updated successfully',
      businessCard: businessCard.toPublicJSON()
    });
  } catch (error) {
    console.error('Error updating business card:', error);
    res.status(500).json({ message: 'Error updating business card', error: error.message });
  }
});

// @route   GET /api/business-cards/event/:eventId
// @desc    Get all business cards for an event
// @access  Private
router.get('/event/:eventId', auth, async (req, res) => {
  try {
    console.log('Fetching all business cards for event:', req.params.eventId);
    
    const businessCards = await BusinessCard.findByEvent(req.params.eventId);
    
    // Format cards for public sharing (exclude sensitive info)
    const publicCards = businessCards.map(card => card.toPublicJSON());
    
    res.json({
      success: true,
      cards: publicCards
    });
  } catch (error) {
    console.error('Error fetching event business cards:', error);
    res.status(500).json({ message: 'Error fetching business cards', error: error.message });
  }
});

// @route   GET /api/business-cards/card/:cardId
// @desc    Get specific business card by ID (for QR code access)
// @access  Public
router.get('/card/:cardId', async (req, res) => {
  try {
    console.log('Fetching business card by ID:', req.params.cardId);
    
    const businessCard = await BusinessCard.findById(req.params.cardId)
      .populate('user', 'name email')
      .populate('event', 'title date location');

    if (!businessCard || !businessCard.isActive) {
      return res.status(404).json({ message: 'Business card not found' });
    }

    res.json({
      success: true,
      businessCard: businessCard.toPublicJSON(),
      event: {
        title: businessCard.event.title,
        date: businessCard.event.date,
        location: businessCard.event.location
      }
    });
  } catch (error) {
    console.error('Error fetching business card:', error);
    res.status(500).json({ message: 'Error fetching business card', error: error.message });
  }
});

// @route   POST /api/business-cards/exchange/:cardId
// @desc    Exchange business cards
// @access  Private
router.post('/exchange/:cardId', auth, async (req, res) => {
  try {
    console.log('Exchanging business card:', req.params.cardId, 'with user:', req.user.id);
    
    const { eventId, method = 'qr_scan', location, notes } = req.body;
    
    // Verify the card exists
    const businessCard = await BusinessCard.findById(req.params.cardId);
    if (!businessCard || !businessCard.isActive) {
      return res.status(404).json({ message: 'Business card not found' });
    }

    // Prevent users from exchanging with themselves
    if (businessCard.user.toString() === req.user.id) {
      return res.status(400).json({ message: 'Cannot exchange business card with yourself' });
    }

    // Create card exchange record
    const exchange = await CardExchange.createExchange(
      req.params.cardId,
      req.user.id,
      eventId,
      method,
      { location, notes }
    );

    res.json({
      success: true,
      message: 'Business card exchanged successfully',
      exchange: {
        id: exchange._id,
        exchangedAt: exchange.createdAt,
        method: exchange.exchangeMethod
      }
    });
  } catch (error) {
    console.error('Error exchanging business card:', error);
    if (error.message.includes('already exchanged')) {
      res.status(400).json({ message: error.message });
    } else {
      res.status(500).json({ message: 'Error exchanging business card', error: error.message });
    }
  }
});

// @route   GET /api/business-cards/exchanged/:eventId
// @desc    Get all exchanged cards for user in specific event
// @access  Private
router.get('/exchanged/:eventId', auth, async (req, res) => {
  try {
    console.log('Fetching exchanged cards for user:', req.user.id, 'event:', req.params.eventId);
    
    const exchanges = await CardExchange.getUserCollectedCards(req.user.id, req.params.eventId);
    
    // Format the response
    const cards = exchanges
      .filter(exchange => exchange.fromCard) // Filter out null cards
      .map(exchange => ({
        ...exchange.fromCard.toPublicJSON(),
        exchangeId: exchange._id,
        exchangedAt: exchange.createdAt,
        exchangeMethod: exchange.exchangeMethod,
        notes: exchange.notes,
        isRead: exchange.isRead,
        isFavorite: exchange.isFavorite,
        tags: exchange.tags
      }));

    res.json({
      success: true,
      cards
    });
  } catch (error) {
    console.error('Error fetching exchanged cards:', error);
    res.status(500).json({ message: 'Error fetching exchanged cards', error: error.message });
  }
});

// @route   GET /api/business-cards/stats/:eventId
// @desc    Get business card statistics for event
// @access  Private
router.get('/stats/:eventId', auth, async (req, res) => {
  try {
    console.log('Fetching business card stats for event:', req.params.eventId);
    
    const [cardStats, exchangeStats, topNetworkers] = await Promise.all([
      BusinessCard.countDocuments({ event: req.params.eventId, isActive: true }),
      CardExchange.getEventStats(req.params.eventId),
      CardExchange.getTopNetworkers(req.params.eventId, 5)
    ]);

    res.json({
      success: true,
      stats: {
        totalCards: cardStats,
        ...exchangeStats,
        topNetworkers
      }
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ message: 'Error fetching statistics', error: error.message });
  }
});

// @route   PUT /api/business-cards/exchange/:exchangeId/favorite
// @desc    Toggle favorite status of exchanged card
// @access  Private
router.put('/exchange/:exchangeId/favorite', auth, async (req, res) => {
  try {
    const exchange = await CardExchange.findOne({
      _id: req.params.exchangeId,
      toUser: req.user.id
    });

    if (!exchange) {
      return res.status(404).json({ message: 'Exchange not found' });
    }

    await exchange.toggleFavorite();

    res.json({
      success: true,
      message: 'Favorite status updated',
      isFavorite: exchange.isFavorite
    });
  } catch (error) {
    console.error('Error updating favorite status:', error);
    res.status(500).json({ message: 'Error updating favorite status', error: error.message });
  }
});

// @route   PUT /api/business-cards/exchange/:exchangeId/tags
// @desc    Add tags to exchanged card
// @access  Private
router.put('/exchange/:exchangeId/tags', auth, async (req, res) => {
  try {
    const { tags } = req.body;
    
    const exchange = await CardExchange.findOne({
      _id: req.params.exchangeId,
      toUser: req.user.id
    });

    if (!exchange) {
      return res.status(404).json({ message: 'Exchange not found' });
    }

    await exchange.addTags(tags);

    res.json({
      success: true,
      message: 'Tags updated',
      tags: exchange.tags
    });
  } catch (error) {
    console.error('Error updating tags:', error);
    res.status(500).json({ message: 'Error updating tags', error: error.message });
  }
});

// @route   GET /api/business-cards/vcard/:cardId
// @desc    Download business card as vCard
// @access  Public
router.get('/vcard/:cardId', async (req, res) => {
  try {
    const businessCard = await BusinessCard.findById(req.params.cardId);
    
    if (!businessCard || !businessCard.isActive) {
      return res.status(404).json({ message: 'Business card not found' });
    }

    const vCardData = businessCard.toVCard();
    
    res.set({
      'Content-Type': 'text/vcard',
      'Content-Disposition': `attachment; filename="${businessCard.name.replace(/\s+/g, '_')}_card.vcf"`
    });
    
    res.send(vCardData);
  } catch (error) {
    console.error('Error generating vCard:', error);
    res.status(500).json({ message: 'Error generating vCard', error: error.message });
  }
});

module.exports = router;