import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../utils/api';
import './EventNetworking.css';

function EventNetworking() {
  const { eventId } = useParams();
  const { user } = useAuth();
  const [event, setEvent] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [filteredParticipants, setFilteredParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [skillFilter, setSkillFilter] = useState('');
  const [industryFilter, setIndustryFilter] = useState('');
  const [showOnlyAvailable, setShowOnlyAvailable] = useState(false);
  const [userProfile, setUserProfile] = useState({
    bio: '',
    jobTitle: '',
    company: '',
    skills: [],
    interests: [],
    industry: '',
    linkedinUrl: '',
    twitterUrl: '',
    websiteUrl: '',
    availableForNetworking: false,
    lookingFor: '',
    canOffer: ''
  });
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [connections, setConnections] = useState([]);

  // Fetch event and participants on load
  useEffect(() => {
    fetchEventData();
    fetchParticipants();
    fetchUserProfile();
    fetchConnections();
  }, [eventId, user]);

  // Filter participants based on search and filters
  useEffect(() => {
    let filtered = participants;

    if (searchQuery) {
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.bio?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.jobTitle?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.company?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.skills?.some(skill => skill.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    if (skillFilter) {
      filtered = filtered.filter(p => 
        p.skills?.some(skill => skill.toLowerCase().includes(skillFilter.toLowerCase()))
      );
    }

    if (industryFilter) {
      filtered = filtered.filter(p => 
        p.industry?.toLowerCase().includes(industryFilter.toLowerCase())
      );
    }

    if (showOnlyAvailable) {
      filtered = filtered.filter(p => p.availableForNetworking);
    }

    setFilteredParticipants(filtered);
  }, [participants, searchQuery, skillFilter, industryFilter, showOnlyAvailable]);

  const fetchEventData = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/events/${eventId}`);
      if (response.ok) {
        const eventData = await response.json();
        setEvent(eventData);
      }
    } catch (error) {
      console.error('Error fetching event:', error);
    }
  };

  const fetchParticipants = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/networking/${eventId}/participants`, {
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
    } finally {
      setLoading(false);
    }
  };

  const fetchUserProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/networking/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const profile = await response.json();
        setUserProfile(prev => ({ ...prev, ...profile }));
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  const fetchConnections = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/networking/connections`, {
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

  const updateProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/networking/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(userProfile)
      });

      if (response.ok) {
        setShowProfileModal(false);
        fetchParticipants(); // Refresh participants to show updated profile
        alert('Profile updated successfully!');
      } else {
        alert('Failed to update profile');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Network error occurred');
    }
  };

  const sendConnectionRequest = async (participantId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/networking/connect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          targetUserId: participantId,
          eventId: eventId
        })
      });

      if (response.ok) {
        alert('Connection request sent!');
        fetchConnections(); // Refresh connections
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to send connection request');
      }
    } catch (error) {
      console.error('Error sending connection request:', error);
      alert('Network error occurred');
    }
  };

  const handleSkillAdd = (skill) => {
    if (skill && !userProfile.skills.includes(skill)) {
      setUserProfile(prev => ({
        ...prev,
        skills: [...prev.skills, skill]
      }));
    }
  };

  const handleSkillRemove = (skillToRemove) => {
    setUserProfile(prev => ({
      ...prev,
      skills: prev.skills.filter(skill => skill !== skillToRemove)
    }));
  };

  const isConnected = (participantId) => {
    return connections.some(conn => 
      (conn.requester === participantId || conn.receiver === participantId) &&
      conn.status === 'accepted'
    );
  };

  const hasPendingRequest = (participantId) => {
    return connections.some(conn => 
      conn.requester === user.id && conn.receiver === participantId &&
      conn.status === 'pending'
    );
  };

  const hasIncomingRequest = (participantId) => {
    return connections.some(conn => 
      conn.requester === participantId && conn.receiver === user.id &&
      conn.status === 'pending'
    );
  };

  const getPendingRequestId = (participantId) => {
    const connection = connections.find(conn => 
      conn.requester === participantId && conn.receiver === user.id &&
      conn.status === 'pending'
    );
    return connection ? connection._id : null;
  };

  const handleConnectionRequest = async (connectionId, status) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/networking/connections/${connectionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });

      if (response.ok) {
        alert(`Connection request ${status}!`);
        fetchConnections(); // Refresh connections
      } else {
        const error = await response.json();
        alert(error.message || `Failed to ${status} connection request`);
      }
    } catch (error) {
      console.error('Error handling connection request:', error);
      alert('Network error occurred');
    }
  };

  if (loading) return (
    <div className="networking-container">
      <div className="loading-state">
        <div className="spinner"></div>
        <p>Loading networking directory...</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="networking-container">
      <div className="error-state">
        <p>❌ {error}</p>
        <button onClick={() => window.location.reload()} className="retry-btn">
          Try Again
        </button>
      </div>
    </div>
  );

  return (
    <div className="networking-container">
      {/* Header */}
      <div className="networking-header">
        <div className="header-content">
          <div className="header-left">
            <h1>🤝 Event Networking</h1>
            <p className="event-title">{event?.title}</p>
            <p className="networking-subtitle">
              Connect with {filteredParticipants.length} fellow attendees
            </p>
          </div>
          <div className="header-actions">
            <button 
              className="btn-profile"
              onClick={() => setShowProfileModal(true)}
            >
              ✏️ Edit My Profile
            </button>
            <Link to={`/events/${eventId}`} className="btn-back">
              ← Back to Event
            </Link>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="networking-filters">
        <div className="filter-row">
          <div className="search-box">
            <input
              type="text"
              placeholder="Search by name, skills, company..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
          </div>
          <div className="filter-group">
            <select
              value={industryFilter}
              onChange={(e) => setIndustryFilter(e.target.value)}
              className="filter-select"
            >
              <option value="">All Industries</option>
              <option value="Technology">Technology</option>
              <option value="Healthcare">Healthcare</option>
              <option value="Finance">Finance</option>
              <option value="Education">Education</option>
              <option value="Marketing">Marketing</option>
              <option value="Consulting">Consulting</option>
            </select>
            <input
              type="text"
              placeholder="Filter by skill..."
              value={skillFilter}
              onChange={(e) => setSkillFilter(e.target.value)}
              className="filter-input"
            />
            <label className="checkbox-filter">
              <input
                type="checkbox"
                checked={showOnlyAvailable}
                onChange={(e) => setShowOnlyAvailable(e.target.checked)}
              />
              Available for networking
            </label>
          </div>
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
            <div key={participant._id} className="participant-card">
              <div className="participant-header">
                <div className="participant-avatar">
                  {participant.name.charAt(0).toUpperCase()}
                </div>
                <div className="participant-info">
                  <h3 className="participant-name">{participant.name}</h3>
                  {participant.jobTitle && (
                    <p className="participant-title">{participant.jobTitle}</p>
                  )}
                  {participant.company && (
                    <p className="participant-company">{participant.company}</p>
                  )}
                </div>
                {participant.availableForNetworking && (
                  <div className="availability-badge">🟢 Available</div>
                )}
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
                      <strong>Looking for:</strong> {participant.lookingFor}
                    </div>
                  )}
                  {participant.canOffer && (
                    <div className="interest-item">
                      <strong>Can offer:</strong> {participant.canOffer}
                    </div>
                  )}
                </div>
              )}

              <div className="participant-actions">
                {participant._id !== user?.id && (
                  <>
                    {isConnected(participant._id) ? (
                      <button className="btn-connected" disabled>
                        ✅ Connected
                      </button>
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
                {participant.linkedinUrl && (
                  <a 
                    href={participant.linkedinUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="btn-linkedin"
                  >
                    💼 LinkedIn
                  </a>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Profile Modal */}
      {showProfileModal && (
        <div className="modal-overlay">
          <div className="profile-modal">
            <div className="modal-header">
              <h2>✏️ Edit Networking Profile</h2>
              <button 
                className="close-btn"
                onClick={() => setShowProfileModal(false)}
              >
                ✕
              </button>
            </div>
            
            <div className="modal-content">
              <div className="form-group">
                <label>Bio</label>
                <textarea
                  value={userProfile.bio}
                  onChange={(e) => setUserProfile(prev => ({ ...prev, bio: e.target.value }))}
                  placeholder="Tell others about yourself..."
                  rows="3"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Job Title</label>
                  <input
                    type="text"
                    value={userProfile.jobTitle}
                    onChange={(e) => setUserProfile(prev => ({ ...prev, jobTitle: e.target.value }))}
                    placeholder="Software Engineer"
                  />
                </div>
                <div className="form-group">
                  <label>Company</label>
                  <input
                    type="text"
                    value={userProfile.company}
                    onChange={(e) => setUserProfile(prev => ({ ...prev, company: e.target.value }))}
                    placeholder="Tech Corp"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Industry</label>
                <select
                  value={userProfile.industry}
                  onChange={(e) => setUserProfile(prev => ({ ...prev, industry: e.target.value }))}
                >
                  <option value="">Select Industry</option>
                  <option value="Technology">Technology</option>
                  <option value="Healthcare">Healthcare</option>
                  <option value="Finance">Finance</option>
                  <option value="Education">Education</option>
                  <option value="Marketing">Marketing</option>
                  <option value="Consulting">Consulting</option>
                </select>
              </div>

              <div className="form-group">
                <label>Skills (comma separated)</label>
                <input
                  type="text"
                  placeholder="React, Node.js, Python, Machine Learning"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' || e.key === ',') {
                      e.preventDefault();
                      const skill = e.target.value.trim();
                      if (skill) {
                        handleSkillAdd(skill);
                        e.target.value = '';
                      }
                    }
                  }}
                />
                <div className="skills-display">
                  {userProfile.skills.map((skill, index) => (
                    <span key={index} className="skill-tag">
                      {skill}
                      <button onClick={() => handleSkillRemove(skill)}>×</button>
                    </span>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label>What are you looking for?</label>
                <input
                  type="text"
                  value={userProfile.lookingFor}
                  onChange={(e) => setUserProfile(prev => ({ ...prev, lookingFor: e.target.value }))}
                  placeholder="Job opportunities, partnerships, mentors..."
                />
              </div>

              <div className="form-group">
                <label>What can you offer?</label>
                <input
                  type="text"
                  value={userProfile.canOffer}
                  onChange={(e) => setUserProfile(prev => ({ ...prev, canOffer: e.target.value }))}
                  placeholder="Mentorship, collaboration, expertise in..."
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>LinkedIn URL</label>
                  <input
                    type="url"
                    value={userProfile.linkedinUrl}
                    onChange={(e) => setUserProfile(prev => ({ ...prev, linkedinUrl: e.target.value }))}
                    placeholder="https://linkedin.com/in/yourprofile"
                  />
                </div>
                <div className="form-group">
                  <label>Website</label>
                  <input
                    type="url"
                    value={userProfile.websiteUrl}
                    onChange={(e) => setUserProfile(prev => ({ ...prev, websiteUrl: e.target.value }))}
                    placeholder="https://yourwebsite.com"
                  />
                </div>
              </div>

              <div className="form-group checkbox-group">
                <label>
                  <input
                    type="checkbox"
                    checked={userProfile.availableForNetworking}
                    onChange={(e) => setUserProfile(prev => ({ ...prev, availableForNetworking: e.target.checked }))}
                  />
                  I'm available for networking at this event
                </label>
              </div>
            </div>

            <div className="modal-actions">
              <button 
                className="btn-cancel"
                onClick={() => setShowProfileModal(false)}
              >
                Cancel
              </button>
              <button 
                className="btn-save"
                onClick={updateProfile}
              >
                Save Profile
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default EventNetworking;