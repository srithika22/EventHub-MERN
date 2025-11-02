const express = require('express');
const router = express.Router();
const Registration = require('../models/Registration');
const Event = require('../models/Event');
const authMiddleware = require('../middleware/auth');

// @route   POST /api/registrations/:eventId
// @desc    Register the logged-in user for an event
// @access  Private (Participant)
router.post('/:eventId', authMiddleware, async (req, res) => {
    try {
        const eventId = req.params.eventId;
        const participantId = req.user.id;
        const { ticketTypeName, quantity, attendeeInfo, preferences } = req.body;

        if (!ticketTypeName) {
            return res.status(400).json({ message: 'Ticket type is required for registration.' });
        }

        if (!quantity || quantity < 1) {
            return res.status(400).json({ message: 'Valid quantity is required.' });
        }

        if (!attendeeInfo || !attendeeInfo.name || !attendeeInfo.email) {
            return res.status(400).json({ message: 'Attendee name and email are required.' });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(attendeeInfo.email)) {
            return res.status(400).json({ message: 'Please provide a valid email address.' });
        }

        // Check if already registered
        const existingRegistration = await Registration.findOne({ event: eventId, participant: participantId });
        if (existingRegistration) {
            return res.status(400).json({ message: 'You are already registered for this event.' });
        }

        // Find the event and the specific ticket type
        const event = await Event.findById(eventId);
        if (!event) {
            return res.status(404).json({ message: 'Event not found.' });
        }

        const ticketType = event.ticketTypes.find(type => type.name === ticketTypeName);
        if (!ticketType) {
            return res.status(404).json({ message: 'Invalid ticket type for this event.' });
        }

        // Check if enough tickets are available
        if ((ticketType.ticketsSold + quantity) > ticketType.capacity) {
            return res.status(400).json({ 
                message: `Not enough ${ticketTypeName} tickets available. Only ${ticketType.capacity - ticketType.ticketsSold} remaining.` 
            });
        }

        // Increment tickets sold for the specific ticket type and total
        if (!ticketType.ticketsSold) {
            ticketType.ticketsSold = 0;
        }
        ticketType.ticketsSold += quantity;
        
        if (!event.totalTicketsSold) {
            event.totalTicketsSold = 0;
        }
        event.totalTicketsSold += quantity;

        // Update venue sections if available
        if (event.venueSections && event.venueSections.length > 0) {
            const randomIndex = Math.floor(Math.random() * event.venueSections.length);
            const section = event.venueSections[randomIndex];
            if (section.booked + quantity <= section.capacity) {
                section.booked += quantity;
            }
        }
        
        console.log(`Updated ticket count for ${ticketTypeName}: ${ticketType.ticketsSold}/${ticketType.capacity}`);
        console.log(`Total tickets sold for event: ${event.totalTicketsSold}`);
        
        await event.save(); // Save the updated event with new ticket counts

        const newRegistration = new Registration({
            event: eventId,
            participant: participantId,
            ticketTypeName,
            quantity,
            attendeeInfo: {
                name: attendeeInfo.name.trim(),
                email: attendeeInfo.email.trim(),
                phone: attendeeInfo.phone ? attendeeInfo.phone.trim() : '',
                address: attendeeInfo.address ? attendeeInfo.address.trim() : '',
                organization: attendeeInfo.organization ? attendeeInfo.organization.trim() : '',
                specialRequirements: attendeeInfo.specialRequirements ? attendeeInfo.specialRequirements.trim() : ''
            },
            preferences: {
                subscribeNewsletter: preferences?.subscribeNewsletter || false
            },
            status: 'confirmed'
        });

        await newRegistration.save();
        
        // Send success response with additional details
        res.status(201).json({ 
            message: 'Successfully registered for the event! Check your email for confirmation.',
            registration: {
                ticketCode: newRegistration.ticketCode,
                eventTitle: event.title,
                ticketType: ticketTypeName,
                quantity: quantity,
                registrationDate: newRegistration.createdAt
            }
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// @route   GET /api/registrations/my-tickets
// @desc    Get all events the logged-in user is registered for
// @access  Private
router.get('/my-tickets', authMiddleware, async (req, res) => {
    try {
        // Detailed logging to diagnose issues
        console.log(`Fetching tickets for user: ${req.user.id}`);
        
        const registrations = await Registration.find({ participant: req.user.id })
            .populate('event'); // This will replace the event ID with the full event details

        console.log(`Found ${registrations.length} registrations`);

        // Filter out any registrations where the event may be null (deleted events)
        const validRegistrations = registrations.filter(reg => reg.event !== null);
        console.log(`${validRegistrations.length} registrations have valid events`);
        
        // Include both event details and registration details
        const myTickets = validRegistrations.map(reg => {
            // Ensure we're returning a valid data structure
            return {
                event: reg.event,
                registration: {
                    _id: reg._id,
                    ticketTypeName: reg.ticketTypeName,
                    quantity: reg.quantity,
                    status: reg.status,
                    ticketCode: reg.ticketCode,
                    createdAt: reg.createdAt
                }
            };
        });
        
        console.log(`Sending response with ${myTickets.length} tickets`);
        if (myTickets.length > 0) {
            // Verify the structure of the first ticket
            const firstTicket = myTickets[0];
            console.log('First ticket structure valid:', 
                firstTicket && 
                firstTicket.event && 
                firstTicket.registration && 
                firstTicket.event._id && 
                firstTicket.registration._id
            );
            console.log('First ticket example:', JSON.stringify(firstTicket));
        } else {
            console.log('No tickets found for this user');
        }
        
        res.status(200).json(myTickets);
    } catch (error) {
        console.error('Error fetching user tickets:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// @route   GET /api/registrations/event/:eventId/participants
// @desc    Get all registrations for a specific event (for organizers)
// @access  Private (Organizer only)
router.get('/event/:eventId/participants', authMiddleware, async (req, res) => {
    try {
        const eventId = req.params.eventId;
        
        // First check if the user is the organizer of this event
        const event = await Event.findById(eventId);
        if (!event) {
            return res.status(404).json({ message: 'Event not found.' });
        }
        
        if (event.organizer.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Access denied. Only the event organizer can view participants.' });
        }
        
        // Get all registrations for this event
        const registrations = await Registration.find({ event: eventId })
            .populate('participant', 'name email profilePicture'); // Only get necessary user fields
        
        res.status(200).json(registrations);
    } catch (error) {
        console.error('Error fetching event participants:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// @route   PUT /api/registrations/:registrationId/status
// @desc    Update registration status (e.g., mark as attended)
// @access  Private (Organizer or Participant)
router.put('/:registrationId/status', authMiddleware, async (req, res) => {
    try {
        const { registrationId } = req.params;
        const { status } = req.body;
        
        // Validate status
        const validStatuses = ['confirmed', 'canceled', 'attended'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ message: 'Invalid status. Must be confirmed, canceled, or attended.' });
        }
        
        // Find the registration
        const registration = await Registration.findById(registrationId).populate('event');
        if (!registration) {
            return res.status(404).json({ message: 'Registration not found.' });
        }
        
        // Check if user has permission to update this registration
        // Participant can only update their own registration, organizer can update any registration for their events
        if (req.user.id !== registration.participant.toString() && 
            req.user.id !== registration.event.organizer.toString()) {
            return res.status(403).json({ message: 'Access denied. You can only update your own registrations or registrations for your events.' });
        }
        
        // Update the status
        registration.status = status;
        await registration.save();
        
        res.status(200).json({ 
            message: `Registration status updated to ${status}`,
            registration: {
                _id: registration._id,
                status: registration.status,
                updatedAt: registration.updatedAt
            }
        });
    } catch (error) {
        console.error('Error updating registration status:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// @route   PUT /api/registrations/bulk-status
// @desc    Update multiple registration statuses
// @access  Private (Organizer only)
router.put('/bulk-status', authMiddleware, async (req, res) => {
    try {
        const { registrationIds, status, eventId } = req.body;
        
        // Validate status
        const validStatuses = ['confirmed', 'canceled', 'attended'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ message: 'Invalid status. Must be confirmed, canceled, or attended.' });
        }
        
        // Verify the user owns the event
        const event = await Event.findById(eventId);
        if (!event) {
            return res.status(404).json({ message: 'Event not found.' });
        }
        
        if (event.organizer.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Access denied. Only the event organizer can update participant statuses.' });
        }
        
        // Update registrations
        const result = await Registration.updateMany(
            { _id: { $in: registrationIds }, event: eventId },
            { $set: { status, updatedAt: new Date() } }
        );
        
        res.json({
            message: `${result.modifiedCount} registrations updated to ${status}`,
            updated: result.modifiedCount
        });
    } catch (error) {
        console.error('Error updating bulk registration status:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// @route   GET /api/registrations/export/:eventId
// @desc    Export participant data as CSV
// @access  Private (Organizer only)
router.get('/export/:eventId', authMiddleware, async (req, res) => {
    try {
        const { eventId } = req.params;
        
        // Verify the user owns the event
        const event = await Event.findById(eventId);
        if (!event) {
            return res.status(404).json({ message: 'Event not found.' });
        }
        
        if (event.organizer.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Access denied. Only the event organizer can export participant data.' });
        }
        
        // Get all registrations for this event
        const registrations = await Registration.find({ event: eventId })
            .populate('participant', 'name email');
        
        // Prepare CSV data
        const csvData = registrations.map(reg => ({
            'Participant Name': reg.participant?.name || 'N/A',
            'Participant Email': reg.participant?.email || 'N/A',
            'Attendee Name': reg.attendeeInfo?.name || 'N/A',
            'Attendee Email': reg.attendeeInfo?.email || 'N/A',
            'Attendee Phone': reg.attendeeInfo?.phone || 'N/A',
            'Ticket Type': reg.ticketTypeName,
            'Quantity': reg.quantity,
            'Status': reg.status,
            'Ticket Code': reg.ticketCode,
            'Registration Date': reg.createdAt?.toISOString().split('T')[0] || 'N/A'
        }));
        
        res.json({
            eventTitle: event.title,
            exportDate: new Date().toISOString(),
            participantCount: csvData.length,
            data: csvData
        });
    } catch (error) {
        console.error('Error exporting participant data:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// @route   GET /api/registrations/organizer-overview
// @desc    Get overview of all registrations for organizer's events
// @access  Private (Organizer only)
router.get('/organizer-overview', authMiddleware, async (req, res) => {
    try {
        // Get all events by this organizer
        const Event = require('../models/Event');
        const events = await Event.find({ organizer: req.user.id });
        const eventIds = events.map(e => e._id);
        
        // Get all registrations for these events
        const registrations = await Registration.find({ event: { $in: eventIds } })
            .populate('event', 'title date category')
            .populate('participant', 'name email');
        
        // Group by event
        const overview = {};
        registrations.forEach(reg => {
            const eventId = reg.event._id.toString();
            if (!overview[eventId]) {
                overview[eventId] = {
                    event: reg.event,
                    totalRegistrations: 0,
                    confirmedRegistrations: 0,
                    attendedRegistrations: 0,
                    canceledRegistrations: 0,
                    totalRevenue: 0,
                    recentRegistrations: []
                };
            }
            
            overview[eventId].totalRegistrations++;
            
            if (reg.status === 'confirmed') overview[eventId].confirmedRegistrations++;
            if (reg.status === 'attended') overview[eventId].attendedRegistrations++;
            if (reg.status === 'canceled') overview[eventId].canceledRegistrations++;
            
            // Add to recent if within last 7 days
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            if (reg.createdAt >= weekAgo) {
                overview[eventId].recentRegistrations.push({
                    participantName: reg.participant?.name,
                    ticketType: reg.ticketTypeName,
                    registrationDate: reg.createdAt
                });
            }
        });
        
        res.json(Object.values(overview));
    } catch (error) {
        console.error('Error fetching organizer overview:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// @route   GET /api/registrations/real-time-stats/:eventId
// @desc    Get real-time registration statistics for a specific event
// @access  Private (Organizer)
router.get('/real-time-stats/:eventId', authMiddleware, async (req, res) => {
    try {
        const eventId = req.params.eventId;
        
        // Verify the event belongs to the organizer
        const event = await Event.findById(eventId);
        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }
        
        if (event.organizer.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Access denied. You can only view statistics for your own events.' });
        }
        
        // Get real-time registration statistics
        const registrations = await Registration.find({ event: eventId }).populate('participant', 'name email');
        
        const stats = {
            totalRegistrations: registrations.length,
            confirmedRegistrations: registrations.filter(r => r.status === 'confirmed').length,
            attendedRegistrations: registrations.filter(r => r.status === 'attended').length,
            canceledRegistrations: registrations.filter(r => r.status === 'canceled').length,
            recentRegistrations: registrations
                .filter(r => {
                    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
                    return r.createdAt >= oneDayAgo;
                })
                .length,
            totalRevenue: registrations.reduce((sum, reg) => {
                if (reg.status !== 'canceled') {
                    const ticketType = event.ticketTypes.find(t => t.name === reg.ticketTypeName);
                    return sum + ((ticketType?.price || 0) * reg.quantity);
                }
                return sum;
            }, 0),
            ticketTypeBreakdown: {}
        };
        
        // Calculate ticket type breakdown
        event.ticketTypes.forEach(ticketType => {
            const typeRegistrations = registrations.filter(r => 
                r.ticketTypeName === ticketType.name && r.status !== 'canceled'
            );
            
            stats.ticketTypeBreakdown[ticketType.name] = {
                sold: typeRegistrations.reduce((sum, reg) => sum + reg.quantity, 0),
                capacity: ticketType.capacity,
                revenue: typeRegistrations.reduce((sum, reg) => sum + (ticketType.price * reg.quantity), 0)
            };
        });
        
        res.json(stats);
    } catch (error) {
        console.error('Error fetching real-time stats:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

module.exports = router;