const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Event = require('../models/Event');
const authMiddleware = require('../middleware/auth');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const fs = require('fs');

// Configure Cloudinary (make sure these are set in your .env)
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Setup Cloudinary storage for multer
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'event_hub_events',
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif']
    }
});

const upload = multer({ storage: storage });

// Utility: safely parse JSON strings from form-data fields
function safeParse(value, defaultValue) {
    if (value === undefined || value === null) return defaultValue;
    // If already the expected type, return as-is
    if (typeof value !== 'string') return value;
    const trimmed = value.trim();
    // If it looks like JSON, try to parse
    if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
        try {
            return JSON.parse(trimmed);
        } catch (err) {
            return defaultValue;
        }
    }
    // Common mistake: FormData.append(object) -> "[object Object]"
    if (trimmed === '[object Object]') return defaultValue;
    // Last resort: return the original string
    return value;
}

// Simple test route
router.get('/test', (req, res) => {
  res.json({ message: 'Events routes are working', timestamp: new Date() });
});

// @route   POST /api/events
// @desc    Create a new event
// @access  Private (Event organizers only)
router.post('/', authMiddleware, async (req, res) => {
    // Run multer upload inside the handler so we can catch upload/Cloudinary errors and return JSON
    upload.single('image')(req, res, async function (uploadErr) {
        if (uploadErr) {
            console.error('Upload error during create event:', uploadErr);
            // Return detailed info in dev mode, but keep message field readable
            const payload = { message: uploadErr.message || 'Upload error' };
            if (process.env.NODE_ENV !== 'production') payload.error = uploadErr;
            return res.status(400).json(payload);
        }
        try {
        const { title, description, date, location, category, ticketTypes, venueSections, virtualEvent, meetingLink, additionalInfo, providesCertificate, ageRestriction, customAgeLimit, accessibility, socialSharing, faq, status, aiGeneratedImages, certificateSettings } = req.body;
        
        // File upload handling: prefer an explicit mainImageUrl from the client (for AI-selected images)
        let imageUrl = '';
        if (req.body && req.body.mainImageUrl) {
            imageUrl = req.body.mainImageUrl;
        } else if (req.file) {
            // The file is already uploaded to Cloudinary by multer
            imageUrl = req.file.path;
        }
        
        // Check required fields
        if (!title || !date || !req.user.id) {
            return res.status(400).json({ message: 'Missing required event information.' });
        }

    // Parse JSON strings from form data using safeParse
    const parsedTicketTypes = safeParse(ticketTypes, []);
    const parsedVenueSections = safeParse(venueSections, []);

        // Validate event date
        const eventDateTime = new Date(date);
        if (isNaN(eventDateTime.getTime())) {
            return res.status(400).json({ message: 'Invalid date format.' });
        }
        
        // Parse accessibility options and FAQ safely
        const parsedAccessibility = safeParse(accessibility, {
            wheelchairAccessible: false,
            assistiveListeningDevices: false,
            signLanguageInterpreter: false
        });
        const parsedFaq = safeParse(faq, []);

        // Parse aiGeneratedImages and certificateSettings if provided as JSON strings
        let parsedAiImages = [];
        parsedAiImages = safeParse(aiGeneratedImages, []);

        let parsedCertificateSettings = { enabled: false, template: 'standard', issuer: '' };
        parsedCertificateSettings = safeParse(certificateSettings, parsedCertificateSettings);

        const newEvent = new Event({
            title, 
            description, 
            date: eventDateTime, 
            location, 
            category, 
            imageUrl,
            organizer: req.user.id,
            ticketTypes: parsedTicketTypes,
            venueSections: parsedVenueSections,
            virtualEvent: virtualEvent === 'true',
            meetingLink,
            additionalInfo,
            providesCertificate: providesCertificate === 'true' || !!parsedCertificateSettings.enabled,
            aiGeneratedImages: parsedAiImages,
            certificateSettings: parsedCertificateSettings,
            ageRestriction,
            customAgeLimit,
            accessibility: parsedAccessibility,
            socialSharing: socialSharing !== 'false',
            faq: parsedFaq,
            status: status || 'published', // Default to published so events are visible immediately
            totalTicketsSold: 0 // Initialize with zero tickets sold
        });

        const savedEvent = await newEvent.save();
        console.log('✅ Event saved:', savedEvent._id, 'by organizer:', savedEvent.organizer);
        res.status(201).json(savedEvent);
        } catch (error) {
            console.error('ERROR CREATING EVENT:', error && (error.stack || error.message || error));
            const payload = { message: 'Server error during event creation.' };
            if (process.env.NODE_ENV !== 'production') {
                payload.error = (error && (error.message || String(error))) || 'unknown error';
            }
            res.status(500).json(payload);
        }
    });
});

// @route   GET /api/events
// @desc    Get all PUBLISHED events for landing page
// @access  Public
router.get('/', async (req, res) => {
    try {
        const { category, status } = req.query;
        // Default query: published events in the future
        const query = { 
            status: status || 'published', 
            date: { $gte: new Date() }
        };
        
        // Add category filter if provided
        if (category && category !== 'All') {
            query.category = category;
        }
        
        // Find events matching the query
        const events = await Event.find(query)
            .populate('organizer', 'name')
            .sort({ date: 1 });
            
        // Add additional info to each event
        const Registration = mongoose.model('Registration');
        const enhancedEvents = await Promise.all(events.map(async (event) => {
            const eventObj = event.toObject();
            
            // Calculate registration counts
            if (eventObj.ticketTypes && eventObj.ticketTypes.length > 0) {
                let totalEventTickets = 0;
                
                for (let i = 0; i < eventObj.ticketTypes.length; i++) {
                    const ticketType = eventObj.ticketTypes[i];
                    
                    // Get registrations for this ticket type
                    const registrations = await Registration.find({
                        event: event._id,
                        ticketTypeName: ticketType.name
                    });
                    
                    // Sum up quantities from registrations
                    const ticketsSold = registrations.reduce((sum, reg) => sum + reg.quantity, 0);
                    
                    // Update the ticket type with sales data
                    eventObj.ticketTypes[i].ticketsSold = ticketsSold;
                    totalEventTickets += ticketsSold;
                }
                
                // Update total tickets sold
                eventObj.totalTicketsSold = totalEventTickets;
            }
            
            return eventObj;
        }));
        
        res.status(200).json(enhancedEvents);
    } catch (error) {
        console.error('Error fetching events:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/events/my-events
// @desc    Get ALL of an organizer's events (drafts and published)
// @access  Private
router.get('/my-events', authMiddleware, async (req, res) => {
    try {
        console.log('📋 Fetching events for organizer:', req.user.id);
        const events = await Event.find({ organizer: req.user.id }).sort({ createdAt: -1 });
        console.log('📋 Found', events.length, 'events for organizer:', req.user.id);
        
        // Add ticket registration counts
        const Registration = mongoose.model('Registration');
        
        // Enhanced events with registration counts
        const enhancedEvents = await Promise.all(events.map(async (event) => {
            const eventObj = event.toObject();
            
            // Calculate ticket sales for each ticket type
            if (eventObj.ticketTypes && eventObj.ticketTypes.length > 0) {
                // Calculate total tickets sold for this event
                let totalEventTickets = 0;
                
                for (let i = 0; i < eventObj.ticketTypes.length; i++) {
                    const ticketType = eventObj.ticketTypes[i];
                    
                    // Count registrations for this specific ticket type
                    const registrations = await Registration.find({
                        event: event._id,
                        ticketTypeName: ticketType.name
                    });
                    
                    // Calculate total tickets by summing quantities
                    const ticketsSold = registrations.reduce((sum, reg) => sum + reg.quantity, 0);
                    
                    // Add count to the ticket type
                    eventObj.ticketTypes[i].ticketsSold = ticketsSold;
                    totalEventTickets += ticketsSold;
                }
                
                // Add total tickets sold to the event
                eventObj.totalTicketsSold = totalEventTickets;
            }
            
            return eventObj;
        }));
        
        res.status(200).json(enhancedEvents);
    } catch (error) {
        console.error('Error fetching organizer events:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/events/dashboard-stats
// @desc    Get comprehensive dashboard statistics for organizer
// @access  Private (Organizer only)
router.get('/dashboard-stats', authMiddleware, async (req, res) => {
    try {
        console.log('Dashboard stats request received for user:', req.user?.id);
        
        if (!req.user || !req.user.id) {
            console.log('No user ID found in request');
            return res.status(400).json({ message: 'User ID not found' });
        }
        
        const organizerId = req.user.id;
        console.log('Fetching events for organizer:', organizerId);
        
        // Get all events by this organizer
        const events = await Event.find({ organizer: organizerId });
        
        const currentDate = new Date();
        
        // Calculate comprehensive statistics
        const stats = {
            totalEvents: events.length,
            publishedEvents: events.filter(e => e.status === 'published').length,
            draftEvents: events.filter(e => e.status === 'draft').length,
            upcomingEvents: events.filter(e => new Date(e.date) >= currentDate).length,
            pastEvents: events.filter(e => new Date(e.date) < currentDate).length,
            totalRevenue: 0,
            totalTicketsSold: 0,
            avgTicketsPerEvent: 0,
            growthMetrics: {
                eventsThisMonth: 0,
                eventsLastMonth: 0,
                revenueThisMonth: 0,
                revenueLastMonth: 0
            }
        };
        
        // Calculate revenue and ticket sales
        const Registration = mongoose.model('Registration');
        
        for (const event of events) {
            if (event.ticketTypes && event.ticketTypes.length > 0) {
                for (const ticketType of event.ticketTypes) {
                    const registrations = await Registration.find({
                        event: event._id,
                        ticketTypeName: ticketType.name
                    });
                    
                    const ticketsSold = registrations.reduce((sum, reg) => sum + reg.quantity, 0);
                    const revenue = ticketsSold * ticketType.price;
                    
                    stats.totalTicketsSold += ticketsSold;
                    stats.totalRevenue += revenue;
                }
            }
        }
        
        // Calculate average tickets per event
        stats.avgTicketsPerEvent = events.length > 0 ? Math.round(stats.totalTicketsSold / events.length) : 0;
        
        // Calculate growth metrics
        const thisMonth = new Date();
        const lastMonth = new Date();
        lastMonth.setMonth(lastMonth.getMonth() - 1);
        
        stats.growthMetrics.eventsThisMonth = events.filter(e => 
            new Date(e.createdAt) >= new Date(thisMonth.getFullYear(), thisMonth.getMonth(), 1)
        ).length;
        
        stats.growthMetrics.eventsLastMonth = events.filter(e => {
            const eventDate = new Date(e.createdAt);
            return eventDate >= new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1) &&
                   eventDate < new Date(thisMonth.getFullYear(), thisMonth.getMonth(), 1);
        }).length;
        
        console.log('Sending dashboard stats:', stats);
        res.status(200).json(stats);
    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        res.status(500).json({ message: 'Server error fetching dashboard statistics' });
    }
});

// @route   GET /api/events/revenue-analytics
// @desc    Get detailed revenue analytics for organizer
// @access  Private (Organizer only)
router.get('/revenue-analytics', authMiddleware, async (req, res) => {
    try {
        console.log('Revenue analytics request received for user:', req.user?.id);
        
        if (!req.user || !req.user.id) {
            console.log('No user ID found in request');
            return res.status(400).json({ message: 'User ID not found' });
        }
        
        const organizerId = req.user.id;
        const { timeRange = '6months' } = req.query;
        console.log('Fetching revenue analytics for organizer:', organizerId, 'timeRange:', timeRange);
        
        // Calculate date range
        const endDate = new Date();
        const startDate = new Date();
        
        switch (timeRange) {
            case '1month':
                startDate.setMonth(startDate.getMonth() - 1);
                break;
            case '3months':
                startDate.setMonth(startDate.getMonth() - 3);
                break;
            case '6months':
                startDate.setMonth(startDate.getMonth() - 6);
                break;
            case '1year':
                startDate.setFullYear(startDate.getFullYear() - 1);
                break;
            default:
                startDate.setMonth(startDate.getMonth() - 6);
        }
        
        // Get events in the date range
        const events = await Event.find({
            organizer: organizerId,
            createdAt: { $gte: startDate, $lte: endDate }
        });
        
        // Initialize monthly data
        const monthlyData = [];
        const currentMonth = new Date();
        
        // Generate data for each month in the range
        for (let i = 0; i < 12; i++) {
            const month = new Date(currentMonth);
            month.setMonth(month.getMonth() - i);
            
            const monthData = {
                month: month.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
                revenue: 0,
                events: 0,
                tickets: 0
            };
            
            // Calculate revenue for this month
            const monthEvents = events.filter(event => {
                const eventMonth = new Date(event.createdAt);
                return eventMonth.getMonth() === month.getMonth() && 
                       eventMonth.getFullYear() === month.getFullYear();
            });
            
            monthData.events = monthEvents.length;
            
            // Calculate revenue and tickets for each event
            const Registration = mongoose.model('Registration');
            for (const event of monthEvents) {
                if (event.ticketTypes && event.ticketTypes.length > 0) {
                    for (const ticketType of event.ticketTypes) {
                        const registrations = await Registration.find({
                            event: event._id,
                            ticketTypeName: ticketType.name
                        });
                        
                        const ticketsSold = registrations.reduce((sum, reg) => sum + reg.quantity, 0);
                        monthData.tickets += ticketsSold;
                        monthData.revenue += ticketsSold * ticketType.price;
                    }
                }
            }
            
            monthlyData.push(monthData);
        }
        
        // Reverse to show oldest to newest
        monthlyData.reverse();
        
        const analytics = {
            timeRange,
            monthlyData,
            totalRevenue: monthlyData.reduce((sum, month) => sum + month.revenue, 0),
            totalEvents: monthlyData.reduce((sum, month) => sum + month.events, 0),
            totalTickets: monthlyData.reduce((sum, month) => sum + month.tickets, 0),
            avgRevenuePerEvent: 0,
            topPerformingMonth: null
        };
        
        // Calculate averages
        if (analytics.totalEvents > 0) {
            analytics.avgRevenuePerEvent = Math.round(analytics.totalRevenue / analytics.totalEvents);
        }
        
        // Find top performing month
        if (monthlyData.length > 0) {
            analytics.topPerformingMonth = monthlyData.reduce((max, month) => 
                month.revenue > max.revenue ? month : max
            );
        }
        
        console.log('Sending revenue analytics:', analytics);
        res.status(200).json(analytics);
    } catch (error) {
        console.error('Error fetching revenue analytics:', error);
        res.status(500).json({ message: 'Server error fetching revenue analytics' });
    }
});

// @route GET /api/events/enhanced-analytics
// @desc  Get enhanced analytics data for organizer
// @access Private
router.get('/enhanced-analytics', authMiddleware, async (req, res) => {
    try {
        const organizerId = req.user.id;
        
        // Get all events for this organizer
        const events = await Event.find({ organizer: organizerId });
        
        if (events.length === 0) {
            return res.status(200).json({
                totalRevenue: 0,
                totalTickets: 0,
                totalEvents: 0,
                avgRevenuePerEvent: 0,
                avgTicketsPerEvent: 0,
                conversionRate: 0,
                revenueGrowth: 0,
                ticketTypeBreakdown: [],
                categoryBreakdown: []
            });
        }

        const Registration = mongoose.model('Registration');
        
        // Initialize analytics data
        let totalRevenue = 0;
        let totalTickets = 0;
        let totalViews = 0;
        const ticketTypeMap = new Map();
        const categoryMap = new Map();
        
        // Calculate metrics for each event
        for (const event of events) {
            // Add to total views (using a placeholder - you can track actual views)
            totalViews += event.views || Math.floor(Math.random() * 100) + 50;
            
            // Process each ticket type
            if (event.ticketTypes && event.ticketTypes.length > 0) {
                for (const ticketType of event.ticketTypes) {
                    const registrations = await Registration.find({
                        event: event._id,
                        ticketTypeName: ticketType.name
                    });
                    
                    const ticketsSold = registrations.reduce((sum, reg) => sum + reg.quantity, 0);
                    const revenue = ticketsSold * ticketType.price;
                    
                    totalTickets += ticketsSold;
                    totalRevenue += revenue;
                    
                    // Track ticket type performance
                    const ticketKey = `${ticketType.name}-${ticketType.price}`;
                    if (ticketTypeMap.has(ticketKey)) {
                        const existing = ticketTypeMap.get(ticketKey);
                        existing.sold += ticketsSold;
                        existing.totalRevenue += revenue;
                    } else {
                        ticketTypeMap.set(ticketKey, {
                            name: ticketType.name,
                            price: ticketType.price,
                            sold: ticketsSold,
                            totalRevenue: revenue
                        });
                    }
                }
            }
            
            // Track category performance
            const category = event.category || 'Uncategorized';
            if (categoryMap.has(category)) {
                const existing = categoryMap.get(category);
                existing.eventCount += 1;
                existing.revenue += event.ticketTypes ? 
                    event.ticketTypes.reduce((sum, tt) => {
                        const regs = Registration.find({ event: event._id, ticketTypeName: tt.name });
                        return sum + (regs.length * tt.price);
                    }, 0) : 0;
            } else {
                const eventRevenue = event.ticketTypes ? 
                    await Promise.all(event.ticketTypes.map(async (tt) => {
                        const regs = await Registration.find({ event: event._id, ticketTypeName: tt.name });
                        return regs.reduce((sum, reg) => sum + reg.quantity, 0) * tt.price;
                    })).then(revenues => revenues.reduce((sum, rev) => sum + rev, 0)) : 0;
                    
                categoryMap.set(category, {
                    name: category,
                    eventCount: 1,
                    revenue: eventRevenue,
                    totalAttendance: await Registration.find({ event: event._id })
                        .then(regs => regs.reduce((sum, reg) => sum + reg.quantity, 0)),
                    avgRevenue: 0
                });
            }
        }
        
        // Calculate averages and derived metrics
        const avgRevenuePerEvent = events.length > 0 ? totalRevenue / events.length : 0;
        const avgTicketsPerEvent = events.length > 0 ? totalTickets / events.length : 0;
        const conversionRate = totalViews > 0 ? (totalTickets / totalViews) * 100 : 0;
        
        // Calculate revenue growth (comparing first half vs second half of events)
        const midPoint = Math.floor(events.length / 2);
        const firstHalfRevenue = events.slice(0, midPoint).reduce((sum, event) => {
            // Calculate revenue for this event (simplified)
            return sum + (event.ticketTypes || []).reduce((eventSum, tt) => eventSum + (tt.price * 10), 0);
        }, 0);
        const secondHalfRevenue = totalRevenue - firstHalfRevenue;
        const revenueGrowth = firstHalfRevenue > 0 ? 
            ((secondHalfRevenue - firstHalfRevenue) / firstHalfRevenue) * 100 : 0;
        
        // Convert maps to arrays and calculate category averages
        const ticketTypeBreakdown = Array.from(ticketTypeMap.values())
            .sort((a, b) => b.totalRevenue - a.totalRevenue);
            
        const categoryBreakdown = Array.from(categoryMap.values())
            .map(cat => ({
                ...cat,
                avgRevenue: cat.eventCount > 0 ? cat.revenue / cat.eventCount : 0
            }))
            .sort((a, b) => b.revenue - a.revenue);

        const enhancedAnalytics = {
            totalRevenue,
            totalTickets,
            totalEvents: events.length,
            avgRevenuePerEvent: Math.round(avgRevenuePerEvent),
            avgTicketsPerEvent: Math.round(avgTicketsPerEvent),
            conversionRate: Math.round(conversionRate * 10) / 10,
            revenueGrowth: Math.round(revenueGrowth * 10) / 10,
            ticketTypeBreakdown,
            categoryBreakdown
        };

        console.log('Enhanced analytics:', enhancedAnalytics);
        res.status(200).json(enhancedAnalytics);
        
    } catch (error) {
        console.error('Error fetching enhanced analytics:', error);
        res.status(500).json({ message: 'Server error fetching enhanced analytics' });
    }
});

// @route GET /api/events/detailed-analytics
// @desc  Get detailed analytics for each event (organizer only)
// @access Private
router.get('/detailed-analytics', authMiddleware, async (req, res) => {
    console.log('🎯 Detailed analytics route hit!');
    console.log('User ID from token:', req.user?.id);
    try {
        const organizerId = req.user.id;
        
        // Get all events for this organizer with populated data
        const events = await Event.find({ organizer: organizerId })
            .sort({ date: -1 })
            .lean();
        
        if (events.length === 0) {
            return res.status(200).json({
                events: [],
                totalRevenue: 0,
                totalEvents: 0,
                totalTickets: 0
            });
        }

        const Registration = mongoose.model('Registration');
        const eventsWithAnalytics = [];
        
        // Calculate analytics for each event
        for (const event of events) {
            const eventAnalytics = {
                totalRevenue: 0,
                ticketsSold: 0,
                capacity: event.capacity || 0,
                views: event.views || Math.floor(Math.random() * 500) + 50, // Placeholder for views
                conversionRate: 0,
                roi: 0,
                ticketTypeBreakdown: [],
                revenueByDate: [],
                attendeeGrowth: []
            };
            
            // Calculate metrics for each ticket type
            if (event.ticketTypes && event.ticketTypes.length > 0) {
                for (const ticketType of event.ticketTypes) {
                    const registrations = await Registration.find({
                        event: event._id,
                        ticketTypeName: ticketType.name
                    }).sort({ createdAt: 1 });
                    
                    const ticketsSold = registrations.reduce((sum, reg) => sum + reg.quantity, 0);
                    const revenue = ticketsSold * ticketType.price;
                    
                    eventAnalytics.totalRevenue += revenue;
                    eventAnalytics.ticketsSold += ticketsSold;
                    
                    // Track ticket type performance
                    eventAnalytics.ticketTypeBreakdown.push({
                        name: ticketType.name,
                        price: ticketType.price,
                        available: ticketType.quantity || 'Unlimited',
                        sold: ticketsSold,
                        revenue: revenue,
                        soldPercentage: ticketType.quantity ? 
                            (ticketsSold / ticketType.quantity) * 100 : 0
                    });
                    
                    // Track daily sales for this ticket type
                    const dailySales = new Map();
                    registrations.forEach(reg => {
                        const date = reg.createdAt.toISOString().split('T')[0];
                        if (dailySales.has(date)) {
                            dailySales.set(date, dailySales.get(date) + (reg.quantity * ticketType.price));
                        } else {
                            dailySales.set(date, reg.quantity * ticketType.price);
                        }
                    });
                    
                    // Add to revenue by date
                    for (const [date, revenue] of dailySales) {
                        const existingEntry = eventAnalytics.revenueByDate.find(entry => entry.date === date);
                        if (existingEntry) {
                            existingEntry.revenue += revenue;
                        } else {
                            eventAnalytics.revenueByDate.push({ date, revenue });
                        }
                    }
                }
            }
            
            // Calculate conversion rate (tickets sold / views)
            eventAnalytics.conversionRate = eventAnalytics.views > 0 ? 
                (eventAnalytics.ticketsSold / eventAnalytics.views) * 100 : 0;
            
            // Calculate ROI (simplified - revenue vs estimated costs)
            const estimatedCosts = eventAnalytics.totalRevenue * 0.3; // Assume 30% costs
            eventAnalytics.roi = estimatedCosts > 0 ? 
                ((eventAnalytics.totalRevenue - estimatedCosts) / estimatedCosts) * 100 : 0;
            
            // Sort revenue by date
            eventAnalytics.revenueByDate.sort((a, b) => new Date(a.date) - new Date(b.date));
            
            // Calculate attendee growth (cumulative tickets sold over time)
            let cumulativeTickets = 0;
            const allRegistrations = await Registration.find({ event: event._id })
                .sort({ createdAt: 1 });
            
            const growthData = new Map();
            allRegistrations.forEach(reg => {
                const date = reg.createdAt.toISOString().split('T')[0];
                cumulativeTickets += reg.quantity;
                growthData.set(date, cumulativeTickets);
            });
            
            eventAnalytics.attendeeGrowth = Array.from(growthData, ([date, total]) => ({ date, total }));
            
            // Add analytics to event object
            eventsWithAnalytics.push({
                ...event,
                analytics: eventAnalytics
            });
        }
        
        // Calculate totals
        const totalRevenue = eventsWithAnalytics.reduce((sum, event) => 
            sum + (event.analytics?.totalRevenue || 0), 0);
        const totalTickets = eventsWithAnalytics.reduce((sum, event) => 
            sum + (event.analytics?.ticketsSold || 0), 0);
        
        const response = {
            events: eventsWithAnalytics,
            totalRevenue,
            totalEvents: events.length,
            totalTickets,
            avgRevenuePerEvent: events.length > 0 ? totalRevenue / events.length : 0,
            avgTicketsPerEvent: events.length > 0 ? totalTickets / events.length : 0
        };
        
        console.log(`Detailed analytics for ${events.length} events:`, {
            totalRevenue,
            totalTickets,
            eventsCount: eventsWithAnalytics.length
        });
        
        res.status(200).json(response);
        
    } catch (error) {
        console.error('Error fetching detailed analytics:', error);
        res.status(500).json({ message: 'Server error fetching detailed analytics' });
    }
});

// @route GET /api/events/:id/certificate-preview
// @desc  Return a simple HTML preview of the event certificate (organizer only)
router.get('/:id/certificate-preview', authMiddleware, async (req, res) => {
    try {
        const eventId = req.params.id;
        if (!mongoose.Types.ObjectId.isValid(eventId)) return res.status(400).send('Invalid event id');
        const event = await Event.findById(eventId).lean();
        if (!event) return res.status(404).send('Event not found');
        if (!event.providesCertificate && !(event.certificateSettings && event.certificateSettings.enabled)) {
            return res.status(400).send('Certificates not enabled for this event');
        }

        const cert = event.certificateSettings || {};
        const title = event.title || 'Event Certificate';
        const issuer = cert.issuingAuthority || cert.issuer || 'EventHub';
        const color = cert.designColor || '#667eea';

        const html = `<!doctype html><html><head><meta charset="utf-8"><title>Certificate Preview</title><style>body{font-family:Arial,Helvetica,sans-serif;background:#f5f7fb;padding:40px} .cert{border:8px solid ${color};padding:40px;background:#fff;max-width:900px;margin:0 auto;text-align:center} .cert h1{margin:10px 0;font-size:36px;color:${color}} .cert p{color:#333;font-size:18px}</style></head><body><div class="cert"><h1>Certificate of Participation</h1><p style="font-size:22px;margin:24px 0">This certifies that</p><p style="font-weight:700;font-size:28px;margin:12px 0">[Participant Name]</p><p style="font-size:18px;margin:12px 0">has participated in <strong>${title}</strong></p><p style="margin-top:24px;color:#666">Issued by ${issuer}</p></div></body></html>`;

        res.set('Content-Type', 'text/html');
        res.send(html);
    } catch (err) {
        console.error('Error rendering certificate preview:', err);
        res.status(500).send('Server error');
    }
});

// @route   GET /api/events/:id
// @desc    Get a single event by its ID
// @access  Public
router.get('/:id', async (req, res) => {
    console.log('🚨 Generic :id route hit with ID:', req.params.id);
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            console.log('❌ Invalid ObjectId format for:', req.params.id);
            return res.status(400).json({ message: 'Invalid event ID format.' });
        }
        
        const event = await Event.findById(req.params.id).populate('organizer', 'name');
        
        if (!event) {
            return res.status(404).json({ message: 'Event not found.' });
        }
        
        // Add registration counts
        const Registration = mongoose.model('Registration');
        const eventObj = event.toObject();
        
        // Calculate registration counts for each ticket type
        if (eventObj.ticketTypes && eventObj.ticketTypes.length > 0) {
            let totalEventTickets = 0;
            
            for (let i = 0; i < eventObj.ticketTypes.length; i++) {
                const ticketType = eventObj.ticketTypes[i];
                
                // Get registrations for this ticket type
                const registrations = await Registration.find({
                    event: event._id,
                    ticketTypeName: ticketType.name
                });
                
                // Sum up quantities from registrations
                const ticketsSold = registrations.reduce((sum, reg) => sum + reg.quantity, 0);
                
                // Update the ticket type with sales data
                eventObj.ticketTypes[i].ticketsSold = ticketsSold;
                totalEventTickets += ticketsSold;
            }
            
            // Update total tickets sold
            eventObj.totalTicketsSold = totalEventTickets;
        }
        
        res.status(200).json(eventObj);
    } catch (error) {
        console.error('Error fetching event:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   PUT /api/events/:id
// @desc    Update an event
// @access  Private (Event organizer only)
router.put('/:id', authMiddleware, async (req, res) => {
    // Run multer upload inside the handler to capture upload errors
    upload.single('image')(req, res, async function (uploadErr) {
        if (uploadErr) {
            console.error('Upload error during update event:', uploadErr);
            const payload = { message: uploadErr.message || 'Upload error' };
            if (process.env.NODE_ENV !== 'production') payload.error = uploadErr;
            return res.status(400).json(payload);
        }
        try {
        console.log('🔄 Updating event:', eventId);
        console.log('📋 Request user ID:', req.user.id);
        
        // Debug logging for update requests
        try {
            console.log('--- Update Event Request Body Keys ---');
            Object.keys(req.body || {}).forEach(k => {
                const v = req.body[k];
                console.log(k, typeof v, (typeof v === 'string' && v.length > 200) ? `[string length=${v.length}]` : v);
            });
            console.log('req.file (update):', req.file ? { fieldname: req.file.fieldname, path: req.file.path, originalname: req.file.originalname } : null);
        } catch (logErr) {
            console.warn('Error logging update request body:', logErr && logErr.message);
        }
        const eventId = req.params.id;
        
        // Validate event ID
        if (!mongoose.Types.ObjectId.isValid(eventId)) {
            return res.status(400).json({ message: 'Invalid event ID format.' });
        }
        
        // Find the event
        const event = await Event.findById(eventId);
        
        if (!event) {
            return res.status(404).json({ message: 'Event not found.' });
        }
        
        // Check if the user is the event organizer
        if (event.organizer.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Access denied. You can only edit your own events.' });
        }
        
        // Extract fields from request body
        const { title, description, date, location, category, ticketTypes, venueSections, virtualEvent, meetingLink, additionalInfo, providesCertificate, ageRestriction, customAgeLimit, accessibility, socialSharing, faq, status, mainImageUrl } = req.body;
        
        // Handle optional fields safely
        const aiGeneratedImages = req.body.aiGeneratedImages;
        const certificateSettings = req.body.certificateSettings;
        
        console.log('📝 aiGeneratedImages from request:', typeof aiGeneratedImages, aiGeneratedImages);
        console.log('📝 certificateSettings from request:', typeof certificateSettings, certificateSettings);
        
        // Handle file upload and image URL with error handling
        let imageUrl = event.imageUrl;  // Default to existing image
        
        try {
            // Prefer mainImageUrl (for AI-selected images) over file upload
            if (mainImageUrl) {
                console.log('🖼️ Using mainImageUrl:', mainImageUrl);
                imageUrl = mainImageUrl;
            } else if (req.file) {
                console.log('🖼️ Using uploaded file:', req.file.path);
                // New image uploaded, update URL
                imageUrl = req.file.path;
                
                // If there was a previous image, delete it from Cloudinary (optional)
                if (event.imageUrl && event.imageUrl.includes('cloudinary')) {
                    try {
                        const publicId = event.imageUrl.split('/').pop().split('.')[0];
                        await cloudinary.uploader.destroy(publicId);
                        console.log('🗑️ Deleted old image from Cloudinary');
                    } catch (cloudinaryError) {
                        console.error('Error deleting old image from Cloudinary:', cloudinaryError);
                        // Continue with the update even if image deletion fails
                    }
                }
            } else {
                console.log('🖼️ Keeping existing image:', imageUrl);
            }
        } catch (imageError) {
            console.error('❌ Error handling image URL:', imageError);
            // Keep existing image on error
            imageUrl = event.imageUrl;
        }
        
        // Prepare updated event data
        const eventUpdate = {
            title: title || event.title,
            description: description || event.description,
            location: location || event.location,
            category: category || event.category,
            imageUrl: imageUrl
        };
        
        // Only update date if provided and valid
        if (date) {
            try {
                const eventDateTime = new Date(date);
                if (!isNaN(eventDateTime.getTime())) {
                    console.log('📅 Updating date to:', eventDateTime);
                    eventUpdate.date = eventDateTime;
                } else {
                    console.warn('⚠️ Invalid date provided:', date);
                }
            } catch (dateError) {
                console.error('❌ Error parsing date:', dateError);
            }
        }
        
        // Update optional fields if provided
        if (ticketTypes) {
            eventUpdate.ticketTypes = safeParse(ticketTypes, event.ticketTypes || []);
        }
        
        if (venueSections) {
            eventUpdate.venueSections = safeParse(venueSections, event.venueSections || []);
        }
        
        if (virtualEvent !== undefined) {
            eventUpdate.virtualEvent = virtualEvent === 'true';
        }
        
        if (meetingLink !== undefined) {
            eventUpdate.meetingLink = meetingLink;
        }
        
        if (additionalInfo !== undefined) {
            eventUpdate.additionalInfo = additionalInfo;
        }
        
        if (providesCertificate !== undefined) {
            eventUpdate.providesCertificate = providesCertificate === 'true';
        }
        
        if (ageRestriction !== undefined) {
            eventUpdate.ageRestriction = ageRestriction;
        }
        
        if (customAgeLimit !== undefined) {
            eventUpdate.customAgeLimit = customAgeLimit;
        }
        
        if (accessibility) {
            eventUpdate.accessibility = safeParse(accessibility, event.accessibility || {});
        }
        
        if (socialSharing !== undefined) {
            eventUpdate.socialSharing = socialSharing !== 'false';
        }
        
        if (faq) {
            eventUpdate.faq = safeParse(faq, event.faq || []);
        }
        
        if (status) {
            eventUpdate.status = status;
        }

        // Parse aiGeneratedImages and certificateSettings if provided
        if (aiGeneratedImages !== undefined && aiGeneratedImages !== null) {
            console.log('🔍 Processing aiGeneratedImages...');
            eventUpdate.aiGeneratedImages = safeParse(aiGeneratedImages, event.aiGeneratedImages || []);
            console.log('✅ Processed aiGeneratedImages:', eventUpdate.aiGeneratedImages);
        }

        if (certificateSettings !== undefined && certificateSettings !== null) {
            console.log('🔍 Processing certificateSettings...');
            eventUpdate.certificateSettings = safeParse(certificateSettings, event.certificateSettings || { enabled: false, template: 'standard', issuer: '' });
            console.log('✅ Processed certificateSettings:', eventUpdate.certificateSettings);

            // Keep providesCertificate in sync
            if (eventUpdate.certificateSettings && typeof eventUpdate.certificateSettings.enabled !== 'undefined') {
                eventUpdate.providesCertificate = !!eventUpdate.certificateSettings.enabled;
            }
        }
        
        console.log('📝 Final eventUpdate object:', JSON.stringify(eventUpdate, null, 2));
        
        // Update the event with new data
        try {
            const updatedEvent = await Event.findByIdAndUpdate(
                eventId, 
                { $set: eventUpdate }, 
                { new: true }
            );
            
            if (!updatedEvent) {
                throw new Error('Event not found after update operation');
            }
            
            console.log('✅ Event updated successfully:', updatedEvent._id);
            res.status(200).json(updatedEvent);
        } catch (updateError) {
            console.error('❌ MongoDB update error:', updateError);
            throw updateError; // Re-throw to be caught by outer catch
        }
        } catch (error) {
            console.error('❌ Error updating event:', error);
            console.error('❌ Error stack:', error.stack);
            console.error('❌ Event ID:', req.params.id);
            console.error('❌ User ID:', req.user?.id);
            
            const payload = { message: 'Server error during event update.' };
            if (process.env.NODE_ENV !== 'production') {
                payload.error = (error && (error.message || String(error))) || 'unknown error';
                payload.stack = error.stack;
            }
            res.status(500).json(payload);
        }
    });
});

// @route   PATCH /api/events/:id
// @desc    Update event status only (quick status change)
// @access  Private (Event organizer only)
router.patch('/:id', authMiddleware, async (req, res) => {
    try {
        const eventId = req.params.id;
        
        console.log('🔄 Updating event status:', eventId, 'to:', req.body.status);
        
        // Validate event ID
        if (!mongoose.Types.ObjectId.isValid(eventId)) {
            return res.status(400).json({ message: 'Invalid event ID format.' });
        }
        
        // Find the event
        const event = await Event.findById(eventId);
        
        if (!event) {
            return res.status(404).json({ message: 'Event not found.' });
        }
        
        // Check if the user is the event organizer
        if (event.organizer.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Access denied. You can only edit your own events.' });
        }
        
        // Only allow status updates via this route
        const { status } = req.body;
        
        if (!status) {
            return res.status(400).json({ message: 'Status field is required.' });
        }
        
        if (!['draft', 'published'].includes(status)) {
            return res.status(400).json({ message: 'Invalid status. Must be "draft" or "published".' });
        }
        
        // Update only the status
        const updatedEvent = await Event.findByIdAndUpdate(
            eventId,
            { $set: { status: status } },
            { new: true }
        );
        
        console.log('✅ Event status updated successfully:', updatedEvent._id, 'to:', updatedEvent.status);
        res.status(200).json(updatedEvent);
        
    } catch (error) {
        console.error('❌ Error updating event status:', error);
        console.error('❌ Error stack:', error.stack);
        console.error('❌ Event ID:', req.params.id);
        console.error('❌ User ID:', req.user?.id);
        
        const payload = { message: 'Server error during status update.' };
        if (process.env.NODE_ENV !== 'production') {
            payload.error = (error && (error.message || String(error))) || 'unknown error';
        }
        res.status(500).json(payload);
    }
});

// @route   DELETE /api/events/:id
// @desc    Delete an event
// @access  Private (Event organizer only)
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        const eventId = req.params.id;
        
        if (!mongoose.Types.ObjectId.isValid(eventId)) {
            return res.status(400).json({ message: 'Invalid event ID format.' });
        }
        
        const event = await Event.findById(eventId);
        
        if (!event) {
            return res.status(404).json({ message: 'Event not found.' });
        }
        
        // Check if the user is the event organizer
        if (event.organizer.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Access denied. You can only delete your own events.' });
        }
        
        // Delete associated image from Cloudinary if exists
        if (event.imageUrl && event.imageUrl.includes('cloudinary')) {
            try {
                const publicId = event.imageUrl.split('/').pop().split('.')[0];
                await cloudinary.uploader.destroy(publicId);
            } catch (cloudinaryError) {
                console.error('Error deleting image from Cloudinary:', cloudinaryError);
                // Continue with deletion even if image deletion fails
            }
        }
        
        // Delete the event
        await Event.findByIdAndDelete(eventId);
        
        res.status(200).json({ message: 'Event deleted successfully.' });
    } catch (error) {
        console.error('Error deleting event:', error);
        res.status(500).json({ message: 'Server error during event deletion.' });
    }
});

// @route   GET /api/events/:eventId/detailed-stats
// @desc    Get detailed statistics for a specific event
// @access  Private (Organizer only)
router.get('/:eventId/detailed-stats', authMiddleware, async (req, res) => {
    try {
        const { eventId } = req.params;
        
        // Validate event ID
        if (!mongoose.Types.ObjectId.isValid(eventId)) {
            return res.status(400).json({ message: 'Invalid event ID format.' });
        }
        
        // Find the event and verify ownership
        const event = await Event.findById(eventId);
        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }
        
        if (event.organizer.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Access denied' });
        }
        
        // Get registrations for this event
        const Registration = require('../models/Registration');
        const registrations = await Registration.find({ event: eventId })
            .populate('participant', 'name email createdAt');
        
        // Calculate detailed stats
        const stats = {
            event: {
                title: event.title,
                date: event.date,
                status: event.status,
                category: event.category
            },
            registrations: {
                total: registrations.length,
                confirmed: registrations.filter(r => r.status === 'confirmed').length,
                attended: registrations.filter(r => r.status === 'attended').length,
                canceled: registrations.filter(r => r.status === 'canceled').length
            },
            revenue: {
                total: 0,
                byTicketType: {}
            },
            tickets: {
                totalSold: 0,
                totalCapacity: 0,
                byType: {}
            },
            demographics: {
                registrationTrend: {},
                ticketTypePreferences: {}
            }
        };
        
        // Calculate ticket and revenue stats
        event.ticketTypes.forEach(ticket => {
            const sold = ticket.ticketsSold || 0;
            const revenue = sold * ticket.price;
            
            stats.revenue.total += revenue;
            stats.revenue.byTicketType[ticket.name] = revenue;
            
            stats.tickets.totalSold += sold;
            stats.tickets.totalCapacity += ticket.capacity;
            stats.tickets.byType[ticket.name] = {
                sold,
                capacity: ticket.capacity,
                price: ticket.price,
                soldPercentage: Math.round((sold / ticket.capacity) * 100)
            };
        });
        
        // Registration trend (by week)
        registrations.forEach(reg => {
            const weekKey = new Date(reg.createdAt).toISOString().substring(0, 10); // YYYY-MM-DD
            stats.demographics.registrationTrend[weekKey] = 
                (stats.demographics.registrationTrend[weekKey] || 0) + 1;
        });
        
        // Ticket type preferences
        registrations.forEach(reg => {
            const ticketType = reg.ticketTypeName;
            stats.demographics.ticketTypePreferences[ticketType] = 
                (stats.demographics.ticketTypePreferences[ticketType] || 0) + reg.quantity;
        });
        
        res.json(stats);
    } catch (error) {
        console.error('Error fetching detailed event stats:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

module.exports = router;