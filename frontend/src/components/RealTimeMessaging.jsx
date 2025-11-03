import React, { useState, useEffect, useRef } from 'react';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../utils/api';
import './RealTimeMessaging.css';

const RealTimeMessaging = ({ eventId, type = 'event', recipientId = null, className = '' }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [replyingTo, setReplyingTo] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);

  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const messagesContainerRef = useRef(null);

  const { socket, joinEvent, joinChat, sendMessage, startTyping, stopTyping } = useSocket();
  const { user } = useAuth();

  useEffect(() => {
    if (socket) {
      // Join appropriate room
      if (type === 'event' && eventId) {
        joinEvent(eventId);
      } else if (type === 'private' && recipientId) {
        const chatId = [user.id, recipientId].sort().join('-');
        joinChat(chatId);
      }

      // Socket event listeners
      socket.on('new-message', handleNewMessage);
      socket.on('message-edited', handleMessageEdited);
      socket.on('message-deleted', handleMessageDeleted);
      socket.on('message-reaction', handleMessageReaction);
      socket.on('user-typing', handleUserTyping);
      socket.on('user-stopped-typing', handleUserStoppedTyping);

      return () => {
        socket.off('new-message', handleNewMessage);
        socket.off('message-edited', handleMessageEdited);
        socket.off('message-deleted', handleMessageDeleted);
        socket.off('message-reaction', handleMessageReaction);
        socket.off('user-typing', handleUserTyping);
        socket.off('user-stopped-typing', handleUserStoppedTyping);
      };
    }
  }, [socket, eventId, recipientId, type]);

  useEffect(() => {
    fetchMessages();
  }, [eventId, recipientId, type]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchMessages = async () => {
    try {
      const token = localStorage.getItem('token');
      let url = '';
      
      if (type === 'event') {
        url = `${API_BASE_URL}/api/messages/event/${eventId}?page=${page}&limit=50`;
      } else if (type === 'private') {
        url = `${API_BASE_URL}/api/messages/private/${recipientId}?page=${page}&limit=50`;
      }

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages || []);
        setHasMore(data.hasMore || false);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNewMessage = (message) => {
    if (
      (type === 'event' && message.event === eventId) ||
      (type === 'private' && (
        (message.sender._id === recipientId && message.recipient._id === user.id) ||
        (message.sender._id === user.id && message.recipient._id === recipientId)
      ))
    ) {
      setMessages(prev => [...prev, message]);
    }
  };

  const handleMessageEdited = (editedMessage) => {
    setMessages(prev => prev.map(msg => 
      msg._id === editedMessage._id ? editedMessage : msg
    ));
  };

  const handleMessageDeleted = ({ messageId }) => {
    setMessages(prev => prev.filter(msg => msg._id !== messageId));
  };

  const handleMessageReaction = ({ messageId, reactions }) => {
    setMessages(prev => prev.map(msg => 
      msg._id === messageId ? { ...msg, reactions } : msg
    ));
  };

  const handleUserTyping = ({ userName, chatId, eventId: typingEventId }) => {
    if (
      (type === 'event' && typingEventId === eventId) ||
      (type === 'private' && chatId === [user.id, recipientId].sort().join('-'))
    ) {
      setTypingUsers(prev => new Set([...prev, userName]));
    }
  };

  const handleUserStoppedTyping = ({ userName, chatId, eventId: typingEventId }) => {
    if (
      (type === 'event' && typingEventId === eventId) ||
      (type === 'private' && chatId === [user.id, recipientId].sort().join('-'))
    ) {
      setTypingUsers(prev => {
        const newSet = new Set(prev);
        newSet.delete(userName);
        return newSet;
      });
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (!newMessage.trim()) {
      console.log('❌ Empty message, not sending');
      return;
    }

    console.log('📤 Sending message:', newMessage);
    console.log('📤 Message type:', type);
    console.log('📤 Event ID:', eventId);
    console.log('📤 Recipient ID:', recipientId);

    const messageData = {
      content: newMessage.trim(),
      type,
      sender: user
    };

    if (type === 'event') {
      messageData.eventId = eventId;
    } else if (type === 'private') {
      messageData.recipientId = recipientId;
    }

    if (replyingTo) {
      messageData.replyToId = replyingTo._id;
    }

    console.log('📤 Message data:', messageData);

    try {
      const token = localStorage.getItem('token');
      const url = `${API_BASE_URL}/api/messages/send`;
      
      console.log('📤 Sending to URL:', url);
      console.log('📤 Token exists:', !!token);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(messageData)
      });

      console.log('📤 Response status:', response.status);
      console.log('📤 Response ok:', response.ok);

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Message sent successfully:', result);
        setNewMessage('');
        setReplyingTo(null);
        handleStopTyping();
      } else {
        const error = await response.json();
        console.error('❌ Send failed:', error);
      }
    } catch (error) {
      console.error('❌ Error sending message:', error);
    }
  };

  const handleTyping = () => {
    if (!isTyping) {
      setIsTyping(true);
      
      const typingData = {
        userName: user.name,
        type
      };

      if (type === 'event') {
        typingData.eventId = eventId;
      } else if (type === 'private') {
        typingData.chatId = [user.id, recipientId].sort().join('-');
      }

      startTyping(typingData);
    }

    // Reset typing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      handleStopTyping();
    }, 2000);
  };

  const handleStopTyping = () => {
    if (isTyping) {
      setIsTyping(false);
      
      const typingData = {
        userName: user.name,
        type
      };

      if (type === 'event') {
        typingData.eventId = eventId;
      } else if (type === 'private') {
        typingData.chatId = [user.id, recipientId].sort().join('-');
      }

      stopTyping(typingData);
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
  };

  const handleReaction = async (messageId, emoji) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/messages/${messageId}/react`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ emoji })
      });

      if (response.ok) {
        const data = await response.json();
        setMessages(prev => prev.map(msg => 
          msg._id === messageId ? { ...msg, reactions: data.reactions } : msg
        ));
      }
    } catch (error) {
      console.error('Error adding reaction:', error);
    }
  };

  const handleEditMessage = async (messageId, newContent) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/messages/${messageId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ content: newContent })
      });

      if (response.ok) {
        setEditingMessage(null);
      }
    } catch (error) {
      console.error('Error editing message:', error);
    }
  };

  const handleDeleteMessage = async (messageId) => {
    if (window.confirm('Are you sure you want to delete this message?')) {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/api/messages/${messageId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          setMessages(prev => prev.filter(msg => msg._id !== messageId));
        }
      } catch (error) {
        console.error('Error deleting message:', error);
      }
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString();
    }
  };

  const groupMessagesByDate = (messages) => {
    const grouped = {};
    messages.forEach(message => {
      const date = formatDate(message.createdAt);
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(message);
    });
    return grouped;
  };

  const renderReactions = (reactions) => {
    const reactionCounts = {};
    reactions.forEach(reaction => {
      if (!reactionCounts[reaction.emoji]) {
        reactionCounts[reaction.emoji] = { count: 0, users: [] };
      }
      reactionCounts[reaction.emoji].count++;
      reactionCounts[reaction.emoji].users.push(reaction.user);
    });

    return Object.entries(reactionCounts).map(([emoji, data]) => (
      <span 
        key={emoji} 
        className="message-reaction"
        title={`${data.users.map(u => u.name).join(', ')}`}
      >
        {emoji} {data.count}
      </span>
    ));
  };

  if (loading) {
    return <div className="messaging-loading">Loading messages...</div>;
  }

  const groupedMessages = groupMessagesByDate(messages);

  return (
    <div className={`real-time-messaging ${className}`}>
      <div className="messages-container" ref={messagesContainerRef}>
        {Object.entries(groupedMessages).map(([date, dateMessages]) => (
          <div key={date}>
            <div className="date-separator">{date}</div>
            {dateMessages.map((message, index) => {
              const isOwn = message.sender._id === user.id;
              const showAvatar = index === 0 || 
                dateMessages[index - 1].sender._id !== message.sender._id;

              return (
                <div 
                  key={message._id} 
                  className={`message ${isOwn ? 'own' : 'other'} ${showAvatar ? 'show-avatar' : ''}`}
                >
                  {!isOwn && showAvatar && (
                    <div className="message-avatar">
                      {message.sender.avatar ? (
                        <img src={message.sender.avatar} alt={message.sender.name} />
                      ) : (
                        <div className="avatar-placeholder">
                          {message.sender.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                  )}
                  
                  <div className="message-content">
                    {!isOwn && showAvatar && (
                      <div className="message-sender">{message.sender.name}</div>
                    )}
                    
                    {message.replyTo && (
                      <div className="message-reply-context">
                        <div className="reply-indicator">↳ Replying to</div>
                        <div className="reply-content">{message.replyTo.content}</div>
                      </div>
                    )}
                    
                    <div className="message-text">
                      {editingMessage === message._id ? (
                        <EditMessageForm 
                          initialContent={message.content}
                          onSave={(content) => handleEditMessage(message._id, content)}
                          onCancel={() => setEditingMessage(null)}
                        />
                      ) : (
                        <span>
                          {message.content}
                          {message.isEdited && <span className="edited-indicator"> (edited)</span>}
                        </span>
                      )}
                    </div>
                    
                    {message.reactions && message.reactions.length > 0 && (
                      <div className="message-reactions">
                        {renderReactions(message.reactions)}
                      </div>
                    )}
                    
                    <div className="message-actions">
                      <span className="message-time">{formatTime(message.createdAt)}</span>
                      
                      <div className="message-menu">
                        <button onClick={() => setReplyingTo(message)}>Reply</button>
                        <button onClick={() => handleReaction(message._id, '👍')}>👍</button>
                        <button onClick={() => handleReaction(message._id, '❤️')}>❤️</button>
                        <button onClick={() => handleReaction(message._id, '😂')}>😂</button>
                        
                        {isOwn && (
                          <>
                            <button onClick={() => setEditingMessage(message._id)}>Edit</button>
                            <button onClick={() => handleDeleteMessage(message._id)}>Delete</button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
        
        {typingUsers.size > 0 && (
          <div className="typing-indicator">
            {Array.from(typingUsers).join(', ')} {typingUsers.size === 1 ? 'is' : 'are'} typing...
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {replyingTo && (
        <div className="reply-context">
          <div className="reply-header">
            <span>Replying to {replyingTo.sender.name}</span>
            <button onClick={() => setReplyingTo(null)}>&times;</button>
          </div>
          <div className="reply-preview">{replyingTo.content}</div>
        </div>
      )}

      <form className="message-input-form" onSubmit={handleSendMessage}>
        <input
          type="text"
          value={newMessage}
          onChange={(e) => {
            setNewMessage(e.target.value);
            handleTyping();
          }}
          onBlur={handleStopTyping}
          placeholder={type === 'event' ? 'Type a message...' : 'Send a private message...'}
          className="message-input"
        />
        <button type="submit" disabled={!newMessage.trim()}>
          Send
        </button>
      </form>
    </div>
  );
};

const EditMessageForm = ({ initialContent, onSave, onCancel }) => {
  const [content, setContent] = useState(initialContent);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (content.trim()) {
      onSave(content.trim());
    }
  };

  return (
    <form onSubmit={handleSubmit} className="edit-message-form">
      <input
        type="text"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="edit-message-input"
        autoFocus
      />
      <div className="edit-message-actions">
        <button type="submit">Save</button>
        <button type="button" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
};

export default RealTimeMessaging;
