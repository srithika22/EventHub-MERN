import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import './CreateEventPage.css';
import './AIPanel.css';

function CreateEventPage() {
  const { isAuthenticated, token } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isEditing, setIsEditing] = useState(false);
  const [eventId, setEventId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    eventType: '',
    title: '',
    category: '',
    location: '',
    description: '',
    date: '',
    time: '',
    image: null,
    imagePreview: null,
    ticketTypes: [{ name: 'General Admission', price: '0', capacity: '100', description: '', earlyBird: false, earlyBirdEnds: '', saleEnds: '' }],
    providesCertificate: false,
    virtualEvent: false,
    meetingLink: '',
    ageRestriction: 'all',
    customAgeLimit: '',
    accessibility: {
      wheelchairAccessible: false,
      assistiveListeningDevices: false,
      signLanguageInterpreter: false
    },
    socialSharing: true,
    faq: [{question: '', answer: ''}],
    status: 'published', // Default to published so events are visible immediately
    // New AI and enhancement features
    aiGeneratedImages: [],
    certificateSettings: {
      enabled: false,
      template: 'modern',
      issuingAuthority: '',
      customText: '',
      designColor: '#6366f1'
    },
    feedbackSurvey: {
      enabled: false,
      questions: ['How would you rate this event?', 'What did you like most?', 'Any suggestions for improvement?']
    },
    socialOptimization: {
      autoHashtags: true,
      shareableImages: true,
      generateQR: true
    },
    // Event type specific fields
    recurring: {
      pattern: 'weekly', // weekly, monthly, custom
      frequency: 1,
      daysOfWeek: [],
      endDate: '',
      maxOccurrences: '',
      seriesDiscount: 0,
      individualBooking: true,
      seriesBooking: true
    },
    multiDate: {
      dates: [{ date: '', startTime: '', endTime: '', venue: '', description: '' }],
      venues: [{ name: '', address: '', capacity: '', facilities: [] }],
      dayPasses: [],
      fullPackage: { enabled: true, discount: 10 }
    },
    appointment: {
      duration: 30, // minutes
      timeSlots: [],
      bufferTime: 15,
      advanceBooking: { min: 1, max: 30 }, // days
      cancellationPolicy: '24h',
      autoConfirm: true,
      maxBookingsPerSlot: 1,
      workingHours: { start: '09:00', end: '17:00' },
      workingDays: [1, 2, 3, 4, 5] // Monday to Friday
    },
    // Advanced features
    liveStreaming: {
      enabled: false,
      platform: 'zoom', // zoom, youtube, custom
      streamKey: '',
      chatEnabled: true,
      recordingEnabled: false
    },
    networking: {
      enabled: false,
      attendeeDirectory: true,
      matchmaking: false,
      chatRooms: [],
      businessCardExchange: true
    },
    gamification: {
      enabled: false,
      points: { attendance: 10, engagement: 5, completion: 20 },
      badges: [],
      leaderboard: true,
      rewards: []
    },
    analytics: {
      realTimeTracking: true,
      heatmaps: false,
      attendeeJourney: true,
      feedbackAnalysis: true
    },
    // Engagement Features
    engagementFeatures: {
      networkingDirectory: {
        enabled: true,
        skillMatching: false,
        profileSharing: true
      },
      liveQA: {
        enabled: true,
        allowAnonymous: true,
        moderatorApproval: false,
        votingEnabled: true
      },
      polling: {
        enabled: true,
        allowAnonymous: true,
        realTimeResults: true
      },
      businessCards: {
        enabled: true,
        qrCodeSharing: true,
        digitalExchange: true
      },
      discussionForum: {
        enabled: true,
        categories: ['general', 'networking', 'feedback'],
        moderation: true
      }
    }
  });

  // Helper function to ensure string fields are never null
  const ensureStringValue = (value, defaultValue = '') => {
    return value === null || value === undefined ? defaultValue : String(value);
  };

  // Function to fetch event data for editing
  const fetchEventData = async (id) => {
    try {
      const authHeader = token && token.startsWith('Bearer') ? token : `Bearer ${token}`;
      const response = await fetch(`http://localhost:3001/api/events/${id}`, {
        headers: { 'Authorization': authHeader }
      });
      
      if (response.ok) {
        const eventData = await response.json();
        // Update form data with existing event data, ensuring no null values
        setFormData({
          ...formData,
          title: ensureStringValue(eventData.title),
          category: ensureStringValue(eventData.category),
          location: ensureStringValue(eventData.location),
          description: ensureStringValue(eventData.description),
          date: new Date(eventData.date).toISOString().split('T')[0],
          time: new Date(eventData.date).toISOString().split('T')[1].substring(0, 5),
          imagePreview: eventData.imageUrl,
          ticketTypes: eventData.ticketTypes || formData.ticketTypes,
          providesCertificate: eventData.providesCertificate || false,
          virtualEvent: eventData.virtualEvent || false,
          meetingLink: ensureStringValue(eventData.meetingLink),
          ageRestriction: ensureStringValue(eventData.ageRestriction, 'all'),
          customAgeLimit: ensureStringValue(eventData.customAgeLimit),
          accessibility: eventData.accessibility || {
            wheelchairAccessible: false,
            assistiveListeningDevices: false,
            signLanguageInterpreter: false
          },
          socialSharing: eventData.socialSharing !== undefined ? eventData.socialSharing : true,
          status: ensureStringValue(eventData.status, 'published'),
          // Include existing AI and certificate data
          aiGeneratedImages: eventData.aiGeneratedImages || [],
          certificateSettings: eventData.certificateSettings || formData.certificateSettings,
          faq: eventData.faq || formData.faq
        });
      }
    } catch (error) {
      console.error("Error fetching event data:", error);
    }
  };
  
  // Extract query parameters for editing
  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const editId = queryParams.get('edit');
    
    if (editId) {
      setIsEditing(true);
      setEventId(editId);
      // Fetch event data for editing
      fetchEventData(editId);
    }
  }, [location]);
  
  // State for AI features
  const [aiPanel, setAiPanel] = useState({
    activeTab: 'images',
    isGenerating: false,
    imagePrompt: '',
    suggestions: []
  });
  
  // State for drag and drop
  const [isDragging, setIsDragging] = useState(false);
  // Enhanced section-based navigation instead of rigid steps
  const getSectionsForEventType = (eventType) => {
    const baseSections = [
      { id: 'type', label: "Event Type", icon: "🎯", description: "Choose your event blueprint" },
      { id: 'basics', label: "Basic Info", icon: "📝", description: "Title, description, category" },
      { id: 'schedule', label: "Schedule", icon: "📅", description: "Dates, times, duration" },
      { id: 'location', label: "Location", icon: "📍", description: "Venue or online setup" },
      { id: 'tickets', label: "Tickets", icon: "🎫", description: "Pricing and capacity" },
      { id: 'media', label: "Media", icon: "🖼️", description: "Images and videos" },
      { id: 'features', label: "Features", icon: "⚡", description: "Advanced options" },
      { id: 'preview', label: "Preview", icon: "👁️", description: "Review and publish" }
    ];

    // Customize sections based on event type
    switch (eventType) {
      case 'recurring':
        return baseSections.map(section => 
          section.id === 'schedule' 
            ? { ...section, label: "Recurring Pattern", description: "Series schedule and frequency" }
            : section.id === 'tickets'
            ? { ...section, description: "Individual & series pricing" }
            : section
        );
      case 'multi-date':
        return baseSections.map(section => 
          section.id === 'schedule' 
            ? { ...section, label: "Multi-Day Schedule", description: "Event dates and sessions" }
            : section.id === 'location'
            ? { ...section, label: "Venues", description: "Multiple locations" }
            : section
        );
      case 'appointment':
        return baseSections.map(section => 
          section.id === 'schedule' 
            ? { ...section, label: "Time Slots", description: "Available appointment times" }
            : section.id === 'tickets'
            ? { ...section, label: "Pricing", description: "Service rates and packages" }
            : section
        );
      default:
        return baseSections;
    }
  };

  const sections = getSectionsForEventType(formData.eventType);
  const [currentSection, setCurrentSection] = useState('type');
  const [completedSections, setCompletedSections] = useState(new Set(['type']));
  const [sectionErrors, setSectionErrors] = useState({});

  // Auto-save functionality
  const [lastSaved, setLastSaved] = useState(null);
  const [autoSaveTimer, setAutoSaveTimer] = useState(null);

  useEffect(() => {
    // Auto-save every 30 seconds
    if (autoSaveTimer) clearTimeout(autoSaveTimer);
    const timer = setTimeout(() => {
      if (formData.title && currentSection !== 'type') {
        // Simulate auto-save
        setLastSaved(new Date());
      }
    }, 30000);
    setAutoSaveTimer(timer);

    return () => {
      if (autoSaveTimer) clearTimeout(autoSaveTimer);
    };
  }, [formData, currentSection]);

  // Smart section validation
  const validateSection = (sectionId) => {
    const errors = {};
    
    switch (sectionId) {
      case 'basics':
        if (!formData.title) errors.title = 'Title is required';
        if (!formData.category) errors.category = 'Category is required';
        if (!formData.description) errors.description = 'Description is required';
        break;
      case 'schedule':
        if (formData.eventType === 'single') {
          if (!formData.date) errors.date = 'Date is required';
          if (!formData.time) errors.time = 'Time is required';
        } else if (formData.eventType === 'recurring') {
          if (!formData.recurring.pattern) errors.pattern = 'Recurrence pattern is required';
          if (!formData.recurring.endDate) errors.endDate = 'End date is required';
        }
        break;
      case 'tickets':
        if (formData.ticketTypes.some(ticket => !ticket.name || !ticket.price)) {
          errors.tickets = 'All ticket types must have name and price';
        }
        break;
      default:
        break;
    }
    
    setSectionErrors(prev => ({ ...prev, [sectionId]: errors }));
    return Object.keys(errors).length === 0;
  };

  // Navigate to section with validation
  const navigateToSection = (sectionId) => {
    const currentIndex = sections.findIndex(s => s.id === currentSection);
    const targetIndex = sections.findIndex(s => s.id === sectionId);
    
    // Only validate if moving forward
    if (targetIndex > currentIndex) {
      if (validateSection(currentSection)) {
        setCompletedSections(prev => new Set([...prev, currentSection]));
      } else {
        return; // Don't navigate if validation fails
      }
    }
    
    setCurrentSection(sectionId);
  };

  // Progress calculation
  const getProgress = () => {
    return Math.round((completedSections.size / sections.length) * 100);
  };

  const handleChange = e => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };
  
  const handleInputChange = e => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };
  
  const handleCheckboxChange = e => {
    const { name, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: checked,
    }));
  };

  const handleFileChange = e => {
    const file = e.target.files[0] || null;
    if (file) {
      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        alert('File size must be less than 5MB');
        return;
      }
      // Validate file type - accept common image mime types
      const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif'];
      if (!allowedTypes.includes(file.type)) {
        alert('Please select a PNG, JPG, GIF, or WEBP image');
        return;
      }
    }
    setFormData(prev => ({
      ...prev,
      image: file,
      imagePreview: file ? URL.createObjectURL(file) : null,
    }));
  };

  // Drag and drop handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files && files[0]) {
      const file = files[0];
      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        alert('File size must be less than 5MB');
        return;
      }
      // Validate file type - accept common image mime types
      const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif'];
      if (!allowedTypes.includes(file.type)) {
        alert('Please select a PNG, JPG, GIF, or WEBP image');
        return;
      }
      
      setFormData(prev => ({
        ...prev,
        image: file,
        imagePreview: URL.createObjectURL(file),
      }));
    }
  };

  const handleTicketChange = (index, e) => {
    const { name, value, type, checked } = e.target;
    const newTicketTypes = [...formData.ticketTypes];
    newTicketTypes[index][name] = type === 'checkbox' ? checked : value;
    setFormData(prev => ({ ...prev, ticketTypes: newTicketTypes }));
  };

  const addTicketType = () => {
    setFormData(prev => ({
      ...prev,
      ticketTypes: [...prev.ticketTypes, { name: '', price: '', capacity: '', description: '', earlyBird: false, earlyBirdEnds: '', saleEnds: '' }],
    }));
  };

  const removeTicketType = index => {
    const newTicketTypes = formData.ticketTypes.filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, ticketTypes: newTicketTypes }));
  };

  // AI Image Generation Function
  const generateAIImage = async () => {
    setAiPanel(prev => ({ ...prev, isGenerating: true }));
    
    const eventContext = `${formData.title || 'event'} ${formData.category || ''} ${formData.description || ''}`;
    const prompt = aiPanel.imagePrompt || `Professional promotional image for ${eventContext}, modern design, vibrant colors, engaging`;
    
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const mockImages = [
        'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=400',
        'https://images.unsplash.com/photo-1511578314322-379afb476865?w=400',
        'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?w=400'
      ];
      
      setFormData(prev => ({
        ...prev,
        aiGeneratedImages: [...prev.aiGeneratedImages, ...mockImages]
      }));
      
      setAiPanel(prev => ({ ...prev, imagePrompt: '' }));
    } catch (error) {
      console.error('Error generating AI image:', error);
      alert('Failed to generate AI image. Please try again.');
    } finally {
      setAiPanel(prev => ({ ...prev, isGenerating: false }));
    }
  };

  // Smart Suggestions Generator
  const generateSmartSuggestions = () => {
    const suggestions = [];
    
    if (formData.title && formData.category) {
      suggestions.push({
        type: 'hashtag',
        content: `#${formData.category.replace(/\s+/g, '')} #${formData.title.replace(/\s+/g, '')} #EventHub`
      });
    }
    
    if (formData.eventType === 'recurring') {
      suggestions.push({
        type: 'tip',
        content: 'Consider offering early bird discounts for series bookings'
      });
    }
    
    if (formData.description && formData.description.length < 100) {
      suggestions.push({
        type: 'improvement',
        content: 'Add more details to your description to improve SEO and attendee understanding'
      });
    }
    
    setAiPanel(prev => ({ ...prev, suggestions }));
  };

  // QR Code Generator
  const generateQRCode = () => {
    const eventUrl = `${window.location.origin}/event/${eventId || 'preview'}`;
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(eventUrl)}`;
  };

  const handleAccessibilityChange = e => {
    const { name, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      accessibility: {
        ...prev.accessibility,
        [name]: checked
      }
    }));
  };

  const handleFaqChange = (index, field, value) => {
    const newFaq = [...formData.faq];
    newFaq[index][field] = value;
    setFormData(prev => ({ ...prev, faq: newFaq }));
  };

  const addFaqItem = () => {
    setFormData(prev => ({
      ...prev,
      faq: [...prev.faq, { question: '', answer: '' }]
    }));
  };

  const removeFaqItem = index => {
    const newFaq = formData.faq.filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, faq: newFaq }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!isAuthenticated || !token) {
      alert('You must be logged in to manage events. Please login again.');
      navigate('/login');
      return;
    }
    
    if (isSubmitting) {
      return; // Prevent double submission
    }
    
    setIsSubmitting(true);
    
  const submissionData = new FormData();
  Object.keys(formData).forEach(key => {
    if (key === 'imagePreview') return; // Don't send local blob URL

    let value = formData[key];

    if (key === 'image' && value instanceof File) {
      submissionData.append(key, value);
      return;
    }

    if (value === undefined || value === null) return;

    if (typeof value === 'boolean') {
      submissionData.append(key, value ? 'true' : 'false');
      return;
    }

    if (typeof value === 'object') {
      try {
        submissionData.append(key, JSON.stringify(value));
      } catch (err) {
        console.warn('Skipping field due to serialization error:', key, err);
      }
      return;
    }

    submissionData.append(key, String(value));
  });

  // Ensure aiGeneratedImages and certificateSettings are included as JSON strings if present
  if (Array.isArray(formData.aiGeneratedImages)) submissionData.set('aiGeneratedImages', JSON.stringify(formData.aiGeneratedImages));
  if (formData.certificateSettings && typeof formData.certificateSettings === 'object') submissionData.set('certificateSettings', JSON.stringify(formData.certificateSettings));

    try {
      const eventAxios = axios.create({
        baseURL: 'http://localhost:3001/api',
        headers: {
          'Authorization': token && token.startsWith('Bearer') ? token : `Bearer ${token}`,
          // Content-Type is set automatically by browser for FormData
        }
      });
      
      let response;
      
      if (isEditing && eventId) {
        response = await eventAxios.put(`/events/${eventId}`, submissionData);
        alert(`Event "${formData.title}" updated successfully!`);
        navigate('/organizer/events'); // Redirect to My Events after update
      } else {
        response = await eventAxios.post('/events', submissionData);
        const newEvent = response.data;
        alert(`Event "${formData.title}" created successfully!`);
        
        // Redirect to My Events page to see the new event
        navigate('/organizer/events');
      }
      
    } catch (error) {
      console.error(`Failed to ${isEditing ? 'update' : 'create'} event`, error);
      console.error('Error details:', error.response?.data || error.message);
      
      if (error.response?.status === 401) {
        alert('Authentication error. Please login again.');
        navigate('/login');
      } else {
        alert(`Error ${isEditing ? 'updating' : 'creating'} event: ` + (error.response?.data?.message || error.message));
      }
    } finally {
      setIsSubmitting(false); // Re-enable submit button
    }
  };

  const getQuickActions = () => {
    // Placeholder function to prevent errors
    return [];
  };

  const getNextSuggestion = () => {
    // Placeholder function to prevent errors
    return [];
  };

  const renderEventTypeSelection = () => {
    return (
      <div className="section-content">
        <div className="section-header">
          <h1>What kind of event are you creating?</h1>
          <p>Choose the blueprint that best fits your vision. This helps us customize your experience.</p>
        </div>
        
        <div className="event-type-grid">
          <div 
            className={`event-type-card ${formData.eventType === 'single' ? 'selected' : ''}`}
            onClick={() => {
              setFormData(prev => ({ ...prev, eventType: 'single' }));
              setCompletedSections(prev => new Set([...prev, 'type']));
            }}
          >
            <div className="event-type-icon">📅</div>
            <h3>Single Event</h3>
            <p>A one-time event with a specific date and time. Perfect for conferences, concerts, workshops, or meetings.</p>
            <div className="event-features">
              <span className="feature-tag">✓ Simple setup</span>
              <span className="feature-tag">✓ Quick publishing</span>
              <span className="feature-tag">✓ Standard ticketing</span>
            </div>
          </div>
          
          <div 
            className={`event-type-card ${formData.eventType === 'recurring' ? 'selected' : ''}`}
            onClick={() => {
              setFormData(prev => ({ ...prev, eventType: 'recurring' }));
              setCompletedSections(prev => new Set([...prev, 'type']));
            }}
          >
            <div className="event-type-icon">🔄</div>
            <h3>Recurring Event Series</h3>
            <p>Multiple events with the same format happening regularly. Great for weekly classes, monthly meetups, or seasonal events.</p>
            <div className="event-features">
              <span className="feature-tag">✓ Series discounts</span>
              <span className="feature-tag">✓ Bulk booking</span>
              <span className="feature-tag">✓ Attendance tracking</span>
            </div>
          </div>
          
          <div 
            className={`event-type-card ${formData.eventType === 'multi-date' ? 'selected' : ''}`}
            onClick={() => {
              setFormData(prev => ({ ...prev, eventType: 'multi-date' }));
              setCompletedSections(prev => new Set([...prev, 'type']));
            }}
          >
            <div className="event-type-icon">📊</div>
            <h3>Multi-Date Event</h3>
            <p>A single event spanning multiple days. Ideal for festivals, conferences, trade shows, or multi-day workshops.</p>
            <div className="event-features">
              <span className="feature-tag">✓ Day passes</span>
              <span className="feature-tag">✓ Multi-venue</span>
              <span className="feature-tag">✓ Package deals</span>
            </div>
          </div>
          
          <div 
            className={`event-type-card ${formData.eventType === 'appointment' ? 'selected' : ''}`}
            onClick={() => {
              setFormData(prev => ({ ...prev, eventType: 'appointment' }));
              setCompletedSections(prev => new Set([...prev, 'type']));
            }}
          >
            <div className="event-type-icon">⏰</div>
            <h3>Appointment / Timed Entry</h3>
            <p>Time-slot based bookings with specific appointment times. Perfect for consultations, tours, or scheduled services.</p>
            <div className="event-features">
              <span className="feature-tag">✓ Time slots</span>
              <span className="feature-tag">✓ Auto-booking</span>
              <span className="feature-tag">✓ Calendar sync</span>
            </div>
          </div>
        </div>

        {formData.eventType && (
          <div className="next-suggestion">
            <div className="suggestion-card">
              <div className="suggestion-icon">💡</div>
              <div className="suggestion-content">
                <h4>Great choice!</h4>
                <p>
                  {formData.eventType === 'single' && "Perfect for one-time events. Let's set up your event details next."}
                  {formData.eventType === 'recurring' && "Excellent for building a community! We'll help you set up the perfect recurring schedule."}
                  {formData.eventType === 'multi-date' && "Great for comprehensive events! We'll help you organize multiple days seamlessly."}
                  {formData.eventType === 'appointment' && "Perfect for personal services! We'll set up your booking system."}
                </p>
                <button 
                  onClick={() => navigateToSection('basics')}
                  className="btn-suggestion"
                >
                  Continue to Basic Info →
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderBasicInfo = () => {
    return (
      <div className="section-content">
        <div className="section-header">
          <h1>
            {formData.eventType === 'appointment' ? 'Service Details' : 
             formData.eventType === 'recurring' ? 'Series Information' : 
             formData.eventType === 'multi-date' ? 'Event Overview' : 'Event Details'}
          </h1>
          <p>
            {formData.eventType === 'appointment' ? 'Describe your service and what clients can expect.' :
             formData.eventType === 'recurring' ? 'Set up your recurring event series information.' :
             formData.eventType === 'multi-date' ? 'Provide an overview of your multi-day event.' :
             'Tell us about your event. The more details, the better!'}
          </p>
        </div>
        
        <div className="form-grid">
          <div className="form-section primary">
            <div className="form-row">
              <div className="form-group">
                <label>{formData.eventType === 'appointment' ? 'Service Title' : 'Event Title'} *</label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  placeholder={
                    formData.eventType === 'appointment' ? 'e.g., 30-minute Business Consultation' :
                    formData.eventType === 'recurring' ? 'e.g., Weekly Yoga Classes' :
                    formData.eventType === 'multi-date' ? 'e.g., Annual Tech Conference 2025' :
                    'e.g., Summer Music Festival'
                  }
                  required
                  className={sectionErrors.basics?.title ? 'error' : ''}
                />
                {sectionErrors.basics?.title && <span className="error-message">{sectionErrors.basics.title}</span>}
              </div>
              
              <div className="form-group">
                <label>Category *</label>
                <select 
                  name="category" 
                  value={formData.category} 
                  onChange={handleInputChange} 
                  required
                  className={sectionErrors.basics?.category ? 'error' : ''}
                >
                  <option value="">Select Category</option>
                  {formData.eventType === 'appointment' ? (
                    <>
                      <option value="Consultation">Consultation</option>
                      <option value="Health & Wellness">Health & Wellness</option>
                      <option value="Professional Services">Professional Services</option>
                      <option value="Beauty & Personal Care">Beauty & Personal Care</option>
                      <option value="Education & Training">Education & Training</option>
                      <option value="Therapy & Counseling">Therapy & Counseling</option>
                    </>
                  ) : (
                    <>
                      <option value="Conference">Conference</option>
                      <option value="Workshop">Workshop</option>
                      <option value="Seminar">Seminar</option>
                      <option value="Social & Entertainment">Social & Entertainment</option>
                      <option value="Sports & Fitness">Sports & Fitness</option>
                      <option value="Arts & Culture">Arts & Culture</option>
                      <option value="Food & Drink">Food & Drink</option>
                      <option value="Charity & Fundraising">Charity & Fundraising</option>
                      <option value="Business & Networking">Business & Networking</option>
                      <option value="Education">Education</option>
                      <option value="Health & Wellness">Health & Wellness</option>
                    </>
                  )}
                </select>
                {sectionErrors.basics?.category && <span className="error-message">{sectionErrors.basics.category}</span>}
              </div>
            </div>
            
            <div className="form-group">
              <label>
                {formData.eventType === 'appointment' ? 'Service Description' : 'Event Description'} *
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder={
                  formData.eventType === 'appointment' ? 
                  'Describe your service, what\'s included, and what clients should prepare...' :
                  formData.eventType === 'recurring' ? 
                  'Describe what attendees can expect from each session in the series...' :
                  'Describe your event, activities, speakers, and what attendees can expect...'
                }
                rows="4"
                required
                className={sectionErrors.basics?.description ? 'error' : ''}
              />
              {sectionErrors.basics?.description && <span className="error-message">{sectionErrors.basics.description}</span>}
              <div className="char-counter">{formData.description.length}/500 characters</div>
            </div>

            {formData.eventType === 'appointment' && (
              <div className="appointment-basics">
                <h3>Service Configuration</h3>
                <div className="form-row">
                  <div className="form-group">
                    <label>Service Duration (minutes) *</label>
                    <select
                      value={formData.appointment.duration}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        appointment: { ...prev.appointment, duration: parseInt(e.target.value) }
                      }))}
                    >
                      <option value="15">15 minutes</option>
                      <option value="30">30 minutes</option>
                      <option value="45">45 minutes</option>
                      <option value="60">1 hour</option>
                      <option value="90">1.5 hours</option>
                      <option value="120">2 hours</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Buffer Time (minutes)</label>
                    <select
                      value={formData.appointment.bufferTime}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        appointment: { ...prev.appointment, bufferTime: parseInt(e.target.value) }
                      }))}
                    >
                      <option value="0">No buffer</option>
                      <option value="5">5 minutes</option>
                      <option value="10">10 minutes</option>
                      <option value="15">15 minutes</option>
                      <option value="30">30 minutes</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="form-section secondary">
            <div className="ai-suggestions">
              <h3>💡 Smart Suggestions</h3>
              <div className="suggestion-list">
                <div className="suggestion-item">
                  <strong>SEO Tip:</strong> Include location and year in your title for better discoverability
                </div>
                {formData.description.length < 100 && (
                  <div className="suggestion-item warning">
                    <strong>Enhance Description:</strong> Add more details about speakers, agenda, or what attendees will learn
                  </div>
                )}
                {formData.eventType === 'recurring' && (
                  <div className="suggestion-item">
                    <strong>Series Tip:</strong> Consider offering package deals for multiple sessions
                  </div>
                )}
              </div>
            </div>

            <div className="quick-actions">
              <h3>⚡ Quick Actions</h3>
              <div className="action-buttons">
                <button 
                  onClick={() => setFormData(prev => ({ ...prev, description: prev.description + '\n\n🎯 What you\'ll learn:\n• \n• \n• ' }))}
                  className="btn-quick-action"
                  type="button"
                >
                  Add Learning Points
                </button>
                <button 
                  onClick={() => setFormData(prev => ({ ...prev, description: prev.description + '\n\n📅 Schedule:\n• \n• ' }))}
                  className="btn-quick-action"
                  type="button"
                >
                  Add Schedule Template
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };
  
  const renderScheduleSection = () => (
    <div className="section-content">
      <div className="section-header">
        <h1>📅 Schedule</h1>
        <p>
          {formData.eventType === 'recurring' && "Set up your recurring event schedule."}
          {formData.eventType === 'multi-date' && "Plan your multi-day event timeline."}
          {formData.eventType === 'appointment' && "Configure your booking time slots."}
          {(!formData.eventType || formData.eventType === 'single') && "Set up when your event will take place."}
        </p>
      </div>
      
      <div className="form-section">
        {/* Single Event Date/Time */}
        {(!formData.eventType || formData.eventType === 'single') && (
          <>
            <div className="form-row">
              <div className="form-group">
                <label>Event Date *</label>
                <input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleInputChange}
                  min={new Date().toISOString().split('T')[0]}
                  required
                />
              </div>
              
              <div className="form-group">
                <label>Start Time *</label>
                <input
                  type="time"
                  name="time"
                  value={formData.time}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </div>
            
            <div className="form-group">
              <label>Duration</label>
              <select 
                name="duration" 
                value={formData.duration || ''} 
                onChange={handleInputChange}
              >
                <option value="">Select duration</option>
                <option value="1">1 hour</option>
                <option value="2">2 hours</option>
                <option value="3">3 hours</option>
                <option value="4">4 hours</option>
                <option value="6">6 hours</option>
                <option value="8">Full day</option>
              </select>
            </div>
          </>
        )}

        {/* Recurring Event Schedule */}
        {formData.eventType === 'recurring' && (
          <div className="recurring-schedule">
            <div className="form-row">
              <div className="form-group">
                <label>First Event Date *</label>
                <input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleInputChange}
                  min={new Date().toISOString().split('T')[0]}
                  required
                />
              </div>
              
              <div className="form-group">
                <label>Start Time *</label>
                <input
                  type="time"
                  name="time"
                  value={formData.time}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label>Duration</label>
                <select 
                  name="duration" 
                  value={formData.duration || ''} 
                  onChange={handleInputChange}
                >
                  <option value="">Select duration</option>
                  <option value="0.5">30 minutes</option>
                  <option value="1">1 hour</option>
                  <option value="1.5">1.5 hours</option>
                  <option value="2">2 hours</option>
                  <option value="3">3 hours</option>
                  <option value="4">4 hours</option>
                </select>
              </div>
              
              <div className="form-group">
                <label>Repeat Pattern *</label>
                <select 
                  name="recurringPattern" 
                  value={formData.recurringPattern || ''} 
                  onChange={handleInputChange}
                >
                  <option value="">Select pattern</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="bi-weekly">Bi-weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="custom">Custom interval</option>
                </select>
              </div>
            </div>

            {formData.recurringPattern === 'weekly' && (
              <div className="form-group">
                <label>Days of Week</label>
                <div className="checkbox-group">
                  {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => (
                    <label key={day} className="checkbox-option">
                      <input
                        type="checkbox"
                        name="recurringDays"
                        value={day.toLowerCase()}
                        checked={(formData.recurringDays || []).includes(day.toLowerCase())}
                        onChange={(e) => {
                          const days = formData.recurringDays || [];
                          if (e.target.checked) {
                            setFormData(prev => ({ ...prev, recurringDays: [...days, day.toLowerCase()] }));
                          } else {
                            setFormData(prev => ({ ...prev, recurringDays: days.filter(d => d !== day.toLowerCase()) }));
                          }
                        }}
                      />
                      <span className="checkbox-custom"></span>
                      {day.slice(0, 3)}
                    </label>
                  ))}
                </div>
              </div>
            )}

            {formData.recurringPattern === 'custom' && (
              <div className="form-row">
                <div className="form-group">
                  <label>Repeat Every</label>
                  <div className="custom-interval">
                    <input
                      type="number"
                      name="customInterval"
                      value={formData.customInterval || ''}
                      onChange={handleInputChange}
                      min="1"
                      max="30"
                      placeholder="1"
                    />
                    <select 
                      name="customIntervalType" 
                      value={formData.customIntervalType || 'days'} 
                      onChange={handleInputChange}
                    >
                      <option value="days">Days</option>
                      <option value="weeks">Weeks</option>
                      <option value="months">Months</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            <div className="form-row">
              <div className="form-group">
                <label>Series End Date</label>
                <input
                  type="date"
                  name="seriesEndDate"
                  value={formData.seriesEndDate || ''}
                  onChange={handleInputChange}
                  min={formData.date}
                />
              </div>
              
              <div className="form-group">
                <label>Max Occurrences</label>
                <input
                  type="number"
                  name="maxOccurrences"
                  value={formData.maxOccurrences || ''}
                  onChange={handleInputChange}
                  min="1"
                  max="100"
                  placeholder="10"
                />
              </div>
            </div>
          </div>
        )}

        {/* Multi-Date Event Schedule */}
        {formData.eventType === 'multi-date' && (
          <div className="multi-date-schedule">
            <div className="form-row">
              <div className="form-group">
                <label>Start Date *</label>
                <input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleInputChange}
                  min={new Date().toISOString().split('T')[0]}
                  required
                />
              </div>
              
              <div className="form-group">
                <label>End Date *</label>
                <input
                  type="date"
                  name="endDate"
                  value={formData.endDate || ''}
                  onChange={handleInputChange}
                  min={formData.date}
                  required
                />
              </div>
            </div>
            
            <div className="form-group">
              <label>Event Type</label>
              <div className="radio-group">
                <label className="radio-option">
                  <input
                    type="radio"
                    name="multiDateType"
                    value="conference"
                    checked={formData.multiDateType === 'conference'}
                    onChange={handleInputChange}
                  />
                  <span className="radio-custom"></span>
                  Conference/Summit
                </label>
                <label className="radio-option">
                  <input
                    type="radio"
                    name="multiDateType"
                    value="festival"
                    checked={formData.multiDateType === 'festival'}
                    onChange={handleInputChange}
                  />
                  <span className="radio-custom"></span>
                  Festival
                </label>
                <label className="radio-option">
                  <input
                    type="radio"
                    name="multiDateType"
                    value="workshop-series"
                    checked={formData.multiDateType === 'workshop-series'}
                    onChange={handleInputChange}
                  />
                  <span className="radio-custom"></span>
                  Workshop Series
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Appointment/Service Schedule */}
        {formData.eventType === 'appointment' && (
          <div className="appointment-schedule">
            <div className="form-group">
              <label>Service Duration *</label>
              <select 
                name="duration" 
                value={formData.duration || ''} 
                onChange={handleInputChange}
                required
              >
                <option value="">Select duration</option>
                <option value="0.25">15 minutes</option>
                <option value="0.5">30 minutes</option>
                <option value="1">1 hour</option>
                <option value="1.5">1.5 hours</option>
                <option value="2">2 hours</option>
                <option value="3">3 hours</option>
              </select>
            </div>
            
            <div className="form-group">
              <label>Available Days</label>
              <div className="checkbox-group">
                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => (
                  <label key={day} className="checkbox-option">
                    <input
                      type="checkbox"
                      name="availableDays"
                      value={day.toLowerCase()}
                      checked={(formData.availableDays || []).includes(day.toLowerCase())}
                      onChange={(e) => {
                        const days = formData.availableDays || [];
                        if (e.target.checked) {
                          setFormData(prev => ({ ...prev, availableDays: [...days, day.toLowerCase()] }));
                        } else {
                          setFormData(prev => ({ ...prev, availableDays: days.filter(d => d !== day.toLowerCase()) }));
                        }
                      }}
                    />
                    <span className="checkbox-custom"></span>
                    {day.slice(0, 3)}
                  </label>
                ))}
              </div>
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label>Start Time</label>
                <input
                  type="time"
                  name="startTime"
                  value={formData.startTime || '09:00'}
                  onChange={handleInputChange}
                />
              </div>
              
              <div className="form-group">
                <label>End Time</label>
                <input
                  type="time"
                  name="endTime"
                  value={formData.endTime || '17:00'}
                  onChange={handleInputChange}
                />
              </div>
            </div>
            
            <div className="form-group">
              <label>Booking Buffer (minutes between appointments)</label>
              <select 
                name="bookingBuffer" 
                value={formData.bookingBuffer || '15'} 
                onChange={handleInputChange}
              >
                <option value="0">No buffer</option>
                <option value="5">5 minutes</option>
                <option value="10">10 minutes</option>
                <option value="15">15 minutes</option>
                <option value="30">30 minutes</option>
              </select>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderLocationSection = () => (
    <div className="section-content">
      <div className="section-header">
        <h1>📍 Location</h1>
        <p>Where will your event take place?</p>
      </div>
      
      <div className="form-section">
        <div className="location-type-selector">
          <div className="radio-group">
            <label className="radio-option">
              <input
                type="radio"
                name="locationType"
                value="physical"
                checked={formData.locationType === 'physical'}
                onChange={handleInputChange}
              />
              <span className="radio-custom"></span>
              Physical Location
            </label>
            <label className="radio-option">
              <input
                type="radio"
                name="locationType"
                value="virtual"
                checked={formData.locationType === 'virtual'}
                onChange={handleInputChange}
              />
              <span className="radio-custom"></span>
              Virtual Event
            </label>
            <label className="radio-option">
              <input
                type="radio"
                name="locationType"
                value="hybrid"
                checked={formData.locationType === 'hybrid'}
                onChange={handleInputChange}
              />
              <span className="radio-custom"></span>
              Hybrid (Both)
            </label>
          </div>
        </div>
        
        {(formData.locationType === 'physical' || formData.locationType === 'hybrid') && (
          <div className="form-group">
            <label>Venue Address *</label>
            <input
              type="text"
              name="location"
              value={formData.location}
              onChange={handleInputChange}
              placeholder="Enter the complete venue address..."
              required
            />
          </div>
        )}
        
        {(formData.locationType === 'virtual' || formData.locationType === 'hybrid') && (
          <div className="form-group">
            <label>Platform/Meeting Link</label>
            <input
              type="url"
              name="meetingLink"
              value={formData.meetingLink || ''}
              onChange={handleInputChange}
              placeholder="https://zoom.us/j/... or https://meet.google.com/..."
            />
            <small className="form-tip">This will be shared with registered attendees</small>
          </div>
        )}
      </div>
    </div>
  );

  const renderTicketsSection = () => (
    <div className="section-content">
      <div className="section-header">
        <h1>Tickets</h1>
        <p>Set up ticket types for your event.</p>
      </div>
      <div className="ticket-container">
        {formData.ticketTypes.map((ticket, index) => (
          <div key={index} className="ticket-card">
            <div className="ticket-header">
              <h4>{ticket.name || `Ticket Type ${index + 1}`}</h4>
              {index > 0 && 
                <button type="button" onClick={() => removeTicketType(index)} className="btn-remove-ticket">
                  Remove
                </button>
              }
            </div>
            
            <div className="ticket-form-group">
              <div className="form-group">
                <label>Ticket Name</label>
                <input type="text" name="name" value={ticket.name} onChange={e => handleTicketChange(index, e)} placeholder="Ticket Name (e.g., VIP)" />
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Price ($)</label>
                  <input type="number" name="price" value={ticket.price} onChange={e => handleTicketChange(index, e)} placeholder="Price" min="0" />
                </div>
                <div className="form-group">
                  <label>Capacity</label>
                  <input type="number" name="capacity" value={ticket.capacity} onChange={e => handleTicketChange(index, e)} placeholder="Capacity" min="1" />
                </div>
              </div>
              
              <div className="form-group">
                <label>Description</label>
                <input type="text" name="description" value={ticket.description} onChange={e => handleTicketChange(index, e)} placeholder="Describe what's included with this ticket" />
              </div>
              
              <div className="form-group-checkbox ticket-option">
                <input 
                  type="checkbox" 
                  id={`earlyBird-${index}`} 
                  name="earlyBird" 
                  checked={ticket.earlyBird} 
                  onChange={e => handleTicketChange(index, e)}
                />
                <label htmlFor={`earlyBird-${index}`}>Early Bird Pricing</label>
              </div>
              
              {ticket.earlyBird && (
                <div className="form-group">
                  <label>Early Bird Ends</label>
                  <input 
                    type="date" 
                    name="earlyBirdEnds" 
                    value={ticket.earlyBirdEnds} 
                    onChange={e => handleTicketChange(index, e)}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
              )}
              
              <div className="form-group">
                <label>Sale Ends</label>
                <input 
                  type="date" 
                  name="saleEnds" 
                  value={ticket.saleEnds} 
                  onChange={e => handleTicketChange(index, e)}
                  min={new Date().toISOString().split('T')[0]}
                />
                <small className="form-tip">Leave blank to sell until the event starts</small>
              </div>
            </div>
          </div>
        ))}
      </div>
      <button type="button" onClick={addTicketType} className="btn-add-ticket">Add Ticket Type</button>
    </div>
  );

  const renderMediaSection = () => (
    <div className="section-content">
      <div className="section-header">
        <h1>🎨 Media & Branding</h1>
        <p>Add images and customize your event's visual appeal.</p>
      </div>
      
      <div className="form-section">
        <div className="form-group">
          <label>Event Banner Image</label>
          <div 
            className={`file-upload-area ${isDragging ? 'drag-over' : ''}`}
            onClick={() => document.getElementById('image-input').click()}
            onDragOver={handleDragOver}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <input
              id="image-input"
              type="file"
              name="image"
              onChange={handleFileChange}
              accept="image/*"
              className="file-input"
            />
            <div className="file-upload-content">
              <div className="upload-icon">📸</div>
              <p>Drag & drop an image here, or click to select</p>
              <span className="file-types">PNG, JPG, GIF up to 5MB</span>
            </div>
          </div>
          {formData.imagePreview && (
            <div className="image-preview">
              <img src={formData.imagePreview} alt="Event Preview" />
              <button 
                type="button" 
                onClick={() => setFormData(prev => ({ ...prev, image: null, imagePreview: null }))}
                className="remove-image-btn"
              >
                ✕ Remove
              </button>
            </div>
          )}
        </div>
        
        <div className="form-section">
          <h3>Event Colors</h3>
          <div className="form-row">
            <div className="form-group">
              <label>Primary Color</label>
              <div className="color-input-wrapper">
                <input
                  type="color"
                  name="primaryColor"
                  value={formData.primaryColor || '#6366f1'}
                  onChange={handleInputChange}
                />
                <span className="color-value">{formData.primaryColor || '#6366f1'}</span>
              </div>
            </div>
            <div className="form-group">
              <label>Secondary Color</label>
              <div className="color-input-wrapper">
                <input
                  type="color"
                  name="secondaryColor"
                  value={formData.secondaryColor || '#e5e7eb'}
                  onChange={handleInputChange}
                />
                <span className="color-value">{formData.secondaryColor || '#e5e7eb'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderFeaturesSection = () => (
    <div className="section-content">
      <div className="section-header">
        <h1>Features</h1>
        <p>Enhance your event with some extra details that attendees might find useful.</p>
      </div>
      
      <div className="form-section">
        <h3>Event Details</h3>
        <div className="form-group-checkbox">
          <input
            type="checkbox"
            id="virtualEvent"
            name="virtualEvent"
            checked={formData.virtualEvent || false}
            onChange={handleCheckboxChange}
          />
          <label htmlFor="virtualEvent">This is a virtual event</label>
        </div>
        
        {formData.virtualEvent && (
          <div className="form-group">
            <label>Meeting Link (Optional - can be added later)</label>
            <input
              type="text"
              name="meetingLink"
              value={formData.meetingLink || ''}
              onChange={handleInputChange}
              placeholder="Zoom, Google Meet, or other platform URL"
            />
            <small className="form-tip">This will be shared with registered participants</small>
          </div>
        )}
      </div>
      
      <div className="form-section">
        <h3>Age Restriction</h3>
        <div className="form-radio-group">
          {/* Radio buttons for age restriction */}
        </div>
      </div>
      
      <div className="form-section">
        <h3>Accessibility Options</h3>
        <p className="subtitle">Select all that apply to your event</p>
        <div className="accessibility-options">
            {/* Accessibility checkboxes */}
        </div>
      </div>
      
      {/* Engagement Features Section */}
      <div className="form-section">
        <h3>🚀 Engagement Features</h3>
        <p className="subtitle">Enable powerful features to boost attendee engagement and networking</p>
        
        <div className="engagement-features-grid">
          {/* Networking Directory */}
          <div className="feature-card">
            <div className="feature-header">
              <input
                type="checkbox"
                id="networkingDirectory"
                checked={formData.engagementFeatures?.networkingDirectory?.enabled || false}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  engagementFeatures: {
                    ...prev.engagementFeatures,
                    networkingDirectory: {
                      ...prev.engagementFeatures?.networkingDirectory,
                      enabled: e.target.checked
                    }
                  }
                }))}
              />
              <label htmlFor="networkingDirectory" className="feature-title">
                <i className="fas fa-users"></i>
                Networking Directory
              </label>
            </div>
            <p className="feature-description">
              Help attendees discover and connect with each other through professional networking
            </p>
            {formData.engagementFeatures?.networkingDirectory?.enabled && (
              <div className="feature-options">
                <label className="feature-option">
                  <input
                    type="checkbox"
                    checked={formData.engagementFeatures?.networkingDirectory?.skillMatching || false}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      engagementFeatures: {
                        ...prev.engagementFeatures,
                        networkingDirectory: {
                          ...prev.engagementFeatures?.networkingDirectory,
                          skillMatching: e.target.checked
                        }
                      }
                    }))}
                  />
                  <span>Enable skill-based matching</span>
                </label>
              </div>
            )}
          </div>

          {/* Live Q&A */}
          <div className="feature-card">
            <div className="feature-header">
              <input
                type="checkbox"
                id="liveQA"
                checked={formData.engagementFeatures?.liveQA?.enabled || false}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  engagementFeatures: {
                    ...prev.engagementFeatures,
                    liveQA: {
                      ...prev.engagementFeatures?.liveQA,
                      enabled: e.target.checked
                    }
                  }
                }))}
              />
              <label htmlFor="liveQA" className="feature-title">
                <i className="fas fa-question-circle"></i>
                Live Q&A Sessions
              </label>
            </div>
            <p className="feature-description">
              Interactive question and answer sessions with real-time voting and moderation
            </p>
            {formData.engagementFeatures?.liveQA?.enabled && (
              <div className="feature-options">
                <label className="feature-option">
                  <input
                    type="checkbox"
                    checked={formData.engagementFeatures?.liveQA?.allowAnonymous || false}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      engagementFeatures: {
                        ...prev.engagementFeatures,
                        liveQA: {
                          ...prev.engagementFeatures?.liveQA,
                          allowAnonymous: e.target.checked
                        }
                      }
                    }))}
                  />
                  <span>Allow anonymous questions</span>
                </label>
              </div>
            )}
          </div>

          {/* Live Polling */}
          <div className="feature-card">
            <div className="feature-header">
              <input
                type="checkbox"
                id="polling"
                checked={formData.engagementFeatures?.polling?.enabled || false}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  engagementFeatures: {
                    ...prev.engagementFeatures,
                    polling: {
                      ...prev.engagementFeatures?.polling,
                      enabled: e.target.checked
                    }
                  }
                }))}
              />
              <label htmlFor="polling" className="feature-title">
                <i className="fas fa-poll"></i>
                Live Polling
              </label>
            </div>
            <p className="feature-description">
              Create interactive polls and surveys to gather real-time audience feedback
            </p>
            {formData.engagementFeatures?.polling?.enabled && (
              <div className="feature-options">
                <label className="feature-option">
                  <input
                    type="checkbox"
                    checked={formData.engagementFeatures?.polling?.realTimeResults || false}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      engagementFeatures: {
                        ...prev.engagementFeatures,
                        polling: {
                          ...prev.engagementFeatures?.polling,
                          realTimeResults: e.target.checked
                        }
                      }
                    }))}
                  />
                  <span>Show real-time results</span>
                </label>
              </div>
            )}
          </div>

          {/* Digital Business Cards */}
          <div className="feature-card">
            <div className="feature-header">
              <input
                type="checkbox"
                id="businessCards"
                checked={formData.engagementFeatures?.businessCards?.enabled || false}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  engagementFeatures: {
                    ...prev.engagementFeatures,
                    businessCards: {
                      ...prev.engagementFeatures?.businessCards,
                      enabled: e.target.checked
                    }
                  }
                }))}
              />
              <label htmlFor="businessCards" className="feature-title">
                <i className="fas fa-address-card"></i>
                Digital Business Cards
              </label>
            </div>
            <p className="feature-description">
              Enable attendees to create and exchange digital business cards seamlessly
            </p>
            {formData.engagementFeatures?.businessCards?.enabled && (
              <div className="feature-options">
                <label className="feature-option">
                  <input
                    type="checkbox"
                    checked={formData.engagementFeatures?.businessCards?.qrCodeSharing || false}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      engagementFeatures: {
                        ...prev.engagementFeatures,
                        businessCards: {
                          ...prev.engagementFeatures?.businessCards,
                          qrCodeSharing: e.target.checked
                        }
                      }
                    }))}
                  />
                  <span>QR code sharing</span>
                </label>
              </div>
            )}
          </div>

          {/* Discussion Forums */}
          <div className="feature-card">
            <div className="feature-header">
              <input
                type="checkbox"
                id="discussionForum"
                checked={formData.engagementFeatures?.discussionForum?.enabled || false}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  engagementFeatures: {
                    ...prev.engagementFeatures,
                    discussionForum: {
                      ...prev.engagementFeatures?.discussionForum,
                      enabled: e.target.checked
                    }
                  }
                }))}
              />
              <label htmlFor="discussionForum" className="feature-title">
                <i className="fas fa-comments"></i>
                Discussion Forums
              </label>
            </div>
            <p className="feature-description">
              Foster ongoing conversations with threaded discussions and categories
            </p>
            {formData.engagementFeatures?.discussionForum?.enabled && (
              <div className="feature-options">
                <label className="feature-option">
                  <input
                    type="checkbox"
                    checked={formData.engagementFeatures?.discussionForum?.moderation || false}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      engagementFeatures: {
                        ...prev.engagementFeatures,
                        discussionForum: {
                          ...prev.engagementFeatures?.discussionForum,
                          moderation: e.target.checked
                        }
                      }
                    }))}
                  />
                  <span>Enable content moderation</span>
                </label>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <div className="form-section">
        <h3>FAQ (Frequently Asked Questions)</h3>
        <p className="subtitle">Add common questions and answers for attendees</p>
        <div className="faq-container">
          {formData.faq && formData.faq.map((item, index) => (
            <div key={index} className="faq-item">
              <div className="form-group">
                <label>Question {index + 1}</label>
                <input
                  type="text"
                  value={item.question}
                  onChange={(e) => handleFaqChange(index, 'question', e.target.value)}
                  placeholder="e.g., Is parking available?"
                />
              </div>
              <div className="form-group">
                <label>Answer</label>
                <textarea
                  value={item.answer}
                  onChange={(e) => handleFaqChange(index, 'answer', e.target.value)}
                  placeholder="Provide a clear answer to the question"
                  rows="2"
                />
              </div>
              {index > 0 && (
                <button type="button" onClick={() => removeFaqItem(index)} className="btn-remove">
                  Remove FAQ
                </button>
              )}
            </div>
          ))}
        </div>
        <button type="button" onClick={addFaqItem} className="btn-add">Add FAQ Item</button>
      </div>
    </div>
  );

  const renderPreviewSection = () => (
    <div className="section-content">
      <div className="section-header">
        <h1>Review & Publish</h1>
        <p>Almost done! Review your event details and choose when to make it visible to the public.</p>
      </div>
      <div className="event-summary">
        <h4>{formData.title}</h4>
        <p><strong>Category:</strong> {formData.category}</p>
        <p><strong>Location:</strong> {formData.location}</p>
        <p><strong>Date & Time:</strong> {formData.date} at {formData.time}</p>
        <p><strong>Description:</strong> {formData.description}</p>
        {formData.imagePreview && <img src={formData.imagePreview} alt="Event Banner" className="image-preview" style={{ maxWidth: '300px' }} />}
        <h5>Tickets</h5>
        <ul>
          {formData.ticketTypes.map((t, i) => <li key={i}>{t.name}: ${t.price} ({t.capacity} available)</li>)}
        </ul>
        {formData.providesCertificate && <p>✓ Certificate Provided</p>}
        
        {/* Engagement Features Summary */}
        {formData.engagementFeatures && (
          <div className="engagement-summary">
            <h5>🚀 Engagement Features</h5>
            <div className="enabled-features">
              {formData.engagementFeatures.networkingDirectory?.enabled && (
                <span className="feature-badge">
                  <i className="fas fa-users"></i> Networking Directory
                </span>
              )}
              {formData.engagementFeatures.liveQA?.enabled && (
                <span className="feature-badge">
                  <i className="fas fa-question-circle"></i> Live Q&A
                </span>
              )}
              {formData.engagementFeatures.polling?.enabled && (
                <span className="feature-badge">
                  <i className="fas fa-poll"></i> Live Polling
                </span>
              )}
              {formData.engagementFeatures.businessCards?.enabled && (
                <span className="feature-badge">
                  <i className="fas fa-address-card"></i> Business Cards
                </span>
              )}
              {formData.engagementFeatures.discussionForum?.enabled && (
                <span className="feature-badge">
                  <i className="fas fa-comments"></i> Discussion Forum
                </span>
              )}
              {!Object.values(formData.engagementFeatures || {}).some(feature => feature?.enabled) && (
                <span className="no-features">No engagement features enabled</span>
              )}
            </div>
          </div>
        )}
      </div>
      <div className="form-group">
          <label>Initial Status</label>
          <select name="status" value={formData.status} onChange={handleChange}>
              <option value="published">Publish Immediately</option>
              <option value="draft">Save as Draft</option>
          </select>
      </div>
    </div>
  );



  const renderSection = () => {
    switch (currentSection) {
      case 'type':
        return renderEventTypeSelection();
      case 'basics':
        return renderBasicInfo();
      case 'schedule':
        return renderScheduleSection();
      case 'location':
        return renderLocationSection();
      case 'tickets':
        return renderTicketsSection();
      case 'media':
        return renderMediaSection();
      case 'features':
        return renderFeaturesSection();
      case 'preview':
        return renderPreviewSection();
      default:
        return renderEventTypeSelection();
    }
  };

  // AI Enhancement Panel
  const renderAIPanel = () => {
    return (
      <div className="create-event-ai-panel">
        <div className="ai-panel-header">
          <h3>🚀 AI-Powered Tools</h3>
          <p>Enhance your event with smart features</p>
        </div>
        
        <div className="ai-tabs">
          <button 
            className={`ai-tab ${aiPanel.activeTab === 'images' ? 'active' : ''}`}
            onClick={() => setAiPanel(prev => ({ ...prev, activeTab: 'images' }))}
          >
            🎨 Images
          </button>
          <button 
            className={`ai-tab ${aiPanel.activeTab === 'certificate' ? 'active' : ''}`}
            onClick={() => setAiPanel(prev => ({ ...prev, activeTab: 'certificate' }))}
          >
            🏆 Certificate
          </button>
          <button 
            className={`ai-tab ${aiPanel.activeTab === 'tools' ? 'active' : ''}`}
            onClick={() => setAiPanel(prev => ({ ...prev, activeTab: 'tools' }))}
          >
            🛠️ Tools
          </button>
        </div>

        <div className="ai-content">
          {aiPanel.activeTab === 'images' && (
            <div className="ai-images-section">
              <div className="ai-image-generator">
                <label>Generate AI Event Images</label>
                <textarea
                  placeholder="Describe your ideal event image... (e.g., 'colorful tech conference banner with modern design')"
                  value={aiPanel.imagePrompt}
                  onChange={(e) => setAiPanel(prev => ({ ...prev, imagePrompt: e.target.value }))}
                  className="ai-prompt-input"
                />
                <button 
                  onClick={generateAIImage}
                  disabled={aiPanel.isGenerating}
                  className="btn-generate-ai"
                >
                  {aiPanel.isGenerating ? '⏳ Generating...' : '✨ Generate Images'}
                </button>
              </div>
              
              {formData.aiGeneratedImages.length > 0 && (
                <div className="ai-generated-gallery">
                  <h4>Generated Images</h4>
                  <div className="ai-image-grid">
                    {formData.aiGeneratedImages.map((url, index) => (
                      <div key={index} className="ai-image-item">
                        <img src={url} alt={`Generated ${index + 1}`} />
                        <button 
                          onClick={() => setFormData(prev => ({ ...prev, imagePreview: url, mainImageUrl: url, image: null }))}
                          className="btn-use-image"
                        >
                          Use This
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {aiPanel.activeTab === 'certificate' && (
            <div className="ai-certificate-section">
              <div className="certificate-controls">
                <label className="toggle-option">
                  <input
                    type="checkbox"
                    checked={formData.certificateSettings.enabled}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      providesCertificate: e.target.checked, // Sync with certificateSettings.enabled
                      certificateSettings: { ...prev.certificateSettings, enabled: e.target.checked }
                    }))}
                  />
                  <span className="toggle-text">Enable Event Certificates</span>
                </label>
                
                {formData.certificateSettings.enabled && (
                  <div className="certificate-config">
                    <div className="form-group">
                      <label>Certificate Template</label>
                      <select
                        value={formData.certificateSettings.template}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          certificateSettings: { ...prev.certificateSettings, template: e.target.value }
                        }))}
                        className="template-select"
                      >
                        <option value="modern">Modern Template</option>
                        <option value="classic">Classic Template</option>
                        <option value="elegant">Elegant Template</option>
                        <option value="creative">Creative Template</option>
                      </select>
                    </div>
                    
                    <div className="form-group">
                      <label>Issuing Authority</label>
                      <input
                        type="text"
                        value={formData.certificateSettings.issuingAuthority}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          certificateSettings: { ...prev.certificateSettings, issuingAuthority: e.target.value }
                        }))}
                        placeholder="e.g., Tech Conference Organization"
                        className="authority-input"
                      />
                    </div>
                    
                    <div className="form-group">
                      <label>Custom Certificate Text</label>
                      <textarea
                        value={formData.certificateSettings.customText}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          certificateSettings: { ...prev.certificateSettings, customText: e.target.value }
                        }))}
                        placeholder="This is to certify that {attendee_name} has successfully completed {event_title}..."
                        className="custom-text-input"
                        rows="4"
                      />
                      <small className="help-text">Use {`{attendee_name}`} and {`{event_title}`} for dynamic content</small>
                    </div>
                    
                    <div className="form-group">
                      <label>Certificate Design Color</label>
                      <div className="color-picker-group">
                        <input
                          type="color"
                          value={formData.certificateSettings.designColor}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            certificateSettings: { ...prev.certificateSettings, designColor: e.target.value }
                          }))}
                          className="color-input"
                        />
                        <span className="color-preview" style={{ backgroundColor: formData.certificateSettings.designColor }}></span>
                      </div>
                    </div>
                    
                    <div className="certificate-preview">
                      <h4>Certificate Preview</h4>
                      <div className="preview-certificate" style={{ borderColor: formData.certificateSettings.designColor }}>
                        <div className="cert-header" style={{ color: formData.certificateSettings.designColor }}>
                          Certificate of Completion
                        </div>
                        <div className="cert-content">
                          <p>This is to certify that</p>
                          <h3 className="attendee-name">John Doe</h3>
                          <p>has successfully attended</p>
                          <h2 className="event-title" style={{ color: formData.certificateSettings.designColor }}>
                            {formData.title || 'Your Event Title'}
                          </h2>
                          <div className="cert-authority">
                            {formData.certificateSettings.issuingAuthority || 'Issuing Authority'}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {aiPanel.activeTab === 'tools' && (
            <div className="ai-tools-section">
              <div className="tool-grid">
                <div className="tool-card">
                  <h4>🎯 Smart Attendance Tracking</h4>
                  <p>Automatically track attendee engagement and participation</p>
                  <label className="toggle-option">
                    <input
                      type="checkbox"
                      checked={formData.attendanceTracking || false}
                      onChange={(e) => setFormData(prev => ({ ...prev, attendanceTracking: e.target.checked }))}
                    />
                    <span className="toggle-text">Enable Smart Tracking</span>
                  </label>
                </div>
                
                <div className="tool-card">
                  <h4>📊 Analytics Dashboard</h4>
                  <p>Get insights about your event performance</p>
                  <label className="toggle-option">
                    <input
                      type="checkbox"
                      checked={formData.analyticsEnabled || false}
                      onChange={(e) => setFormData(prev => ({ ...prev, analyticsEnabled: e.target.checked }))}
                    />
                    <span className="toggle-text">Enable Analytics</span>
                  </label>
                </div>
                
                <div className="tool-card">
                  <h4>📧 Smart Email Campaigns</h4>
                  <p>Automated email sequences for attendees</p>
                  <label className="toggle-option">
                    <input
                      type="checkbox"
                      checked={formData.emailCampaigns || false}
                      onChange={(e) => setFormData(prev => ({ ...prev, emailCampaigns: e.target.checked }))}
                    />
                    <span className="toggle-text">Enable Email Automation</span>
                  </label>
                </div>
                
                <div className="tool-card">
                  <h4>🎮 Gamification</h4>
                  <p>Add badges, points, and leaderboards</p>
                  <label className="toggle-option">
                    <input
                      type="checkbox"
                      checked={formData.gamificationEnabled || false}
                      onChange={(e) => setFormData(prev => ({ ...prev, gamificationEnabled: e.target.checked }))}
                    />
                    <span className="toggle-text">Enable Gamification</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Other AI panel tabs content would go here */}

        </div>
      </div>
    );
  };

  return (
    <div className="create-event-page">
      <div className="create-event-sidebar">
        <div className="event-setup-title">{isEditing ? 'EDIT EVENT' : 'CREATE EVENT'}</div>
        
        <div className="progress-overview">
          <div className="progress-bar-container">
            <div className="progress-bar" style={{ width: `${getProgress()}%` }}></div>
          </div>
          <span className="progress-text">{getProgress()}% Complete</span>
        </div>

        <div className="section-navigator">
          {sections.map((section) => (
            <div 
              key={section.id}
              className={`nav-section ${currentSection === section.id ? 'active' : ''} ${completedSections.has(section.id) ? 'completed' : ''}`}
              onClick={() => navigateToSection(section.id)}
            >
              <div className="section-icon">{section.icon}</div>
              <div className="section-info">
                <div className="section-label">{section.label}</div>
                <div className="section-description">{section.description}</div>
                {sectionErrors[section.id] && Object.keys(sectionErrors[section.id]).length > 0 && (
                  <div className="section-error">⚠️ Needs attention</div>
                )}
              </div>
              {completedSections.has(section.id) && (
                <div className="section-check">✓</div>
              )}
            </div>
          ))}
        </div>

        {lastSaved && (
          <div className="auto-save-indicator">
            <span className="save-icon">💾</span>
            Auto-saved at {lastSaved.toLocaleTimeString()}
          </div>
        )}
      </div>
      
      <div className="create-event-main">
        <div className="content-header">
          <div className="breadcrumb">
            <span>Create Event</span>
            <span className="separator">›</span>
            <span className="current">{sections.find(s => s.id === currentSection)?.label}</span>
          </div>
          
          {getQuickActions().length > 0 && (
            <div className="quick-actions-bar">
              {getQuickActions().map((action, index) => (
                <button 
                  key={index}
                  onClick={action.action}
                  className="quick-action-btn"
                >
                  {action.text}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="section-content-wrapper">
          <form onSubmit={handleSubmit}>
            {renderSection()}
            
            <div className="section-navigation">
              <div className="nav-buttons">
                {currentSection !== 'type' && (
                  <button 
                    type="button" 
                    onClick={() => {
                      const currentIndex = sections.findIndex(s => s.id === currentSection);
                      if (currentIndex > 0) {
                        setCurrentSection(sections[currentIndex - 1].id);
                      }
                    }}
                    className="btn-nav btn-back"
                  >
                    ← Back
                  </button>
                )}
                
                {currentSection !== 'preview' ? (
                  <button 
                    type="button" 
                    onClick={() => {
                      const currentIndex = sections.findIndex(s => s.id === currentSection);
                      if (validateSection(currentSection)) {
                        setCompletedSections(prev => new Set([...prev, currentSection]));
                        if (currentIndex < sections.length - 1) {
                          setCurrentSection(sections[currentIndex + 1].id);
                        }
                      }
                    }}
                    className="btn-nav btn-next"
                  >
                    Continue →
                  </button>
                ) : (
                  <button type="submit" className="btn-nav btn-publish" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <span className="spinner-inline"></span>
                        {isEditing ? 'Updating...' : 'Publishing...'}
                      </>
                    ) : (
                      isEditing 
                        ? (formData.status === 'draft' ? 'Update Draft' : 'Update Event')
                        : (formData.status === 'draft' ? 'Save Draft' : 'Publish Event')
                    )}
                  </button>
                )}
              </div>

              {getNextSuggestion().length > 0 && (
                <div className="next-suggestions">
                  {getNextSuggestion().map((suggestion, index) => (
                    <div key={index} className="suggestion-hint">
                      💡 {suggestion.text}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </form>
        </div>
      </div>

      <div className="ai-panel-container">
        {renderAIPanel()}
      </div>
    </div>
  );
}

export default CreateEventPage;