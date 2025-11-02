import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { useSocket } from './SocketContext';

// Notification types
export const NOTIFICATION_TYPES = {
  MESSAGE: 'message',
  POLL_CREATED: 'poll_created',
  POLL_VOTE: 'poll_vote',
  QUESTION_ADDED: 'question_added',
  QUESTION_ANSWERED: 'question_answered',
  FORUM_DISCUSSION: 'forum_discussion',
  FORUM_REPLY: 'forum_reply',
  CONNECTION_REQUEST: 'connection_request',
  CONNECTION_ACCEPTED: 'connection_accepted',
  EVENT_UPDATE: 'event_update',
  ENGAGEMENT_MILESTONE: 'engagement_milestone'
};

// Notification actions
const NOTIFICATION_ACTIONS = {
  ADD_NOTIFICATION: 'ADD_NOTIFICATION',
  MARK_AS_READ: 'MARK_AS_READ',
  MARK_ALL_AS_READ: 'MARK_ALL_AS_READ',
  REMOVE_NOTIFICATION: 'REMOVE_NOTIFICATION',
  CLEAR_ALL: 'CLEAR_ALL',
  SET_NOTIFICATIONS: 'SET_NOTIFICATIONS'
};

// Initial state
const initialState = {
  notifications: [],
  unreadCount: 0,
  isEnabled: true,
  settings: {
    messages: true,
    polls: true,
    qa: true,
    forum: true,
    networking: true,
    events: true,
    sound: true,
    desktop: false
  }
};

// Notification reducer
const notificationReducer = (state, action) => {
  switch (action.type) {
    case NOTIFICATION_ACTIONS.ADD_NOTIFICATION:
      const newNotification = {
        id: Date.now() + Math.random(),
        ...action.payload,
        timestamp: new Date(),
        isRead: false
      };
      
      return {
        ...state,
        notifications: [newNotification, ...state.notifications.slice(0, 49)],
        unreadCount: state.unreadCount + 1
      };

    case NOTIFICATION_ACTIONS.MARK_AS_READ:
      const updatedNotifications = state.notifications.map(notif =>
        notif.id === action.payload.id ? { ...notif, isRead: true } : notif
      );
      const unreadAfterMark = updatedNotifications.filter(n => !n.isRead).length;
      
      return {
        ...state,
        notifications: updatedNotifications,
        unreadCount: unreadAfterMark
      };

    case NOTIFICATION_ACTIONS.MARK_ALL_AS_READ:
      return {
        ...state,
        notifications: state.notifications.map(notif => ({ ...notif, isRead: true })),
        unreadCount: 0
      };

    case NOTIFICATION_ACTIONS.REMOVE_NOTIFICATION:
      const filteredNotifications = state.notifications.filter(notif => notif.id !== action.payload.id);
      const unreadAfterRemove = filteredNotifications.filter(n => !n.isRead).length;
      
      return {
        ...state,
        notifications: filteredNotifications,
        unreadCount: unreadAfterRemove
      };

    case NOTIFICATION_ACTIONS.CLEAR_ALL:
      return {
        ...state,
        notifications: [],
        unreadCount: 0
      };

    case NOTIFICATION_ACTIONS.SET_NOTIFICATIONS:
      return {
        ...state,
        notifications: action.payload.notifications,
        unreadCount: action.payload.notifications.filter(n => !n.isRead).length
      };

    default:
      return state;
  }
};

// Create context
const NotificationContext = createContext();

// Notification provider component
export const NotificationProvider = ({ children }) => {
  const [state, dispatch] = useReducer(notificationReducer, initialState);
  const { socket } = useSocket();

  useEffect(() => {
    // Load notifications from localStorage on mount
    const savedNotifications = localStorage.getItem('eventHub_notifications');
    if (savedNotifications) {
      try {
        const parsed = JSON.parse(savedNotifications);
        dispatch({
          type: NOTIFICATION_ACTIONS.SET_NOTIFICATIONS,
          payload: { notifications: parsed }
        });
      } catch (error) {
        console.error('Error loading saved notifications:', error);
      }
    }

    // Set up socket listeners for real-time notifications
    if (socket) {
      socket.on('notification', handleSocketNotification);
      socket.on('message-notification', handleMessageNotification);
      socket.on('poll-notification', handlePollNotification);
      socket.on('qa-notification', handleQANotification);
      socket.on('forum-notification', handleForumNotification);
      socket.on('networking-notification', handleNetworkingNotification);
      socket.on('event-notification', handleEventNotification);

      return () => {
        socket.off('notification');
        socket.off('message-notification');
        socket.off('poll-notification');
        socket.off('qa-notification');
        socket.off('forum-notification');
        socket.off('networking-notification');
        socket.off('event-notification');
      };
    }
  }, [socket]);

  useEffect(() => {
    // Save notifications to localStorage whenever they change
    localStorage.setItem('eventHub_notifications', JSON.stringify(state.notifications));
  }, [state.notifications]);

  // Socket notification handlers
  const handleSocketNotification = (data) => {
    if (state.isEnabled) {
      addNotification(data);
    }
  };

  const handleMessageNotification = (data) => {
    if (state.settings.messages) {
      addNotification({
        type: NOTIFICATION_TYPES.MESSAGE,
        title: 'New Message',
        message: `${data.senderName}: ${data.preview}`,
        icon: '💬',
        data: data
      });
    }
  };

  const handlePollNotification = (data) => {
    if (state.settings.polls) {
      const message = data.action === 'created' 
        ? `New poll: ${data.pollTitle}`
        : `Someone voted on: ${data.pollTitle}`;
      
      addNotification({
        type: data.action === 'created' ? NOTIFICATION_TYPES.POLL_CREATED : NOTIFICATION_TYPES.POLL_VOTE,
        title: data.action === 'created' ? 'New Poll' : 'Poll Update',
        message,
        icon: '📊',
        data: data
      });
    }
  };

  const handleQANotification = (data) => {
    if (state.settings.qa) {
      const message = data.action === 'question_added'
        ? `New question: ${data.questionText}`
        : `Question answered: ${data.questionText}`;
      
      addNotification({
        type: data.action === 'question_added' ? NOTIFICATION_TYPES.QUESTION_ADDED : NOTIFICATION_TYPES.QUESTION_ANSWERED,
        title: data.action === 'question_added' ? 'New Question' : 'Question Answered',
        message,
        icon: '❓',
        data: data
      });
    }
  };

  const handleForumNotification = (data) => {
    if (state.settings.forum) {
      const message = data.action === 'discussion_added'
        ? `New discussion: ${data.title}`
        : `New reply in: ${data.discussionTitle}`;
      
      addNotification({
        type: data.action === 'discussion_added' ? NOTIFICATION_TYPES.FORUM_DISCUSSION : NOTIFICATION_TYPES.FORUM_REPLY,
        title: data.action === 'discussion_added' ? 'New Discussion' : 'New Reply',
        message,
        icon: '💭',
        data: data
      });
    }
  };

  const handleNetworkingNotification = (data) => {
    if (state.settings.networking) {
      const message = data.action === 'connection_request'
        ? `${data.requesterName} wants to connect`
        : `${data.accepterName} accepted your connection`;
      
      addNotification({
        type: data.action === 'connection_request' ? NOTIFICATION_TYPES.CONNECTION_REQUEST : NOTIFICATION_TYPES.CONNECTION_ACCEPTED,
        title: data.action === 'connection_request' ? 'Connection Request' : 'Connection Accepted',
        message,
        icon: '🤝',
        data: data
      });
    }
  };

  const handleEventNotification = (data) => {
    if (state.settings.events) {
      addNotification({
        type: NOTIFICATION_TYPES.EVENT_UPDATE,
        title: 'Event Update',
        message: data.message,
        icon: '📅',
        data: data
      });
    }
  };

  // Notification actions
  const addNotification = (notification) => {
    dispatch({
      type: NOTIFICATION_ACTIONS.ADD_NOTIFICATION,
      payload: notification
    });

    // Play sound if enabled
    if (state.settings.sound) {
      playNotificationSound();
    }

    // Show desktop notification if enabled and supported
    if (state.settings.desktop && 'Notification' in window && Notification.permission === 'granted') {
      showDesktopNotification(notification);
    }
  };

  const markAsRead = (id) => {
    dispatch({
      type: NOTIFICATION_ACTIONS.MARK_AS_READ,
      payload: { id }
    });
  };

  const markAllAsRead = () => {
    dispatch({
      type: NOTIFICATION_ACTIONS.MARK_ALL_AS_READ
    });
  };

  const removeNotification = (id) => {
    dispatch({
      type: NOTIFICATION_ACTIONS.REMOVE_NOTIFICATION,
      payload: { id }
    });
  };

  const clearAll = () => {
    dispatch({
      type: NOTIFICATION_ACTIONS.CLEAR_ALL
    });
  };

  const updateSettings = (newSettings) => {
    dispatch({
      type: 'UPDATE_SETTINGS',
      payload: newSettings
    });
  };

  // Utility functions
  const playNotificationSound = () => {
    try {
      const audio = new Audio('/notification-sound.mp3');
      audio.volume = 0.3;
      audio.play().catch(console.error);
    } catch (error) {
      console.error('Error playing notification sound:', error);
    }
  };

  const showDesktopNotification = (notification) => {
    try {
      new Notification(notification.title, {
        body: notification.message,
        icon: '/logo192.png',
        tag: notification.type
      });
    } catch (error) {
      console.error('Error showing desktop notification:', error);
    }
  };

  const requestDesktopPermission = async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return false;
  };

  const getNotificationsByType = (type) => {
    return state.notifications.filter(notif => notif.type === type);
  };

  const getRecentNotifications = (limit = 10) => {
    return state.notifications.slice(0, limit);
  };

  const contextValue = {
    notifications: state.notifications,
    unreadCount: state.unreadCount,
    isEnabled: state.isEnabled,
    settings: state.settings,
    addNotification,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAll,
    updateSettings,
    requestDesktopPermission,
    getNotificationsByType,
    getRecentNotifications
  };

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
    </NotificationContext.Provider>
  );
};

// Custom hook to use notification context
export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

export default NotificationContext;