import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { API_BASE_URL } from '../utils/api';
import './LandingPage.css';
import EventCard from '../components/EventCard';
import Header from '../components/Header';

const CATEGORIES = [
  { value: 'All', label: 'All Events', icon: '🎯' },
  { value: 'Concert', label: 'Concerts', icon: '🎵' },
  { value: 'Webinar', label: 'Webinars', icon: '💻' },
  { value: 'Technical', label: 'Technical', icon: '⚙️' },
  { value: 'Non-Technical', label: 'Creative', icon: '🎨' },
  { value: 'Workshop', label: 'Workshops', icon: '🛠️' },
  { value: 'Sports', label: 'Sports', icon: '⚽' }
];

const FEATURED_COMPANIES = [
  'Google', 'Microsoft', 'Amazon', 'Meta', 'Netflix', 'Apple'
];

const TESTIMONIALS = [
  {
    id: 1,
    name: "Priya Sharma",
    role: "Software Developer",
    company: "TCS",
    image: "https://i.pravatar.cc/100?img=1",
    content: "EventHub has transformed how I discover tech events. Found amazing workshops that boosted my career!"
  },
  {
    id: 2,
    name: "Arjun Reddy",
    role: "Event Organizer",
    company: "StartupConf",
    image: "https://i.pravatar.cc/100?img=2", 
    content: "Managing events has never been easier. The analytics and participant management tools are incredible."
  },
  {
    id: 3,
    name: "Sneha Patel",
    role: "Marketing Manager",
    company: "InnovateCorp",
    image: "https://i.pravatar.cc/100?img=3",
    content: "Our company events get 3x more attendance since we started using EventHub. Highly recommended!"
  }
];

// Loading Skeleton Component
const EventSkeleton = () => (
  <div className="event-skeleton">
    <div className="skeleton-image"></div>
    <div className="skeleton-content">
      <div className="skeleton-category"></div>
      <div className="skeleton-title"></div>
      <div className="skeleton-title short"></div>
      <div className="skeleton-location"></div>
    </div>
  </div>
);

// Animated Counter Component
const AnimatedStat = ({ finalValue, label, suffix = '+' }) => {
  const [count, setCount] = useState(0);
  const targetRef = useRef(null);
  const [hasAnimated, setHasAnimated] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !hasAnimated) {
        setHasAnimated(true);
        let start = 0;
        const end = finalValue;
        const duration = 2000;
        const increment = end / (duration / 16);
        
        const timer = setInterval(() => {
          start += increment;
          if (start >= end) {
            setCount(end);
            clearInterval(timer);
          } else {
            setCount(Math.ceil(start));
          }
        }, 16);
        
        return () => clearInterval(timer);
      }
    }, { threshold: 0.8 });

    if (targetRef.current) observer.observe(targetRef.current);
    return () => observer.disconnect();
  }, [finalValue, hasAnimated]);

  return (
    <div className="stat-item" ref={targetRef}>
      <span className="stat-number">{count.toLocaleString()}{suffix}</span>
      <span className="stat-label">{label}</span>
    </div>
  );
};

function LandingPage() {
  const [activeTab, setActiveTab] = useState('All');
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [retryCount, setRetryCount] = useState(0);

  // Improved event fetching with better error handling
  const fetchEvents = async (category = activeTab, retries = 3) => {
    try {
      setLoading(true);
      setError(null);
      
      // Build URL with proper query parameters for Vite
      const baseUrl = API_BASE_URL;
      let url = `${baseUrl}/api/events?status=published`;
      
      if (category && category !== 'All') {
        url += `&category=${encodeURIComponent(category)}`;
      }
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        // Add timeout
        signal: AbortSignal.timeout(10000)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Validate and filter events
      const validEvents = Array.isArray(data) 
        ? data.filter(event => event && event._id && event.title && event.date)
        : [];
      
      setEvents(validEvents);
      setRetryCount(0);
      
    } catch (err) {
      console.error('Event fetch error:', err);
      
      if (retries > 0 && err.name !== 'AbortError') {
        setTimeout(() => fetchEvents(category, retries - 1), 2000);
        return;
      }
      
      let errorMessage = 'Unable to load events at the moment.';
      
      if (err.name === 'AbortError') {
        errorMessage = 'Request timed out. Please check your internet connection.';
      } else if (err.message.includes('NetworkError') || err.message.includes('fetch')) {
        errorMessage = 'Network error. Please check if the server is running.';
      } else if (err.message.includes('500')) {
        errorMessage = 'Server error. Please try again later.';
      } else if (err.message.includes('404')) {
        errorMessage = 'Events service not found. Please contact support.';
      }
      
      setError(errorMessage);
      setRetryCount(prev => prev + 1);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents(activeTab);
    
    // Set up auto-refresh every 30 seconds for new events
    const refreshInterval = setInterval(() => {
      console.log('🔄 Auto-refreshing events on landing page...');
      fetchEvents(activeTab);
    }, 30000);

    // Cleanup interval on unmount or dependency change
    return () => clearInterval(refreshInterval);
  }, [activeTab]);

  // Handle category change
  const handleCategoryChange = (category) => {
    setActiveTab(category);
    setSearchQuery(''); // Clear search when changing category
  };

  // Filter events based on search query
  const filteredEvents = events.filter(event => {
    if (!searchQuery) return true;
    
    const query = searchQuery.toLowerCase();
    return (
      event.title?.toLowerCase().includes(query) ||
      event.description?.toLowerCase().includes(query) ||
      event.location?.toLowerCase().includes(query) ||
      event.category?.toLowerCase().includes(query)
    );
  });

  // Scroll animation observer
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
        }
      });
    }, { threshold: 0.1, rootMargin: '50px' });

    const targets = document.querySelectorAll('.animate-on-scroll');
    targets.forEach(target => observer.observe(target));

    return () => observer.disconnect();
  }, []);

  const renderEvents = () => {
    if (loading) {
      return (
        <div className="event-grid">
          {[...Array(6)].map((_, index) => (
            <EventSkeleton key={index} />
          ))}
        </div>
      );
    }
    
    if (error) {
      return (
        <div className="error-state">
          <div className="error-icon">⚠️</div>
          <h3>Oops! Something went wrong</h3>
          <p>{error}</p>
          <button 
            className="btn btn-primary"
            onClick={() => fetchEvents(activeTab)}
            disabled={loading}
          >
            {loading ? 'Retrying...' : 'Try Again'}
          </button>
        </div>
      );
    }
    
    if (filteredEvents.length === 0) {
      return (
        <div className="empty-state">
          <div className="empty-icon">🎪</div>
          <h3>No events found</h3>
          <p>
            {searchQuery 
              ? `No events match "${searchQuery}". Try a different search term.`
              : `No upcoming events in ${activeTab === 'All' ? 'any category' : activeTab}. Check back soon!`
            }
          </p>
          {searchQuery && (
            <button 
              className="btn btn-secondary"
              onClick={() => setSearchQuery('')}
            >
              Clear Search
            </button>
          )}
        </div>
      );
    }

    return (
      <div className="event-grid">
        {filteredEvents.map(event => (
          <EventCard key={event._id} event={event} />
        ))}
      </div>
    );
  };

  return (
    <div className="landing-page">
      <Header />
      <main>
        {/* HERO SECTION */}
        <section className="hero-section">
          <div className="hero-bg-pattern"></div>
          <div className="container hero-content animate-on-scroll visible">
            <div className="hero-badge">
              <span>🚀 India's Leading Event Platform</span>
            </div>
            <h1>
              Discover Amazing Events.<br />
              <span className="gradient-text">Create Memorable Experiences.</span>
            </h1>
            <p>
              Join thousands of event enthusiasts discovering workshops, conferences, 
              concerts and networking events. From tech meetups to cultural festivals - 
              your next great experience starts here.
            </p>
            
            <div className="hero-stats">
              <div className="hero-stat">
                <span className="stat-number">50K+</span>
                <span className="stat-label">Active Users</span>
              </div>
              <div className="hero-stat">
                <span className="stat-number">1.2K+</span>
                <span className="stat-label">Events Hosted</span>
              </div>
              <div className="hero-stat">
                <span className="stat-number">95%</span>
                <span className="stat-label">Satisfaction Rate</span>
              </div>
            </div>
            
            <div className="hero-buttons">
              <a href="#events" className="btn btn-primary btn-large">
                <i className="fas fa-search"></i>
                Explore Events
              </a>
              <Link to="/signup-organizer" className="btn btn-secondary btn-large">
                <i className="fas fa-plus"></i>
                Host Your Event
              </Link>
            </div>
            
            <div className="trusted-by">
              <p>Trusted by teams at</p>
              <div className="company-logos">
                {FEATURED_COMPANIES.map(company => (
                  <span key={company} className="company-logo">{company}</span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* SEARCH & FILTER SECTION */}
        <section id="events" className="section events-section">
          <div className="container">
            <div className="section-header animate-on-scroll">
              <h2 className="section-title">Find Your Perfect Event</h2>
              <p className="section-subtitle">
                Discover curated events across various categories. Filter by your interests and location.
              </p>
            </div>

            {/* Search Bar */}
            <div className="search-section animate-on-scroll">
              <div className="search-container">
                <i className="fas fa-search search-icon"></i>
                <input
                  type="text"
                  placeholder="Search events by title, location, or description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="search-input"
                />
                {searchQuery && (
                  <button 
                    className="clear-search"
                    onClick={() => setSearchQuery('')}
                    aria-label="Clear search"
                  >
                    <i className="fas fa-times"></i>
                  </button>
                )}
              </div>
            </div>

            {/* Category Filters */}
            <div className="event-tabs animate-on-scroll">
              {CATEGORIES.map(category => (
                <button
                  key={category.value}
                  className={`tab-button ${activeTab === category.value ? 'active' : ''}`}
                  onClick={() => handleCategoryChange(category.value)}
                >
                  <span className="tab-icon">{category.icon}</span>
                  {category.label}
                </button>
              ))}
            </div>

            {/* Results Info */}
            {!loading && !error && (
              <div className="results-info animate-on-scroll">
                <p>
                  {searchQuery ? (
                    <>Showing {filteredEvents.length} results for "<strong>{searchQuery}</strong>"</>
                  ) : (
                    <>Showing {filteredEvents.length} {activeTab === 'All' ? 'upcoming events' : `${activeTab.toLowerCase()} events`}</>
                  )}
                </p>
              </div>
            )}

            {/* Events Grid */}
            <div className="animate-on-scroll">
              {renderEvents()}
            </div>
          </div>
        </section>

        {/* FEATURES SECTION */}
        <section id="features" className="section features-section">
          <div className="container">
            <div className="section-header animate-on-scroll">
              <h2 className="section-title">Why Choose EventHub?</h2>
              <p className="section-subtitle">
                Everything you need to discover, attend, and organize exceptional events
              </p>
            </div>
            
            <div className="features-grid">
              <div className="feature-card animate-on-scroll">
                <div className="feature-icon">
                  <i className="fas fa-search"></i>
                </div>
                <h3>Smart Discovery</h3>
                <p>AI-powered recommendations help you find events perfectly matched to your interests and schedule.</p>
              </div>
              
              <div className="feature-card animate-on-scroll">
                <div className="feature-icon">
                  <i className="fas fa-shield-alt"></i>
                </div>
                <h3>Secure Bookings</h3>
                <p>Safe and secure payment processing with instant confirmation and digital tickets.</p>
              </div>
              
              <div className="feature-card animate-on-scroll">
                <div className="feature-icon">
                  <i className="fas fa-users"></i>
                </div>
                <h3>Community Driven</h3>
                <p>Connect with like-minded people, network with professionals, and build lasting relationships.</p>
              </div>
              
              <div className="feature-card animate-on-scroll">
                <div className="feature-icon">
                  <i className="fas fa-chart-line"></i>
                </div>
                <h3>Organizer Tools</h3>
                <p>Comprehensive analytics, participant management, and marketing tools for successful events.</p>
              </div>
              
              <div className="feature-card animate-on-scroll">
                <div className="feature-icon">
                  <i className="fas fa-mobile-alt"></i>
                </div>
                <h3>Mobile First</h3>
                <p>Seamless experience across all devices with our responsive design and mobile app.</p>
              </div>
              
              <div className="feature-card animate-on-scroll">
                <div className="feature-icon">
                  <i className="fas fa-headset"></i>
                </div>
                <h3>24/7 Support</h3>
                <p>Round-the-clock customer support to help you with any questions or issues.</p>
              </div>
            </div>
          </div>
        </section>

        {/* STATS SECTION */}
        <section className="stats-section">
          <div className="container">
            <div className="stats-grid animate-on-scroll">
              <AnimatedStat finalValue={50000} label="Happy Attendees" />
              <AnimatedStat finalValue={1200} label="Successful Events" />
              <AnimatedStat finalValue={42} label="Cities Covered" />
              <AnimatedStat finalValue={98} label="Satisfaction Rate" suffix="%" />
            </div>
          </div>
        </section>

        {/* TESTIMONIALS SECTION */}
        <section className="testimonials-section section">
          <div className="container">
            <div className="section-header animate-on-scroll">
              <h2 className="section-title">What Our Community Says</h2>
              <p className="section-subtitle">
                Join thousands of satisfied users who trust EventHub for their event experiences
              </p>
            </div>
            
            <div className="testimonials-grid">
              {TESTIMONIALS.map((testimonial, index) => (
                <div key={testimonial.id} className={`testimonial-card animate-on-scroll delay-${index + 1}`}>
                  <div className="testimonial-content">
                    <div className="stars">
                      {[...Array(5)].map((_, i) => (
                        <i key={i} className="fas fa-star"></i>
                      ))}
                    </div>
                    <p>"{testimonial.content}"</p>
                  </div>
                  <div className="testimonial-author">
                    <img src={testimonial.image} alt={testimonial.name} />
                    <div>
                      <div className="author-name">{testimonial.name}</div>
                      <div className="author-title">{testimonial.role} at {testimonial.company}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA SECTION */}
        <section className="cta-section">
          <div className="container">
            <div className="cta-content animate-on-scroll">
              <h2>Ready to Get Started?</h2>
              <p>
                Join thousands of event enthusiasts and organizers who choose EventHub 
                for their event needs. Create your account today!
              </p>
              <div className="cta-buttons">
                <Link to="/signup" className="btn btn-primary btn-large">
                  <i className="fas fa-user-plus"></i>
                  Join as Participant
                </Link>
                <Link to="/signup-organizer" className="btn btn-secondary btn-large">
                  <i className="fas fa-rocket"></i>
                  Become an Organizer
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default LandingPage;
