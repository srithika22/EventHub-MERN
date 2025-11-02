import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { API_BASE_URL } from '../utils/api';
import './EventForum.css';

const EventForum = () => {
  const { eventId } = useParams();
  const [discussions, setDiscussions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('recent');
  const [searchTerm, setSearchTerm] = useState('');
  const [showNewDiscussion, setShowNewDiscussion] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isOrganizer, setIsOrganizer] = useState(false);
  
  const [newDiscussion, setNewDiscussion] = useState({
    title: '',
    content: '',
    category: 'general',
    isPinned: false
  });

  const [selectedDiscussion, setSelectedDiscussion] = useState(null);
  const [newReply, setNewReply] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);

  useEffect(() => {
    fetchDiscussions();
    fetchCategories();
    checkUserRole();
  }, [eventId, selectedCategory, sortBy]);

  const fetchDiscussions = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/forum/${eventId}/discussions?category=${selectedCategory}&sort=${sortBy}&search=${searchTerm}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

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
        const data = await response.json();
        setDiscussions(prev => [data.discussion, ...prev]);
        setNewDiscussion({ title: '', content: '', category: 'general', isPinned: false });
        setShowNewDiscussion(false);
      }
    } catch (error) {
      console.error('Error creating discussion:', error);
    }
  };

  const handleReply = async (discussionId, parentId = null) => {
    if (!newReply.trim()) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/forum/${eventId}/discussions/${discussionId}/replies`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          content: newReply,
          parentId
        })
      });

      if (response.ok) {
        const data = await response.json();
        // Update the selected discussion with new reply
        setSelectedDiscussion(prev => ({
          ...prev,
          replies: [...(prev.replies || []), data.reply]
        }));
        setNewReply('');
        setReplyingTo(null);
      }
    } catch (error) {
      console.error('Error posting reply:', error);
    }
  };

  const handleLikeDiscussion = async (discussionId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/forum/${eventId}/discussions/${discussionId}/like`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        fetchDiscussions(); // Refresh discussions
      }
    } catch (error) {
      console.error('Error liking discussion:', error);
    }
  };

  const handlePinDiscussion = async (discussionId) => {
    if (!isOrganizer) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/forum/${eventId}/discussions/${discussionId}/pin`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        fetchDiscussions();
      }
    } catch (error) {
      console.error('Error pinning discussion:', error);
    }
  };

  const formatTimeAgo = (date) => {
    const now = new Date();
    const postDate = new Date(date);
    const diffInMinutes = Math.floor((now - postDate) / (1000 * 60));

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes} minutes ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)} hours ago`;
    return `${Math.floor(diffInMinutes / 1440)} days ago`;
  };

  const getCategoryColor = (category) => {
    const colors = {
      general: '#667eea',
      announcements: '#f093fb',
      networking: '#4facfe',
      feedback: '#43e97b',
      technical: '#fa709a',
      social: '#ffecd2'
    };
    return colors[category] || '#667eea';
  };

  const filteredDiscussions = discussions.filter(discussion =>
    discussion.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    discussion.content.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div className="forum-loading">Loading forum discussions...</div>;
  }

  return (
    <div className="event-forum-container">
      <div className="forum-header">
        <div className="forum-title-section">
          <h2>Event Forum</h2>
          <p>Connect with fellow attendees and share thoughts about the event</p>
        </div>
        
        <div className="forum-controls">
          <div className="search-sort-controls">
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
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="sort-filter"
            >
              <option value="recent">Most Recent</option>
              <option value="popular">Most Popular</option>
              <option value="replies">Most Replied</option>
            </select>
          </div>

          <button
            className="new-discussion-btn"
            onClick={() => setShowNewDiscussion(true)}
          >
            + New Discussion
          </button>
        </div>
      </div>

      {showNewDiscussion && (
        <div className="new-discussion-modal">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Start New Discussion</h3>
              <button 
                className="close-btn"
                onClick={() => setShowNewDiscussion(false)}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCreateDiscussion} className="new-discussion-form">
              <input
                type="text"
                placeholder="Discussion title..."
                value={newDiscussion.title}
                onChange={(e) => setNewDiscussion(prev => ({ ...prev, title: e.target.value }))}
                required
                className="title-input"
              />

              <select
                value={newDiscussion.category}
                onChange={(e) => setNewDiscussion(prev => ({ ...prev, category: e.target.value }))}
                className="category-select"
              >
                {categories.map(category => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>

              <textarea
                placeholder="Share your thoughts..."
                value={newDiscussion.content}
                onChange={(e) => setNewDiscussion(prev => ({ ...prev, content: e.target.value }))}
                required
                rows="4"
                className="content-textarea"
              />

              {isOrganizer && (
                <label className="pin-checkbox">
                  <input
                    type="checkbox"
                    checked={newDiscussion.isPinned}
                    onChange={(e) => setNewDiscussion(prev => ({ ...prev, isPinned: e.target.checked }))}
                  />
                  Pin this discussion
                </label>
              )}

              <div className="form-actions">
                <button type="submit" className="submit-btn">
                  Create Discussion
                </button>
                <button 
                  type="button" 
                  className="cancel-btn"
                  onClick={() => setShowNewDiscussion(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="discussions-list">
        {filteredDiscussions.length === 0 ? (
          <div className="no-discussions">
            <h3>No discussions yet</h3>
            <p>Be the first to start a conversation about this event!</p>
          </div>
        ) : (
          filteredDiscussions.map(discussion => (
            <div key={discussion._id} className={`discussion-card ${discussion.isPinned ? 'pinned' : ''}`}>
              <div className="discussion-main">
                <div className="discussion-meta">
                  {discussion.isPinned && (
                    <span className="pinned-badge">📌 Pinned</span>
                  )}
                  <span 
                    className="category-badge"
                    style={{ backgroundColor: getCategoryColor(discussion.category) }}
                  >
                    {discussion.categoryName}
                  </span>
                </div>

                <h3 
                  className="discussion-title"
                  onClick={() => setSelectedDiscussion(discussion)}
                >
                  {discussion.title}
                </h3>

                <p className="discussion-content">
                  {discussion.content.length > 200 
                    ? `${discussion.content.substring(0, 200)}...` 
                    : discussion.content
                  }
                </p>

                <div className="discussion-footer">
                  <div className="discussion-stats">
                    <span className="author">By {discussion.author.name}</span>
                    <span className="timestamp">{formatTimeAgo(discussion.createdAt)}</span>
                    <span className="replies-count">{discussion.repliesCount || 0} replies</span>
                    <span className="likes-count">{discussion.likesCount || 0} likes</span>
                  </div>

                  <div className="discussion-actions">
                    <button
                      className="like-btn"
                      onClick={() => handleLikeDiscussion(discussion._id)}
                    >
                      👍 Like
                    </button>
                    <button
                      className="reply-btn"
                      onClick={() => setSelectedDiscussion(discussion)}
                    >
                      💬 Reply
                    </button>
                    {isOrganizer && (
                      <button
                        className="pin-btn"
                        onClick={() => handlePinDiscussion(discussion._id)}
                      >
                        📌 {discussion.isPinned ? 'Unpin' : 'Pin'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {selectedDiscussion && (
        <div className="discussion-detail-modal">
          <div className="modal-content discussion-detail">
            <div className="modal-header">
              <h3>{selectedDiscussion.title}</h3>
              <button 
                className="close-btn"
                onClick={() => setSelectedDiscussion(null)}
              >
                ×
              </button>
            </div>

            <div className="discussion-detail-content">
              <div className="original-post">
                <div className="post-meta">
                  <span className="author-name">{selectedDiscussion.author.name}</span>
                  <span className="post-time">{formatTimeAgo(selectedDiscussion.createdAt)}</span>
                </div>
                <div className="post-content">
                  {selectedDiscussion.content}
                </div>
              </div>

              <div className="replies-section">
                <h4>Replies ({selectedDiscussion.repliesCount || 0})</h4>
                
                <div className="new-reply-form">
                  <textarea
                    placeholder="Write a reply..."
                    value={newReply}
                    onChange={(e) => setNewReply(e.target.value)}
                    rows="3"
                    className="reply-textarea"
                  />
                  <button
                    className="reply-submit-btn"
                    onClick={() => handleReply(selectedDiscussion._id)}
                  >
                    Post Reply
                  </button>
                </div>

                <div className="replies-list">
                  {(selectedDiscussion.replies || []).map(reply => (
                    <div key={reply._id} className="reply-item">
                      <div className="reply-meta">
                        <span className="reply-author">{reply.author.name}</span>
                        <span className="reply-time">{formatTimeAgo(reply.createdAt)}</span>
                      </div>
                      <div className="reply-content">
                        {reply.content}
                      </div>
                      <button
                        className="reply-to-reply-btn"
                        onClick={() => setReplyingTo(reply._id)}
                      >
                        Reply
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EventForum;