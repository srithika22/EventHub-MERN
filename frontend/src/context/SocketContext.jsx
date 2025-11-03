import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { SOCKET_URL } from '../utils/api';

const SocketContext = createContext();

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      // Initialize socket connection using env-based socket URL
      const newSocket = io(SOCKET_URL, {
        auth: {
          userId: user.id,
          userName: user.name
        }
      });

      newSocket.on('connect', () => {
        console.log('Connected to server');
        setConnected(true);
      });

      newSocket.on('disconnect', () => {
        console.log('Disconnected from server');
        setConnected(false);
      });

      newSocket.on('users-online', (users) => {
        setOnlineUsers(new Set(users));
      });

      newSocket.on('user-joined', (userId) => {
        setOnlineUsers(prev => new Set([...prev, userId]));
      });

      newSocket.on('user-left', (userId) => {
        setOnlineUsers(prev => {
          const newSet = new Set(prev);
          newSet.delete(userId);
          return newSet;
        });
      });

      setSocket(newSocket);

      return () => {
        newSocket.close();
      };
    } else {
      // Clean up socket if user logs out
      if (socket) {
        socket.close();
        setSocket(null);
        setConnected(false);
      }
    }
  }, [user]);

  const joinEvent = (eventId) => {
    if (socket && eventId) {
      socket.emit('join-event', eventId);
    }
  };

  const leaveEvent = (eventId) => {
    if (socket && eventId) {
      socket.emit('leave-event', eventId);
    }
  };

  const joinChat = (chatId) => {
    if (socket && chatId) {
      socket.emit('join-chat', chatId);
    }
  };

  const leaveChat = (chatId) => {
    if (socket && chatId) {
      socket.emit('leave-chat', chatId);
    }
  };

  const sendMessage = (data) => {
    if (socket) {
      socket.emit('send-message', data);
    }
  };

  const startTyping = (data) => {
    if (socket) {
      socket.emit('typing', data);
    }
  };

  const stopTyping = (data) => {
    if (socket) {
      socket.emit('stop-typing', data);
    }
  };

  const emitPollCreated = (eventId, poll) => {
    if (socket) {
      socket.emit('new-poll', { eventId, poll });
    }
  };

  const emitPollVote = (eventId, pollId, results) => {
    if (socket) {
      socket.emit('poll-vote', { eventId, pollId, results });
    }
  };

  const emitNewQuestion = (eventId, question) => {
    if (socket) {
      socket.emit('new-question', { eventId, question });
    }
  };

  const emitQuestionAnswered = (eventId, questionId, answer) => {
    if (socket) {
      socket.emit('question-answered', { eventId, questionId, answer });
    }
  };

  const emitNewDiscussion = (eventId, discussion) => {
    if (socket) {
      socket.emit('new-discussion', { eventId, discussion });
    }
  };

  const emitNewReply = (eventId, discussionId, reply) => {
    if (socket) {
      socket.emit('new-reply', { eventId, discussionId, reply });
    }
  };

  const emitForumTyping = (eventId, discussionId) => {
    if (socket) {
      socket.emit('forum-typing', { eventId, discussionId });
    }
  };

  const emitForumStopTyping = (eventId, discussionId) => {
    if (socket) {
      socket.emit('forum-stop-typing', { eventId, discussionId });
    }
  };

  const value = {
    socket,
    connected,
    onlineUsers,
    joinEvent,
    leaveEvent,
    joinChat,
    leaveChat,
    sendMessage,
    startTyping,
    stopTyping,
    emitPollCreated,
    emitPollVote,
    emitNewQuestion,
    emitQuestionAnswered,
    emitNewDiscussion,
    emitNewReply,
    emitForumTyping,
    emitForumStopTyping
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};

export default SocketContext;