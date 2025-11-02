import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import RealTimeMessaging from '../components/RealTimeMessaging';
import './AdvancedEventNetworking.css';

function AdvancedEventNetworking() {
  const { eventId } = useParams();
  const { user } = useAuth();
  const [event, setEvent] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [filteredParticipants, setFilteredParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Search and filtering
  const [searchQuery, setSearchQuery] = useState('');
  const [skillFilter, setSkillFilter] = useState('');
  const [industryFilter, setIndustryFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [showOnlyAvailable, setShowOnlyAvailable] = useState(false);
  const [sortBy, setSortBy] = useState('name'); // name, relevance, recent, popular
  
  // User profile and networking
  const [userProfile, setUserProfile] = useState({
    bio: '',
    jobTitle: '',
    company: '',
    skills: [],
    interests: [],
    industry: '',
    location: '',
    linkedinUrl: '',
    twitterUrl: '',
    websiteUrl: '',
    githubUrl: '',
    portfolioUrl: '',
    availableForNetworking: false,
    lookingFor: '',
    canOffer: '',
    preferredMeetingType: 'both', // virtual, inPerson, both
    timezone: '',
    languages: []
  });
  
  // UI states
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [selectedParticipant, setSelectedParticipant] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [activeTab, setActiveTab] = useState('directory'); // directory, connections, messages, analytics
  
  // Connections and messaging
  const [connections, setConnections] = useState([]);
  const [messages, setMessages] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);

  // Fetch data on component mount
  useEffect(() => {
    fetchEventData();
    fetchParticipants();
    fetchUserProfile();
    fetchConnections();
    fetchMessages();
  }, [eventId, user]);

  // Apply filters and sorting
  useEffect(() => {
    let filtered = [...participants];

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.bio?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.jobTitle?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.company?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.skills?.some(skill => skill.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    // Skill filter
    if (skillFilter) {
      filtered = filtered.filter(p => 
        p.skills?.some(skill => skill.toLowerCase().includes(skillFilter.toLowerCase()))
      );
    }

    // Industry filter
    if (industryFilter) {
      filtered = filtered.filter(p => 
        p.industry?.toLowerCase().includes(industryFilter.toLowerCase())
      );
    }

    // Location filter
    if (locationFilter) {
      filtered = filtered.filter(p => 
        p.location?.toLowerCase().includes(locationFilter.toLowerCase())
      );
    }

    // Availability filter
    if (showOnlyAvailable) {
      filtered = filtered.filter(p => p.availableForNetworking);
    }

    // Sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'relevance':
          // Sort by skill match relevance
          const aScore = calculateRelevanceScore(a);
          const bScore = calculateRelevanceScore(b);
          return bScore - aScore;
        case 'recent':
          return new Date(b.joinedAt || 0) - new Date(a.joinedAt || 0);
        case 'popular':
          return (b.connectionCount || 0) - (a.connectionCount || 0);
        default:
          return 0;
      }
    });

    setFilteredParticipants(filtered);
  }, [participants, searchQuery, skillFilter, industryFilter, locationFilter, showOnlyAvailable, sortBy, userProfile]);

  const calculateRelevanceScore = (participant) => {
    let score = 0;
    if (!userProfile.skills || !participant.skills) return score;

    // Calculate skill overlap
    const commonSkills = userProfile.skills.filter(skill => 
      participant.skills.some(pSkill => pSkill.toLowerCase().includes(skill.toLowerCase()))
    );
    score += commonSkills.length * 2;

    // Same industry bonus
    if (userProfile.industry && participant.industry === userProfile.industry) {
      score += 3;
    }

    // Complementary looking for / can offer
    if (userProfile.lookingFor && participant.canOffer?.toLowerCase().includes(userProfile.lookingFor.toLowerCase())) {
      score += 5;
    }
    if (userProfile.canOffer && participant.lookingFor?.toLowerCase().includes(userProfile.canOffer.toLowerCase())) {
      score += 5;
    }

    return score;
  };

  const fetchEventData = async () => {
    try {
      const response = await fetch(`/api/events/${eventId}`);
      if (response.ok) {
        const data = await response.json();
        setEvent(data);
      }
    } catch (error) {
      console.error('Error fetching event:', error);
    }
  };

  const fetchParticipants = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/networking/${eventId}/participants`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setParticipants(data);
      } else {
        setError('Failed to load participants');
      }
    } catch (error) {
      console.error('Error fetching participants:', error);
      setError('Network error occurred');
    }
    setLoading(false);
  };

  const fetchUserProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/networking/profile', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.networkingProfile) {
          setUserProfile(data.networkingProfile);
        }
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const fetchConnections = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/networking/connections', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setConnections(data);
      }
    } catch (error) {
      console.error('Error fetching connections:', error);
    }
  };

  const fetchMessages = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/networking/messages', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const updateProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/networking/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(userProfile)
      });

      if (response.ok) {
        setShowProfileModal(false);
        fetchParticipants();
        alert('Profile updated successfully!');
      } else {
        alert('Failed to update profile');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Network error occurred');
    }
  };

  const sendConnectionRequest = async (participantId, message = '') => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/networking/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          targetUserId: participantId,
          eventId: eventId,
          message: message
        })
      });

      if (response.ok) {
        alert('Connection request sent!');
        fetchConnections();
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to send connection request');
      }
    } catch (error) {
      console.error('Error sending connection request:', error);
      alert('Network error occurred');
    }
  };

  const handleConnectionRequest = async (connectionId, status) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/networking/connections/${connectionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });

      if (response.ok) {
        alert(`Connection request ${status}!`);
        fetchConnections();
      } else {
        const error = await response.json();
        alert(error.message || `Failed to ${status} connection request`);
      }
    } catch (error) {
      console.error('Error handling connection request:', error);
      alert('Network error occurred');
    }
  };

  const sendMessage = async (receiverId, messageText) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/networking/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          receiverId,
          message: messageText,
          eventId
        })
      });

      if (response.ok) {
        setNewMessage('');
        fetchMessages();
      } else {
        alert('Failed to send message');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Network error occurred');
    }
  };

  // Helper functions for connection status
  const isConnected = (participantId) => {
    return connections.some(conn => 
      (conn.requester._id === participantId || conn.receiver._id === participantId) &&
      conn.status === 'accepted'
    );
  };

  const hasPendingRequest = (participantId) => {
    return connections.some(conn => 
      conn.requester._id === user.id && conn.receiver._id === participantId &&
      conn.status === 'pending'
    );
  };

  const hasIncomingRequest = (participantId) => {
    return connections.some(conn => 
      conn.requester._id === participantId && conn.receiver._id === user.id &&
      conn.status === 'pending'
    );
  };

  const getPendingRequestId = (participantId) => {
    const connection = connections.find(conn => 
      conn.requester._id === participantId && conn.receiver._id === user.id &&
      conn.status === 'pending'
    );
    return connection ? connection._id : null;
  };

  const getConnectedUsers = () => {
    return connections
      .filter(conn => conn.status === 'accepted')
      .map(conn => conn.requester._id === user.id ? conn.receiver : conn.requester);
  };

  const getPendingRequests = () => {
    return connections.filter(conn => 
      conn.receiver._id === user.id && conn.status === 'pending'
    );
  };

  if (loading) return (
    <div className="advanced-networking-container">
      <div className="loading-state">
        <div className="spinner"></div>
        <p>Loading networking hub...</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="advanced-networking-container">
      <div className="error-state">
        <p>❌ {error}</p>
        <button onClick={() => window.location.reload()} className="retry-btn">
          Try Again
        </button>
      </div>
    </div>
  );

  return (
    <div className="advanced-networking-container">
      {/* Header */}
      <div className="networking-header">
        <div className="header-content">
          <div className="header-left">
            <h1>🌐 Networking Hub</h1>
            {event && <p className="event-title">{event.title}</p>}
            <p className="networking-subtitle">Connect, collaborate, and grow your professional network</p>
          </div>
          <div className="header-actions">
            <button 
              className="btn-profile" 
              onClick={() => setShowProfileModal(true)}
            >
              <i className="fas fa-user-edit"></i>
              Edit Profile
            </button>
            <Link to={`/events/${eventId}`} className="btn-back">
              <i className="fas fa-arrow-left"></i>
              Back to Event
            </Link>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="networking-nav">
        <div className="nav-content">
          <button 
            className={`nav-tab ${activeTab === 'directory' ? 'active' : ''}`}
            onClick={() => setActiveTab('directory')}
          >
            <i className="fas fa-users"></i>
            Directory ({filteredParticipants.length})
          </button>
          <button 
            className={`nav-tab ${activeTab === 'connections' ? 'active' : ''}`}
            onClick={() => setActiveTab('connections')}
          >
            <i className="fas fa-handshake"></i>
            My Connections ({getConnectedUsers().length})
          </button>
          <button 
            className={`nav-tab ${activeTab === 'messages' ? 'active' : ''}`}
            onClick={() => setActiveTab('messages')}
          >
            <i className="fas fa-comments"></i>
            Messages
            {unreadCount > 0 && <span className="unread-badge">{unreadCount}</span>}
          </button>
          <button 
            className={`nav-tab ${activeTab === 'requests' ? 'active' : ''}`}
            onClick={() => setActiveTab('requests')}
          >
            <i className="fas fa-user-plus"></i>
            Requests ({getPendingRequests().length})
          </button>
          <button 
            className={`nav-tab ${activeTab === 'analytics' ? 'active' : ''}`}
            onClick={() => setActiveTab('analytics')}
          >
            <i className="fas fa-chart-line"></i>
            Insights
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="networking-content">
        {activeTab === 'directory' && (
          <div className="directory-section">
            {/* Advanced Filters */}
            <div className="filters-panel">
              <div className="filters-row">
                <div className="search-box">
                  <i className="fas fa-search"></i>
                  <input
                    type="text"
                    placeholder="Search by name, skills, company..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="search-input"
                  />
                </div>
                
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="sort-select">
                  <option value="name">Sort by Name</option>
                  <option value="relevance">Sort by Relevance</option>
                  <option value="recent">Recently Joined</option>
                  <option value="popular">Most Connected</option>
                </select>
              </div>
              
              <div className="filters-row">
                <input
                  type="text"
                  placeholder="Filter by skills"
                  value={skillFilter}
                  onChange={(e) => setSkillFilter(e.target.value)}
                  className="filter-input"
                />
                <input
                  type="text"
                  placeholder="Filter by industry"
                  value={industryFilter}
                  onChange={(e) => setIndustryFilter(e.target.value)}
                  className="filter-input"
                />
                <input
                  type="text"
                  placeholder="Filter by location"
                  value={locationFilter}
                  onChange={(e) => setLocationFilter(e.target.value)}
                  className="filter-input"
                />
                <label className="availability-filter">
                  <input
                    type="checkbox"
                    checked={showOnlyAvailable}
                    onChange={(e) => setShowOnlyAvailable(e.target.checked)}
                  />
                  Available for networking
                </label>
              </div>
            </div>

            {/* Participants Grid */}
            <div className="participants-grid">
              {filteredParticipants.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">👥</div>
                  <h3>No participants found</h3>
                  <p>Try adjusting your search filters or be the first to set up your networking profile!</p>
                </div>
              ) : (
                filteredParticipants.map((participant) => (
                  <div key={participant._id} className="participant-card enhanced">
                    <div className="participant-header">
                      <div className="participant-avatar">
                        {participant.name.charAt(0).toUpperCase()}
                        {participant.availableForNetworking && <div className="availability-indicator"></div>}
                      </div>
                      <div className="participant-info">
                        <h3 className="participant-name">{participant.name}</h3>
                        {participant.jobTitle && (
                          <p className="participant-title">{participant.jobTitle}</p>
                        )}
                        {participant.company && (
                          <p className="participant-company">{participant.company}</p>
                        )}
                        {participant.location && (
                          <p className="participant-location">📍 {participant.location}</p>
                        )}
                      </div>
                      <div className="card-actions">
                        <button 
                          className="btn-view-profile"
                          onClick={() => {
                            setSelectedParticipant(participant);
                            setShowDetailModal(true);
                          }}
                        >
                          <i className="fas fa-eye"></i>
                        </button>
                      </div>
                    </div>

                    {participant.bio && (
                      <p className="participant-bio">{participant.bio}</p>
                    )}

                    {participant.skills && participant.skills.length > 0 && (
                      <div className="participant-skills">
                        <h4>Skills:</h4>
                        <div className="skills-list">
                          {participant.skills.slice(0, 3).map((skill, index) => (
                            <span key={index} className="skill-tag">{skill}</span>
                          ))}
                          {participant.skills.length > 3 && (
                            <span className="skill-tag more">+{participant.skills.length - 3} more</span>
                          )}
                        </div>
                      </div>
                    )}

                    {(participant.lookingFor || participant.canOffer) && (
                      <div className="networking-interests">
                        {participant.lookingFor && (
                          <div className="interest-item">
                            <strong>🔍 Looking for:</strong> {participant.lookingFor}
                          </div>
                        )}
                        {participant.canOffer && (
                          <div className="interest-item">
                            <strong>💡 Can offer:</strong> {participant.canOffer}
                          </div>
                        )}
                      </div>
                    )}

                    <div className="participant-actions">
                      {participant._id !== user?.id && (
                        <>
                          {isConnected(participant._id) ? (
                            <div className="connected-actions">
                              <button className="btn-connected" disabled>
                                ✅ Connected
                              </button>
                              <button 
                                className="btn-message"
                                onClick={() => {
                                  setSelectedConversation(participant);
                                  setActiveTab('messages');
                                }}
                              >
                                💬 Message
                              </button>
                            </div>
                          ) : hasIncomingRequest(participant._id) ? (
                            <div className="connection-request-actions">
                              <p className="request-text">🔔 Connection request received</p>
                              <div className="request-buttons">
                                <button 
                                  className="btn-accept"
                                  onClick={() => handleConnectionRequest(getPendingRequestId(participant._id), 'accepted')}
                                >
                                  ✅ Accept
                                </button>
                                <button 
                                  className="btn-reject"
                                  onClick={() => handleConnectionRequest(getPendingRequestId(participant._id), 'rejected')}
                                >
                                  ❌ Decline
                                </button>
                              </div>
                            </div>
                          ) : hasPendingRequest(participant._id) ? (
                            <button className="btn-pending" disabled>
                              ⏳ Request Sent
                            </button>
                          ) : (
                            <button 
                              className="btn-connect"
                              onClick={() => sendConnectionRequest(participant._id)}
                            >
                              🤝 Connect
                            </button>
                          )}
                        </>
                      )}
                      
                      <div className="social-links">
                        {participant.linkedinUrl && (
                          <a 
                            href={participant.linkedinUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="social-link linkedin"
                          >
                            <i className="fab fa-linkedin"></i>
                          </a>
                        )}
                        {participant.twitterUrl && (
                          <a 
                            href={participant.twitterUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="social-link twitter"
                          >
                            <i className="fab fa-twitter"></i>
                          </a>
                        )}
                        {participant.githubUrl && (
                          <a 
                            href={participant.githubUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="social-link github"
                          >
                            <i className="fab fa-github"></i>
                          </a>
                        )}
                        {participant.websiteUrl && (
                          <a 
                            href={participant.websiteUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="social-link website"
                          >
                            <i className="fas fa-globe"></i>
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'connections' && (
          <div className="connections-section">
            <h2>My Connections</h2>
            <div className="connections-grid">
              {getConnectedUsers().map((connection) => (
                <div key={connection._id} className="connection-card">
                  <div className="connection-avatar">
                    {connection.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="connection-info">
                    <h3>{connection.name}</h3>
                    <p>{connection.jobTitle} at {connection.company}</p>
                  </div>
                  <div className="connection-actions">
                    <button 
                      className="btn-message"
                      onClick={() => {
                        setSelectedConversation(connection);
                        setActiveTab('messages');
                      }}
                    >
                      💬 Message
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'messages' && (
          <div className="messages-section">
            <div className="messaging-tabs">
              <button 
                className={`tab ${!selectedConversation ? 'active' : ''}`}
                onClick={() => setSelectedConversation(null)}
              >
                Event Chat
              </button>
              {selectedConversation && (
                <button 
                  className={`tab ${selectedConversation ? 'active' : ''}`}
                  onClick={() => setSelectedConversation(selectedConversation)}
                >
                  {selectedConversation.name}
                  <span 
                    className="close-conversation"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedConversation(null);
                    }}
                  >
                    ×
                  </span>
                </button>
              )}
            </div>
            
            <div className="messaging-container">
              {!selectedConversation ? (
                <div>
                  <h2>Event Chat</h2>
                  <RealTimeMessaging 
                    eventId={eventId} 
                    type="event" 
                    className="event-messaging"
                  />
                </div>
              ) : (
                <div>
                  <h2>Private Chat with {selectedConversation.name}</h2>
                  <RealTimeMessaging 
                    eventId={eventId} 
                    type="private" 
                    recipientId={selectedConversation._id}
                    className="private-messaging"
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'requests' && (
          <div className="requests-section">
            <h2>Connection Requests</h2>
            <div className="requests-list">
              {getPendingRequests().map((request) => (
                <div key={request._id} className="request-card">
                  <div className="request-info">
                    <h3>{request.requester.name}</h3>
                    <p>{request.requester.jobTitle} at {request.requester.company}</p>
                    {request.message && <p className="request-message">"{request.message}"</p>}
                  </div>
                  <div className="request-actions">
                    <button 
                      className="btn-accept"
                      onClick={() => handleConnectionRequest(request._id, 'accepted')}
                    >
                      ✅ Accept
                    </button>
                    <button 
                      className="btn-reject"
                      onClick={() => handleConnectionRequest(request._id, 'rejected')}
                    >
                      ❌ Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="analytics-section">
            <h2>Networking Insights</h2>
            <div className="analytics-grid">
              <div className="insight-card">
                <h3>Total Connections</h3>
                <p className="insight-number">{getConnectedUsers().length}</p>
              </div>
              <div className="insight-card">
                <h3>Profile Views</h3>
                <p className="insight-number">—</p>
              </div>
              <div className="insight-card">
                <h3>Messages Sent</h3>
                <p className="insight-number">—</p>
              </div>
              <div className="insight-card">
                <h3>Events Attended</h3>
                <p className="insight-number">—</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Profile Modal */}
      {showProfileModal && (
        <div className="modal-overlay" onClick={() => setShowProfileModal(false)}>
          <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
            <h2>Edit Networking Profile</h2>
            
            <div className="profile-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Bio</label>
                  <textarea
                    value={userProfile.bio}
                    onChange={(e) => setUserProfile(prev => ({...prev, bio: e.target.value}))}
                    placeholder="Tell others about yourself..."
                    rows="3"
                  />
                </div>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Job Title</label>
                  <input
                    type="text"
                    value={userProfile.jobTitle}
                    onChange={(e) => setUserProfile(prev => ({...prev, jobTitle: e.target.value}))}
                    placeholder="Your current role"
                  />
                </div>
                <div className="form-group">
                  <label>Company</label>
                  <input
                    type="text"
                    value={userProfile.company}
                    onChange={(e) => setUserProfile(prev => ({...prev, company: e.target.value}))}
                    placeholder="Your company"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Industry</label>
                  <input
                    type="text"
                    value={userProfile.industry}
                    onChange={(e) => setUserProfile(prev => ({...prev, industry: e.target.value}))}
                    placeholder="e.g., Technology, Finance, Healthcare"
                  />
                </div>
                <div className="form-group">
                  <label>Location</label>
                  <input
                    type="text"
                    value={userProfile.location}
                    onChange={(e) => setUserProfile(prev => ({...prev, location: e.target.value}))}
                    placeholder="City, Country"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>What are you looking for?</label>
                  <input
                    type="text"
                    value={userProfile.lookingFor}
                    onChange={(e) => setUserProfile(prev => ({...prev, lookingFor: e.target.value}))}
                    placeholder="e.g., Job opportunities, Mentorship, Partnerships"
                  />
                </div>
                <div className="form-group">
                  <label>What can you offer?</label>
                  <input
                    type="text"
                    value={userProfile.canOffer}
                    onChange={(e) => setUserProfile(prev => ({...prev, canOffer: e.target.value}))}
                    placeholder="e.g., Advice, Collaboration, Investment"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>LinkedIn URL</label>
                  <input
                    type="url"
                    value={userProfile.linkedinUrl}
                    onChange={(e) => setUserProfile(prev => ({...prev, linkedinUrl: e.target.value}))}
                    placeholder="https://linkedin.com/in/yourprofile"
                  />
                </div>
                <div className="form-group">
                  <label>Website URL</label>
                  <input
                    type="url"
                    value={userProfile.websiteUrl}
                    onChange={(e) => setUserProfile(prev => ({...prev, websiteUrl: e.target.value}))}
                    placeholder="https://yourwebsite.com"
                  />
                </div>
              </div>

              <div className="form-row">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={userProfile.availableForNetworking}
                    onChange={(e) => setUserProfile(prev => ({...prev, availableForNetworking: e.target.checked}))}
                  />
                  I'm available for networking at this event
                </label>
              </div>
            </div>

            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setShowProfileModal(false)}>
                Cancel
              </button>
              <button className="btn-save" onClick={updateProfile}>
                Save Profile
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Participant Detail Modal */}
      {showDetailModal && selectedParticipant && (
        <div className="modal-overlay" onClick={() => setShowDetailModal(false)}>
          <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
            <div className="participant-detail">
              <div className="detail-header">
                <div className="detail-avatar">
                  {selectedParticipant.name.charAt(0).toUpperCase()}
                </div>
                <div className="detail-info">
                  <h2>{selectedParticipant.name}</h2>
                  <p>{selectedParticipant.jobTitle} at {selectedParticipant.company}</p>
                  <p>📍 {selectedParticipant.location}</p>
                </div>
              </div>

              {selectedParticipant.bio && (
                <div className="detail-section">
                  <h3>About</h3>
                  <p>{selectedParticipant.bio}</p>
                </div>
              )}

              {selectedParticipant.skills && selectedParticipant.skills.length > 0 && (
                <div className="detail-section">
                  <h3>Skills</h3>
                  <div className="skills-list">
                    {selectedParticipant.skills.map((skill, index) => (
                      <span key={index} className="skill-tag">{skill}</span>
                    ))}
                  </div>
                </div>
              )}

              <div className="detail-actions">
                <button className="btn-close" onClick={() => setShowDetailModal(false)}>
                  Close
                </button>
                {selectedParticipant._id !== user?.id && !isConnected(selectedParticipant._id) && (
                  <button 
                    className="btn-connect"
                    onClick={() => {
                      sendConnectionRequest(selectedParticipant._id);
                      setShowDetailModal(false);
                    }}
                  >
                    🤝 Connect
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdvancedEventNetworking;