import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import { API_BASE_URL } from '../utils/api';
import './EventDetailsPage.css';

function EventDetailsPage() {
  // Initialize hooks from React Router and our Auth Context
  const { id } = useParams(); 
  const { user } = useAuth();
  const navigate = useNavigate();

  // State for managing event data, loading, and errors
  const [event, setEvent] = useState(null);
  const [speakers, setSpeakers] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedTicket, setSelectedTicket] = useState({
    ticketTypeName: '',
    quantity: 1
  });
  const [registrationLoading, setRegistrationLoading] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [showRegistrationForm, setShowRegistrationForm] = useState(false);
  const [activeTab, setActiveTab] = useState('overview'); // overview, speakers, agenda
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    organization: '',
    specialRequirements: '',
    agreeToTerms: false,
    subscribeNewsletter: false
  });
  const [formErrors, setFormErrors] = useState({});

  // Validation function
  const validateForm = () => {
    const errors = {};
    
    if (!formData.name.trim()) {
      errors.name = 'Full name is required';
    } else if (formData.name.trim().length < 2) {
      errors.name = 'Name must be at least 2 characters';
    }
    
    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }
    
    if (formData.phone && !/^[\+]?[1-9][\d]{0,15}$/.test(formData.phone.replace(/[\s\-\(\)]/g, ''))) {
      errors.phone = 'Please enter a valid phone number';
    }
    
    if (!formData.agreeToTerms) {
      errors.agreeToTerms = 'You must agree to the terms and conditions';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Effect to fetch event data when the component loads
  useEffect(() => {
    const fetchEvent = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${API_BASE_URL}/api/events/${id}`);
        if (!response.ok) {
          throw new Error('Event not found. It might have been moved or deleted.');
        }
        const data = await response.json();
        setEvent(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    const checkRegistrationStatus = async () => {
      if (user) {
        try {
          const token = localStorage.getItem('token');
          const response = await fetch(`${API_BASE_URL}/api/registrations/my-tickets`, {
            headers: { 'Authorization': token }
          });
          
          if (response.ok) {
            const ticketData = await response.json();
            // Check if the user is already registered for this event
            const isAlreadyRegistered = Array.isArray(ticketData) && 
              ticketData.some(item => item && item.event && item.event._id === id);
            setIsRegistered(isAlreadyRegistered);
          }
        } catch (err) {
          console.error("Failed to check registration status:", err);
        }
      }
    };

    const fetchSpeakers = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/speakers/event/${id}`);
        const data = await response.json();
        if (data.success) {
          setSpeakers(data.speakers.filter(speaker => speaker.status === 'confirmed'));
        }
      } catch (err) {
        console.error("Failed to fetch speakers:", err);
      }
    };

    const fetchSessions = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/sessions/event/${id}`);
        const data = await response.json();
        if (data.success) {
          setSessions(data.sessions);
        }
      } catch (err) {
        console.error("Failed to fetch sessions:", err);
      }
    };
    
    fetchEvent();
    checkRegistrationStatus();
    fetchSpeakers();
    fetchSessions();
  }, [id, user]);
  
  // Initialize form data with user information if available
  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        name: user.name || '',
        email: user.email || ''
      }));
    }
  }, [user]);

  // Function to handle ticket selection
  const handleTicketSelection = (ticketTypeName) => {
    setSelectedTicket(prev => ({
      ...prev,
      ticketTypeName
    }));
  };

  // Function to handle quantity change
  const handleQuantityChange = (e) => {
    const value = parseInt(e.target.value);
    if (value > 0 && value <= 10) {
      setSelectedTicket(prev => ({
        ...prev,
        quantity: value
      }));
    }
  };

  // Function to handle form input changes
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === 'checkbox' ? checked : value;
    
    setFormData(prev => ({
      ...prev,
      [name]: newValue
    }));
    
    // Clear field-specific error when user starts typing
    if (formErrors[name]) {
      setFormErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
    
    // Real-time validation for email
    if (name === 'email' && value) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        setFormErrors(prev => ({
          ...prev,
          email: 'Please enter a valid email address'
        }));
      }
    }
    
    // Real-time validation for phone
    if (name === 'phone' && value) {
      if (!/^[\+]?[1-9][\d]{0,15}$/.test(value.replace(/[\s\-\(\)]/g, ''))) {
        setFormErrors(prev => ({
          ...prev,
          phone: 'Please enter a valid phone number'
        }));
      }
    }
  };

  // Function to start registration process
  const startRegistration = () => {
    // Check if a user is logged in
    if (!user) {
      toast.info('Please log in to register for events.');
      navigate('/login', { state: { from: `/events/${id}` } });
      return;
    }

    // Check if a ticket type is selected
    if (!selectedTicket.ticketTypeName && event.ticketTypes && event.ticketTypes.length > 1) {
      toast.warning('Please select a ticket type.');
      return;
    }
    
    // Make sure event has ticket types
    if (!event.ticketTypes || event.ticketTypes.length === 0) {
      toast.error('This event does not have any available tickets.');
      return;
    }

    // If all checks pass, show the registration form
    setShowRegistrationForm(true);
  };

  // Function to handle the registration submission
  const handleRegister = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.warning('Please fix the form errors before submitting.');
      return;
    }
    
    setRegistrationLoading(true);
    const token = localStorage.getItem('token');
    
    try {
      // Use the selected ticket type or the first one if there's only one option
      const ticketToUse = selectedTicket.ticketTypeName || 
        (event.ticketTypes && event.ticketTypes.length === 1 ? event.ticketTypes[0].name : null);
      
      if (!ticketToUse) {
        throw new Error('No valid ticket type selected');
      }
      
      const response = await fetch(`${API_BASE_URL}/api/registrations/${id}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': token 
        },
        body: JSON.stringify({
          ticketTypeName: ticketToUse,
          quantity: selectedTicket.quantity,
          attendeeInfo: {
            name: formData.name.trim(),
            email: formData.email.trim(),
            phone: formData.phone.trim(),
            address: formData.address.trim(),
            organization: formData.organization.trim(),
            specialRequirements: formData.specialRequirements.trim()
          },
          preferences: {
            subscribeNewsletter: formData.subscribeNewsletter
          }
        })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        toast.success('Successfully registered! Check your email for confirmation and ticket details.');
        setIsRegistered(true);
        setShowRegistrationForm(false);
        
        // Reset form
        setFormData({
          name: user?.name || '',
          email: user?.email || '',
          phone: '',
          address: '',
          organization: '',
          specialRequirements: '',
          agreeToTerms: false,
          subscribeNewsletter: false
        });
        setFormErrors({});
        
        navigate('/participant-dashboard/events');
      } else {
        toast.error(`Registration failed: ${data.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Registration error:', error);
      toast.error('Could not connect to the server. Please try again.');
    } finally {
      setRegistrationLoading(false);
    }
  };

  // Function to cancel registration process
  const cancelRegistration = () => {
    setShowRegistrationForm(false);
  };

  // --- Render logic ---
  if (loading) {
    return <div style={{ textAlign: 'center', padding: '5rem' }}><h2>Loading event...</h2></div>;
  }
  if (error) {
    return <div style={{ textAlign: 'center', padding: '5rem' }}><h2>Error: {error}</h2></div>;
  }
  if (!event) {
    return <div style={{ textAlign: 'center', padding: '5rem' }}><h2>Event not found</h2></div>;
  }

  return (
    <div className="event-details-page">
      <img 
        src={event.imageUrl || 'https://via.placeholder.com/900x400.png?text=Event+Image'} 
        alt={event.title} 
        className="event-banner-image" 
      />
      
      <div className="event-header">
        <h1>{event.title}</h1>
      </div>
      
      <div className="event-content-wrapper">
        <div className="event-main-content">
          {/* Event Meta Info */}
          <div className="event-meta-info">
            <div className="meta-item">
              <i className="fas fa-calendar-alt"></i>
              <span>
                {new Date(event.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                {event.time && ` at ${new Date(`2000-01-01T${event.time}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`}
              </span>
            </div>
            <div className="meta-item">
              <i className="fas fa-map-marker-alt"></i>
              <span>{event.location}</span>
            </div>
            <div className="meta-item">
              <i className="fas fa-tag"></i>
              <span>{event.category}</span>
            </div>
            <div className="meta-item">
              <i className="fas fa-user"></i>
              <span>Hosted by {event.organizer?.name || 'Our Team'}</span>
            </div>
            {event.providesCertificate && (
              <div className="meta-item certificate-badge">
                <i className="fas fa-certificate"></i>
                <span>Certificate Provided</span>
              </div>
            )}
          </div>

          {/* Tabbed Navigation */}
          <div className="event-tabs">
            <div className="tab-navigation">
              <button
                className={`tab-button ${activeTab === 'overview' ? 'active' : ''}`}
                onClick={() => setActiveTab('overview')}
              >
                <i className="fas fa-info-circle"></i>
                Overview
              </button>
              <button
                className={`tab-button ${activeTab === 'speakers' ? 'active' : ''}`}
                onClick={() => setActiveTab('speakers')}
              >
                <i className="fas fa-microphone"></i>
                Speakers
                {speakers.length > 0 && <span className="tab-count">({speakers.length})</span>}
              </button>
              <button
                className={`tab-button ${activeTab === 'agenda' ? 'active' : ''}`}
                onClick={() => setActiveTab('agenda')}
              >
                <i className="fas fa-calendar-check"></i>
                Agenda
                {sessions.length > 0 && <span className="tab-count">({sessions.length})</span>}
              </button>
            </div>

            <div className="tab-content">
              {/* Overview Tab */}
              {activeTab === 'overview' && (
                <div className="tab-panel overview-panel">
                  <div className="event-description">
                    <h3>About This Event</h3>
                    {event.virtualEvent && (
                      <div className="virtual-event-badge">
                        Virtual Event
                      </div>
                    )}
                    {event.ageRestriction && event.ageRestriction !== 'all' && (
                      <div className="age-restriction-badge">
                        {event.ageRestriction === 'custom' ? `${event.customAgeLimit}+ only` : event.ageRestriction}
                      </div>
                    )}
                    {event.providesCertificate && (
                      <div className="certificate-badge">
                        Certificate Provided
                      </div>
                    )}
                    <p>{event.description}</p>
                    {event.additionalInfo && (
                      <div className="additional-info">
                        <h4>Additional Information</h4>
                        <p>{event.additionalInfo}</p>
                      </div>
                    )}
                  </div>

                  {event.ticketTypes && event.ticketTypes.length > 0 && (
                    <div className="event-tickets">
                      <h3>Ticket Information</h3>
                      <div className="ticket-types-container">
                        {event.ticketTypes.map((ticket, index) => (
                          <div key={index} className="ticket-type-card">
                            <div className="ticket-type-header">
                              <h4>{ticket.name}</h4>
                              <span className="ticket-price">
                                {Number(ticket.price) === 0 ? 'Free' : `$${ticket.price}`}
                              </span>
                            </div>
                            <div className="ticket-type-details">
                              <div className="ticket-availability">
                                <span>Available: </span>
                                <span className="ticket-count">
                                  {ticket.capacity - (ticket.ticketsSold || 0)} of {ticket.capacity}
                                </span>
                              </div>
                              
                              {ticket.description && (
                                <div className="ticket-description">
                                  {ticket.description}
                                </div>
                              )}
                              
                              {ticket.earlyBird && new Date(ticket.earlyBirdEnds) > new Date() && (
                                <div className="ticket-early-bird">
                                  Early bird pricing until {new Date(ticket.earlyBirdEnds).toLocaleDateString()}
                                </div>
                              )}
                              
                              {ticket.saleEnds && (
                                <div className="ticket-sale-ends">
                                  Available until {new Date(ticket.saleEnds).toLocaleDateString()}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Speakers Tab */}
              {activeTab === 'speakers' && (
                <div className="tab-panel speakers-panel">
                  <div className="speakers-section">
                    <h3>Event Speakers</h3>
                    {speakers.length === 0 ? (
                      <div className="no-content-message">
                        <i className="fas fa-microphone-slash"></i>
                        <p>No speakers have been announced for this event yet.</p>
                      </div>
                    ) : (
                      <div className="speakers-grid">
                        {speakers.map((speaker) => (
                          <div key={speaker._id} className="speaker-card">
                            <div className="speaker-image">
                              {speaker.imageUrl ? (
                                <img src={speaker.imageUrl} alt={speaker.name} />
                              ) : (
                                <div className="speaker-avatar">
                                  <i className="fas fa-user"></i>
                                </div>
                              )}
                            </div>
                            <div className="speaker-info">
                              <h4>{speaker.name}</h4>
                              <p className="speaker-title">{speaker.title}</p>
                              <p className="speaker-company">{speaker.company}</p>
                              <p className="speaker-bio">{speaker.bio}</p>
                              
                              {speaker.expertise && speaker.expertise.length > 0 && (
                                <div className="speaker-expertise">
                                  {speaker.expertise.map((skill, index) => (
                                    <span key={index} className="expertise-tag">{skill}</span>
                                  ))}
                                </div>
                              )}

                              {(speaker.socialLinks?.linkedin || speaker.socialLinks?.twitter || speaker.socialLinks?.website) && (
                                <div className="speaker-social">
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
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Agenda Tab */}
              {activeTab === 'agenda' && (
                <div className="tab-panel agenda-panel">
                  <div className="agenda-section">
                    <h3>Event Agenda</h3>
                    {sessions.length === 0 ? (
                      <div className="no-content-message">
                        <i className="fas fa-calendar-times"></i>
                        <p>The agenda for this event will be available soon.</p>
                      </div>
                    ) : (
                      <div className="agenda-timeline">
                        {sessions
                          .sort((a, b) => new Date(`${a.date}T${a.startTime}`) - new Date(`${b.date}T${b.startTime}`))
                          .map((session) => (
                            <div key={session._id} className="agenda-item">
                              <div className="agenda-time">
                                <div className="session-date">
                                  {new Date(session.date).toLocaleDateString('en-US', { 
                                    month: 'short', 
                                    day: 'numeric' 
                                  })}
                                </div>
                                <div className="session-time">
                                  {new Date(`2000-01-01T${session.startTime}`).toLocaleTimeString('en-US', { 
                                    hour: 'numeric', 
                                    minute: '2-digit', 
                                    hour12: true 
                                  })}
                                  {session.endTime && (
                                    <span> - {new Date(`2000-01-01T${session.endTime}`).toLocaleTimeString('en-US', { 
                                      hour: 'numeric', 
                                      minute: '2-digit', 
                                      hour12: true 
                                    })}</span>
                                  )}
                                </div>
                              </div>
                              <div className="agenda-content">
                                <h4>{session.title}</h4>
                                <p className="session-description">{session.description}</p>
                                
                                <div className="session-details">
                                  {session.location && (
                                    <div className="session-location">
                                      <i className="fas fa-map-marker-alt"></i>
                                      <span>{session.location}</span>
                                    </div>
                                  )}
                                  {session.type && (
                                    <div className="session-type">
                                      <i className="fas fa-tag"></i>
                                      <span className={`session-type-badge ${session.type}`}>{session.type}</span>
                                    </div>
                                  )}
                                  {session.capacity && (
                                    <div className="session-capacity">
                                      <i className="fas fa-users"></i>
                                      <span>Capacity: {session.capacity}</span>
                                    </div>
                                  )}
                                </div>

                                {session.speaker && (
                                  <div className="session-speaker">
                                    <i className="fas fa-microphone"></i>
                                    <span>Speaker: {speakers.find(s => s._id === session.speaker)?.name || 'TBD'}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div className="event-sidebar">
          <div className="registration-card">
            <h3>Register for this Event</h3>
            {event.ticketTypes && event.ticketTypes.length > 0 && (
              <div className="ticket-summary">
                <p><strong>Select Ticket Type:</strong></p>
                <div className="ticket-selection">
                  {event.ticketTypes.map((ticket, index) => {
                    const isAvailable = (ticket.capacity - (ticket.ticketsSold || 0)) > 0;
                    const isSelected = selectedTicket.ticketTypeName === ticket.name;
                    
                    return (
                      <div 
                        key={index} 
                        className={`ticket-option ${!isAvailable ? 'sold-out' : ''} ${isSelected ? 'selected' : ''}`}
                        onClick={() => isAvailable && handleTicketSelection(ticket.name)}
                      >
                        <div className="ticket-option-details">
                          <span className="ticket-name">{ticket.name}</span>
                          <span className="ticket-price">
                            {Number(ticket.price) === 0 ? 'Free' : `$${ticket.price}`}
                          </span>
                        </div>
                        {!isAvailable ? (
                          <span className="sold-out-label">Sold Out</span>
                        ) : (
                          <span className="available-label">
                            {ticket.capacity - (ticket.ticketsSold || 0)} available
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
                
                {event.ticketTypes.length > 0 && (event.ticketTypes.length === 1 || selectedTicket.ticketTypeName) && (
                  <div className="quantity-selector">
                    <label htmlFor="quantity">Quantity:</label>
                    <select 
                      id="quantity" 
                      value={selectedTicket.quantity} 
                      onChange={handleQuantityChange}
                    >
                      {[...Array(10)].map((_, i) => (
                        <option key={i} value={i + 1}>{i + 1}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}
            
            {/* Check if user is already registered */}
            {isRegistered ? (
              <div className="already-registered">
                <i className="fas fa-check-circle"></i>
                <p>You are already registered for this event!</p>
                <Link to="/participant-dashboard/events" className="btn-view-ticket">View My Ticket</Link>
              </div>
            ) : showRegistrationForm ? (
              <form onSubmit={handleRegister} className="registration-form">
                <div className="form-header">
                  <h4>Attendee Information</h4>
                  <p>Please fill in your details to complete registration</p>
                </div>
                
                <div className="form-group">
                  <label htmlFor="name">Full Name *</label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className={formErrors.name ? 'error' : ''}
                    placeholder="Enter your full name"
                    required
                  />
                  {formErrors.name && <span className="error-text">{formErrors.name}</span>}
                </div>
                
                <div className="form-group">
                  <label htmlFor="email">Email Address *</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className={formErrors.email ? 'error' : ''}
                    placeholder="your.email@example.com"
                    required
                  />
                  {formErrors.email && <span className="error-text">{formErrors.email}</span>}
                </div>
                
                <div className="form-group">
                  <label htmlFor="phone">Phone Number</label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className={formErrors.phone ? 'error' : ''}
                    placeholder="+1 (555) 123-4567"
                  />
                  {formErrors.phone && <span className="error-text">{formErrors.phone}</span>}
                </div>
                
                <div className="form-group">
                  <label htmlFor="organization">Organization/Company</label>
                  <input
                    type="text"
                    id="organization"
                    name="organization"
                    value={formData.organization}
                    onChange={handleInputChange}
                    placeholder="Your company or organization (optional)"
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="address">Address</label>
                  <textarea
                    id="address"
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    placeholder="Your complete address (optional)"
                    rows="3"
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="specialRequirements">Special Requirements</label>
                  <textarea
                    id="specialRequirements"
                    name="specialRequirements"
                    value={formData.specialRequirements}
                    onChange={handleInputChange}
                    placeholder="Any dietary restrictions, accessibility needs, or special requests (optional)"
                    rows="2"
                  />
                </div>
                
                <div className="form-group checkbox">
                  <input
                    type="checkbox"
                    id="subscribeNewsletter"
                    name="subscribeNewsletter"
                    checked={formData.subscribeNewsletter}
                    onChange={handleInputChange}
                  />
                  <label htmlFor="subscribeNewsletter">Subscribe to event updates and newsletters</label>
                </div>
                
                <div className="form-group checkbox required">
                  <input
                    type="checkbox"
                    id="agreeToTerms"
                    name="agreeToTerms"
                    checked={formData.agreeToTerms}
                    onChange={handleInputChange}
                    className={formErrors.agreeToTerms ? 'error' : ''}
                    required
                  />
                  <label htmlFor="agreeToTerms">
                    I agree to the <a href="/terms" target="_blank">terms and conditions</a> and <a href="/privacy" target="_blank">privacy policy</a> *
                  </label>
                  {formErrors.agreeToTerms && <span className="error-text">{formErrors.agreeToTerms}</span>}
                </div>
                
                <div className="registration-summary">
                  <div className="summary-item">
                    <span>Event:</span>
                    <span>{event.title}</span>
                  </div>
                  <div className="summary-item">
                    <span>Ticket Type:</span>
                    <span>{selectedTicket.ticketTypeName || (event.ticketTypes && event.ticketTypes[0]?.name)}</span>
                  </div>
                  <div className="summary-item">
                    <span>Quantity:</span>
                    <span>{selectedTicket.quantity}</span>
                  </div>
                  {event.ticketTypes && (
                    <div className="summary-item total">
                      <span>Total:</span>
                      <span>
                        {(() => {
                          const ticket = event.ticketTypes.find(t => t.name === selectedTicket.ticketTypeName) || event.ticketTypes[0];
                          const total = (ticket?.price || 0) * selectedTicket.quantity;
                          return total === 0 ? 'Free' : `$${total.toFixed(2)}`;
                        })()}
                      </span>
                    </div>
                  )}
                </div>
                
                <div className="form-actions">
                  <button 
                    type="button" 
                    onClick={cancelRegistration}
                    className="btn-cancel"
                  >
                    <i className="fas fa-times"></i> Cancel
                  </button>
                  <button 
                    type="submit"
                    className={`btn-register ${registrationLoading ? 'loading' : ''}`}
                    disabled={registrationLoading}
                  >
                    {registrationLoading ? (
                      <>
                        <i className="fas fa-spinner fa-spin"></i> Processing...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-credit-card"></i> Complete Registration
                      </>
                    )}
                  </button>
                </div>
              </form>
            ) : (
              /* Registration Button */
              event.ticketTypes && event.ticketTypes.some(ticket => (ticket.capacity - (ticket.ticketsSold || 0)) > 0) ? (
                <button 
                  className="btn-register" 
                  onClick={startRegistration}
                >
                  <i className="fas fa-ticket-alt"></i> Register Now
                </button>
              ) : (
                <button className="btn-register sold-out-btn" disabled>
                  <i className="fas fa-times-circle"></i> Sold Out
                </button>
              )
            )}
            
            <p className="registration-note">
              * By registering, you agree to our terms and conditions.
            </p>
            
            {/* Networking Button */}
            <div className="networking-section">
              <Link 
                to={`/events/${event._id}/networking`} 
                className="btn-networking"
              >
                🤝 Connect with Attendees
              </Link>
              <Link 
                to={`/events/${event._id}/qa`} 
                className="btn-qa"
              >
                💬 Live Q&A
              </Link>
              <Link 
                to={`/events/${event._id}/business-cards`} 
                className="btn-business-cards"
              >
                💼 Digital Business Cards
              </Link>
              <Link 
                to={`/events/${event._id}/forum`} 
                className="btn-forum"
              >
                🗣️ Discussion Forum
              </Link>
              <Link 
                to={`/events/${event._id}/live-polling`} 
                className="btn-polling"
              >
                📊 Live Polls
              </Link>
              <p className="networking-note">
                Network with other participants, ask questions, exchange business cards, join discussions, and participate in live polls
              </p>
            </div>
          </div>
          
          {/* Accessibility Options Section */}
          {event.accessibility && (
            event.accessibility.wheelchairAccessible || 
            event.accessibility.assistiveListeningDevices || 
            event.accessibility.signLanguageInterpreter
          ) && (
            <div className="event-faq-section">
              <h3>Accessibility</h3>
              <div className="accessibility-section">
                {event.accessibility.wheelchairAccessible && (
                  <div className="accessibility-badge">
                    Wheelchair Accessible
                  </div>
                )}
                {event.accessibility.assistiveListeningDevices && (
                  <div className="accessibility-badge">
                    Assistive Listening Devices
                  </div>
                )}
                {event.accessibility.signLanguageInterpreter && (
                  <div className="accessibility-badge">
                    Sign Language Interpreter
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* FAQ Section */}
          {event.faq && event.faq.length > 0 && event.faq.some(item => item.question && item.answer) && (
            <div className="event-faq-section">
              <h3>Frequently Asked Questions</h3>
              {event.faq.map((item, index) => (
                item.question && item.answer ? (
                  <div key={index} className="faq-item">
                    <div className="faq-question">{item.question}</div>
                    <div className="faq-answer">{item.answer}</div>
                  </div>
                ) : null
              ))}
            </div>
          )}
          
          {/* Virtual Event Info */}
          {event.virtualEvent && event.meetingLink && (
            <div className="event-faq-section">
              <h3>Virtual Event Information</h3>
              <p>This is a virtual event. Registered participants will receive access to the following link:</p>
              <div className="meeting-link">
                <a href={event.meetingLink} target="_blank" rel="noopener noreferrer">
                  {event.meetingLink}
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default EventDetailsPage;