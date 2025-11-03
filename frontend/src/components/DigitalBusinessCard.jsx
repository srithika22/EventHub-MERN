import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import './DigitalBusinessCard.css';

import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import './DigitalBusinessCard.css';
import { API_BASE_URL } from '../utils/api';

const DigitalBusinessCard = ({ eventId: propEventId, onNetworkingUpdate }) => {
  const { eventId: paramEventId, cardId } = useParams(); // Get eventId from route or cardId for public access
  const eventId = propEventId || paramEventId; // Use prop eventId or URL param
  const [businessCard, setBusinessCard] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [exchangedCards, setExchangedCards] = useState([]);
  const [showMyCard, setShowMyCard] = useState(true);
  const [scannerActive, setScannerActive] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    jobTitle: '',
    company: '',
    email: '',
    phone: '',
    website: '',
    linkedin: '',
    twitter: '',
    bio: '',
    profileImage: ''
  });

  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    fetchMyBusinessCard();
    fetchExchangedCards();
  }, [eventId]);

  const fetchMyBusinessCard = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/business-cards/my-card/${eventId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.businessCard) {
          setBusinessCard(data.businessCard);
          setFormData(data.businessCard);
          generateQRCode(data.businessCard._id);
        }
      }
    } catch (error) {
      console.error('Error fetching business card:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchExchangedCards = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/business-cards/exchanged/${eventId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setExchangedCards(data.cards || []);
      }
    } catch (error) {
      console.error('Error fetching exchanged cards:', error);
    }
  };

  const generateQRCode = async (cardId) => {
    try {
      const qrData = `${window.location.origin}/business-card/${cardId}`;
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrData)}`;
      setQrCodeUrl(qrUrl);
    } catch (error) {
      console.error('Error generating QR code:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const url = businessCard 
        ? `${API_BASE_URL}/api/business-cards/update/${businessCard._id}`
        : `${API_BASE_URL}/api/business-cards/create/${eventId}`;
      
      const method = businessCard ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        const data = await response.json();
        setBusinessCard(data.businessCard);
        setIsEditing(false);
        if (!businessCard) {
          generateQRCode(data.businessCard._id);
        }
      }
    } catch (error) {
      console.error('Error saving business card:', error);
    }
  };

  const handleExchange = async (cardId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/business-cards/exchange/${cardId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ eventId })
      });

      if (response.ok) {
        fetchExchangedCards();
        alert('Business card exchanged successfully!');
      }
    } catch (error) {
      console.error('Error exchanging business card:', error);
    }
  };

  const startScanner = async () => {
    try {
      setScannerActive(true);
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (error) {
      console.error('Error starting camera:', error);
      alert('Camera access required for QR scanning');
    }
  };

  const stopScanner = () => {
    setScannerActive(false);
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
    }
  };

  const downloadCard = (card) => {
    const vCard = `BEGIN:VCARD
VERSION:3.0
FN:${card.name}
ORG:${card.company}
TITLE:${card.jobTitle}
EMAIL:${card.email}
TEL:${card.phone}
URL:${card.website}
NOTE:${card.bio}
END:VCARD`;

    const blob = new Blob([vCard], { type: 'text/vcard' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${card.name.replace(/\s+/g, '_')}_card.vcf`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return <div className="business-card-loading">Loading business cards...</div>;
  }

  return (
    <div className="business-card-container">
      <div className="business-card-header">
        <h2>Digital Business Cards</h2>
        <div className="card-tabs">
          <button 
            className={showMyCard ? 'tab-active' : 'tab-inactive'}
            onClick={() => setShowMyCard(true)}
          >
            My Card
          </button>
          <button 
            className={!showMyCard ? 'tab-active' : 'tab-inactive'}
            onClick={() => setShowMyCard(false)}
          >
            Collected Cards ({exchangedCards.length})
          </button>
        </div>
      </div>

      {showMyCard ? (
        <div className="my-card-section">
          {!businessCard && !isEditing ? (
            <div className="no-card">
              <h3>Create Your Digital Business Card</h3>
              <p>Share your professional information with other event participants</p>
              <button 
                className="create-card-btn"
                onClick={() => setIsEditing(true)}
              >
                Create Business Card
              </button>
            </div>
          ) : isEditing ? (
            <form className="card-form" onSubmit={handleSubmit}>
              <h3>{businessCard ? 'Edit' : 'Create'} Business Card</h3>
              
              <div className="form-row">
                <input
                  type="text"
                  name="name"
                  placeholder="Full Name *"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                />
                <input
                  type="text"
                  name="jobTitle"
                  placeholder="Job Title"
                  value={formData.jobTitle}
                  onChange={handleInputChange}
                />
              </div>

              <div className="form-row">
                <input
                  type="text"
                  name="company"
                  placeholder="Company"
                  value={formData.company}
                  onChange={handleInputChange}
                />
                <input
                  type="email"
                  name="email"
                  placeholder="Email Address *"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="form-row">
                <input
                  type="tel"
                  name="phone"
                  placeholder="Phone Number"
                  value={formData.phone}
                  onChange={handleInputChange}
                />
                <input
                  type="url"
                  name="website"
                  placeholder="Website"
                  value={formData.website}
                  onChange={handleInputChange}
                />
              </div>

              <div className="form-row">
                <input
                  type="url"
                  name="linkedin"
                  placeholder="LinkedIn Profile"
                  value={formData.linkedin}
                  onChange={handleInputChange}
                />
                <input
                  type="url"
                  name="twitter"
                  placeholder="Twitter/X Profile"
                  value={formData.twitter}
                  onChange={handleInputChange}
                />
              </div>

              <textarea
                name="bio"
                placeholder="Professional Bio (optional)"
                value={formData.bio}
                onChange={handleInputChange}
                rows="3"
              />

              <div className="form-actions">
                <button type="submit" className="save-btn">
                  {businessCard ? 'Update' : 'Create'} Card
                </button>
                <button 
                  type="button" 
                  className="cancel-btn"
                  onClick={() => setIsEditing(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div className="card-display">
              <div className="business-card-preview">
                <div className="card-header-section">
                  <div className="card-avatar">
                    {businessCard.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="card-basic-info">
                    <h3>{businessCard.name}</h3>
                    <p className="job-title">{businessCard.jobTitle}</p>
                    <p className="company">{businessCard.company}</p>
                  </div>
                </div>

                <div className="card-contact-info">
                  {businessCard.email && (
                    <div className="contact-item">
                      <span className="icon">📧</span>
                      <span>{businessCard.email}</span>
                    </div>
                  )}
                  {businessCard.phone && (
                    <div className="contact-item">
                      <span className="icon">📱</span>
                      <span>{businessCard.phone}</span>
                    </div>
                  )}
                  {businessCard.website && (
                    <div className="contact-item">
                      <span className="icon">🌐</span>
                      <a href={businessCard.website} target="_blank" rel="noopener noreferrer">
                        Website
                      </a>
                    </div>
                  )}
                  {businessCard.linkedin && (
                    <div className="contact-item">
                      <span className="icon">💼</span>
                      <a href={businessCard.linkedin} target="_blank" rel="noopener noreferrer">
                        LinkedIn
                      </a>
                    </div>
                  )}
                </div>

                {businessCard.bio && (
                  <div className="card-bio">
                    <p>{businessCard.bio}</p>
                  </div>
                )}
              </div>

              <div className="card-sharing">
                <div className="qr-section">
                  <h4>Share Your Card</h4>
                  {qrCodeUrl && (
                    <img src={qrCodeUrl} alt="QR Code" className="qr-code" />
                  )}
                  <p>Others can scan this QR code to get your business card</p>
                </div>

                <div className="card-actions">
                  <button 
                    className="edit-card-btn"
                    onClick={() => setIsEditing(true)}
                  >
                    Edit Card
                  </button>
                  <button 
                    className="scan-btn"
                    onClick={scannerActive ? stopScanner : startScanner}
                  >
                    {scannerActive ? 'Stop Scanning' : 'Scan QR Code'}
                  </button>
                </div>
              </div>

              {scannerActive && (
                <div className="scanner-section">
                  <video ref={videoRef} className="scanner-video" />
                  <canvas ref={canvasRef} style={{ display: 'none' }} />
                  <p>Position QR code in the camera view</p>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="collected-cards-section">
          <h3>Collected Business Cards</h3>
          {exchangedCards.length === 0 ? (
            <div className="no-cards">
              <p>No business cards collected yet</p>
              <p>Scan QR codes or exchange cards with other participants</p>
            </div>
          ) : (
            <div className="cards-grid">
              {exchangedCards.map((card) => (
                <div key={card._id} className="collected-card">
                  <div className="card-mini-header">
                    <div className="mini-avatar">
                      {card.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="mini-info">
                      <h4>{card.name}</h4>
                      <p>{card.jobTitle}</p>
                      <p className="mini-company">{card.company}</p>
                    </div>
                  </div>

                  <div className="card-mini-contact">
                    {card.email && <p>📧 {card.email}</p>}
                    {card.phone && <p>📱 {card.phone}</p>}
                  </div>

                  <div className="card-mini-actions">
                    <button 
                      className="download-btn"
                      onClick={() => downloadCard(card)}
                    >
                      Download vCard
                    </button>
                    {card.linkedin && (
                      <a 
                        href={card.linkedin} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="linkedin-btn"
                      >
                        LinkedIn
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DigitalBusinessCard;