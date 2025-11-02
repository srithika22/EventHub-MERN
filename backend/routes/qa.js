const express = require('express');
const router = express.Router();
const Question = require('../models/Question');
const Event = require('../models/Event');
const authMiddleware = require('../middleware/auth');

// Test route
router.get('/test', (req, res) => {
    res.json({ message: 'Enhanced Q&A routes are working!' });
});

// @route   GET /api/qa/:eventId/questions
// @desc    Get all questions for an event
// @access  Private
router.get('/:eventId/questions', authMiddleware, async (req, res) => {
    try {
        console.log('Fetching questions for event:', req.params.eventId);
        const eventId = req.params.eventId;
        
        const questions = await Question.find({ event: eventId })
            .populate('asker', 'name email')
            .populate('author', 'name email') // For backward compatibility
            .sort({ createdAt: -1 });
        
        // Map author to asker for consistency
        const formattedQuestions = questions.map(q => ({
            ...q.toObject(),
            asker: q.asker || q.author
        }));
        
        res.json({ questions: formattedQuestions });
    } catch (error) {
        console.error('Error fetching questions:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST /api/qa/:eventId/questions
// @desc    Submit a new question for an event
// @access  Private
router.post('/:eventId/questions', authMiddleware, async (req, res) => {
    try {
        const eventId = req.params.eventId;
        const { question, category = 'general' } = req.body;
        const askerId = req.user.id;
        
        if (!question || !question.trim()) {
            return res.status(400).json({ message: 'Question text is required' });
        }
        
        // Verify event exists
        const event = await Event.findById(eventId);
        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }
        
        const newQuestion = new Question({
            event: eventId,
            asker: askerId,
            author: askerId, // For backward compatibility
            question: question.trim(),
            category,
            status: 'pending',
            votes: 0,
            isStarred: false
        });
        
        await newQuestion.save();
        await newQuestion.populate('asker', 'name email');
        
        // Emit real-time event
        const io = req.app.get('io');
        if (io) {
            io.to(`event-${eventId}`).emit('question-added', newQuestion);
        }
        
        res.status(201).json({ question: newQuestion });
    } catch (error) {
        console.error('Error creating question:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST /api/qa/questions/:questionId/vote
// @desc    Vote on a question (upvote/downvote)
// @access  Private
router.post('/questions/:questionId/vote', authMiddleware, async (req, res) => {
    try {
        const questionId = req.params.questionId;
        const { voteType } = req.body; // 'up', 'down', or 'remove'
        const userId = req.user.id;
        
        const question = await Question.findById(questionId);
        if (!question) {
            return res.status(404).json({ message: 'Question not found' });
        }
        
        // Initialize votes array if not exists
        if (!question.votes) question.votes = 0;
        if (!question.voterIds) question.voterIds = [];
        if (!question.userVotes) question.userVotes = new Map();
        
        const currentUserVote = question.userVotes.get(userId);
        
        // Remove existing vote if any
        if (currentUserVote) {
            if (currentUserVote === 'up') {
                question.votes = Math.max(0, question.votes - 1);
            }
            question.userVotes.delete(userId);
            question.voterIds = question.voterIds.filter(id => id.toString() !== userId);
        }
        
        // Add new vote if not removing
        if (voteType === 'up' && currentUserVote !== 'up') {
            question.votes = (question.votes || 0) + 1;
            question.userVotes.set(userId, 'up');
            question.voterIds.push(userId);
        }
        
        await question.save();
        
        // Emit real-time event
        const io = req.app.get('io');
        if (io) {
            io.to(`event-${question.event}`).emit('question-voted', {
                questionId,
                votes: question.votes,
                userVote: question.userVotes.get(userId) || null
            });
        }
        
        res.json({ 
            votes: question.votes,
            userVote: question.userVotes.get(userId) || null
        });
    } catch (error) {
        console.error('Error voting on question:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST /api/qa/questions/:questionId/answer
// @desc    Answer a question (organizer only)
// @access  Private
router.post('/questions/:questionId/answer', authMiddleware, async (req, res) => {
    try {
        const questionId = req.params.questionId;
        const { answer } = req.body;
        const userId = req.user.id;
        
        if (!answer || !answer.trim()) {
            return res.status(400).json({ message: 'Answer text is required' });
        }
        
        const question = await Question.findById(questionId).populate('event');
        if (!question) {
            return res.status(404).json({ message: 'Question not found' });
        }
        
        // Check if user is organizer
        const isOrganizer = question.event.organizer.toString() === userId || req.user.role === 'organizer';
        if (!isOrganizer) {
            return res.status(403).json({ message: 'Only organizers can answer questions' });
        }
        
        question.answer = answer.trim();
        question.status = 'answered';
        question.answeredAt = new Date();
        question.answeredBy = userId;
        
        await question.save();
        
        // Emit real-time event
        const io = req.app.get('io');
        if (io) {
            io.to(`event-${question.event._id}`).emit('question-answered', {
                questionId,
                answer: question.answer,
                answeredAt: question.answeredAt
            });
        }
        
        res.json({ 
            answer: question.answer,
            answeredAt: question.answeredAt
        });
    } catch (error) {
        console.error('Error answering question:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST /api/qa/questions/:questionId/star
// @desc    Star/unstar a question (organizer only)
// @access  Private
router.post('/questions/:questionId/star', authMiddleware, async (req, res) => {
    try {
        const questionId = req.params.questionId;
        const userId = req.user.id;
        
        const question = await Question.findById(questionId).populate('event');
        if (!question) {
            return res.status(404).json({ message: 'Question not found' });
        }
        
        // Check if user is organizer
        const isOrganizer = question.event.organizer.toString() === userId || req.user.role === 'organizer';
        if (!isOrganizer) {
            return res.status(403).json({ message: 'Only organizers can star questions' });
        }
        
        question.isStarred = !question.isStarred;
        await question.save();
        
        // Emit real-time event
        const io = req.app.get('io');
        if (io) {
            io.to(`event-${question.event._id}`).emit('question-starred', {
                questionId,
                isStarred: question.isStarred
            });
        }
        
        res.json({ isStarred: question.isStarred });
    } catch (error) {
        console.error('Error starring question:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   DELETE /api/qa/questions/:questionId
// @desc    Delete a question
// @access  Private
router.delete('/questions/:questionId', authMiddleware, async (req, res) => {
    try {
        const questionId = req.params.questionId;
        const userId = req.user.id;
        
        const question = await Question.findById(questionId).populate('event');
        if (!question) {
            return res.status(404).json({ message: 'Question not found' });
        }
        
        // Check if user is the author or the event organizer
        const isAuthor = (question.asker && question.asker.toString() === userId) || 
                        (question.author && question.author.toString() === userId);
        const isOrganizer = question.event.organizer.toString() === userId || req.user.role === 'organizer';
        
        if (!isAuthor && !isOrganizer) {
            return res.status(403).json({ message: 'Not authorized to delete this question' });
        }
        
        await Question.findByIdAndDelete(questionId);
        
        res.json({ message: 'Question deleted successfully' });
    } catch (error) {
        console.error('Error deleting question:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/qa/:eventId/categories
// @desc    Get question categories for an event
// @access  Private
router.get('/:eventId/categories', authMiddleware, async (req, res) => {
    try {
        const eventId = req.params.eventId;
        
        const categories = await Question.distinct('category', { event: eventId });
        
        res.json({ categories: categories || ['general'] });
    } catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/qa/:eventId/analytics
// @desc    Get Q&A analytics for an event (organizer only)
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
        
        const questions = await Question.find({ event: eventId });
        
        const analytics = {
            totalQuestions: questions.length,
            answeredQuestions: questions.filter(q => q.status === 'answered').length,
            pendingQuestions: questions.filter(q => q.status === 'pending').length,
            starredQuestions: questions.filter(q => q.isStarred).length,
            totalVotes: questions.reduce((sum, q) => sum + (q.votes || 0), 0),
            categoryBreakdown: questions.reduce((acc, q) => {
                acc[q.category] = (acc[q.category] || 0) + 1;
                return acc;
            }, {}),
            responseRate: questions.length > 0 ? 
                Math.round((questions.filter(q => q.status === 'answered').length / questions.length) * 100) : 0,
            avgVotesPerQuestion: questions.length > 0 ? 
                Math.round(questions.reduce((sum, q) => sum + (q.votes || 0), 0) / questions.length) : 0,
            topQuestions: questions
                .sort((a, b) => (b.votes || 0) - (a.votes || 0))
                .slice(0, 10)
                .map(q => ({
                    _id: q._id,
                    question: q.question,
                    votes: q.votes || 0,
                    status: q.status,
                    category: q.category
                }))
        };
        
        res.json({ analytics });
    } catch (error) {
        console.error('Error fetching Q&A analytics:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;