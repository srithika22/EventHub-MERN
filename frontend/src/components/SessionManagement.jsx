import React, { useState, useEffect } from 'react';
import './SessionManagement.css';

const SessionManagement = ({ eventId }) => {
  const [sessions, setSessions] = useState([]);
  const [speakers, setSpeakers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingSession, setEditingSession] = useState(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [viewMode, setViewMode] = useState('grid'); // grid or agenda
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'presentation',
    startTime: '',
    endTime: '',
    location: {
      venue: '',
      room: '',
      floor: '',
      isVirtual: false,
      virtualLink: '',
      capacity: 0
    },
    speakers: [],
    category: '',
    tags: [],
    skillLevel: 'all',
    prerequisites: [],
    learningObjectives: [],
    capacity: 0,
    registrationRequired: false,
    materials: []
  });

  useEffect(() => {
    if (eventId) {
      fetchSessions();
      fetchSpeakers();
    }
  }, [eventId]);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/sessions/event/${eventId}`);
      const data = await response.json();
      
      if (data.success) {
        setSessions(data.sessions);
      }
    } catch (error) {
      console.error('Error fetching sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSpeakers = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/speakers/event/${eventId}`);
      const data = await response.json();
      
      if (data.success) {
        setSpeakers(data.speakers.filter(speaker => speaker.status === 'confirmed'));
      }
    } catch (error) {
      console.error('Error fetching speakers:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const url = editingSession 
        ? `${API_BASE_URL}/api/sessions/${editingSession._id}`
        : '${API_BASE_URL}/api/sessions';
      
      const method = editingSession ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...formData,
          eventId: eventId
        })
      });

      if (response.ok) {
        fetchSessions();
        resetForm();
        setShowAddModal(false);
        setEditingSession(null);
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to save session');
      }
    } catch (error) {
      console.error('Error saving session:', error);
      alert('Network error occurred');
    }
  };

  const handleDelete = async (sessionId) => {
    if (!confirm('Are you sure you want to delete this session?')) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/sessions/${sessionId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        fetchSessions();
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to delete session');
      }
    } catch (error) {
      console.error('Error deleting session:', error);
      alert('Network error occurred');
    }
  };

  const handleEdit = (session) => {
    setEditingSession(session);
    setFormData({
      title: session.title || '',
      description: session.description || '',
      type: session.type || 'presentation',
      startTime: session.startTime ? new Date(session.startTime).toISOString().slice(0, 16) : '',
      endTime: session.endTime ? new Date(session.endTime).toISOString().slice(0, 16) : '',
      location: {
        venue: session.location?.venue || '',
        room: session.location?.room || '',
        floor: session.location?.floor || '',
        isVirtual: session.location?.isVirtual || false,
        virtualLink: session.location?.virtualLink || '',
        capacity: session.location?.capacity || 0
      },
      speakers: session.speakers ? session.speakers.map(s => s._id || s) : [],
      category: session.category || '',
      tags: session.tags || [],
      skillLevel: session.skillLevel || 'all',
      prerequisites: session.prerequisites || [],
      learningObjectives: session.learningObjectives || [],
      capacity: session.capacity || 0,
      registrationRequired: session.registrationRequired || false,
      materials: session.materials || []
    });
    setShowAddModal(true);
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      type: 'presentation',
      startTime: '',
      endTime: '',
      location: {
        venue: '',
        room: '',
        floor: '',
        isVirtual: false,
        virtualLink: '',
        capacity: 0
      },
      speakers: [],
      category: '',
      tags: [],
      skillLevel: 'all',
      prerequisites: [],
      learningObjectives: [],
      capacity: 0,
      registrationRequired: false,
      materials: []
    });
  };

  const getSessionTypeIcon = (type) => {
    const icons = {
      keynote: 'fas fa-star',
      workshop: 'fas fa-tools',
      panel: 'fas fa-users',
      presentation: 'fas fa-presentation',
      networking: 'fas fa-handshake',
      breakout: 'fas fa-comments',
      qa: 'fas fa-question-circle',
      demo: 'fas fa-desktop'
    };
    return icons[type] || 'fas fa-calendar';
  };

  const getSessionTypeColor = (type) => {
    const colors = {
      keynote: '#FFD700',
      workshop: '#10B981',
      panel: '#8B5CF6',
      presentation: '#3B82F6',
      networking: '#F59E0B',
      breakout: '#EF4444',
      qa: '#06B6D4',
      demo: '#84CC16'
    };
    return colors[type] || '#6B7280';
  };

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getDuration = (startTime, endTime) => {
    const start = new Date(startTime);
    const end = new Date(endTime);
    const durationMs = end - start;
    const hours = Math.floor(durationMs / (1000 * 60 * 60));
    const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const groupSessionsByDate = (sessions) => {
    const grouped = {};
    sessions.forEach(session => {
      const date = new Date(session.startTime).toISOString().split('T')[0];
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(session);
    });
    
    // Sort sessions within each date by start time
    Object.keys(grouped).forEach(date => {
      grouped[date].sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
    });
    
    return grouped;
  };

  const filteredSessions = selectedDate 
    ? sessions.filter(session => 
        new Date(session.startTime).toISOString().split('T')[0] === selectedDate
      )
    : sessions;

  if (loading) {
    return (
      <div className="session-management">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading sessions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="session-management">
      <div className="session-header">
        <div className="header-content">
          <h2>Session Management</h2>
          <p className="header-subtitle">Create and manage event sessions, workshops, and presentations</p>
        </div>
        <div className="header-actions">
          <div className="view-controls">
            <button 
              className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
            >
              <i className="fas fa-th-large"></i>
            </button>
            <button 
              className={`view-btn ${viewMode === 'agenda' ? 'active' : ''}`}
              onClick={() => setViewMode('agenda')}
            >
              <i className="fas fa-list"></i>
            </button>
          </div>
          <button 
            className="btn btn-primary"
            onClick={() => {
              resetForm();
              setEditingSession(null);
              setShowAddModal(true);
            }}
          >
            <i className="fas fa-plus"></i>
            Add Session
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="session-filters">
        <div className="filter-group">
          <label>Filter by Date:</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
          {selectedDate && (
            <button 
              className="clear-filter"
              onClick={() => setSelectedDate('')}
            >
              <i className="fas fa-times"></i>
              Clear
            </button>
          )}
        </div>
        <div className="session-stats">
          <span className="stat">
            <i className="fas fa-calendar"></i>
            {filteredSessions.length} Sessions
          </span>
          <span className="stat">
            <i className="fas fa-users"></i>
            {speakers.length} Speakers
          </span>
        </div>
      </div>

      {filteredSessions.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">
            <i className="fas fa-calendar-plus"></i>
          </div>
          <h3>No Sessions Found</h3>
          <p>{selectedDate ? 'No sessions scheduled for this date' : 'Start building your event agenda by adding your first session'}</p>
          <button 
            className="btn btn-primary"
            onClick={() => {
              resetForm();
              setEditingSession(null);
              setShowAddModal(true);
            }}
          >
            Add Your First Session
          </button>
        </div>
      ) : (
        <div className={`sessions-container ${viewMode}`}>
          {viewMode === 'grid' ? (
            <div className="sessions-grid">
              {filteredSessions.map(session => (
                <div key={session._id} className="session-card">
                  <div className="session-header-card">
                    <div className="session-type" style={{ backgroundColor: getSessionTypeColor(session.type) }}>
                      <i className={getSessionTypeIcon(session.type)}></i>
                      <span>{session.type}</span>
                    </div>
                    <div className="session-duration">
                      {getDuration(session.startTime, session.endTime)}
                    </div>
                  </div>
                  
                  <div className="session-content">
                    <h3 className="session-title">{session.title}</h3>
                    <p className="session-description">{session.description}</p>
                    
                    <div className="session-meta">
                      <div className="meta-item">
                        <i className="fas fa-clock"></i>
                        <span>
                          {formatDate(session.startTime)}<br/>
                          {formatTime(session.startTime)} - {formatTime(session.endTime)}
                        </span>
                      </div>
                      
                      {session.location?.isVirtual ? (
                        <div className="meta-item">
                          <i className="fas fa-video"></i>
                          <span>Virtual Session</span>
                        </div>
                      ) : (
                        session.location?.room && (
                          <div className="meta-item">
                            <i className="fas fa-map-marker-alt"></i>
                            <span>{session.location.room}</span>
                          </div>
                        )
                      )}
                      
                      {session.capacity > 0 && (
                        <div className="meta-item">
                          <i className="fas fa-users"></i>
                          <span>Max {session.capacity} attendees</span>
                        </div>
                      )}
                    </div>
                    
                    {session.speakers && session.speakers.length > 0 && (
                      <div className="session-speakers">
                        <h4>Speakers:</h4>
                        <div className="speakers-list">
                          {session.speakers.map(speaker => (
                            <div key={speaker._id} className="speaker-mini">
                              {speaker.profileImage ? (
                                <img src={speaker.profileImage} alt={speaker.name} />
                              ) : (
                                <div className="speaker-placeholder">
                                  {speaker.name.charAt(0)}
                                </div>
                              )}
                              <span>{speaker.name}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {session.tags && session.tags.length > 0 && (
                      <div className="session-tags">
                        {session.tags.map((tag, index) => (
                          <span key={index} className="tag">{tag}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <div className="session-actions">
                    <button 
                      className="btn btn-outline btn-sm"
                      onClick={() => handleEdit(session)}
                    >
                      <i className="fas fa-edit"></i>
                      Edit
                    </button>
                    <button 
                      className="btn btn-danger btn-sm"
                      onClick={() => handleDelete(session._id)}
                    >
                      <i className="fas fa-trash"></i>
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="agenda-view">
              {Object.entries(groupSessionsByDate(filteredSessions))
                .sort(([a], [b]) => new Date(a) - new Date(b))
                .map(([date, dateSessions]) => (
                  <div key={date} className="agenda-day">
                    <div className="day-header">
                      <h3>{formatDate(date)}</h3>
                      <span className="session-count">{dateSessions.length} sessions</span>
                    </div>
                    <div className="day-sessions">
                      {dateSessions.map(session => (
                        <div key={session._id} className="agenda-session">
                          <div className="session-time">
                            <span className="start-time">{formatTime(session.startTime)}</span>
                            <span className="end-time">{formatTime(session.endTime)}</span>
                          </div>
                          <div className="session-details">
                            <div className="session-header-agenda">
                              <h4>{session.title}</h4>
                              <div className="session-type-small" style={{ backgroundColor: getSessionTypeColor(session.type) }}>
                                <i className={getSessionTypeIcon(session.type)}></i>
                                {session.type}
                              </div>
                            </div>
                            <p>{session.description}</p>
                            {session.speakers && session.speakers.length > 0 && (
                              <div className="agenda-speakers">
                                <i className="fas fa-microphone"></i>
                                {session.speakers.map(s => s.name).join(', ')}
                              </div>
                            )}
                            {(session.location?.room || session.location?.isVirtual) && (
                              <div className="agenda-location">
                                <i className={session.location.isVirtual ? "fas fa-video" : "fas fa-map-marker-alt"}></i>
                                {session.location.isVirtual ? 'Virtual Session' : session.location.room}
                              </div>
                            )}
                          </div>
                          <div className="session-actions-agenda">
                            <button 
                              className="btn btn-outline btn-sm"
                              onClick={() => handleEdit(session)}
                            >
                              <i className="fas fa-edit"></i>
                            </button>
                            <button 
                              className="btn btn-danger btn-sm"
                              onClick={() => handleDelete(session._id)}
                            >
                              <i className="fas fa-trash"></i>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* Add/Edit Session Modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content session-modal">
            <div className="modal-header">
              <h3>{editingSession ? 'Edit Session' : 'Add New Session'}</h3>
              <button 
                className="modal-close"
                onClick={() => {
                  setShowAddModal(false);
                  setEditingSession(null);
                  resetForm();
                }}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="session-form">
              <div className="form-grid">
                {/* Basic Information */}
                <div className="form-section">
                  <h4>Basic Information</h4>
                  
                  <div className="form-group">
                    <label>Session Title *</label>
                    <input
                      type="text"
                      required
                      value={formData.title}
                      onChange={(e) => setFormData(prev => ({...prev, title: e.target.value}))}
                      placeholder="Enter session title"
                    />
                  </div>

                  <div className="form-group">
                    <label>Description</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({...prev, description: e.target.value}))}
                      placeholder="Describe the session content and objectives..."
                      rows="4"
                    />
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Session Type *</label>
                      <select
                        required
                        value={formData.type}
                        onChange={(e) => setFormData(prev => ({...prev, type: e.target.value}))}
                      >
                        <option value="presentation">Presentation</option>
                        <option value="workshop">Workshop</option>
                        <option value="keynote">Keynote</option>
                        <option value="panel">Panel Discussion</option>
                        <option value="networking">Networking</option>
                        <option value="breakout">Breakout Session</option>
                        <option value="qa">Q&A Session</option>
                        <option value="demo">Demo</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Skill Level</label>
                      <select
                        value={formData.skillLevel}
                        onChange={(e) => setFormData(prev => ({...prev, skillLevel: e.target.value}))}
                      >
                        <option value="all">All Levels</option>
                        <option value="beginner">Beginner</option>
                        <option value="intermediate">Intermediate</option>
                        <option value="advanced">Advanced</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Category</label>
                    <input
                      type="text"
                      value={formData.category}
                      onChange={(e) => setFormData(prev => ({...prev, category: e.target.value}))}
                      placeholder="e.g., Technology, Business, Design"
                    />
                  </div>
                </div>

                {/* Schedule & Location */}
                <div className="form-section">
                  <h4>Schedule & Location</h4>
                  
                  <div className="form-row">
                    <div className="form-group">
                      <label>Start Time *</label>
                      <input
                        type="datetime-local"
                        required
                        value={formData.startTime}
                        onChange={(e) => setFormData(prev => ({...prev, startTime: e.target.value}))}
                      />
                    </div>

                    <div className="form-group">
                      <label>End Time *</label>
                      <input
                        type="datetime-local"
                        required
                        value={formData.endTime}
                        onChange={(e) => setFormData(prev => ({...prev, endTime: e.target.value}))}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>
                      <input
                        type="checkbox"
                        checked={formData.location.isVirtual}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          location: {...prev.location, isVirtual: e.target.checked}
                        }))}
                      />
                      Virtual Session
                    </label>
                  </div>

                  {formData.location.isVirtual ? (
                    <div className="form-group">
                      <label>Virtual Meeting Link</label>
                      <input
                        type="url"
                        value={formData.location.virtualLink}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          location: {...prev.location, virtualLink: e.target.value}
                        }))}
                        placeholder="https://zoom.us/j/..."
                      />
                    </div>
                  ) : (
                    <>
                      <div className="form-group">
                        <label>Venue</label>
                        <input
                          type="text"
                          value={formData.location.venue}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            location: {...prev.location, venue: e.target.value}
                          }))}
                          placeholder="Conference center, hotel, etc."
                        />
                      </div>

                      <div className="form-row">
                        <div className="form-group">
                          <label>Room</label>
                          <input
                            type="text"
                            value={formData.location.room}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              location: {...prev.location, room: e.target.value}
                            }))}
                            placeholder="Room name or number"
                          />
                        </div>

                        <div className="form-group">
                          <label>Floor</label>
                          <input
                            type="text"
                            value={formData.location.floor}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              location: {...prev.location, floor: e.target.value}
                            }))}
                            placeholder="Floor number"
                          />
                        </div>
                      </div>
                    </>
                  )}

                  <div className="form-row">
                    <div className="form-group">
                      <label>Capacity</label>
                      <input
                        type="number"
                        min="0"
                        value={formData.capacity}
                        onChange={(e) => setFormData(prev => ({...prev, capacity: parseInt(e.target.value) || 0}))}
                        placeholder="Maximum attendees (0 = unlimited)"
                      />
                    </div>

                    <div className="form-group">
                      <label>
                        <input
                          type="checkbox"
                          checked={formData.registrationRequired}
                          onChange={(e) => setFormData(prev => ({...prev, registrationRequired: e.target.checked}))}
                        />
                        Registration Required
                      </label>
                    </div>
                  </div>
                </div>

                {/* Speakers */}
                <div className="form-section">
                  <h4>Speakers</h4>
                  
                  <div className="form-group">
                    <label>Select Speakers</label>
                    <div className="speakers-selection">
                      {speakers.map(speaker => (
                        <label key={speaker._id} className="speaker-checkbox">
                          <input
                            type="checkbox"
                            checked={formData.speakers.includes(speaker._id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormData(prev => ({
                                  ...prev,
                                  speakers: [...prev.speakers, speaker._id]
                                }));
                              } else {
                                setFormData(prev => ({
                                  ...prev,
                                  speakers: prev.speakers.filter(id => id !== speaker._id)
                                }));
                              }
                            }}
                          />
                          <div className="speaker-info">
                            {speaker.profileImage ? (
                              <img src={speaker.profileImage} alt={speaker.name} />
                            ) : (
                              <div className="speaker-placeholder">
                                {speaker.name.charAt(0)}
                              </div>
                            )}
                            <div>
                              <span className="speaker-name">{speaker.name}</span>
                              {speaker.title && <span className="speaker-title">{speaker.title}</span>}
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                    {speakers.length === 0 && (
                      <p className="no-speakers">No confirmed speakers available. Add speakers first.</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingSession(null);
                    resetForm();
                  }}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingSession ? 'Update Session' : 'Add Session'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SessionManagement;
