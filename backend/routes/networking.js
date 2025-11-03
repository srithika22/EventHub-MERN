const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const User = require('../models/User');
const Event = require('../models/Event');
const Registration = require('../models/Registration');
const Connection = require('../models/Connection');
const authMiddleware = require('../middleware/auth');

// @route   GET /api/networking/:eventId/participants
// @desc    Get all participants for an event who have opted in for networking
// @access  Private
router.get('/:eventId/participants', authMiddleware, async (req, res) => {
    try {
        const eventId = req.params.eventId;
        
        // Validate ObjectId format
        if (!mongoose.Types.ObjectId.isValid(eventId)) {
            console.log('❌ Invalid eventId format:', eventId);
            return res.status(400).json({ message: 'Invalid event ID format' });
        }
        
        console.log('🔍 Fetching participants for event:', eventId);
        
        // Check if event exists
        const event = await Event.findById(eventId);
        if (!event) {
            console.log('❌ Event not found:', eventId);
            return res.status(404).json({ message: 'Event not found' });
        }
        
        // Find all registrations for this event
        const registrations = await Registration.find({ event: eventId })
            .populate('participant');
        
        console.log('📊 Found registrations:', registrations.length);
        
        // Filter participants who have networking profiles and opted in
        const networkingParticipants = registrations
            .map(reg => reg.participant)
            .filter(participant => participant && participant.networkingProfile)
            .map(participant => ({
                _id: participant._id,
                name: participant.name,
                email: participant.email,
                bio: participant.networkingProfile.bio,
                jobTitle: participant.networkingProfile.jobTitle,
                company: participant.networkingProfile.company,
                skills: participant.networkingProfile.skills,
                interests: participant.networkingProfile.interests,
                industry: participant.networkingProfile.industry,
                linkedinUrl: participant.networkingProfile.linkedinUrl,
                twitterUrl: participant.networkingProfile.twitterUrl,
                websiteUrl: participant.networkingProfile.websiteUrl,
                availableForNetworking: participant.networkingProfile.availableForNetworking,
                lookingFor: participant.networkingProfile.lookingFor,
                canOffer: participant.networkingProfile.canOffer
            }))
            .filter(participant => participant.availableForNetworking);
        
        res.json(networkingParticipants);
    } catch (error) {
        console.error('Error fetching networking participants:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/networking/profile
// @desc    Get current user's networking profile
// @access  Private
router.get('/profile', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        res.json(user.networkingProfile || {});
    } catch (error) {
        console.error('Error fetching networking profile:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   PUT /api/networking/profile
// @desc    Update current user's networking profile
// @access  Private
router.put('/profile', authMiddleware, async (req, res) => {
    try {
        const {
            bio,
            jobTitle,
            company,
            skills,
            interests,
            industry,
            linkedinUrl,
            twitterUrl,
            websiteUrl,
            availableForNetworking,
            lookingFor,
            canOffer
        } = req.body;
        
        const user = await User.findById(req.user.id);
        
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        // Update networking profile
        user.networkingProfile = {
            bio: bio || '',
            jobTitle: jobTitle || '',
            company: company || '',
            skills: Array.isArray(skills) ? skills : [],
            interests: Array.isArray(interests) ? interests : [],
            industry: industry || '',
            linkedinUrl: linkedinUrl || '',
            twitterUrl: twitterUrl || '',
            websiteUrl: websiteUrl || '',
            availableForNetworking: Boolean(availableForNetworking),
            lookingFor: lookingFor || '',
            canOffer: canOffer || ''
        };
        
        await user.save();
        
        res.json({ message: 'Profile updated successfully', profile: user.networkingProfile });
    } catch (error) {
        console.error('Error updating networking profile:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST /api/networking/connect
// @desc    Send a connection request
// @access  Private
router.post('/connect', authMiddleware, async (req, res) => {
    try {
        const { targetUserId, eventId, message } = req.body;
        const requesterId = req.user.id;
        
        if (requesterId === targetUserId) {
            return res.status(400).json({ message: 'Cannot connect to yourself' });
        }
        
        // Check if connection already exists
        const existingConnection = await Connection.findOne({
            $or: [
                { requester: requesterId, receiver: targetUserId },
                { requester: targetUserId, receiver: requesterId }
            ]
        });
        
        if (existingConnection) {
            return res.status(400).json({ message: 'Connection already exists or pending' });
        }
        
        // Create new connection request
        const newConnection = new Connection({
            requester: requesterId,
            receiver: targetUserId,
            event: eventId,
            message: message || '',
            status: 'pending'
        });
        
        await newConnection.save();
        
        res.status(201).json({ message: 'Connection request sent successfully' });
    } catch (error) {
        console.error('Error sending connection request:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/networking/connections
// @desc    Get user's connections and pending requests
// @access  Private
router.get('/connections', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        
        const connections = await Connection.find({
            $or: [
                { requester: userId },
                { receiver: userId }
            ]
        })
        .populate('requester', 'name email')
        .populate('receiver', 'name email')
        .populate('event', 'title date');
        
        res.json(connections);
    } catch (error) {
        console.error('Error fetching connections:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   PUT /api/networking/connections/:connectionId
// @desc    Accept or reject a connection request
// @access  Private
router.put('/connections/:connectionId', authMiddleware, async (req, res) => {
    try {
        const { connectionId } = req.params;
        const { status } = req.body; // 'accepted' or 'rejected'
        const userId = req.user.id;
        
        if (!['accepted', 'rejected'].includes(status)) {
            return res.status(400).json({ message: 'Invalid status' });
        }
        
        const connection = await Connection.findById(connectionId);
        
        if (!connection) {
            return res.status(404).json({ message: 'Connection request not found' });
        }
        
        // Only the receiver can accept/reject
        if (connection.receiver.toString() !== userId) {
            return res.status(403).json({ message: 'Not authorized to modify this request' });
        }
        
        connection.status = status;
        connection.respondedAt = new Date();
        
        await connection.save();
        
        res.json({ message: `Connection request ${status}` });
    } catch (error) {
        console.error('Error updating connection:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/networking/recommendations/:eventId
// @desc    Get networking recommendations for an event
// @access  Private
router.get('/recommendations/:eventId', authMiddleware, async (req, res) => {
    try {
        const eventId = req.params.eventId;
        const userId = req.user.id;
        
        // Get current user's profile
        const currentUser = await User.findById(userId);
        const userSkills = currentUser.networkingProfile?.skills || [];
        const userInterests = currentUser.networkingProfile?.interests || [];
        const userIndustry = currentUser.networkingProfile?.industry || '';
        
        // Get all participants for this event
        const registrations = await Registration.find({ event: eventId })
            .populate('participant');
        
        // Score and rank participants based on compatibility
        const recommendations = registrations
            .map(reg => reg.participant)
            .filter(participant => 
                participant && 
                participant._id.toString() !== userId &&
                participant.networkingProfile &&
                participant.networkingProfile.availableForNetworking
            )
            .map(participant => {
                const profile = participant.networkingProfile;
                let score = 0;
                
                // Skill matching
                const skillMatches = profile.skills?.filter(skill => 
                    userSkills.some(userSkill => 
                        userSkill.toLowerCase().includes(skill.toLowerCase()) ||
                        skill.toLowerCase().includes(userSkill.toLowerCase())
                    )
                ).length || 0;
                score += skillMatches * 3;
                
                // Interest matching
                const interestMatches = profile.interests?.filter(interest => 
                    userInterests.some(userInterest => 
                        userInterest.toLowerCase().includes(interest.toLowerCase()) ||
                        interest.toLowerCase().includes(userInterest.toLowerCase())
                    )
                ).length || 0;
                score += interestMatches * 2;
                
                // Industry matching
                if (profile.industry && userIndustry && 
                    profile.industry.toLowerCase() === userIndustry.toLowerCase()) {
                    score += 5;
                }
                
                // Looking for / can offer matching
                if (profile.lookingFor && currentUser.networkingProfile?.canOffer) {
                    const lookingForMatch = profile.lookingFor.toLowerCase()
                        .includes(currentUser.networkingProfile.canOffer.toLowerCase()) ||
                        currentUser.networkingProfile.canOffer.toLowerCase()
                        .includes(profile.lookingFor.toLowerCase());
                    if (lookingForMatch) score += 4;
                }
                
                if (profile.canOffer && currentUser.networkingProfile?.lookingFor) {
                    const canOfferMatch = profile.canOffer.toLowerCase()
                        .includes(currentUser.networkingProfile.lookingFor.toLowerCase()) ||
                        currentUser.networkingProfile.lookingFor.toLowerCase()
                        .includes(profile.canOffer.toLowerCase());
                    if (canOfferMatch) score += 4;
                }
                
                return {
                    participant,
                    score,
                    matchReasons: {
                        skillMatches,
                        interestMatches,
                        industryMatch: profile.industry === userIndustry,
                        complementaryGoals: score > 10
                    }
                };
            })
            .filter(rec => rec.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, 10); // Top 10 recommendations
        
        res.json(recommendations);
    } catch (error) {
        console.error('Error generating recommendations:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/networking/messages
// @desc    Get messages for the current user
// @access  Private
router.get('/messages', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        
        // For now, return empty messages array
        // In a real implementation, you would have a Message model
        const messages = [];
        const unreadCount = 0;
        
        res.json({
            messages,
            unreadCount
        });
    } catch (error) {
        console.error('Error fetching messages:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST /api/networking/messages
// @desc    Send a message to another user
// @access  Private
router.post('/messages', authMiddleware, async (req, res) => {
    try {
        const { receiverId, message, eventId } = req.body;
        const senderId = req.user.id;
        
        // Basic validation
        if (!receiverId || !message) {
            return res.status(400).json({ message: 'Receiver and message are required' });
        }
        
        // For now, just return success
        // In a real implementation, you would save to a Message model
        res.status(201).json({ 
            message: 'Message sent successfully',
            messageId: 'temp-' + Date.now()
        });
    } catch (error) {
        console.error('Error sending message:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/networking/:eventId/analytics
// @desc    Get networking analytics for an event (organizer only)
// @access  Private
router.get('/:eventId/analytics', authMiddleware, async (req, res) => {
    try {
        const eventId = req.params.eventId;
        const userId = req.user.id;

        // Verify user is organizer (simplified check)
        const event = await Event.findById(eventId);
        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }

        const isOrganizer = event.organizer.toString() === userId || req.user.role === 'organizer';
        if (!isOrganizer) {
            return res.status(403).json({ message: 'Only organizers can view analytics' });
        }

        // Get networking statistics
        console.log('Fetching networking analytics for event:', eventId);
        const registrations = await Registration.find({ event: eventId }).populate('participant');
        console.log('Found registrations:', registrations.length);
        
        // Use separate populate calls to avoid any schema confusion
        const connections = await Connection.find({ event: eventId })
            .populate('requester', 'name email')
            .populate('receiver', 'name email');
        console.log('Found connections:', connections.length);

        const participantsWithNetworking = registrations.filter(reg => 
            reg.participant && 
            reg.participant.networkingProfile && 
            reg.participant.networkingProfile.availableForNetworking
        );

        // Safely handle connections that might have missing data
        const validConnections = connections.filter(c => c.requester && c.receiver);

        const analytics = {
            totalParticipants: registrations.length,
            networkingParticipants: participantsWithNetworking.length,
            totalConnections: validConnections.filter(c => c.status === 'accepted').length,
            pendingConnections: validConnections.filter(c => c.status === 'pending').length,
            networkingRate: registrations.length > 0 ? 
                Math.round((participantsWithNetworking.length / registrations.length) * 100) : 0,
            connectionRate: participantsWithNetworking.length > 0 ? 
                Math.round((validConnections.filter(c => c.status === 'accepted').length / participantsWithNetworking.length) * 100) : 0,
            activeUsers: participantsWithNetworking.length, // Simplified
            businessCardsShared: validConnections.filter(c => c.status === 'accepted').length, // Simplified
            recentConnections: validConnections
                .filter(c => c.status === 'accepted')
                .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                .slice(0, 10)
                .map(c => ({
                    user1: c.requester?.name || 'Unknown',
                    user2: c.receiver?.name || 'Unknown',
                    timestamp: c.createdAt
                })),
            industryBreakdown: participantsWithNetworking.reduce((acc, reg) => {
                const industry = reg.participant?.networkingProfile?.industry || 'Other';
                acc[industry] = (acc[industry] || 0) + 1;
                return acc;
            }, {}),
            skillsBreakdown: participantsWithNetworking.reduce((acc, reg) => {
                const skills = reg.participant?.networkingProfile?.skills || [];
                skills.forEach(skill => {
                    if (skill) {
                        acc[skill] = (acc[skill] || 0) + 1;
                    }
                });
                return acc;
            }, {})
        };

        res.json({
            success: true,
            analytics
        });
    } catch (error) {
        console.error('Error fetching networking analytics:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

module.exports = router;