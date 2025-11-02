import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import './EventCard.css';

function EventCard({ event, isRegistered = false }) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Defensive check: If the event or its ID is missing, don't render a broken card.
  if (!event || !event._id) {
    return null;
  }

  const eventDetailUrl = `/events/${event._id}`; 
  
  // Format the date nicely
  const eventDate = new Date(event.date);
  const isValidDate = !isNaN(eventDate.getTime());
  
  const formattedDate = isValidDate ? eventDate.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short', 
    day: 'numeric',
    year: eventDate.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
  }) : 'Date TBD';
  
  // Format the time if available
  const formattedTime = event.time ? 
    new Date(`2000-01-01T${event.time}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }) : '';
    
  // Calculate if the event is upcoming or past
  const isUpcoming = isValidDate ? eventDate >= new Date() : true;
  
  // Get days until event
  const daysUntilEvent = isValidDate ? Math.ceil((eventDate - new Date()) / (1000 * 60 * 60 * 24)) : null;
  
  // Get ticket info
  const hasTicketTypes = event.ticketTypes && Array.isArray(event.ticketTypes) && event.ticketTypes.length > 0;
  
  // Safely calculate lowest price with null checks
  let lowestPrice = 0;
  let highestPrice = 0;
  if (hasTicketTypes) {
    const validPrices = event.ticketTypes
      .filter(t => t && t.price !== undefined && t.price !== null)
      .map(t => Number(t.price) || 0);
    if (validPrices.length > 0) {
      lowestPrice = Math.min(...validPrices);
      highestPrice = Math.max(...validPrices);
    }
  }
  
  const isFree = lowestPrice === 0;
  const hasPriceRange = highestPrice > lowestPrice;
  
  // Check ticket availability with null checks
  const totalTickets = hasTicketTypes ? 
    event.ticketTypes.reduce((sum, type) => {
      if (!type || type.quantity === undefined || type.quantity === null) return sum;
      return sum + Number(type.quantity || 0);
    }, 0) : 0;
  
  const ticketsSold = hasTicketTypes ? 
    event.ticketTypes.reduce((sum, type) => {
      if (!type) return sum;
      return sum + (Number(type.ticketsSold) || 0);
    }, 0) : 0;
  
  const ticketsAvailable = totalTickets - ticketsSold;
  const isSoldOut = ticketsAvailable <= 0 && totalTickets > 0;
  const isLimitedAvailability = ticketsAvailable > 0 && ticketsAvailable <= totalTickets * 0.2;
  const popularityPercentage = totalTickets > 0 ? Math.round((ticketsSold / totalTickets) * 100) : 0;
  
  // Truncate title and description
  const truncatedTitle = event.title?.length > 60 ? event.title.substring(0, 60) + '...' : event.title;
  const truncatedLocation = event.location?.length > 40 ? event.location.substring(0, 40) + '...' : event.location;
  
  // Get category icon
  const getCategoryIcon = (category) => {
    switch(category?.toLowerCase()) {
      case 'concert': return '🎵';
      case 'webinar': return '💻';
      case 'technical': return '⚙️';
      case 'non-technical': return '🎨';
      case 'workshop': return '🛠️';
      case 'sports': return '⚽';
      default: return '🎯';
    }
  };

  // Fallback image
  const defaultImage = 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?auto=format&fit=crop&w=800&q=80';
  const imageUrl = imageError ? defaultImage : (event.imageUrl || defaultImage);

  return (
    <Link to={eventDetailUrl} className="event-card-link">
      <article className={`event-card ${!isUpcoming ? 'past-event' : ''} ${isSoldOut ? 'sold-out' : ''}`}>
        {/* Image Container with Overlays */}
        <div className="event-image-container">
          <div className={`image-skeleton ${imageLoaded ? 'hidden' : ''}`}></div>
          <img 
            src={imageUrl}
            alt={event.title || 'Event'} 
            className={`event-image ${imageLoaded ? 'loaded' : ''}`}
            onLoad={() => setImageLoaded(true)}
            onError={() => {
              setImageError(true);
              setImageLoaded(true);
            }}
            loading="lazy"
          />
          
          {/* Status Badges */}
          <div className="event-badges">
            {isRegistered && <span className="event-badge registered">
              <i className="fas fa-check-circle"></i> Registered
            </span>}
            {!isUpcoming && <span className="event-badge past">Past Event</span>}
            {isFree && isUpcoming && <span className="event-badge free">Free</span>}
            {isSoldOut && isUpcoming && <span className="event-badge sold-out">Sold Out</span>}
            {isLimitedAvailability && isUpcoming && !isSoldOut && (
              <span className="event-badge limited">
                <i className="fas fa-fire"></i> Only {ticketsAvailable} left
              </span>
            )}
            {popularityPercentage >= 70 && !isSoldOut && isUpcoming && (
              <span className="event-badge popular">
                <i className="fas fa-star"></i> Popular
              </span>
            )}
          </div>
          
          {/* Floating Action Button */}
          <div className="event-action">
            <button className="bookmark-btn" onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              // Add bookmark functionality here
            }}>
              <i className="far fa-heart"></i>
            </button>
          </div>
          
          {/* Date Overlay */}
          {isUpcoming && daysUntilEvent !== null && (
            <div className="date-overlay">
              <div className="days-until">
                {daysUntilEvent === 0 ? 'Today' : 
                 daysUntilEvent === 1 ? 'Tomorrow' : 
                 daysUntilEvent <= 7 ? `${daysUntilEvent} days` : 
                 formattedDate}
              </div>
            </div>
          )}
        </div>
        
        {/* Event Details */}
        <div className="event-details">
          {/* Category and Status */}
          <div className="event-meta">
            <span className="event-category">
              <span className="category-icon">{getCategoryIcon(event.category)}</span>
              {event.category}
            </span>
            {event.providesCertificate && (
              <span className="certificate-badge" title="Provides Certificate">
                <i className="fas fa-certificate"></i>
              </span>
            )}
          </div>
          
          {/* Title */}
          <h3 className="event-title" title={event.title}>
            {truncatedTitle}
          </h3>
          
          {/* Date and Time */}
          <div className="event-datetime">
            <i className="fas fa-calendar-alt"></i>
            <span>{formattedDate}</span>
            {formattedTime && <span className="event-time">• {formattedTime}</span>}
          </div>
          
          {/* Location */}
          <div className="event-location" title={event.location}>
            <i className="fas fa-map-marker-alt"></i>
            <span>{truncatedLocation}</span>
          </div>
          
          {/* Organizer */}
          {event.organizer?.name && (
            <div className="event-organizer">
              <i className="fas fa-user"></i>
              <span>by {event.organizer.name}</span>
            </div>
          )}
          
          {/* Progress Bar for Ticket Sales */}
          {hasTicketTypes && totalTickets > 0 && isUpcoming && (
            <div className="ticket-progress">
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ width: `${(ticketsSold / totalTickets) * 100}%` }}
                ></div>
              </div>
              <div className="progress-text">
                {ticketsSold} of {totalTickets} tickets sold
              </div>
            </div>
          )}
          
          {/* Footer with Price and CTA */}
          <div className="event-footer">
            <div className="event-price-section">
              {hasTicketTypes ? (
                <div className="price-info">
                  {isFree ? (
                    <span className="price free-price">Free</span>
                  ) : (
                    <span className="price">
                      {hasPriceRange ? `$${lowestPrice} - $${highestPrice}` : `$${lowestPrice}`}
                    </span>
                  )}
                </div>
              ) : (
                <span className="price-info">Pricing TBD</span>
              )}
            </div>
            
            <div className="event-cta">
              {isSoldOut ? (
                <span className="cta-button disabled">Sold Out</span>
              ) : !isUpcoming ? (
                <span className="cta-button disabled">Event Ended</span>
              ) : (
                <span className="cta-button">
                  View Details
                  <i className="fas fa-arrow-right"></i>
                </span>
              )}
            </div>
          </div>
        </div>
      </article>
    </Link>
  );
}

export default EventCard;