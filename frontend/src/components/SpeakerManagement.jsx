import React, { useState, useEffect } from 'react';
import './SpeakerManagement.css';

const SpeakerManagement = ({ eventId }) => {
  const [speakers, setSpeakers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingSpeaker, setEditingSpeaker] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    bio: '',
    title: '',
    company: '',
    profileImage: '',
    socialLinks: {
      linkedin: '',
      twitter: '',
      website: '',
      instagram: ''
    },
    expertise: [],
    experience: '',
    achievements: [],
    speakingTopics: [],
    isKeynoteSpeaker: false,
    speakerFee: {
      amount: 0,
      currency: 'USD'
    },
    availability: {
      startDate: '',
      endDate: '',
      preferredTimeSlots: []
    },
    contactPreferences: {
      phone: '',
      preferredContactMethod: 'email'
    }
  });

  useEffect(() => {
    if (eventId) {
      fetchSpeakers();
    }
  }, [eventId]);

  const fetchSpeakers = async () => {
    try {
      setLoading(true);
      const response = await fetch(`http://localhost:3001/api/speakers/event/${eventId}`);
      const data = await response.json();
      
      if (data.success) {
        setSpeakers(data.speakers);
      }
    } catch (error) {
      console.error('Error fetching speakers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const url = editingSpeaker 
        ? `http://localhost:3001/api/speakers/${editingSpeaker._id}`
        : 'http://localhost:3001/api/speakers';
      
      const method = editingSpeaker ? 'PUT' : 'POST';
      
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
        fetchSpeakers();
        resetForm();
        setShowAddModal(false);
        setEditingSpeaker(null);
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to save speaker');
      }
    } catch (error) {
      console.error('Error saving speaker:', error);
      alert('Network error occurred');
    }
  };

  const handleDelete = async (speakerId) => {
    if (!confirm('Are you sure you want to delete this speaker?')) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:3001/api/speakers/${speakerId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        fetchSpeakers();
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to delete speaker');
      }
    } catch (error) {
      console.error('Error deleting speaker:', error);
      alert('Network error occurred');
    }
  };

  const handleEdit = (speaker) => {
    setEditingSpeaker(speaker);
    setFormData({
      name: speaker.name || '',
      email: speaker.email || '',
      bio: speaker.bio || '',
      title: speaker.title || '',
      company: speaker.company || '',
      profileImage: speaker.profileImage || '',
      socialLinks: {
        linkedin: speaker.socialLinks?.linkedin || '',
        twitter: speaker.socialLinks?.twitter || '',
        website: speaker.socialLinks?.website || '',
        instagram: speaker.socialLinks?.instagram || ''
      },
      expertise: speaker.expertise || [],
      experience: speaker.experience || '',
      achievements: speaker.achievements || [],
      speakingTopics: speaker.speakingTopics || [],
      isKeynoteSpeaker: speaker.isKeynoteSpeaker || false,
      speakerFee: {
        amount: speaker.speakerFee?.amount || 0,
        currency: speaker.speakerFee?.currency || 'USD'
      },
      availability: {
        startDate: speaker.availability?.startDate ? new Date(speaker.availability.startDate).toISOString().split('T')[0] : '',
        endDate: speaker.availability?.endDate ? new Date(speaker.availability.endDate).toISOString().split('T')[0] : '',
        preferredTimeSlots: speaker.availability?.preferredTimeSlots || []
      },
      contactPreferences: {
        phone: speaker.contactPreferences?.phone || '',
        preferredContactMethod: speaker.contactPreferences?.preferredContactMethod || 'email'
      }
    });
    setShowAddModal(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      bio: '',
      title: '',
      company: '',
      profileImage: '',
      socialLinks: {
        linkedin: '',
        twitter: '',
        website: '',
        instagram: ''
      },
      expertise: [],
      experience: '',
      achievements: [],
      speakingTopics: [],
      isKeynoteSpeaker: false,
      speakerFee: {
        amount: 0,
        currency: 'USD'
      },
      availability: {
        startDate: '',
        endDate: '',
        preferredTimeSlots: []
      },
      contactPreferences: {
        phone: '',
        preferredContactMethod: 'email'
      }
    });
  };

  const handleArrayFieldChange = (field, index, value) => {
    const newArray = [...formData[field]];
    newArray[index] = value;
    setFormData(prev => ({
      ...prev,
      [field]: newArray
    }));
  };

  const addArrayField = (field) => {
    setFormData(prev => ({
      ...prev,
      [field]: [...prev[field], '']
    }));
  };

  const removeArrayField = (field, index) => {
    const newArray = formData[field].filter((_, i) => i !== index);
    setFormData(prev => ({
      ...prev,
      [field]: newArray
    }));
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      'confirmed': { label: 'Confirmed', class: 'status-confirmed' },
      'pending': { label: 'Pending', class: 'status-pending' },
      'declined': { label: 'Declined', class: 'status-declined' },
      'invited': { label: 'Invited', class: 'status-invited' }
    };
    
    const config = statusConfig[status] || { label: status, class: 'status-default' };
    return <span className={`status-badge ${config.class}`}>{config.label}</span>;
  };

  if (loading) {
    return (
      <div className="speaker-management">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading speakers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="speaker-management">
      <div className="speaker-header">
        <div className="header-content">
          <h2>Speaker Management</h2>
          <p className="header-subtitle">Manage speakers and presenters for your event</p>
        </div>
        <button 
          className="btn btn-primary"
          onClick={() => {
            resetForm();
            setEditingSpeaker(null);
            setShowAddModal(true);
          }}
        >
          <i className="fas fa-plus"></i>
          Add Speaker
        </button>
      </div>

      {speakers.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">
            <i className="fas fa-microphone-alt"></i>
          </div>
          <h3>No Speakers Added</h3>
          <p>Start building your speaker lineup by adding your first speaker</p>
          <button 
            className="btn btn-primary"
            onClick={() => {
              resetForm();
              setEditingSpeaker(null);
              setShowAddModal(true);
            }}
          >
            Add Your First Speaker
          </button>
        </div>
      ) : (
        <div className="speakers-grid">
          {speakers.map(speaker => (
            <div key={speaker._id} className="speaker-card">
              <div className="speaker-image">
                {speaker.profileImage ? (
                  <img src={speaker.profileImage} alt={speaker.name} />
                ) : (
                  <div className="placeholder-image">
                    <i className="fas fa-user"></i>
                  </div>
                )}
                {speaker.isKeynoteSpeaker && (
                  <div className="keynote-badge">
                    <i className="fas fa-star"></i>
                    Keynote
                  </div>
                )}
              </div>
              
              <div className="speaker-info">
                <h3 className="speaker-name">{speaker.name}</h3>
                {speaker.title && <p className="speaker-title">{speaker.title}</p>}
                {speaker.company && <p className="speaker-company">{speaker.company}</p>}
                
                <div className="speaker-status">
                  {getStatusBadge(speaker.status)}
                </div>
                
                {speaker.expertise && speaker.expertise.length > 0 && (
                  <div className="speaker-expertise">
                    {speaker.expertise.slice(0, 3).map((skill, index) => (
                      <span key={index} className="expertise-tag">{skill}</span>
                    ))}
                    {speaker.expertise.length > 3 && (
                      <span className="expertise-more">+{speaker.expertise.length - 3} more</span>
                    )}
                  </div>
                )}
                
                <div className="speaker-contact">
                  <a href={`mailto:${speaker.email}`} className="contact-link">
                    <i className="fas fa-envelope"></i>
                    {speaker.email}
                  </a>
                </div>
                
                {speaker.socialLinks && (
                  <div className="social-links">
                    {speaker.socialLinks.linkedin && (
                      <a href={speaker.socialLinks.linkedin} target="_blank" rel="noopener noreferrer">
                        <i className="fab fa-linkedin"></i>
                      </a>
                    )}
                    {speaker.socialLinks.twitter && (
                      <a href={speaker.socialLinks.twitter} target="_blank" rel="noopener noreferrer">
                        <i className="fab fa-twitter"></i>
                      </a>
                    )}
                    {speaker.socialLinks.website && (
                      <a href={speaker.socialLinks.website} target="_blank" rel="noopener noreferrer">
                        <i className="fas fa-globe"></i>
                      </a>
                    )}
                  </div>
                )}
              </div>
              
              <div className="speaker-actions">
                <button 
                  className="btn btn-outline btn-sm"
                  onClick={() => handleEdit(speaker)}
                >
                  <i className="fas fa-edit"></i>
                  Edit
                </button>
                <button 
                  className="btn btn-danger btn-sm"
                  onClick={() => handleDelete(speaker._id)}
                >
                  <i className="fas fa-trash"></i>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Speaker Modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content speaker-modal">
            <div className="modal-header">
              <h3>{editingSpeaker ? 'Edit Speaker' : 'Add New Speaker'}</h3>
              <button 
                className="modal-close"
                onClick={() => {
                  setShowAddModal(false);
                  setEditingSpeaker(null);
                  resetForm();
                }}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="speaker-form">
              <div className="form-grid">
                {/* Basic Information */}
                <div className="form-section">
                  <h4>Basic Information</h4>
                  
                  <div className="form-group">
                    <label>Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({...prev, name: e.target.value}))}
                      placeholder="Speaker's full name"
                    />
                  </div>

                  <div className="form-group">
                    <label>Email *</label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({...prev, email: e.target.value}))}
                      placeholder="speaker@example.com"
                    />
                  </div>

                  <div className="form-group">
                    <label>Job Title</label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData(prev => ({...prev, title: e.target.value}))}
                      placeholder="e.g., Senior Developer, CEO"
                    />
                  </div>

                  <div className="form-group">
                    <label>Company</label>
                    <input
                      type="text"
                      value={formData.company}
                      onChange={(e) => setFormData(prev => ({...prev, company: e.target.value}))}
                      placeholder="Company name"
                    />
                  </div>

                  <div className="form-group">
                    <label>Profile Image URL</label>
                    <input
                      type="url"
                      value={formData.profileImage}
                      onChange={(e) => setFormData(prev => ({...prev, profileImage: e.target.value}))}
                      placeholder="https://example.com/image.jpg"
                    />
                  </div>

                  <div className="form-group">
                    <label>
                      <input
                        type="checkbox"
                        checked={formData.isKeynoteSpeaker}
                        onChange={(e) => setFormData(prev => ({...prev, isKeynoteSpeaker: e.target.checked}))}
                      />
                      Keynote Speaker
                    </label>
                  </div>
                </div>

                {/* Biography & Experience */}
                <div className="form-section">
                  <h4>Biography & Experience</h4>
                  
                  <div className="form-group">
                    <label>Biography</label>
                    <textarea
                      value={formData.bio}
                      onChange={(e) => setFormData(prev => ({...prev, bio: e.target.value}))}
                      placeholder="Speaker's professional biography..."
                      rows="4"
                    />
                  </div>

                  <div className="form-group">
                    <label>Experience</label>
                    <textarea
                      value={formData.experience}
                      onChange={(e) => setFormData(prev => ({...prev, experience: e.target.value}))}
                      placeholder="Professional experience and background..."
                      rows="3"
                    />
                  </div>

                  {/* Expertise */}
                  <div className="form-group">
                    <label>Areas of Expertise</label>
                    {formData.expertise.map((item, index) => (
                      <div key={index} className="array-input">
                        <input
                          type="text"
                          value={item}
                          onChange={(e) => handleArrayFieldChange('expertise', index, e.target.value)}
                          placeholder="e.g., React, JavaScript, AI"
                        />
                        <button
                          type="button"
                          onClick={() => removeArrayField('expertise', index)}
                          className="remove-btn"
                        >
                          <i className="fas fa-times"></i>
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => addArrayField('expertise')}
                      className="add-btn"
                    >
                      <i className="fas fa-plus"></i> Add Expertise
                    </button>
                  </div>

                  {/* Speaking Topics */}
                  <div className="form-group">
                    <label>Speaking Topics</label>
                    {formData.speakingTopics.map((topic, index) => (
                      <div key={index} className="array-input">
                        <input
                          type="text"
                          value={topic}
                          onChange={(e) => handleArrayFieldChange('speakingTopics', index, e.target.value)}
                          placeholder="e.g., Building Scalable Apps"
                        />
                        <button
                          type="button"
                          onClick={() => removeArrayField('speakingTopics', index)}
                          className="remove-btn"
                        >
                          <i className="fas fa-times"></i>
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => addArrayField('speakingTopics')}
                      className="add-btn"
                    >
                      <i className="fas fa-plus"></i> Add Topic
                    </button>
                  </div>
                </div>

                {/* Social Links */}
                <div className="form-section">
                  <h4>Social Media & Contact</h4>
                  
                  <div className="form-group">
                    <label>LinkedIn Profile</label>
                    <input
                      type="url"
                      value={formData.socialLinks.linkedin}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        socialLinks: {...prev.socialLinks, linkedin: e.target.value}
                      }))}
                      placeholder="https://linkedin.com/in/username"
                    />
                  </div>

                  <div className="form-group">
                    <label>Twitter Profile</label>
                    <input
                      type="url"
                      value={formData.socialLinks.twitter}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        socialLinks: {...prev.socialLinks, twitter: e.target.value}
                      }))}
                      placeholder="https://twitter.com/username"
                    />
                  </div>

                  <div className="form-group">
                    <label>Website</label>
                    <input
                      type="url"
                      value={formData.socialLinks.website}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        socialLinks: {...prev.socialLinks, website: e.target.value}
                      }))}
                      placeholder="https://website.com"
                    />
                  </div>

                  <div className="form-group">
                    <label>Phone</label>
                    <input
                      type="tel"
                      value={formData.contactPreferences.phone}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        contactPreferences: {...prev.contactPreferences, phone: e.target.value}
                      }))}
                      placeholder="+1 (555) 123-4567"
                    />
                  </div>
                </div>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingSpeaker(null);
                    resetForm();
                  }}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingSpeaker ? 'Update Speaker' : 'Add Speaker'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SpeakerManagement;