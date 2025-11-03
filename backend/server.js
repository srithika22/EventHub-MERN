const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const http = require('http');
const socketIo = require('socket.io');
require('dotenv').config({ path: path.join(__dirname, '.env') }); // Loads variables from .env file in server directory

// Log to check environment variables are loaded
console.log("MongoDB URI exists:", !!process.env.MONGO_URI);
console.log("JWT Secret exists:", !!process.env.JWT_SECRET);

const authRoutes = require('./routes/auth');
const eventRoutes = require('./routes/events');
const registrationRoutes = require('./routes/registrations');
const networkingRoutes = require('./routes/networking');
const qaRoutes = require('./routes/qa');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

// CORS configuration for production and development
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  process.env.FRONTEND_URL,
  'https://eventhub-mern.vercel.app', // Your main Vercel domain
  'https://eventhub-mern-dphu8rj04-rithikas-projects-4d46ea67.vercel.app' // New deployment URL
];

app.use(cors({
  origin: (origin, callback) => {
    console.log('CORS Origin check:', origin); // Debug log
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    // Check if origin is in allowed list or matches Vercel pattern
    if (allowedOrigins.includes(origin) || (origin && origin.includes('vercel.app'))) {
      return callback(null, true);
    }
    
    const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
    return callback(new Error(msg), false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// --- DATABASE CONNECTION ---
mongoose.connect(process.env.MONGO_URI, {
  serverSelectionTimeoutMS: 10000,
  socketTimeoutMS: 45000,
  maxPoolSize: 10,
  retryWrites: true,
  w: 'majority'
})
  .then(() => console.log('✅ Successfully connected to MongoDB Atlas!'))
  .catch((error) => console.error('❌ MongoDB connection error:', error));

// --- API ROUTES ---
app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes); 
app.use('/api/registrations', registrationRoutes);
app.use('/api/networking', networkingRoutes);
app.use('/api/qa', qaRoutes);
app.use('/api/business-cards', require('./routes/business-cards'));
app.use('/api/forum', require('./routes/forum'));
app.use('/api/polling', require('./routes/polling'));
app.use('/api/speakers', require('./routes/speakers'));
app.use('/api/sessions', require('./routes/sessions'));
app.use('/api/messages', require('./routes/messages'));

const PORT = process.env.PORT || 3001;

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Join event room
  socket.on('join-event', (eventId) => {
    socket.join(`event-${eventId}`);
    console.log(`User ${socket.id} joined event ${eventId}`);
  });

  // Join private chat room
  socket.on('join-chat', (chatId) => {
    socket.join(`chat-${chatId}`);
    console.log(`User ${socket.id} joined chat ${chatId}`);
  });

  // Handle new messages
  socket.on('send-message', (data) => {
    const { chatId, eventId, message, sender, type } = data;
    
    if (type === 'private') {
      // Send to specific chat room
      socket.to(`chat-${chatId}`).emit('new-message', {
        message,
        sender,
        timestamp: new Date(),
        chatId
      });
    } else if (type === 'event') {
      // Send to event room (group chat)
      socket.to(`event-${eventId}`).emit('new-message', {
        message,
        sender,
        timestamp: new Date(),
        eventId,
        type: 'event'
      });
    }
  });

  // Handle typing indicators
  socket.on('typing', (data) => {
    const { chatId, eventId, userName, type } = data;
    if (type === 'private') {
      socket.to(`chat-${chatId}`).emit('user-typing', { userName, chatId });
    } else if (type === 'event') {
      socket.to(`event-${eventId}`).emit('user-typing', { userName, eventId });
    }
  });

  socket.on('stop-typing', (data) => {
    const { chatId, eventId, userName, type } = data;
    if (type === 'private') {
      socket.to(`chat-${chatId}`).emit('user-stopped-typing', { userName, chatId });
    } else if (type === 'event') {
      socket.to(`event-${eventId}`).emit('user-stopped-typing', { userName, eventId });
    }
  });

  // Handle poll events
  socket.on('new-poll', (data) => {
    const { eventId, poll } = data;
    socket.to(`event-${eventId}`).emit('poll-created', poll);
  });

  socket.on('poll-vote', (data) => {
    const { eventId, pollId, results } = data;
    socket.to(`event-${eventId}`).emit('poll-updated', { pollId, results });
  });

  // Handle Q&A events
  socket.on('new-question', (data) => {
    const { eventId, question } = data;
    socket.to(`event-${eventId}`).emit('question-added', question);
  });

  socket.on('question-answered', (data) => {
    const { eventId, questionId, answer } = data;
    socket.to(`event-${eventId}`).emit('question-updated', { questionId, answer });
  });

  // Handle forum events
  socket.on('new-discussion', (data) => {
    const { eventId, discussion } = data;
    socket.to(`event-${eventId}`).emit('discussion-created', discussion);
  });

  socket.on('new-reply', (data) => {
    const { eventId, discussionId, reply } = data;
    socket.to(`event-${eventId}`).emit('reply-added', { discussionId, reply });
  });

  // Handle forum typing indicators
  socket.on('forum-typing', (data) => {
    const { eventId, discussionId } = data;
    const userName = socket.userName || 'Someone';
    socket.to(`event-${eventId}`).emit('forum-typing', { 
      userId: socket.userId, 
      userName, 
      discussionId 
    });
  });

  socket.on('forum-stop-typing', (data) => {
    const { eventId, discussionId } = data;
    const userName = socket.userName || 'Someone';
    socket.to(`event-${eventId}`).emit('forum-stop-typing', { 
      userId: socket.userId, 
      userName, 
      discussionId 
    });
  });

  // Track online users
  socket.on('user-connected', (userData) => {
    socket.userId = userData.userId;
    socket.userName = userData.userName;
  });

  // Leave event room
  socket.on('leave-event', (eventId) => {
    socket.leave(`event-${eventId}`);
    console.log(`User ${socket.id} left event ${eventId}`);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Make io accessible to routes
app.set('io', io);

// Global error handler - return JSON to clients and log server-side errors
app.use((err, req, res, next) => {
  console.error('Global error handler:', err && (err.stack || err.message || err));
  const statusCode = err && err.status ? err.status : 500;
  const payload = { message: err && err.message ? err.message : 'Internal Server Error' };
  if (process.env.NODE_ENV !== 'production') {
    payload.error = err && (err.stack || String(err));
  }
  res.status(statusCode).json(payload);
});

server.listen(PORT, () => {
  console.log(`🚀 Server is listening on http://localhost:${PORT}`);
});