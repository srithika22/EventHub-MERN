import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import { API_BASE_URL } from '../utils/api';
import EventImage from '../components/EventImage';
import './ParticipantDashboard.css';
import './ParticipantDashboardExtras.css';
import './PastEventsStyles.css';
import '../components/EventImage.css';

// Utility to handle different ID formats (string vs object)
const normalizeId = (id) => {
  if (!id) return null;
  if (typeof id === 'string') return id.trim();
  if (typeof id === 'object' && id._id) return String(id._id).trim();
  if (typeof id === 'object' && typeof id.toString === 'function') {
    return id.toString().trim();
  }
  return String(id).trim();
};

// Utility function to normalize registration data from the API
const cleanRegistrationData = (data) => {
  if (!Array.isArray(data)) {
    console.error('API response is not an array:', data);
    return [];
  }

  const normalizedData = data.map(item => {
    if (!item) return null;

    // Case 1: Already in the correct { event, registration } format
    if (item.event && item.registration) {
      return item;
    }

    // Case 2: Raw Registration object with a populated 'event' property
    if (item._id && item.event && item.ticketTypeName) {
      return {
        event: item.event,
        registration: {
          _id: item._id,
          ticketTypeName: item.ticketTypeName || 'General Admission',
          quantity: item.quantity || 1,
          status: item.status || 'confirmed',
          ticketCode: item.ticketCode || `TKT-${item._id?.toString().slice(-6).toUpperCase()}`,
          createdAt: item.createdAt || new Date(),
        },
      };
    }

    // Case 2b: Raw Registration object with a populated 'event' property but missing ticketTypeName
    if (item._id && item.event) {
      console.log('Processing registration without ticketTypeName:', item);
      return {
        event: item.event,
        registration: {
          _id: item._id,
          ticketTypeName: item.ticketTypeName || item.event.ticketTypes?.[0]?.name || 'General Admission',
          quantity: item.quantity || 1,
          status: item.status || 'confirmed',
          ticketCode: item.ticketCode || `TKT-${item._id?.toString().slice(-6).toUpperCase()}`,
          createdAt: item.createdAt || new Date(),
        },
      };
    }

    // Case 3: It's a direct Event object
    if (item.title && item._id && !item.registration) {
      return {
        event: item,
        registration: { // Create a mock registration object for consistency
          _id: `reg-${item._id}`,
          ticketTypeName: item.ticketTypes?.[0]?.name || 'General Admission',
          quantity: 1,
          status: 'confirmed',
          ticketCode: 'N/A',
          createdAt: new Date(),
        }
      };
    }

    console.warn('Unrecognized registration format, discarding item:', item);
    return null;
  });

  // Filter out any nulls or items that couldn't be normalized or are invalid
  return normalizedData.filter(item => item && item.event?._id && item.registration);
};


function ParticipantDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [myEvents, setMyEvents] = useState([]);
  const [pastEvents, setPastEvents] = useState([]);
  const [availableEvents, setAvailableEvents] = useState([]);
  const [loadingMyEvents, setLoadingMyEvents] = useState(true);
  const [loadingPastEvents, setLoadingPastEvents] = useState(true);
  const [loadingAvailableEvents, setLoadingAvailableEvents] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Speaker and session data for enhanced event cards
  const [eventSpeakers, setEventSpeakers] = useState({});
  const [eventSessions, setEventSessions] = useState({});

  const handleLogout = () => {
    logout();
    navigate('/login');
    toast.success("You've been logged out.");
  };

  const fetchMyEvents = useCallback(async () => {
    setLoadingMyEvents(true);
    setError(null);
    const token = localStorage.getItem('token');
    if (!token) {
      toast.error('Authentication token not found.');
      navigate('/login');
      return;
    }
    try {
      const authHeader = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
      const response = await fetch('${API_BASE_URL}/api/registrations/my-tickets', {
        headers: { 'Authorization': authHeader }
      });

      if (response.ok) {
        const data = await response.json();
        // console.log('Fetched raw registration data:', data);
        
        // Log the structure of raw data items for debugging (commented out to reduce console noise)
        // data.forEach((item, index) => {
        //   console.log(`Registration ${index}:`, {
        //     hasEvent: !!item?.event,
        //     eventId: item?.event?._id,
        //     eventTitle: item?.event?.title,
        //     ticketTypeName: item?.ticketTypeName,
        //     ticketCode: item?.ticketCode,
        //     quantity: item?.quantity,
        //     status: item?.status,
        //     rawItem: item
        //   });
        // });
        
        const processedData = cleanRegistrationData(data);
        console.log('Processed registration data:', processedData);
        
        // Additional debugging: check each processed item (commented out to reduce console noise)
        // processedData.forEach((item, index) => {
        //   console.log(`Processed registration ${index}:`, {
        //     eventTitle: item.event?.title,
        //     registrationId: item.registration?._id,
        //     ticketCode: item.registration?.ticketCode,
        //     ticketTypeName: item.registration?.ticketTypeName,
        //     quantity: item.registration?.quantity,
        //     status: item.registration?.status
        //   });
        // });
        
        // Separate current and past events based on date
        const currentDate = new Date();
        const upcomingEvents = [];
        const completedEvents = [];
        
        processedData.forEach(item => {
          const eventDate = new Date(item.event.date);
          if (eventDate >= currentDate) {
            upcomingEvents.push(item);
          } else {
            // Mark past events as attended if they were confirmed
            if (item.registration.status === 'confirmed') {
              item.registration.status = 'attended';
            }
            completedEvents.push(item);
          }
        });
        
        console.log(`Separated events: ${upcomingEvents.length} upcoming, ${completedEvents.length} past`);
        
        setMyEvents(upcomingEvents);
        setPastEvents(completedEvents);
        
        // Fetch speakers and sessions for all user events
        await fetchEventSpeakersAndSessions([...upcomingEvents, ...completedEvents]);
      } else {
        setError("Could not load your registrations.");
        if (response.status === 401) {
          toast.error('Your session has expired. Please log in again.');
          logout();
          navigate('/login');
        }
      }
    } catch (err) {
      console.error("Failed to fetch participant's events:", err);
      setError("An error occurred while fetching your events.");
    } finally {
      setLoadingMyEvents(false);
      setLoadingPastEvents(false);
    }
  }, [navigate, logout]);

  // Function to fetch speakers and sessions for events
  const fetchEventSpeakersAndSessions = async (events) => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const authHeader = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
    const speakers = {};
    const sessions = {};

    for (const { event } of events) {
      try {
        // Fetch speakers for this event
        const speakersResponse = await fetch(`${API_BASE_URL}/api/speakers/event/${event._id}`, {
          headers: { 'Authorization': authHeader }
        });
        if (speakersResponse.ok) {
          speakers[event._id] = await speakersResponse.json();
        }

        // Fetch sessions for this event
        const sessionsResponse = await fetch(`${API_BASE_URL}/api/sessions/event/${event._id}`, {
          headers: { 'Authorization': authHeader }
        });
        if (sessionsResponse.ok) {
          sessions[event._id] = await sessionsResponse.json();
        }
      } catch (err) {
        console.error(`Failed to fetch speakers/sessions for event ${event._id}:`, err);
      }
    }

    setEventSpeakers(speakers);
    setEventSessions(sessions);
  };

  // Function to fetch speakers and sessions for browse events
  const fetchEventSpeakersAndSessionsForBrowse = async (events) => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const authHeader = token.startsWith('Bearer ') ? token : `Bearer ${token}`;

    for (const event of events) {
      try {
        // Fetch speakers for this event
        const speakersResponse = await fetch(`${API_BASE_URL}/api/speakers/event/${event._id}`, {
          headers: { 'Authorization': authHeader }
        });
        if (speakersResponse.ok) {
          const speakers = await speakersResponse.json();
          setEventSpeakers(prev => ({ ...prev, [event._id]: speakers }));
        }

        // Fetch sessions for this event
        const sessionsResponse = await fetch(`${API_BASE_URL}/api/sessions/event/${event._id}`, {
          headers: { 'Authorization': authHeader }
        });
        if (sessionsResponse.ok) {
          const sessions = await sessionsResponse.json();
          setEventSessions(prev => ({ ...prev, [event._id]: sessions }));
        }
      } catch (err) {
        console.error(`Failed to fetch speakers/sessions for event ${event._id}:`, err);
      }
    }
  };

  // Effect 1: Fetch initial user data once on component mount.
  useEffect(() => {
    fetchMyEvents();
  }, [fetchMyEvents]);

  // Effect 2: Fetch available events ONLY after user's events are loaded.
  useEffect(() => {
    if (loadingMyEvents) {
      return;
    }

    const fetchAndSetAvailableEvents = async () => {
      setLoadingAvailableEvents(true);
      const token = localStorage.getItem('token');
      if (!token) return;

      try {
        // Create set of registered event IDs with proper debugging
        const registeredEventIds = new Set(
          myEvents
            .map(item => {
              const eventId = normalizeId(item?.event?._id);
              console.log('Registered event ID:', eventId, 'from item:', item?.event?._id);
              return eventId;
            })
            .filter(Boolean)
        );
        console.log('Set of registered event IDs:', Array.from(registeredEventIds));
        
        const authHeader = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
        
        const response = await fetch('${API_BASE_URL}/api/events?status=published', {
          headers: { 'Authorization': authHeader }
        });

        if (response.ok) {
          const allEvents = await response.json();
          if (Array.isArray(allEvents)) {
            // console.log(`Received ${allEvents.length} total events from API`);
            // console.log(`Filtering out ${registeredEventIds.size} registered events`);
            
            const filteredEvents = allEvents.filter(event => {
              const eventId = normalizeId(event?._id);
              const isRegistered = registeredEventIds.has(eventId);
              // console.log(`Event ${event?.title} (${eventId}): ${isRegistered ? 'EXCLUDED (registered)' : 'INCLUDED (available)'}`);
              return eventId && !isRegistered;
            });
            
            // console.log(`Found ${filteredEvents.length} available events after filtering`);
            setAvailableEvents(filteredEvents);
            
            // Fetch speakers and sessions for available events as well
            if (filteredEvents.length > 0) {
              await fetchEventSpeakersAndSessionsForBrowse(filteredEvents);
            }
          }
        }
      } catch (err) {
        console.error("Error fetching available events:", err);
        toast.error("Could not load available events.");
      } finally {
        setLoadingAvailableEvents(false);
      }
    };

    fetchAndSetAvailableEvents();
    
    // Set up auto-refresh every 30 seconds for new events
    const refreshInterval = setInterval(() => {
      console.log('🔄 Auto-refreshing available events...');
      fetchAndSetAvailableEvents();
    }, 30000);

    // Cleanup interval on unmount or dependency change
    return () => clearInterval(refreshInterval);
    
  }, [myEvents, loadingMyEvents]);

  // Effect 3: ONLY responsible for setting the active tab based on the URL.
  useEffect(() => {
    const path = location.pathname;
    if (path.includes('/events')) setActiveTab('events');
    else if (path.includes('/past-events')) setActiveTab('past-events');
    else if (path.includes('/browse')) setActiveTab('browse');
    else if (path.includes('/profile')) setActiveTab('profile');
    else if (path.includes('/networking')) setActiveTab('networking');
    else if (path.includes('/qa')) setActiveTab('qa');
    else if (path.includes('/polling')) setActiveTab('polling');
    else if (path.includes('/business-cards')) setActiveTab('business-cards');
    else if (path.includes('/discussions')) setActiveTab('discussions');
    else setActiveTab('dashboard');
  }, [location.pathname]);

  return (
    <div className="dashboard-container">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h1 className="logo">EventHub</h1>
        </div>

        <div className="user-profile">
          <img
            src={user?.avatarUrl || `https://ui-avatars.com/api/?name=${user?.name || 'User'}&background=7C3AED&color=fff`}
            alt="Profile"
            className="avatar"
          />
          <div className="user-info">
            <h3 className="user-name">{user?.name || 'User'}</h3>
            <span className="user-role">Participant</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <Link to="/participant-dashboard" className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}>
            <i className="fas fa-th-large"></i>
            <span>Dashboard</span>
          </Link>
          <Link to="/participant-dashboard/events" className={`nav-item ${activeTab === 'events' ? 'active' : ''}`}>
            <i className="fas fa-ticket-alt"></i>
            <span>My Tickets</span>
          </Link>
          <Link to="/participant-dashboard/past-events" className={`nav-item ${activeTab === 'past-events' ? 'active' : ''}`}>
            <i className="fas fa-history"></i>
            <span>Past Events</span>
          </Link>
          <Link to="/participant-dashboard/browse" className={`nav-item ${activeTab === 'browse' ? 'active' : ''}`}>
            <i className="fas fa-search"></i>
            <span>Browse Events</span>
          </Link>
          <Link to="/participant-dashboard/profile" className={`nav-item ${activeTab === 'profile' ? 'active' : ''}`}>
            <i className="fas fa-user-circle"></i>
            <span>Profile</span>
          </Link>
          
          <div className="nav-section-divider">
            <span>Engagement</span>
          </div>
          
          <Link to="/participant-dashboard/networking" className={`nav-item ${activeTab === 'networking' ? 'active' : ''}`}>
            <i className="fas fa-users"></i>
            <span>Networking</span>
          </Link>
          <Link to="/participant-dashboard/qa" className={`nav-item ${activeTab === 'qa' ? 'active' : ''}`}>
            <i className="fas fa-question-circle"></i>
            <span>Q&A Sessions</span>
          </Link>
          <Link to="/participant-dashboard/polling" className={`nav-item ${activeTab === 'polling' ? 'active' : ''}`}>
            <i className="fas fa-poll"></i>
            <span>Live Polls</span>
          </Link>
          <Link to="/participant-dashboard/business-cards" className={`nav-item ${activeTab === 'business-cards' ? 'active' : ''}`}>
            <i className="fas fa-address-card"></i>
            <span>Business Cards</span>
          </Link>
          <Link to="/participant-dashboard/discussions" className={`nav-item ${activeTab === 'discussions' ? 'active' : ''}`}>
            <i className="fas fa-comments"></i>
            <span>Discussions</span>
          </Link>
          
          <button onClick={handleLogout} className="nav-item logout">
            <i className="fas fa-sign-out-alt"></i>
            <span>Logout</span>
          </button>
        </nav>
      </aside>

      <main className="main-content">
        <header className="content-header">
          <div className="header-title">
            <h2>
              {activeTab === 'dashboard' && 'Participant Dashboard'}
              {activeTab === 'events' && 'My Tickets'}
              {activeTab === 'past-events' && 'Past Events'}
              {activeTab === 'browse' && 'Browse Events'}
              {activeTab === 'profile' && 'My Profile'}
              {activeTab === 'networking' && 'Networking Directory'}
              {activeTab === 'qa' && 'Q&A Sessions'}
              {activeTab === 'polling' && 'Live Polls'}
              {activeTab === 'business-cards' && 'Digital Business Cards'}
              {activeTab === 'discussions' && 'Discussion Forums'}
            </h2>
            <p className="date">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
          <div className="welcome-message">
            <p>Welcome back, <strong>{user?.name}</strong></p>
          </div>
        </header>

        {error && (
          <div className="alert alert-error">
            <i className="fas fa-exclamation-triangle"></i>
            <span>{error}</span>
          </div>
        )}

        {/* Dashboard View */}
        {activeTab === 'dashboard' && (
          <div className="dashboard-content">
            <div className="widget-row">
              <div className="widget widget-upcoming">
                <div className="widget-header">
                  <h3>Upcoming Events</h3>
                  <Link to="/participant-dashboard/events" className="widget-link">View All</Link>
                </div>
                <div className="widget-content">
                  {loadingMyEvents ? (
                    <div className="loading"><i className="fas fa-spinner fa-spin"></i> Loading...</div>
                  ) : myEvents.length > 0 ? (
                    <div className="upcoming-events">
                      {myEvents.slice(0, 3).map(({ event }) => (
                        <Link to={`/events/${event._id}`} key={event._id} className="event-card">
                          <div className="event-details">
                            <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                              <h4 className="event-title">{event.title}</h4>
                              {event.providesCertificate && (
                                <span className="certificate-indicator" title="Certificate available">
                                  <i className="fas fa-certificate"></i>
                                </span>
                              )}
                            </div>
                            
                            {/* Show speakers and sessions count */}
                            {(eventSpeakers[event._id]?.length > 0 || eventSessions[event._id]?.length > 0) && (
                              <div className="event-features-mini">
                                {eventSpeakers[event._id]?.length > 0 && (
                                  <span className="feature-mini">
                                    <i className="fas fa-microphone"></i>
                                    {eventSpeakers[event._id].length}
                                  </span>
                                )}
                                {eventSessions[event._id]?.length > 0 && (
                                  <span className="feature-mini">
                                    <i className="fas fa-calendar-check"></i>
                                    {eventSessions[event._id].length}
                                  </span>
                                )}
                              </div>
                            )}
                            
                            <div className="event-meta">
                              <span><i className="fas fa-calendar-alt"></i> {new Date(event.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                              <span className="badge badge-registered">Registered</span>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <div className="empty-state">
                      <i className="fas fa-calendar-times"></i>
                      <p>No upcoming events</p>
                      <Link to="/participant-dashboard/browse" className="btn btn-primary">Find Events</Link>
                    </div>
                  )}
                </div>
              </div>

              <div className="widget widget-discover">
                <div className="widget-header">
                  <h3>Discover Events</h3>
                  <Link to="/participant-dashboard/browse" className="widget-link">See More</Link>
                </div>
                <div className="widget-content">
                  {loadingAvailableEvents ? (
                     <div className="loading"><i className="fas fa-spinner fa-spin"></i> Loading...</div>
                  ) : availableEvents.length > 0 ? (
                    <div className="event-recommendations">
                      {availableEvents.slice(0, 3).map(event => (
                        <Link to={`/events/${event._id}`} key={event._id} className="event-card">
                          <div className="event-details">
                            <span className="event-category">{event.category}</span>
                            <h4 className="event-title">{event.title}</h4>
                            
                            {/* Show speakers and sessions count */}
                            {(eventSpeakers[event._id]?.length > 0 || eventSessions[event._id]?.length > 0) && (
                              <div className="event-features-mini">
                                {eventSpeakers[event._id]?.length > 0 && (
                                  <span className="feature-mini">
                                    <i className="fas fa-microphone"></i>
                                    {eventSpeakers[event._id].length}
                                  </span>
                                )}
                                {eventSessions[event._id]?.length > 0 && (
                                  <span className="feature-mini">
                                    <i className="fas fa-calendar-check"></i>
                                    {eventSessions[event._id].length}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <div className="empty-state">
                      <i className="fas fa-search"></i>
                      <p>No new events to show</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Past Events Summary */}
            {pastEvents.length > 0 && (
              <div className="widget-row">
                <div className="widget widget-past-events">
                  <div className="widget-header">
                    <h3>Recent Past Events</h3>
                    <Link to="/participant-dashboard/past-events" className="widget-link">View All</Link>
                  </div>
                  <div className="widget-content">
                    <div className="past-events-summary">
                      {pastEvents.slice(0, 3).map(({ event, registration }) => (
                        <div key={registration._id} className="past-event-summary">
                          <div className="event-details">
                            <h5 className="event-title">{event.title}</h5>
                            <div className="event-meta">
                              <span>
                                <i className="fas fa-calendar-alt"></i>
                                {new Date(event.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                              </span>
                              <span className="badge badge-attended">Attended</span>
                            </div>
                          </div>
                        </div>
                      ))}
                      <div className="past-events-stats">
                        <div className="stat">
                          <span className="stat-value">{pastEvents.length}</span>
                          <span className="stat-label">Events Attended</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <div className="quick-actions">
              <h3>Quick Actions</h3>
              <div className="action-buttons">
                <Link to="/participant-dashboard/browse" className="action-btn"><i className="fas fa-search"></i><span>Find Events</span></Link>
                <Link to="/participant-dashboard/profile" className="action-btn"><i className="fas fa-user-edit"></i><span>Update Profile</span></Link>
                <Link to="/" className="action-btn"><i className="fas fa-home"></i><span>Homepage</span></Link>
              </div>
            </div>

            {/* Engagement Features Section */}
            <div className="engagement-features">
              <h3>Engagement Features</h3>
              <p className="section-description">Connect, interact, and engage with other attendees</p>
              <div className="engagement-grid">
                <div className="engagement-card networking">
                  <div className="card-icon">
                    <i className="fas fa-users"></i>
                  </div>
                  <div className="card-content">
                    <h4>Networking</h4>
                    <p>Connect with other attendees and build professional relationships</p>
                    <Link to="/participant-dashboard/networking" className="card-action">
                      Start Networking <i className="fas fa-arrow-right"></i>
                    </Link>
                  </div>
                </div>

                <div className="engagement-card qa">
                  <div className="card-icon">
                    <i className="fas fa-question-circle"></i>
                  </div>
                  <div className="card-content">
                    <h4>Q&A Sessions</h4>
                    <p>Ask questions and participate in live Q&A sessions</p>
                    <Link to="/participant-dashboard/qa" className="card-action">
                      Join Q&A <i className="fas fa-arrow-right"></i>
                    </Link>
                  </div>
                </div>

                <div className="engagement-card polling">
                  <div className="card-icon">
                    <i className="fas fa-poll"></i>
                  </div>
                  <div className="card-content">
                    <h4>Live Polls</h4>
                    <p>Participate in real-time polls and surveys</p>
                    <Link to="/participant-dashboard/polling" className="card-action">
                      Vote Now <i className="fas fa-arrow-right"></i>
                    </Link>
                  </div>
                </div>

                <div className="engagement-card business-cards">
                  <div className="card-icon">
                    <i className="fas fa-address-card"></i>
                  </div>
                  <div className="card-content">
                    <h4>Business Cards</h4>
                    <p>Create and exchange digital business cards</p>
                    <Link to="/participant-dashboard/business-cards" className="card-action">
                      Manage Cards <i className="fas fa-arrow-right"></i>
                    </Link>
                  </div>
                </div>

                <div className="engagement-card discussions">
                  <div className="card-icon">
                    <i className="fas fa-comments"></i>
                  </div>
                  <div className="card-content">
                    <h4>Discussions</h4>
                    <p>Join discussions and forums about your events</p>
                    <Link to="/participant-dashboard/discussions" className="card-action">
                      Join Discussions <i className="fas fa-arrow-right"></i>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Networking Tab */}
        {activeTab === 'networking' && (
          <div className="tab-content">
            <div className="tab-header">
              <h3>Networking Directory</h3>
              <p>Connect with attendees from your registered events</p>
            </div>
            <div className="networking-overview">
              <div className="event-networking-list">
                {myEvents.map(({ event }) => (
                  <div key={event._id} className="event-networking-item">
                    <div className="event-info">
                      <h4>{event.title}</h4>
                      <p>{new Date(event.date).toLocaleDateString()}</p>
                    </div>
                    <div className="networking-actions">
                      <Link to={`/events/${event._id}/networking`} className="btn btn-primary">
                        Start Networking
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Q&A Tab */}
        {activeTab === 'qa' && (
          <div className="tab-content">
            <div className="tab-header">
              <h3>Q&A Sessions</h3>
              <p>Ask questions and get answers from event organizers</p>
            </div>
            <div className="qa-overview">
              <div className="event-qa-list">
                {myEvents.map(({ event }) => (
                  <div key={event._id} className="event-qa-item">
                    <div className="event-info">
                      <h4>{event.title}</h4>
                      <p>{new Date(event.date).toLocaleDateString()}</p>
                    </div>
                    <div className="qa-actions">
                      <Link to={`/events/${event._id}/qa`} className="btn btn-primary">
                        Join Q&A
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Polling Tab */}
        {activeTab === 'polling' && (
          <div className="tab-content">
            <div className="tab-header">
              <h3>Live Polls</h3>
              <p>Participate in interactive polls during events</p>
            </div>
            <div className="polling-overview">
              <div className="event-polling-list">
                {myEvents.map(({ event }) => (
                  <div key={event._id} className="event-polling-item">
                    <div className="event-info">
                      <h4>{event.title}</h4>
                      <p>{new Date(event.date).toLocaleDateString()}</p>
                    </div>
                    <div className="polling-actions">
                      <Link to={`/events/${event._id}/live-polling`} className="btn btn-primary">
                        View Polls
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Business Cards Tab */}
        {activeTab === 'business-cards' && (
          <div className="tab-content">
            <div className="tab-header">
              <h3>Digital Business Cards</h3>
              <p>Create and manage your digital business cards</p>
            </div>
            <div className="business-cards-overview">
              <div className="event-cards-list">
                {myEvents.map(({ event }) => (
                  <div key={event._id} className="event-cards-item">
                    <div className="event-info">
                      <h4>{event.title}</h4>
                      <p>{new Date(event.date).toLocaleDateString()}</p>
                    </div>
                    <div className="cards-actions">
                      <Link to={`/events/${event._id}/business-cards`} className="btn btn-primary">
                        Manage Cards
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Discussions Tab */}
        {activeTab === 'discussions' && (
          <div className="tab-content">
            <div className="tab-header">
              <h3>Discussion Forums</h3>
              <p>Join conversations about your events</p>
            </div>
            <div className="discussions-overview">
              <div className="event-discussions-list">
                {myEvents.map(({ event }) => (
                  <div key={event._id} className="event-discussions-item">
                    <div className="event-info">
                      <h4>{event.title}</h4>
                      <p>{new Date(event.date).toLocaleDateString()}</p>
                    </div>
                    <div className="discussions-actions">
                      <Link to={`/events/${event._id}/forum`} className="btn btn-primary">
                        Join Discussion
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* My Tickets View */}
        {activeTab === 'events' && (
          <div className="events-content">
            <div className="section-header">
              <h3>My Registered Events</h3>
              <button className="btn-secondary" onClick={fetchMyEvents} disabled={loadingMyEvents}>
                <i className="fas fa-sync-alt"></i> Refresh
              </button>
            </div>
            {loadingMyEvents ? (
              <div className="loading-container"><i className="fas fa-spinner fa-spin"></i><p>Loading your events...</p></div>
            ) : myEvents.length > 0 ? (
              <div className="events-grid">
                {myEvents.map(({ event, registration }) => (
                  <div key={registration._id} className="registered-event-card">
                    <div className="event-header">
                      {event.imageUrl ? (
                        <EventImage 
                          src={event.imageUrl} 
                          alt={event.title}
                          style={{ width: '100%', height: '160px', objectFit: 'cover' }}
                        />
                      ) : (
                        <div className="event-placeholder" style={{ height: '160px' }}>
                          <i className="fas fa-calendar-alt"></i>
                        </div>
                      )}
                      <div className="event-status">
                        <span className={`status-badge status-${registration.status}`}>{registration.status}</span>
                      </div>
                    </div>
                    <div className="event-body">
                      <h4 className="event-title">{event.title}</h4>
                      
                      {/* Event Advanced Features Summary */}
                      {(eventSpeakers[event._id]?.length > 0 || eventSessions[event._id]?.length > 0) && (
                        <div className="event-features">
                          {eventSpeakers[event._id]?.length > 0 && (
                            <div className="feature-item">
                              <i className="fas fa-microphone"></i>
                              <span>{eventSpeakers[event._id].length} Speaker{eventSpeakers[event._id].length !== 1 ? 's' : ''}</span>
                            </div>
                          )}
                          {eventSessions[event._id]?.length > 0 && (
                            <div className="feature-item">
                              <i className="fas fa-calendar-check"></i>
                              <span>{eventSessions[event._id].length} Session{eventSessions[event._id].length !== 1 ? 's' : ''}</span>
                            </div>
                          )}
                        </div>
                      )}

                      <div className="ticket-info">
                        <div className="ticket-detail">
                          <span className="label">Code:</span>
                          <span className="value">{registration.ticketCode || `TKT-${registration._id?.toString().slice(-6).toUpperCase() || 'XXXX'}`}</span>
                        </div>
                        <div className="ticket-detail">
                          <span className="label">Type:</span>
                          <span className="value">{registration.ticketTypeName || 'General Admission'}</span>
                        </div>
                        <div className="ticket-detail">
                          <span className="label">Qty:</span>
                          <span className="value">{registration.quantity || 1}</span>
                        </div>
                      </div>
                      <div className="event-info">
                        <div className="info-item"><i className="fas fa-calendar-alt"></i><span>{new Date(event.date).toLocaleDateString()}</span></div>
                        <div className="info-item"><i className="fas fa-map-marker-alt"></i><span>{event.location}</span></div>
                      </div>
                      <div className="event-actions">
                         <Link to={`/events/${event._id}`} className="btn btn-outline">View Details</Link>
                         {event.virtualEvent && event.meetingLink && <a href={event.meetingLink} target="_blank" rel="noopener noreferrer" className="btn btn-primary">Join Event</a>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state-large">
                <i className="fas fa-ticket-alt"></i>
                <h3>No Registered Events</h3>
                <p>You haven't registered for any events yet. Let's find one for you!</p>
                <Link to="/participant-dashboard/browse" className="btn btn-primary btn-large">Browse Events</Link>
              </div>
            )}
          </div>
        )}

        {/* Past Events View */}
        {activeTab === 'past-events' && (
          <div className="past-events-content">
            <div className="section-header">
              <h3>My Past Events</h3>
              <button className="btn-secondary" onClick={fetchMyEvents} disabled={loadingPastEvents}>
                <i className="fas fa-sync-alt"></i> Refresh
              </button>
            </div>
            {loadingPastEvents ? (
              <div className="loading-container"><i className="fas fa-spinner fa-spin"></i><p>Loading your past events...</p></div>
            ) : pastEvents.length > 0 ? (
              <div className="events-grid">
                {pastEvents.map(({ event, registration }) => (
                  <div key={registration._id} className="past-event-card">
                    <div className="event-header">
                      {event.imageUrl ? (
                        <EventImage 
                          src={event.imageUrl} 
                          alt={event.title}
                          style={{ width: '100%', height: '160px', objectFit: 'cover' }}
                        />
                      ) : (
                        <div className="event-placeholder" style={{ height: '160px' }}>
                          <i className="fas fa-calendar-alt"></i>
                        </div>
                      )}
                      <div className="event-status">
                        <span className={`status-badge status-${registration.status}`}>
                          {registration.status === 'attended' ? 'Attended' : registration.status}
                        </span>
                      </div>
                    </div>
                    <div className="event-body">
                      <h4 className="event-title">{event.title}</h4>
                      <div className="ticket-info">
                        <div className="ticket-detail">
                          <span className="label">Code:</span>
                          <span className="value">{registration.ticketCode || `TKT-${registration._id?.toString().slice(-6).toUpperCase() || 'XXXX'}`}</span>
                        </div>
                        <div className="ticket-detail">
                          <span className="label">Type:</span>
                          <span className="value">{registration.ticketTypeName || 'General Admission'}</span>
                        </div>
                        <div className="ticket-detail">
                          <span className="label">Qty:</span>
                          <span className="value">{registration.quantity || 1}</span>
                        </div>
                      </div>
                      <div className="event-info">
                        <div className="info-item"><i className="fas fa-calendar-alt"></i><span>{new Date(event.date).toLocaleDateString()}</span></div>
                        <div className="info-item"><i className="fas fa-map-marker-alt"></i><span>{event.location}</span></div>
                      </div>
                      <div className="event-actions">
                         <Link to={`/events/${event._id}`} className="btn btn-outline">
                           <i className="fas fa-info-circle"></i> Event Details
                         </Link>
                         <button className="btn btn-success" disabled>
                           <i className="fas fa-check"></i> Attended
                         </button>
                         {event.providesCertificate && (
                           <button className="btn btn-primary">
                             <i className="fas fa-certificate"></i> Get Certificate
                           </button>
                         )}
                         <button className="btn btn-secondary" onClick={() => {
                           toast.info('Event feedback feature coming soon!');
                         }}>
                           <i className="fas fa-star"></i> Leave Review
                         </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state-large">
                <i className="fas fa-history"></i>
                <h3>No Past Events</h3>
                <p>You haven't attended any events yet. Start exploring events and build your experience!</p>
                <Link to="/participant-dashboard/browse" className="btn btn-primary btn-large">Find Events</Link>
              </div>
            )}
          </div>
        )}

        {/* Browse Events View */}
        {activeTab === 'browse' && (
           <div className="browse-content">
              <div className="section-header">
                  <h3>Explore Available Events</h3>
                  {/* The fetch is handled by the useEffect, manual refresh is optional */}
              </div>
              {loadingAvailableEvents ? (
                  <div className="loading-container"><i className="fas fa-spinner fa-spin"></i><p>Finding events...</p></div>
              ) : availableEvents.length > 0 ? (
                  <div className="events-grid">
                      {availableEvents.map(event => (
                          <div key={event._id} className="event-browse-card">
                              <div className="event-header">
                                  {event.imageUrl ? (
                                    <img src={event.imageUrl} alt={event.title} />
                                  ) : (
                                    <div className="event-placeholder">
                                      <i className="fas fa-calendar-alt"></i>
                                    </div>
                                  )}
                                  <div className="event-category-badge">{event.category}</div>
                              </div>
                              <div className="event-body">
                                  <h4 className="event-title">{event.title}</h4>
                                  
                                  {/* Event Advanced Features Summary */}
                                  {(eventSpeakers[event._id]?.length > 0 || eventSessions[event._id]?.length > 0) && (
                                    <div className="event-features">
                                      {eventSpeakers[event._id]?.length > 0 && (
                                        <div className="feature-item">
                                          <i className="fas fa-microphone"></i>
                                          <span>{eventSpeakers[event._id].length} Speaker{eventSpeakers[event._id].length !== 1 ? 's' : ''}</span>
                                        </div>
                                      )}
                                      {eventSessions[event._id]?.length > 0 && (
                                        <div className="feature-item">
                                          <i className="fas fa-calendar-check"></i>
                                          <span>{eventSessions[event._id].length} Session{eventSessions[event._id].length !== 1 ? 's' : ''}</span>
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  <div className="event-info">
                                      <div className="info-item"><i className="fas fa-calendar-alt"></i><span>{new Date(event.date).toLocaleDateString()}</span></div>
                                      <div className="info-item"><i className="fas fa-map-marker-alt"></i><span>{event.location}</span></div>
                                  </div>
                                  <p className="event-description">{event.description ? `${event.description.substring(0, 100)}...` : "No description."}</p>
                                  <div className="event-actions">
                                      <Link to={`/events/${event._id}`} className="btn btn-primary">View & Register</Link>
                                  </div>
                              </div>
                          </div>
                      ))}
                  </div>
              ) : (
                  <div className="empty-state-large">
                      <i className="fas fa-calendar-times"></i>
                      <h3>No New Events Available</h3>
                      <p>You're registered for all current events, or no events are published.</p>
                  </div>
              )}
           </div>
        )}

        {/* Profile View */}
        {activeTab === 'profile' && (
          <div className="profile-content">
            <div className="section-header"><h3>My Profile</h3></div>
            <div className="profile-card">
                <div className="profile-header">
                    <div className="profile-avatar">
                        <img src={user?.avatarUrl || `https://ui-avatars.com/api/?name=${user?.name || 'User'}&background=7C3AED&color=fff&size=200`} alt="Profile"/>
                    </div>
                    <div className="profile-info">
                        <h2>{user?.name || 'User'}</h2>
                        <p className="email">{user?.email || 'email@example.com'}</p>
                        <p className="member-since">Member since: {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'Unknown'}</p>
                    </div>
                </div>
                <div className="profile-actions">
                    <button className="btn btn-outline"><i className="fas fa-edit"></i> Edit Profile</button>
                    <button className="btn btn-outline"><i className="fas fa-key"></i> Change Password</button>
                </div>
                <div className="profile-stats">
                    <div className="stat-item">
                        <span className="stat-value">{myEvents.length}</span>
                        <span className="stat-label">Registered Events</span>
                    </div>
                </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default ParticipantDashboard;
