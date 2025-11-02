import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { API_BASE_URL } from '../utils/api';
import './EventManagementCard.css';

const EventManagementCard = ({ event, onEventUpdated, onEventDeleted }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [selectedImageIndex, setSelectedImageIndex] = useState(0);
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0
        }).format(amount);
    };

    const getStatusBadgeClass = (status) => {
        switch (status) {
            case 'published': return 'status-published';
            case 'draft': return 'status-draft';
            case 'canceled': return 'status-canceled';
            case 'completed': return 'status-completed';
            default: return 'status-default';
        }
    };

    const handleStatusChange = async (newStatus) => {
        setIsUpdatingStatus(true);
        try {
            const token = localStorage.getItem('token');
            const authHeader = token.startsWith('Bearer ') ? token : `Bearer ${token}`;

            const response = await fetch(`${API_BASE_URL}/api/events/${event._id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': authHeader
                },
                body: JSON.stringify({ status: newStatus })
            });

            if (!response.ok) {
                throw new Error('Failed to update event status');
            }

            const updatedEvent = await response.json();
            toast.success(`Event ${newStatus} successfully`);
            onEventUpdated && onEventUpdated(updatedEvent);
        } catch (error) {
            console.error('Error updating event status:', error);
            toast.error('Failed to update event status');
        } finally {
            setIsUpdatingStatus(false);
        }
    };

    const handleDeleteEvent = async () => {
        try {
            const token = localStorage.getItem('token');
            const authHeader = token.startsWith('Bearer ') ? token : `Bearer ${token}`;

            const response = await fetch(`${API_BASE_URL}/api/events/${event._id}`, {
                method: 'DELETE',
                headers: { 'Authorization': authHeader }
            });

            if (!response.ok) {
                throw new Error('Failed to delete event');
            }

            toast.success('Event deleted successfully');
            onEventDeleted && onEventDeleted(event._id);
        } catch (error) {
            console.error('Error deleting event:', error);
            toast.error('Failed to delete event');
        } finally {
            setShowDeleteConfirm(false);
        }
    };

    const calculateRevenue = () => {
        return event.ticketTypes.reduce((sum, ticket) => 
            sum + (ticket.ticketsSold || 0) * ticket.price, 0);
    };

    const calculateCapacity = () => {
        return event.ticketTypes.reduce((sum, ticket) => sum + ticket.capacity, 0);
    };

    const calculateSoldPercentage = () => {
        const totalCapacity = calculateCapacity();
        const totalSold = event.totalTicketsSold || 0;
        return totalCapacity > 0 ? Math.round((totalSold / totalCapacity) * 100) : 0;
    };

    const handleCertificatePreview = async (eventId) => {
        try {
            const token = localStorage.getItem('token');
            const authHeader = token?.startsWith('Bearer ') ? token : `Bearer ${token}`;
            
            const response = await fetch(`${API_BASE_URL}/api/events/${eventId}/certificate-preview`, {
                headers: { 'Authorization': authHeader }
            });
            
            if (response.ok) {
                const html = await response.text();
                const newWindow = window.open('', '_blank');
                newWindow.document.write(html);
                newWindow.document.close();
            } else {
                toast.error('Unable to load certificate preview');
            }
        } catch (error) {
            console.error('Error loading certificate preview:', error);
            toast.error('Error loading certificate preview');
        }
    };

    const isEventPast = () => {
        return new Date(event.date) < new Date();
    };

    const canEdit = () => {
        return !isEventPast() && event.status !== 'canceled';
    };

    return (
        <div className="event-management-card">
            <div className="event-card-header">
                    <div className="event-basic-info">
                    <div className="event-image-gallery">
                        {((event.aiGeneratedImages && event.aiGeneratedImages.length > 0) || event.imageUrl) ? (
                            <>
                                <img src={(event.aiGeneratedImages && event.aiGeneratedImages[selectedImageIndex]) || event.imageUrl} alt={event.title} />
                                <div className="thumbs">
                                    {event.aiGeneratedImages && event.aiGeneratedImages.map((img, idx) => (
                                        <button key={idx} className={`thumb ${selectedImageIndex===idx? 'active':''}`} onClick={() => setSelectedImageIndex(idx)}>
                                            <img src={img} alt={`ai-${idx}`} />
                                        </button>
                                    ))}
                                    {event.imageUrl && (
                                        <button className={`thumb ${(!event.aiGeneratedImages || selectedImageIndex >= (event.aiGeneratedImages?.length || 0))? 'active':''}`} onClick={() => setSelectedImageIndex((event.aiGeneratedImages?.length) || 0)}>
                                            <img src={event.imageUrl} alt="main" />
                                        </button>
                                    )}
                                </div>
                            </>
                        ) : (
                            <div className="event-placeholder">
                                <i className="fas fa-calendar-alt"></i>
                            </div>
                        )}
                    </div>

                    <div className="event-details">
                        <h3 className="event-title">{event.title}</h3>
                        <p className="event-date">
                            <i className="fas fa-calendar"></i>
                            {formatDate(event.date)}
                        </p>
                        <p className="event-location">
                            <i className="fas fa-map-marker-alt"></i>
                            {event.location}
                        </p>
                    </div>
                </div>

                <div className="event-sidebar">
                    <div className="event-badges">
                        <span className={`status-badge ${getStatusBadgeClass(event.status)}`}>
                            {event.status}
                        </span>
                        <span className="event-category-badge">{event.category}</span>
                    </div>
                    
                    <div className="event-actions">
                        <button 
                            className="btn btn-outline btn-sm"
                            onClick={() => setIsExpanded(!isExpanded)}
                        >
                            <i className={`fas fa-chevron-${isExpanded ? 'up' : 'down'}`}></i>
                            {isExpanded ? 'Less' : 'More'}
                        </button>
                    </div>
                </div>
            </div>

            {isExpanded && (
                <div className="event-card-expanded">
                    <div className="expanded-content">
                        {/* Event Statistics */}
                        <div className="event-stats-section">
                            <h4>Event Statistics</h4>
                            <div className="event-stats">
                                <div className="stat-item">
                                    <div className="stat-value">{event.totalTicketsSold || 0}</div>
                                    <div className="stat-label">Tickets Sold</div>
                                </div>
                                <div className="stat-item">
                                    <div className="stat-value">{formatCurrency(calculateRevenue())}</div>
                                    <div className="stat-label">Revenue</div>
                                </div>
                                <div className="stat-item">
                                    <div className="stat-value">{calculateSoldPercentage()}%</div>
                                    <div className="stat-label">Sold</div>
                                    <div className="progress-bar">
                                        <div 
                                            className="progress-fill" 
                                            style={{ width: `${calculateSoldPercentage()}%` }}
                                        ></div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="ticket-types-section">
                            <h4>Ticket Types</h4>
                            <div className="ticket-types-grid">
                                {event.ticketTypes.map((ticket, index) => (
                                    <div key={index} className="ticket-type-card">
                                        <div className="ticket-type-header">
                                            <span className="ticket-name">{ticket.name}</span>
                                            <span className="ticket-price">{formatCurrency(ticket.price)}</span>
                                        </div>
                                        <div className="ticket-stats">
                                            <span className="tickets-sold">
                                                {ticket.ticketsSold || 0} / {ticket.capacity} sold
                                            </span>
                                            <div className="ticket-progress">
                                                <div 
                                                    className="ticket-progress-fill"
                                                    style={{ 
                                                        width: `${Math.round(((ticket.ticketsSold || 0) / ticket.capacity) * 100)}%` 
                                                    }}
                                                ></div>
                                            </div>
                                        </div>
                                        <div className="ticket-revenue">
                                            Revenue: {formatCurrency((ticket.ticketsSold || 0) * ticket.price)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="event-description">
                            <h4>Description</h4>
                            <p>{event.description || 'No description provided'}</p>
                        </div>

                        {event.additionalInfo && (
                            <div className="additional-info">
                                <h4>Additional Information</h4>
                                <p>{event.additionalInfo}</p>
                            </div>
                        )}

                        <div className="event-features">
                            <div className="features-grid">
                                {event.virtualEvent && (
                                    <div className="feature-item">
                                        <i className="fas fa-video"></i>
                                        <span>Virtual Event</span>
                                    </div>
                                )}
                                {(event.providesCertificate || (event.certificateSettings && event.certificateSettings.enabled)) && (
                                    <div className="feature-item certificate">
                                        <i className="fas fa-certificate"></i>
                                        <span>Certificate Provided</span>
                                    </div>
                                )}
                                {event.accessibility?.wheelchairAccessible && (
                                    <div className="feature-item">
                                        <i className="fas fa-wheelchair"></i>
                                        <span>Wheelchair Accessible</span>
                                    </div>
                                )}
                                {event.ageRestriction !== 'none' && (
                                    <div className="feature-item">
                                        <i className="fas fa-user-check"></i>
                                        <span>Age Restricted ({event.ageRestriction})</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="expanded-actions">
                        <div className="status-controls">
                            <label htmlFor={`status-${event._id}`}>Status:</label>
                            <select 
                                id={`status-${event._id}`}
                                value={event.status}
                                onChange={(e) => handleStatusChange(e.target.value)}
                                disabled={isUpdatingStatus || isEventPast()}
                                className="status-select"
                            >
                                <option value="draft">Draft</option>
                                <option value="published">Published</option>
                                <option value="canceled">Canceled</option>
                                {isEventPast() && <option value="completed">Completed</option>}
                            </select>
                        </div>

                        <div className="action-buttons">
                            {canEdit() && (
                                <button 
                                    className="btn btn-primary btn-sm"
                                    onClick={() => window.open(`/create-event?edit=${event._id}`, '_blank')}
                                >
                                    <i className="fas fa-edit"></i>
                                    Edit Event
                                </button>
                            )}
                            
                            <button 
                                className="btn btn-outline btn-sm"
                                onClick={() => window.open(`/events/${event._id}`, '_blank')}
                            >
                                <i className="fas fa-external-link-alt"></i>
                                View Public
                            </button>

                            <button 
                                className="btn btn-outline btn-sm"
                                onClick={() => window.open(`/organizer/participants/${event._id}`, '_blank')}
                            >
                                <i className="fas fa-users"></i>
                                Participants
                            </button>

                            {(event.providesCertificate || (event.certificateSettings && event.certificateSettings.enabled)) && (
                                <button
                                    className="btn btn-outline btn-sm"
                                    onClick={() => handleCertificatePreview(event._id)}
                                >
                                    <i className="fas fa-certificate"></i>
                                    Certificate Preview
                                </button>
                            )}

                            <button 
                                className="btn btn-danger btn-sm"
                                onClick={() => setShowDeleteConfirm(true)}
                            >
                                <i className="fas fa-trash"></i>
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showDeleteConfirm && (
                <div className="delete-confirm-overlay">
                    <div className="delete-confirm-modal">
                        <h3>Delete Event</h3>
                        <p>
                            Are you sure you want to delete "<strong>{event.title}</strong>"? 
                            This action cannot be undone and will also delete all associated registrations.
                        </p>
                        <div className="confirm-actions">
                            <button 
                                className="btn btn-outline"
                                onClick={() => setShowDeleteConfirm(false)}
                            >
                                Cancel
                            </button>
                            <button 
                                className="btn btn-danger"
                                onClick={handleDeleteEvent}
                            >
                                Delete Event
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EventManagementCard;