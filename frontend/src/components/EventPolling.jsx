import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { API_BASE_URL } from '../utils/api';
import './EventPolling.css';

const EventPolling = () => {
  const { eventId } = useParams();
  const [polls, setPolls] = useState([]);
  const [activePolls, setActivePolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isOrganizer, setIsOrganizer] = useState(false);
  const [showCreatePoll, setShowCreatePoll] = useState(false);
  const [selectedPoll, setSelectedPoll] = useState(null);
  const [showResults, setShowResults] = useState(false);
  
  const [newPoll, setNewPoll] = useState({
    question: '',
    type: 'multiple_choice',
    options: ['', ''],
    allowMultiple: false,
    isAnonymous: true,
    timeLimit: 0, // 0 means no time limit
    description: ''
  });

  const [userResponses, setUserResponses] = useState({});

  useEffect(() => {
    fetchPolls();
    checkUserRole();
    
    // Set up polling for real-time updates
    const interval = setInterval(fetchActivePolls, 3000);
    return () => clearInterval(interval);
  }, [eventId]);

  const fetchPolls = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/polling/${eventId}/polls`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setPolls(data.polls || []);
        setActivePolls(data.polls.filter(poll => poll.isActive) || []);
      }
    } catch (error) {
      console.error('Error fetching polls:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchActivePolls = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/polling/${eventId}/active`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setActivePolls(data.polls || []);
      }
    } catch (error) {
      console.error('Error fetching active polls:', error);
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

  const handleCreatePoll = async (e) => {
    e.preventDefault();
    
    // Validate poll data
    if (!newPoll.question || newPoll.options.filter(opt => opt.trim()).length < 2) {
      alert('Please provide a question and at least 2 options');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/polling/${eventId}/polls`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...newPoll,
          options: newPoll.options.filter(opt => opt.trim())
        })
      });

      if (response.ok) {
        const data = await response.json();
        setPolls(prev => [data.poll, ...prev]);
        setNewPoll({
          question: '',
          type: 'multiple_choice',
          options: ['', ''],
          allowMultiple: false,
          isAnonymous: true,
          timeLimit: 0,
          description: ''
        });
        setShowCreatePoll(false);
      }
    } catch (error) {
      console.error('Error creating poll:', error);
    }
  };

  const handleVote = async (pollId, selectedOptions) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/polling/${eventId}/polls/${pollId}/vote`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          selectedOptions: Array.isArray(selectedOptions) ? selectedOptions : [selectedOptions]
        })
      });

      if (response.ok) {
        const data = await response.json();
        setUserResponses(prev => ({
          ...prev,
          [pollId]: selectedOptions
        }));
        
        // Update local poll data with new results
        setActivePolls(prev => prev.map(poll => 
          poll._id === pollId ? { ...poll, ...data.poll } : poll
        ));
        setPolls(prev => prev.map(poll => 
          poll._id === pollId ? { ...poll, ...data.poll } : poll
        ));
      }
    } catch (error) {
      console.error('Error voting:', error);
    }
  };

  const handleTogglePoll = async (pollId, activate) => {
    if (!isOrganizer) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/polling/${eventId}/polls/${pollId}/${activate ? 'activate' : 'deactivate'}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        fetchPolls();
        fetchActivePolls();
      }
    } catch (error) {
      console.error('Error toggling poll:', error);
    }
  };

  const addOption = () => {
    setNewPoll(prev => ({
      ...prev,
      options: [...prev.options, '']
    }));
  };

  const removeOption = (index) => {
    if (newPoll.options.length > 2) {
      setNewPoll(prev => ({
        ...prev,
        options: prev.options.filter((_, i) => i !== index)
      }));
    }
  };

  const updateOption = (index, value) => {
    setNewPoll(prev => ({
      ...prev,
      options: prev.options.map((opt, i) => i === index ? value : opt)
    }));
  };

  const calculatePercentage = (votes, total) => {
    if (total === 0) return 0;
    return Math.round((votes / total) * 100);
  };

  const formatTimeRemaining = (endTime) => {
    if (!endTime) return 'No time limit';
    
    const now = new Date();
    const end = new Date(endTime);
    const diff = end - now;
    
    if (diff <= 0) return 'Time expired';
    
    const minutes = Math.floor(diff / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    return `${minutes}:${seconds.toString().padStart(2, '0')} remaining`;
  };

  if (loading) {
    return <div className="polling-loading">Loading polls...</div>;
  }

  return (
    <div className="event-polling-container">
      <div className="polling-header">
        <div className="polling-title-section">
          <h2>Live Polls</h2>
          <p>Participate in real-time polls and see instant results</p>
        </div>
        
        {isOrganizer && (
          <div className="organizer-controls">
            <button
              className="create-poll-btn"
              onClick={() => setShowCreatePoll(true)}
            >
              + Create Poll
            </button>
            <button
              className="show-results-btn"
              onClick={() => setShowResults(!showResults)}
            >
              {showResults ? 'Hide Results' : 'Show Analytics'}
            </button>
          </div>
        )}
      </div>

      {/* Active Polls Section */}
      {activePolls.length > 0 && (
        <div className="active-polls-section">
          <h3>🔴 Live Polls</h3>
          <div className="active-polls-grid">
            {activePolls.map(poll => (
              <div key={poll._id} className="active-poll-card">
                <div className="poll-header">
                  <h4>{poll.question}</h4>
                  {poll.description && (
                    <p className="poll-description">{poll.description}</p>
                  )}
                  <div className="poll-meta">
                    <span className="poll-type">{poll.type.replace('_', ' ')}</span>
                    <span className="time-remaining">
                      {formatTimeRemaining(poll.endTime)}
                    </span>
                  </div>
                </div>

                <div className="poll-content">
                  {poll.type === 'multiple_choice' || poll.type === 'single_choice' ? (
                    <div className="poll-options">
                      {poll.options.map((option, index) => {
                        const votes = poll.results?.find(r => r.optionIndex === index)?.votes || 0;
                        const percentage = calculatePercentage(votes, poll.totalVotes || 0);
                        const isSelected = userResponses[poll._id]?.includes(index);
                        
                        return (
                          <div key={index} className="poll-option">
                            <button
                              className={`option-btn ${isSelected ? 'selected' : ''}`}
                              onClick={() => {
                                if (poll.allowMultiple) {
                                  const current = userResponses[poll._id] || [];
                                  const updated = current.includes(index)
                                    ? current.filter(i => i !== index)
                                    : [...current, index];
                                  handleVote(poll._id, updated);
                                } else {
                                  handleVote(poll._id, [index]);
                                }
                              }}
                              disabled={userResponses[poll._id] && !poll.allowMultiple && !isSelected}
                            >
                              <span className="option-text">{option}</span>
                              <div className="option-stats">
                                <div 
                                  className="progress-bar"
                                  style={{ width: `${percentage}%` }}
                                />
                                <span className="vote-count">{votes} votes ({percentage}%)</span>
                              </div>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  ) : poll.type === 'rating' ? (
                    <div className="rating-poll">
                      <div className="rating-options">
                        {[1, 2, 3, 4, 5].map(rating => {
                          const votes = poll.results?.find(r => r.rating === rating)?.votes || 0;
                          const percentage = calculatePercentage(votes, poll.totalVotes || 0);
                          const isSelected = userResponses[poll._id] === rating;
                          
                          return (
                            <button
                              key={rating}
                              className={`rating-btn ${isSelected ? 'selected' : ''}`}
                              onClick={() => handleVote(poll._id, rating)}
                            >
                              <span className="rating-number">{rating}</span>
                              <div className="rating-stats">
                                <div 
                                  className="progress-bar"
                                  style={{ width: `${percentage}%` }}
                                />
                                <span className="vote-count">{votes} ({percentage}%)</span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                      <div className="rating-labels">
                        <span>Poor</span>
                        <span>Excellent</span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-poll">
                      <textarea
                        placeholder="Share your thoughts..."
                        rows="3"
                        className="text-response"
                        onBlur={(e) => {
                          if (e.target.value.trim()) {
                            handleVote(poll._id, e.target.value);
                          }
                        }}
                      />
                    </div>
                  )}
                </div>

                <div className="poll-footer">
                  <span className="total-votes">
                    {poll.totalVotes || 0} total votes
                  </span>
                  {isOrganizer && (
                    <button
                      className="deactivate-btn"
                      onClick={() => handleTogglePoll(poll._id, false)}
                    >
                      End Poll
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All Polls Section */}
      <div className="all-polls-section">
        <h3>All Polls</h3>
        <div className="polls-grid">
          {polls.map(poll => (
            <div key={poll._id} className={`poll-card ${poll.isActive ? 'active' : 'inactive'}`}>
              <div className="poll-card-header">
                <h4>{poll.question}</h4>
                <div className="poll-status">
                  <span className={`status-badge ${poll.isActive ? 'active' : 'ended'}`}>
                    {poll.isActive ? 'Live' : 'Ended'}
                  </span>
                </div>
              </div>

              <div className="poll-summary">
                <div className="summary-stats">
                  <span>{poll.totalVotes || 0} votes</span>
                  <span>{poll.type.replace('_', ' ')}</span>
                  <span>Created {new Date(poll.createdAt).toLocaleDateString()}</span>
                </div>
              </div>

              {isOrganizer && (
                <div className="poll-actions">
                  <button
                    className="view-details-btn"
                    onClick={() => setSelectedPoll(poll)}
                  >
                    View Details
                  </button>
                  <button
                    className={`toggle-btn ${poll.isActive ? 'deactivate' : 'activate'}`}
                    onClick={() => handleTogglePoll(poll._id, !poll.isActive)}
                  >
                    {poll.isActive ? 'End Poll' : 'Activate'}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Create Poll Modal */}
      {showCreatePoll && (
        <div className="poll-modal">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Create New Poll</h3>
              <button 
                className="close-btn"
                onClick={() => setShowCreatePoll(false)}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCreatePoll} className="create-poll-form">
              <input
                type="text"
                placeholder="Poll question..."
                value={newPoll.question}
                onChange={(e) => setNewPoll(prev => ({ ...prev, question: e.target.value }))}
                required
                className="question-input"
              />

              <textarea
                placeholder="Description (optional)..."
                value={newPoll.description}
                onChange={(e) => setNewPoll(prev => ({ ...prev, description: e.target.value }))}
                rows="2"
                className="description-input"
              />

              <select
                value={newPoll.type}
                onChange={(e) => setNewPoll(prev => ({ ...prev, type: e.target.value }))}
                className="type-select"
              >
                <option value="single_choice">Single Choice</option>
                <option value="multiple_choice">Multiple Choice</option>
                <option value="rating">Rating Scale (1-5)</option>
                <option value="text">Text Response</option>
              </select>

              {(newPoll.type === 'single_choice' || newPoll.type === 'multiple_choice') && (
                <div className="options-section">
                  <label>Options:</label>
                  {newPoll.options.map((option, index) => (
                    <div key={index} className="option-input-group">
                      <input
                        type="text"
                        placeholder={`Option ${index + 1}`}
                        value={option}
                        onChange={(e) => updateOption(index, e.target.value)}
                        className="option-input"
                      />
                      {newPoll.options.length > 2 && (
                        <button
                          type="button"
                          onClick={() => removeOption(index)}
                          className="remove-option-btn"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addOption}
                    className="add-option-btn"
                  >
                    + Add Option
                  </button>
                </div>
              )}

              <div className="poll-settings">
                {newPoll.type === 'multiple_choice' && (
                  <label className="setting-checkbox">
                    <input
                      type="checkbox"
                      checked={newPoll.allowMultiple}
                      onChange={(e) => setNewPoll(prev => ({ ...prev, allowMultiple: e.target.checked }))}
                    />
                    Allow multiple selections
                  </label>
                )}

                <label className="setting-checkbox">
                  <input
                    type="checkbox"
                    checked={newPoll.isAnonymous}
                    onChange={(e) => setNewPoll(prev => ({ ...prev, isAnonymous: e.target.checked }))}
                  />
                  Anonymous voting
                </label>

                <div className="time-limit-setting">
                  <label>Time limit (minutes, 0 = no limit):</label>
                  <input
                    type="number"
                    min="0"
                    max="60"
                    value={newPoll.timeLimit}
                    onChange={(e) => setNewPoll(prev => ({ ...prev, timeLimit: parseInt(e.target.value) }))}
                    className="time-input"
                  />
                </div>
              </div>

              <div className="form-actions">
                <button type="submit" className="create-btn">
                  Create Poll
                </button>
                <button 
                  type="button" 
                  className="cancel-btn"
                  onClick={() => setShowCreatePoll(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Poll Details Modal */}
      {selectedPoll && (
        <div className="poll-modal">
          <div className="modal-content poll-details">
            <div className="modal-header">
              <h3>Poll Analytics</h3>
              <button 
                className="close-btn"
                onClick={() => setSelectedPoll(null)}
              >
                ×
              </button>
            </div>

            <div className="poll-analytics">
              <div className="analytics-summary">
                <h4>{selectedPoll.question}</h4>
                <div className="summary-grid">
                  <div className="stat-card">
                    <div className="stat-number">{selectedPoll.totalVotes || 0}</div>
                    <div className="stat-label">Total Votes</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-number">{selectedPoll.uniqueVoters || 0}</div>
                    <div className="stat-label">Unique Voters</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-number">
                      {selectedPoll.isActive ? 'Live' : 'Ended'}
                    </div>
                    <div className="stat-label">Status</div>
                  </div>
                </div>
              </div>

              <div className="detailed-results">
                <h5>Detailed Results</h5>
                {selectedPoll.type === 'rating' ? (
                  <div className="rating-analytics">
                    {[1, 2, 3, 4, 5].map(rating => {
                      const result = selectedPoll.results?.find(r => r.rating === rating);
                      const votes = result?.votes || 0;
                      const percentage = calculatePercentage(votes, selectedPoll.totalVotes || 0);
                      
                      return (
                        <div key={rating} className="rating-result">
                          <span className="rating-label">{rating} Star</span>
                          <div className="result-bar">
                            <div 
                              className="result-fill"
                              style={{ width: `${percentage}%` }}
                            />
                            <span className="result-text">{votes} votes ({percentage}%)</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="option-analytics">
                    {selectedPoll.options?.map((option, index) => {
                      const result = selectedPoll.results?.find(r => r.optionIndex === index);
                      const votes = result?.votes || 0;
                      const percentage = calculatePercentage(votes, selectedPoll.totalVotes || 0);
                      
                      return (
                        <div key={index} className="option-result">
                          <span className="option-label">{option}</span>
                          <div className="result-bar">
                            <div 
                              className="result-fill"
                              style={{ width: `${percentage}%` }}
                            />
                            <span className="result-text">{votes} votes ({percentage}%)</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {polls.length === 0 && (
        <div className="no-polls">
          <h3>No polls yet</h3>
          <p>
            {isOrganizer 
              ? 'Create your first poll to engage with attendees!' 
              : 'The organizer hasn\'t created any polls yet.'
            }
          </p>
        </div>
      )}
    </div>
  );
};

export default EventPolling;
