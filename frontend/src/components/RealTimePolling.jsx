import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import './RealTimePolling.css';

const RealTimePolling = () => {
  const { eventId } = useParams();
  const { user } = useAuth();
  const { socket, joinEvent, emitPollCreated, emitPollVote } = useSocket();
  
  const [polls, setPolls] = useState([]);
  const [activePolls, setActivePolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isOrganizer, setIsOrganizer] = useState(false);
  const [showCreatePoll, setShowCreatePoll] = useState(false);
  const [selectedPoll, setSelectedPoll] = useState(null);
  const [showResults, setShowResults] = useState(false);
  const [activeTab, setActiveTab] = useState('active'); // active, completed, all, analytics
  
  const [newPoll, setNewPoll] = useState({
    question: '',
    type: 'multiple_choice',
    options: ['', ''],
    allowMultiple: false,
    isAnonymous: true,
    timeLimit: 0,
    description: '',
    isActive: true
  });

  const [userResponses, setUserResponses] = useState({});
  const [pollAnalytics, setPollAnalytics] = useState({});

  useEffect(() => {
    if (socket && eventId) {
      joinEvent(eventId);
      
      // Socket event listeners for real-time updates
      socket.on('poll-created', handlePollCreated);
      socket.on('poll-updated', handlePollUpdated);
      socket.on('poll-ended', handlePollEnded);
      socket.on('poll-results', handlePollResults);

      return () => {
        socket.off('poll-created', handlePollCreated);
        socket.off('poll-updated', handlePollUpdated);
        socket.off('poll-ended', handlePollEnded);
        socket.off('poll-results', handlePollResults);
      };
    }
  }, [socket, eventId]);

  useEffect(() => {
    fetchPolls();
    checkUserRole();
    fetchUserResponses();
  }, [eventId]);

  const handlePollCreated = (poll) => {
    setPolls(prev => [poll, ...prev]);
    if (poll.isActive) {
      setActivePolls(prev => [poll, ...prev]);
    }
    // Show notification
    showNotification(`New poll: ${poll.question}`, 'info');
  };

  const handlePollUpdated = ({ pollId, results }) => {
    setPolls(prev => prev.map(poll => 
      poll._id === pollId ? { ...poll, responses: results } : poll
    ));
    setActivePolls(prev => prev.map(poll => 
      poll._id === pollId ? { ...poll, responses: results } : poll
    ));
  };

  const handlePollEnded = (pollId) => {
    setActivePolls(prev => prev.filter(poll => poll._id !== pollId));
    setPolls(prev => prev.map(poll => 
      poll._id === pollId ? { ...poll, isActive: false } : poll
    ));
    showNotification('A poll has ended', 'warning');
  };

  const handlePollResults = ({ pollId, results }) => {
    setPollAnalytics(prev => ({
      ...prev,
      [pollId]: results
    }));
  };

  const fetchPolls = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:3001/api/polling/${eventId}/polls`, {
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

  const fetchUserResponses = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:3001/api/polling/${eventId}/my-responses`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        const responsesMap = {};
        data.responses.forEach(response => {
          responsesMap[response.poll] = response;
        });
        setUserResponses(responsesMap);
      }
    } catch (error) {
      console.error('Error fetching user responses:', error);
    }
  };

  const checkUserRole = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:3001/api/events/${eventId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setIsOrganizer(data.event.organizer === user.id || user.role === 'organizer');
      }
    } catch (error) {
      console.error('Error checking user role:', error);
    }
  };

  const handleCreatePoll = async (e) => {
    e.preventDefault();
    
    if (!newPoll.question || newPoll.options.filter(opt => opt.trim()).length < 2) {
      showNotification('Please provide a question and at least 2 options', 'error');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:3001/api/polling/${eventId}/polls`, {
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
        
        // Emit real-time event
        emitPollCreated(eventId, data.poll);
        
        setNewPoll({
          question: '',
          type: 'multiple_choice',
          options: ['', ''],
          allowMultiple: false,
          isAnonymous: true,
          timeLimit: 0,
          description: '',
          isActive: true
        });
        setShowCreatePoll(false);
        showNotification('Poll created successfully!', 'success');
      }
    } catch (error) {
      console.error('Error creating poll:', error);
      showNotification('Error creating poll', 'error');
    }
  };

  const handleVote = async (pollId, selectedOptions) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:3001/api/polling/${eventId}/polls/${pollId}/vote`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ selectedOptions })
      });

      if (response.ok) {
        const data = await response.json();
        
        // Update local state
        setUserResponses(prev => ({
          ...prev,
          [pollId]: data.response
        }));

        // Emit real-time vote update
        emitPollVote(eventId, pollId, data.results);
        
        showNotification('Vote submitted successfully!', 'success');
      }
    } catch (error) {
      console.error('Error voting:', error);
      showNotification('Error submitting vote', 'error');
    }
  };

  const handleEndPoll = async (pollId) => {
    if (!window.confirm('Are you sure you want to end this poll?')) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:3001/api/polling/${eventId}/polls/${pollId}/end`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        // Real-time update will be handled by socket event
        showNotification('Poll ended successfully!', 'success');
      }
    } catch (error) {
      console.error('Error ending poll:', error);
      showNotification('Error ending poll', 'error');
    }
  };

  const showNotification = (message, type) => {
    // Simple notification system - can be enhanced with a proper toast library
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      document.body.removeChild(notification);
    }, 3000);
  };

  const addOption = () => {
    setNewPoll(prev => ({
      ...prev,
      options: [...prev.options, '']
    }));
  };

  const updateOption = (index, value) => {
    setNewPoll(prev => ({
      ...prev,
      options: prev.options.map((opt, i) => i === index ? value : opt)
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

  const getFilteredPolls = () => {
    switch (activeTab) {
      case 'active':
        return polls.filter(poll => poll.isActive);
      case 'completed':
        return polls.filter(poll => !poll.isActive);
      case 'all':
        return polls;
      default:
        return polls.filter(poll => poll.isActive);
    }
  };

  const calculatePollResults = (poll) => {
    if (!poll.responses || poll.responses.length === 0) {
      return poll.options.map(() => ({ count: 0, percentage: 0 }));
    }

    const totalVotes = poll.responses.length;
    const optionCounts = poll.options.map(() => 0);

    poll.responses.forEach(response => {
      response.selectedOptions.forEach(optionIndex => {
        if (optionIndex < optionCounts.length) {
          optionCounts[optionIndex]++;
        }
      });
    });

    return optionCounts.map(count => ({
      count,
      percentage: totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0
    }));
  };

  if (loading) {
    return (
      <div className="polling-loading">
        <div className="spinner"></div>
        <p>Loading polls...</p>
      </div>
    );
  }

  return (
    <div className="real-time-polling">
      <div className="polling-header">
        <h1>Real-Time Polling</h1>
        <div className="header-actions">
          {isOrganizer && (
            <button 
              className="create-poll-btn"
              onClick={() => setShowCreatePoll(true)}
            >
              ➕ Create Poll
            </button>
          )}
        </div>
      </div>

      <div className="polling-tabs">
        <button 
          className={`tab ${activeTab === 'active' ? 'active' : ''}`}
          onClick={() => setActiveTab('active')}
        >
          Active Polls ({activePolls.length})
        </button>
        <button 
          className={`tab ${activeTab === 'completed' ? 'active' : ''}`}
          onClick={() => setActiveTab('completed')}
        >
          Completed Polls
        </button>
        <button 
          className={`tab ${activeTab === 'all' ? 'active' : ''}`}
          onClick={() => setActiveTab('all')}
        >
          All Polls ({polls.length})
        </button>
        {isOrganizer && (
          <button 
            className={`tab ${activeTab === 'analytics' ? 'active' : ''}`}
            onClick={() => setActiveTab('analytics')}
          >
            Analytics
          </button>
        )}
      </div>

      <div className="polls-container">
        {activeTab === 'analytics' && isOrganizer ? (
          <PollAnalytics polls={polls} analytics={pollAnalytics} />
        ) : (
          <div className="polls-grid">
            {getFilteredPolls().map((poll) => (
              <PollCard
                key={poll._id}
                poll={poll}
                userResponse={userResponses[poll._id]}
                onVote={handleVote}
                onEndPoll={isOrganizer ? handleEndPoll : null}
                showResults={showResults || !poll.isActive}
                isOrganizer={isOrganizer}
                calculateResults={calculatePollResults}
              />
            ))}
          </div>
        )}

        {getFilteredPolls().length === 0 && (
          <div className="no-polls">
            <h3>No polls available</h3>
            <p>
              {activeTab === 'active' 
                ? 'There are no active polls at the moment.'
                : 'No polls have been created yet.'
              }
            </p>
          </div>
        )}
      </div>

      {/* Create Poll Modal */}
      {showCreatePoll && (
        <div className="modal-overlay" onClick={() => setShowCreatePoll(false)}>
          <div className="poll-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Create New Poll</h2>
              <button onClick={() => setShowCreatePoll(false)}>&times;</button>
            </div>
            
            <form onSubmit={handleCreatePoll} className="poll-form">
              <div className="form-group">
                <label>Question *</label>
                <input
                  type="text"
                  value={newPoll.question}
                  onChange={(e) => setNewPoll({...newPoll, question: e.target.value})}
                  placeholder="Enter your poll question"
                  required
                />
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={newPoll.description}
                  onChange={(e) => setNewPoll({...newPoll, description: e.target.value})}
                  placeholder="Optional description or context"
                  rows="3"
                />
              </div>

              <div className="form-group">
                <label>Poll Type</label>
                <select
                  value={newPoll.type}
                  onChange={(e) => setNewPoll({...newPoll, type: e.target.value})}
                >
                  <option value="multiple_choice">Multiple Choice</option>
                  <option value="rating">Rating Scale</option>
                  <option value="yes_no">Yes/No</option>
                  <option value="text">Text Response</option>
                </select>
              </div>

              {newPoll.type === 'multiple_choice' && (
                <div className="form-group">
                  <label>Options *</label>
                  {newPoll.options.map((option, index) => (
                    <div key={index} className="option-input">
                      <input
                        type="text"
                        value={option}
                        onChange={(e) => updateOption(index, e.target.value)}
                        placeholder={`Option ${index + 1}`}
                        required
                      />
                      {newPoll.options.length > 2 && (
                        <button 
                          type="button" 
                          onClick={() => removeOption(index)}
                          className="remove-option"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                  <button type="button" onClick={addOption} className="add-option">
                    ➕ Add Option
                  </button>
                </div>
              )}

              <div className="form-row">
                <div className="form-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={newPoll.allowMultiple}
                      onChange={(e) => setNewPoll({...newPoll, allowMultiple: e.target.checked})}
                    />
                    Allow multiple selections
                  </label>
                </div>
                
                <div className="form-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={newPoll.isAnonymous}
                      onChange={(e) => setNewPoll({...newPoll, isAnonymous: e.target.checked})}
                    />
                    Anonymous voting
                  </label>
                </div>
              </div>

              <div className="form-group">
                <label>Time Limit (minutes, 0 = no limit)</label>
                <input
                  type="number"
                  min="0"
                  value={newPoll.timeLimit}
                  onChange={(e) => setNewPoll({...newPoll, timeLimit: parseInt(e.target.value) || 0})}
                />
              </div>

              <div className="modal-actions">
                <button type="button" onClick={() => setShowCreatePoll(false)}>
                  Cancel
                </button>
                <button type="submit" className="create-btn">
                  Create Poll
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// Poll Card Component
const PollCard = ({ poll, userResponse, onVote, onEndPoll, showResults, isOrganizer, calculateResults }) => {
  const [selectedOptions, setSelectedOptions] = useState([]);
  const [showVoteResults, setShowVoteResults] = useState(showResults);
  
  const results = calculateResults(poll);
  const hasVoted = !!userResponse;
  const totalVotes = poll.responses ? poll.responses.length : 0;

  const handleOptionChange = (optionIndex) => {
    if (poll.allowMultiple) {
      setSelectedOptions(prev => 
        prev.includes(optionIndex)
          ? prev.filter(i => i !== optionIndex)
          : [...prev, optionIndex]
      );
    } else {
      setSelectedOptions([optionIndex]);
    }
  };

  const handleSubmitVote = () => {
    if (selectedOptions.length > 0) {
      onVote(poll._id, selectedOptions);
      setSelectedOptions([]);
    }
  };

  return (
    <div className={`poll-card ${poll.isActive ? 'active' : 'ended'}`}>
      <div className="poll-header">
        <h3>{poll.question}</h3>
        <div className="poll-status">
          {poll.isActive ? (
            <span className="status active">🟢 Active</span>
          ) : (
            <span className="status ended">🔴 Ended</span>
          )}
        </div>
      </div>

      {poll.description && (
        <p className="poll-description">{poll.description}</p>
      )}

      <div className="poll-meta">
        <span>{totalVotes} votes</span>
        {poll.timeLimit > 0 && poll.isActive && (
          <span>⏱️ {poll.timeLimit} min limit</span>
        )}
      </div>

      {poll.isActive && !hasVoted && !showVoteResults ? (
        <div className="voting-section">
          {poll.options.map((option, index) => (
            <label key={index} className="option-label">
              <input
                type={poll.allowMultiple ? 'checkbox' : 'radio'}
                name={`poll-${poll._id}`}
                checked={selectedOptions.includes(index)}
                onChange={() => handleOptionChange(index)}
              />
              <span className="option-text">{option}</span>
            </label>
          ))}
          
          <div className="vote-actions">
            <button 
              onClick={handleSubmitVote}
              disabled={selectedOptions.length === 0}
              className="vote-btn"
            >
              Submit Vote
            </button>
            {!hasVoted && (
              <button 
                onClick={() => setShowVoteResults(!showVoteResults)}
                className="results-btn"
              >
                {showVoteResults ? 'Hide Results' : 'View Results'}
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="results-section">
          <h4>Results</h4>
          {poll.options.map((option, index) => (
            <div key={index} className="result-bar">
              <div className="result-label">
                <span>{option}</span>
                <span>{results[index].count} ({results[index].percentage}%)</span>
              </div>
              <div className="result-progress">
                <div 
                  className="result-fill"
                  style={{ width: `${results[index].percentage}%` }}
                />
              </div>
            </div>
          ))}
          
          {hasVoted && (
            <p className="voted-status">✅ You have voted in this poll</p>
          )}
        </div>
      )}

      {isOrganizer && poll.isActive && onEndPoll && (
        <div className="organizer-actions">
          <button 
            onClick={() => onEndPoll(poll._id)}
            className="end-poll-btn"
          >
            End Poll
          </button>
        </div>
      )}
    </div>
  );
};

// Analytics Component
const PollAnalytics = ({ polls, analytics }) => {
  const totalPolls = polls.length;
  const activePolls = polls.filter(poll => poll.isActive).length;
  const totalVotes = polls.reduce((sum, poll) => sum + (poll.responses?.length || 0), 0);
  const avgVotesPerPoll = totalPolls > 0 ? Math.round(totalVotes / totalPolls) : 0;

  return (
    <div className="poll-analytics">
      <div className="analytics-grid">
        <div className="stat-card">
          <h3>Total Polls</h3>
          <div className="stat-value">{totalPolls}</div>
        </div>
        
        <div className="stat-card">
          <h3>Active Polls</h3>
          <div className="stat-value">{activePolls}</div>
        </div>
        
        <div className="stat-card">
          <h3>Total Votes</h3>
          <div className="stat-value">{totalVotes}</div>
        </div>
        
        <div className="stat-card">
          <h3>Avg Votes/Poll</h3>
          <div className="stat-value">{avgVotesPerPoll}</div>
        </div>
      </div>

      <div className="polls-performance">
        <h3>Poll Performance</h3>
        {polls.map((poll) => (
          <div key={poll._id} className="poll-performance-item">
            <div className="poll-info">
              <h4>{poll.question}</h4>
              <span className="vote-count">{poll.responses?.length || 0} votes</span>
            </div>
            <div className="performance-bar">
              <div 
                className="performance-fill"
                style={{ 
                  width: `${Math.min((poll.responses?.length || 0) / Math.max(totalVotes / totalPolls, 1) * 100, 100)}%` 
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RealTimePolling;