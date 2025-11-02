import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './LivePolling.css';

function LivePolling() {
  const { eventId } = useParams();
  const { user } = useAuth();
  const [event, setEvent] = useState(null);
  const [polls, setPolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedTab, setSelectedTab] = useState('active'); // active, completed, all
  const [refreshing, setRefreshing] = useState(false);

  const refreshPolls = async () => {
    setRefreshing(true);
    await fetchPolls();
    setRefreshing(false);
  };

  useEffect(() => {
    console.log('LivePolling component mounted with eventId:', eventId);
    console.log('Current user:', user);
    fetchEvent();
    fetchPolls();
    
    // Set up polling for real-time updates
    const interval = setInterval(fetchPolls, 5000); // Reduced frequency to 5 seconds
    return () => clearInterval(interval);
  }, [eventId]); // Removed selectedTab dependency since we filter client-side now

  const fetchEvent = async () => {
    try {
      const response = await fetch(`http://localhost:3001/api/events/${eventId}`);
      if (response.ok) {
        const eventData = await response.json();
        setEvent(eventData);
      }
    } catch (error) {
      console.error('Error fetching event:', error);
    }
  };

  const fetchPolls = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Please log in to view polls');
        setLoading(false);
        return;
      }

      // Always fetch all polls and filter on client side for consistency
      const endpoint = `http://localhost:3001/api/polling/${eventId}/polls`;
        
      console.log('Fetching all polls from:', endpoint, 'for tab:', selectedTab);
      
      const response = await fetch(endpoint, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      console.log('Poll fetch response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('Poll data received:', data);
        console.log('Number of polls:', data.polls?.length || 0);
        
        // Store all polls - filtering will be done in render
        const allPolls = data.polls || [];
        setPolls(allPolls);
        setError('');
        
        // Log poll details for debugging
        allPolls.forEach((poll, index) => {
          console.log(`Poll ${index + 1}:`, {
            id: poll._id,
            question: poll.question,
            isActive: poll.isActive,
            options: poll.options,
            totalVotes: poll.totalVotes
          });
        });
        
      } else {
        const errorData = await response.json();
        console.error('Error response:', errorData);
        setError(errorData.message || 'Failed to load polls');
      }
    } catch (error) {
      console.error('Error fetching polls:', error);
      setError('Network error occurred. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const submitVote = async (pollId, optionIndex) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:3001/api/polling/${eventId}/polls/${pollId}/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          selectedOptions: [optionIndex] // Array to support multiple choice polls
        })
      });

      if (response.ok) {
        fetchPolls(); // Refresh polls to show updated results
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to submit vote');
      }
    } catch (error) {
      console.error('Error submitting vote:', error);
      alert('Network error occurred');
    }
  };

  const getTotalVotes = (poll) => {
    return poll.totalVotes || 0;
  };

  const getOptionVotes = (poll, optionIndex) => {
    const result = poll.results?.find(r => r.optionIndex === optionIndex);
    return result ? result.votes : 0;
  };

  const calculatePercentage = (votes, totalVotes) => {
    if (totalVotes === 0) return 0;
    return Math.round((votes / totalVotes) * 100);
  };

  const hasUserVoted = (poll) => {
    return poll.userResponse && poll.userResponse.length > 0;
  };

  const getUserVote = (poll) => {
    return poll.userResponse ? poll.userResponse[0] : null;
  };

  // Helper functions for filtering polls
  const getActivePolls = () => polls.filter(poll => poll.isActive);
  const getCompletedPolls = () => polls.filter(poll => !poll.isActive);
  const getAllPolls = () => polls;
  
  const getFilteredPolls = () => {
    switch (selectedTab) {
      case 'active':
        return getActivePolls();
      case 'completed':
        return getCompletedPolls();
      case 'all':
      default:
        return getAllPolls();
    }
  };

  const filteredPolls = getFilteredPolls();

  if (loading) {
    return (
      <div className="polling-container">
        <div className="loading-spinner">
          <i className="fas fa-spinner fa-spin"></i>
          <p>Loading polls...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="polling-container">
        <div className="error-state">
          <p>❌ {error}</p>
          <button onClick={() => window.location.reload()} className="retry-btn">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="polling-container">
      {/* Header */}
      <div className="polling-header">
        <div className="header-content">
          <div className="header-left">
            <h1>📊 Live Polling</h1>
            <p className="event-title">{event?.title}</p>
            <p className="polling-subtitle">
              Participate in real-time polls and see instant results
            </p>
          </div>
          <div className="polling-stats">
            <div className="stat">
              <span className="stat-number">{getActivePolls().length}</span>
              <span className="stat-label">Active Polls</span>
            </div>
            <div className="stat">
              <span className="stat-number">{getAllPolls().length}</span>
              <span className="stat-label">Total Polls</span>
            </div>
            <button 
              className={`refresh-btn ${refreshing ? 'refreshing' : ''}`}
              onClick={refreshPolls}
              disabled={refreshing}
              title="Refresh polls"
            >
              <i className={`fas fa-sync-alt ${refreshing ? 'fa-spin' : ''}`}></i>
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="polling-tabs">
        <button 
          className={`tab-button ${selectedTab === 'active' ? 'active' : ''}`}
          onClick={() => setSelectedTab('active')}
        >
          🔴 Active ({getActivePolls().length})
        </button>
        <button 
          className={`tab-button ${selectedTab === 'completed' ? 'active' : ''}`}
          onClick={() => setSelectedTab('completed')}
        >
          ✅ Completed ({getCompletedPolls().length})
        </button>
        <button 
          className={`tab-button ${selectedTab === 'all' ? 'active' : ''}`}
          onClick={() => setSelectedTab('all')}
        >
          📋 All Polls ({getAllPolls().length})
        </button>
      </div>

      {/* Polls List */}
      <div className="polls-content">
        {filteredPolls.length === 0 ? (
          <div className="empty-state">
            <i className="fas fa-poll"></i>
            <h3>No polls available</h3>
            <p>
              {selectedTab === 'active' 
                ? 'There are no active polls at the moment. Check back later!'
                : selectedTab === 'completed'
                ? 'No completed polls found for this event.'
                : 'No polls have been created for this event yet.'
              }
            </p>
            <div className="debug-info" style={{ marginTop: '1rem', fontSize: '0.875rem', color: '#666' }}>
              <p>Debug: Total polls loaded: {getAllPolls().length}</p>
              <p>Active: {getActivePolls().length} | Completed: {getCompletedPolls().length}</p>
              <p>Current tab: {selectedTab}</p>
              <p>Event ID: {eventId}</p>
            </div>
          </div>
        ) : (
          <div className="polls-grid">
            {filteredPolls.map((poll) => {
                const totalVotes = getTotalVotes(poll);
                const userVoted = hasUserVoted(poll);
                const userVote = getUserVote(poll);

                return (
                  <div key={poll._id} className={`poll-card ${poll.isActive ? 'active' : 'completed'}`}>
                    {/* Poll Header */}
                    <div className="poll-header">
                      <div className="poll-status">
                        {poll.isActive ? (
                          <span className="status-badge live">🔴 LIVE</span>
                        ) : (
                          <span className="status-badge completed">✅ COMPLETED</span>
                        )}
                        {poll.allowMultiple && (
                          <span className="multiple-badge">Multiple Choice</span>
                        )}
                      </div>
                      <h3 className="poll-question">{poll.question}</h3>
                      {poll.description && (
                        <p className="poll-description">{poll.description}</p>
                      )}
                    </div>

                    {/* Poll Options */}
                    <div className="poll-options">
                      {poll.options.map((optionText, index) => {
                        const votes = getOptionVotes(poll, index);
                        const percentage = calculatePercentage(votes, totalVotes);
                        const isUserChoice = userVote === index;
                        const canVote = poll.isActive && !userVoted;

                        return (
                          <div 
                            key={index} 
                            className={`poll-option ${isUserChoice ? 'user-choice' : ''} ${canVote ? 'clickable' : ''}`}
                            onClick={() => canVote && submitVote(poll._id, index)}
                          >
                            <div className="option-content">
                              <span className="option-text">{optionText}</span>
                              <div className="option-stats">
                                <span className="votes-count">{votes} votes</span>
                                <span className="percentage">{percentage}%</span>
                              </div>
                            </div>
                            <div 
                              className="option-progress"
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Poll Footer */}
                    <div className="poll-footer">
                      <div className="poll-meta">
                        <span className="total-votes">
                          <i className="fas fa-users"></i> {totalVotes} total votes
                        </span>
                        <span className="poll-time">
                          <i className="fas fa-clock"></i> 
                          {poll.isActive ? 'Active now' : `Ended ${new Date(poll.endedAt).toLocaleString()}`}
                        </span>
                      </div>
                      {userVoted && (
                        <div className="vote-confirmation">
                          <i className="fas fa-check-circle"></i> 
                          You voted for "{poll.options[userVote]}"
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>
    </div>
  );
}

export default LivePolling;