import React, { useState, useEffect, useContext, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import { API_BASE_URL } from '../utils/api';
import './RealTimeForum.css';

const RealTimeForum = () => {
  const { eventId } = useParams();
  const socket = useSocket();
  const [discussions, setDiscussions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('recent');
  const [searchTerm, setSearchTerm] = useState('');
  const [showNewDiscussion, setShowNewDiscussion] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isOrganizer, setIsOrganizer] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState(new Set());
  
  const [newDiscussion, setNewDiscussion] = useState({
    title: '',
    content: '',
    category: 'general',
    isPinned: false
  });

  const [selectedDiscussion, setSelectedDiscussion] = useState(null);
  const [replies, setReplies] = useState([]);
  const [newReply, setNewReply] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const [editingReply, setEditingReply] = useState(null);
  const [showReactions, setShowReactions] = useState(null);
  
  const repliesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const reactions = ['👍', '❤️', '😄', '😮', '😢', '😡'];

  useEffect(() => {
    if (socket && eventId) {
      // Join event room
      socket.emit('join-event', eventId);

      // Socket event listeners
      socket.on('forum-discussion-added', handleNewDiscussion);
      socket.on('forum-discussion-updated', handleDiscussionUpdate);
      socket.on('forum-discussion-deleted', handleDiscussionDelete);
      socket.on('forum-reply-added', handleNewReply);
      socket.on('forum-reply-updated', handleReplyUpdate);
      socket.on('forum-reply-deleted', handleReplyDelete);
      socket.on('forum-reaction-added', handleReactionUpdate);
      socket.on('forum-typing', handleTypingUpdate);
      socket.on('forum-stop-typing', handleStopTyping);
      socket.on('forum-users-online', setOnlineUsers);

      return () => {
        socket.off('forum-discussion-added');
        socket.off('forum-discussion-updated');
        socket.off('forum-discussion-deleted');
        socket.off('forum-reply-added');
        socket.off('forum-reply-updated');
        socket.off('forum-reply-deleted');
        socket.off('forum-reaction-added');
        socket.off('forum-typing');
        socket.off('forum-stop-typing');
        socket.off('forum-users-online');
        socket.emit('leave-event', eventId);
      };
    }
  }, [socket, eventId]);

  useEffect(() => {
    fetchDiscussions();
    fetchCategories();
    checkUserRole();
  }, [eventId, selectedCategory, sortBy]);

  useEffect(() => {
    scrollToBottom();
  }, [replies]);

  const scrollToBottom = () => {
    repliesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleNewDiscussion = (discussion) => {
    setDiscussions(prev => [discussion, ...prev]);
  };

  const handleDiscussionUpdate = (updatedDiscussion) => {
    setDiscussions(prev => 
      prev.map(d => d._id === updatedDiscussion._id ? updatedDiscussion : d)
    );
  };

  const handleDiscussionDelete = (discussionId) => {
    setDiscussions(prev => prev.filter(d => d._id !== discussionId));
    if (selectedDiscussion?._id === discussionId) {
      setSelectedDiscussion(null);
    }
  };

  const handleNewReply = (reply) => {
    if (selectedDiscussion && reply.discussion === selectedDiscussion._id) {
      setReplies(prev => [...prev, reply]);
    }
  };

  const handleReplyUpdate = (updatedReply) => {
    setReplies(prev => 
      prev.map(r => r._id === updatedReply._id ? updatedReply : r)
    );
  };

  const handleReplyDelete = (replyId) => {
    setReplies(prev => prev.filter(r => r._id !== replyId));
  };

  const handleReactionUpdate = ({ type, targetId, targetType, reactions }) => {
    if (targetType === 'discussion') {
      setDiscussions(prev => 
        prev.map(d => d._id === targetId ? { ...d, reactions } : d)
      );
      if (selectedDiscussion?._id === targetId) {
        setSelectedDiscussion(prev => ({ ...prev, reactions }));
      }
    } else if (targetType === 'reply') {
      setReplies(prev => 
        prev.map(r => r._id === targetId ? { ...r, reactions } : r)
      );
    }
  };

  const handleTypingUpdate = ({ userId, userName, discussionId }) => {
    if (selectedDiscussion?._id === discussionId) {
      setTypingUsers(prev => new Set([...prev, userName]));
    }
  };

  const handleStopTyping = ({ userId, userName, discussionId }) => {
    if (selectedDiscussion?._id === discussionId) {
      setTypingUsers(prev => {
        const newSet = new Set(prev);
        newSet.delete(userName);
        return newSet;
      });
    }
  };

  const fetchDiscussions = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${API_BASE_URL}/api/forum/${eventId}/discussions?category=${selectedCategory}&sort=${sortBy}&search=${searchTerm}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        setDiscussions(data.discussions || []);
      }
    } catch (error) {
      console.error('Error fetching discussions:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/forum/${eventId}/categories`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setCategories(data.categories || []);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const checkUserRole = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/events/${eventId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        const userStr = localStorage.getItem('user');
        if (userStr) {
          const user = JSON.parse(userStr);
          setIsOrganizer(data.event.organizer === user.id || user.role === 'organizer');
        }
      }
    } catch (error) {
      console.error('Error checking user role:', error);
    }
  };

  const handleCreateDiscussion = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/forum/${eventId}/discussions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newDiscussion)
      });

      if (response.ok) {
        setNewDiscussion({ title: '', content: '', category: 'general', isPinned: false });
        setShowNewDiscussion(false);
        // Discussion will be added via socket event
      }
    } catch (error) {
      console.error('Error creating discussion:', error);
    }
  };

  const openDiscussion = async (discussion) => {
    setSelectedDiscussion(discussion);
    await fetchReplies(discussion._id);
  };

  const fetchReplies = async (discussionId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/forum/discussions/${discussionId}/replies`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setReplies(data.replies || []);
      }
    } catch (error) {
      console.error('Error fetching replies:', error);
    }
  };

  const handleReplySubmit = async (e) => {
    e.preventDefault();
    if (!newReply.trim()) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/forum/discussions/${selectedDiscussion._id}/replies`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          content: newReply,
          parentReply: replyingTo?._id 
        })
      });

      if (response.ok) {
        setNewReply('');
        setReplyingTo(null);
        stopTyping();
        // Reply will be added via socket event
      }
    } catch (error) {
      console.error('Error submitting reply:', error);
    }
  };

  const handleReaction = async (targetId, targetType, reaction) => {
    try {
      const token = localStorage.getItem('token');
      await fetch(`${API_BASE_URL}/api/forum/reactions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ targetId, targetType, reaction })
      });
      // Reaction update will come via socket
    } catch (error) {
      console.error('Error adding reaction:', error);
    }
  };

  const handleTyping = () => {
    if (socket && selectedDiscussion) {
      socket.emit('forum-typing', {
        discussionId: selectedDiscussion._id,
        eventId
      });

      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        stopTyping();
      }, 3000);
    }
  };

  const stopTyping = () => {
    if (socket && selectedDiscussion) {
      socket.emit('forum-stop-typing', {
        discussionId: selectedDiscussion._id,
        eventId
      });
    }
  };

  const formatTimeAgo = (date) => {
    const now = new Date();
    const diff = now - new Date(date);
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  const filteredDiscussions = discussions.filter(discussion => {
    const matchesCategory = selectedCategory === 'all' || discussion.category === selectedCategory;
    const matchesSearch = discussion.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         discussion.content.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const sortedDiscussions = [...filteredDiscussions].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    
    switch (sortBy) {
      case 'popular':
        return (b.reactions?.length || 0) - (a.reactions?.length || 0);
      case 'oldest':
        return new Date(a.createdAt) - new Date(b.createdAt);
      default: // recent
        return new Date(b.updatedAt) - new Date(a.updatedAt);
    }
  });

  if (loading) {
    return (
      <div className="forum-loading">
        <div className="loading-spinner"></div>
        <p>Loading forum discussions...</p>
      </div>
    );
  }

  return (
    <div className="real-time-forum">
      <div className="forum-header">
        <div className="forum-title">
          <h2>Event Forum</h2>
          <div className="online-users">
            <span className="online-indicator"></span>
            <span>{onlineUsers.length} online</span>
          </div>
        </div>
        
        <div className="forum-controls">
          <div className="search-filters">
            <input
              type="text"
              placeholder="Search discussions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
            
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="category-filter"
            >
              <option value="all">All Categories</option>
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
            
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="sort-filter"
            >
              <option value="recent">Most Recent</option>
              <option value="popular">Most Popular</option>
              <option value="oldest">Oldest First</option>
            </select>
          </div>
          
          <button
            onClick={() => setShowNewDiscussion(true)}
            className="new-discussion-btn"
          >
            <span className="icon">💬</span>
            New Discussion
          </button>
        </div>
      </div>

      <div className="forum-content">
        {!selectedDiscussion ? (
          <div className="discussions-list">
            {sortedDiscussions.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">💬</div>
                <p>No discussions yet. Start the conversation!</p>
                <button
                  onClick={() => setShowNewDiscussion(true)}
                  className="start-discussion-btn"
                >
                  Create First Discussion
                </button>
              </div>
            ) : (
              <div className="discussions-grid">
                {sortedDiscussions.map(discussion => (
                  <div
                    key={discussion._id}
                    className={`discussion-card ${discussion.isPinned ? 'pinned' : ''}`}
                    onClick={() => openDiscussion(discussion)}
                  >
                    {discussion.isPinned && (
                      <div className="pin-indicator">
                        <span className="pin-icon">📌</span>
                        Pinned
                      </div>
                    )}
                    
                    <div className="discussion-header">
                      <h3 className="discussion-title">{discussion.title}</h3>
                      <span className="discussion-category">{discussion.category}</span>
                    </div>
                    
                    <div className="discussion-content">
                      <p>{discussion.content.substring(0, 150)}...</p>
                    </div>
                    
                    <div className="discussion-meta">
                      <div className="author-info">
                        <span className="author-name">{discussion.author?.name}</span>
                        <span className="discussion-time">{formatTimeAgo(discussion.createdAt)}</span>
                      </div>
                      
                      <div className="discussion-stats">
                        <span className="replies-count">
                          <span className="icon">💬</span>
                          {discussion.repliesCount || 0}
                        </span>
                        <span className="reactions-count">
                          <span className="icon">👍</span>
                          {discussion.reactions?.length || 0}
                        </span>
                      </div>
                    </div>
                    
                    {discussion.reactions && discussion.reactions.length > 0 && (
                      <div className="discussion-reactions">
                        {Object.entries(
                          discussion.reactions.reduce((acc, r) => {
                            acc[r.reaction] = (acc[r.reaction] || 0) + 1;
                            return acc;
                          }, {})
                        ).map(([reaction, count]) => (
                          <span key={reaction} className="reaction-summary">
                            {reaction} {count}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="discussion-detail">
            <div className="discussion-detail-header">
              <button
                onClick={() => setSelectedDiscussion(null)}
                className="back-btn"
              >
                ← Back to Discussions
              </button>
              
              <div className="discussion-info">
                <h3>{selectedDiscussion.title}</h3>
                <div className="discussion-meta">
                  <span className="author">By {selectedDiscussion.author?.name}</span>
                  <span className="time">{formatTimeAgo(selectedDiscussion.createdAt)}</span>
                  <span className="category">{selectedDiscussion.category}</span>
                </div>
              </div>
            </div>
            
            <div className="discussion-body">
              <div className="original-post">
                <p>{selectedDiscussion.content}</p>
                
                <div className="post-actions">
                  <button
                    onClick={() => setShowReactions(showReactions === 'discussion' ? null : 'discussion')}
                    className="reaction-btn"
                  >
                    <span className="icon">😊</span>
                    React
                  </button>
                  
                  {showReactions === 'discussion' && (
                    <div className="reactions-picker">
                      {reactions.map(reaction => (
                        <button
                          key={reaction}
                          onClick={() => {
                            handleReaction(selectedDiscussion._id, 'discussion', reaction);
                            setShowReactions(null);
                          }}
                          className="reaction-option"
                        >
                          {reaction}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                
                {selectedDiscussion.reactions && selectedDiscussion.reactions.length > 0 && (
                  <div className="post-reactions">
                    {Object.entries(
                      selectedDiscussion.reactions.reduce((acc, r) => {
                        acc[r.reaction] = (acc[r.reaction] || 0) + 1;
                        return acc;
                      }, {})
                    ).map(([reaction, count]) => (
                      <span key={reaction} className="reaction-count">
                        {reaction} {count}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="replies-section">
                <h4>Replies ({replies.length})</h4>
                
                <div className="replies-list">
                  {replies.map(reply => (
                    <div key={reply._id} className="reply-item">
                      <div className="reply-header">
                        <span className="reply-author">{reply.author?.name}</span>
                        <span className="reply-time">{formatTimeAgo(reply.createdAt)}</span>
                      </div>
                      
                      <div className="reply-content">
                        {reply.parentReply && (
                          <div className="reply-reference">
                            Replying to previous message
                          </div>
                        )}
                        <p>{reply.content}</p>
                      </div>
                      
                      <div className="reply-actions">
                        <button
                          onClick={() => setReplyingTo(reply)}
                          className="reply-btn"
                        >
                          Reply
                        </button>
                        <button
                          onClick={() => setShowReactions(showReactions === reply._id ? null : reply._id)}
                          className="reaction-btn"
                        >
                          😊 React
                        </button>
                        
                        {showReactions === reply._id && (
                          <div className="reactions-picker">
                            {reactions.map(reaction => (
                              <button
                                key={reaction}
                                onClick={() => {
                                  handleReaction(reply._id, 'reply', reaction);
                                  setShowReactions(null);
                                }}
                                className="reaction-option"
                              >
                                {reaction}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      
                      {reply.reactions && reply.reactions.length > 0 && (
                        <div className="reply-reactions">
                          {Object.entries(
                            reply.reactions.reduce((acc, r) => {
                              acc[r.reaction] = (acc[r.reaction] || 0) + 1;
                              return acc;
                            }, {})
                          ).map(([reaction, count]) => (
                            <span key={reaction} className="reaction-count">
                              {reaction} {count}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                  <div ref={repliesEndRef} />
                </div>
                
                {typingUsers.size > 0 && (
                  <div className="typing-indicator">
                    {Array.from(typingUsers).join(', ')} {typingUsers.size === 1 ? 'is' : 'are'} typing...
                  </div>
                )}
                
                <form onSubmit={handleReplySubmit} className="reply-form">
                  {replyingTo && (
                    <div className="replying-to">
                      <span>Replying to {replyingTo.author?.name}</span>
                      <button
                        type="button"
                        onClick={() => setReplyingTo(null)}
                        className="cancel-reply"
                      >
                        ×
                      </button>
                    </div>
                  )}
                  
                  <div className="reply-input-container">
                    <textarea
                      value={newReply}
                      onChange={(e) => {
                        setNewReply(e.target.value);
                        handleTyping();
                      }}
                      placeholder="Write your reply..."
                      className="reply-input"
                      rows={3}
                    />
                    <button type="submit" className="send-reply-btn" disabled={!newReply.trim()}>
                      Send
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>

      {showNewDiscussion && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Create New Discussion</h3>
              <button
                onClick={() => setShowNewDiscussion(false)}
                className="close-modal"
              >
                ×
              </button>
            </div>
            
            <form onSubmit={handleCreateDiscussion} className="discussion-form">
              <div className="form-group">
                <label>Title</label>
                <input
                  type="text"
                  value={newDiscussion.title}
                  onChange={(e) => setNewDiscussion({...newDiscussion, title: e.target.value})}
                  placeholder="Enter discussion title..."
                  required
                />
              </div>
              
              <div className="form-group">
                <label>Category</label>
                <select
                  value={newDiscussion.category}
                  onChange={(e) => setNewDiscussion({...newDiscussion, category: e.target.value})}
                >
                  <option value="general">General</option>
                  <option value="technical">Technical</option>
                  <option value="networking">Networking</option>
                  <option value="feedback">Feedback</option>
                  <option value="announcements">Announcements</option>
                </select>
              </div>
              
              <div className="form-group">
                <label>Content</label>
                <textarea
                  value={newDiscussion.content}
                  onChange={(e) => setNewDiscussion({...newDiscussion, content: e.target.value})}
                  placeholder="Share your thoughts..."
                  rows={6}
                  required
                />
              </div>
              
              {isOrganizer && (
                <div className="form-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={newDiscussion.isPinned}
                      onChange={(e) => setNewDiscussion({...newDiscussion, isPinned: e.target.checked})}
                    />
                    Pin this discussion (organizer only)
                  </label>
                </div>
              )}
              
              <div className="form-actions">
                <button type="button" onClick={() => setShowNewDiscussion(false)} className="cancel-btn">
                  Cancel
                </button>
                <button type="submit" className="create-btn">
                  Create Discussion
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default RealTimeForum;
