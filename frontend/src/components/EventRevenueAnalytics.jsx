import React, { useState, useEffect } from 'react';
import './EventRevenueAnalytics.css';

const EventRevenueAnalytics = ({ organizerId }) => {
    const [eventsData, setEventsData] = useState([]);
    const [filteredEvents, setFilteredEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    // Filters and sorting
    const [sortBy, setSortBy] = useState('revenue'); // revenue, tickets, roi, date
    const [sortOrder, setSortOrder] = useState('desc');
    const [filterStatus, setFilterStatus] = useState('all'); // all, upcoming, past, live
    const [filterCategory, setFilterCategory] = useState('all');
    const [timeRange, setTimeRange] = useState('all'); // all, thisMonth, lastMonth, thisYear
    const [searchTerm, setSearchTerm] = useState('');

    // View modes
    const [viewMode, setViewMode] = useState('table'); // table, cards, chart
    const [selectedEvents, setSelectedEvents] = useState([]);

    useEffect(() => {
        fetchEventAnalytics();
    }, [organizerId]);

    useEffect(() => {
        applyFiltersAndSorting();
    }, [eventsData, sortBy, sortOrder, filterStatus, filterCategory, timeRange, searchTerm]);

    const fetchEventAnalytics = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            console.log('Fetching detailed analytics with token:', token ? 'Present' : 'Missing');
            
            const response = await fetch('/api/events/detailed-analytics', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            console.log('Response status:', response.status);
            console.log('Response headers:', response.headers);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Error response:', errorText);
                throw new Error(`Failed to fetch event analytics: ${response.status} ${errorText}`);
            }

            const data = await response.json();
            console.log('Analytics data received:', data);
            setEventsData(data.events || []);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const applyFiltersAndSorting = () => {
        let filtered = [...eventsData];

        // Apply status filter
        if (filterStatus !== 'all') {
            const now = new Date();
            filtered = filtered.filter(event => {
                const eventDate = new Date(event.date);
                const endDate = new Date(event.endDate || event.date);
                
                switch (filterStatus) {
                    case 'upcoming': return eventDate > now;
                    case 'past': return endDate < now;
                    case 'live': return eventDate <= now && endDate >= now;
                    default: return true;
                }
            });
        }

        // Apply category filter
        if (filterCategory !== 'all') {
            filtered = filtered.filter(event => event.category === filterCategory);
        }

        // Apply time range filter
        if (timeRange !== 'all') {
            const now = new Date();
            filtered = filtered.filter(event => {
                const eventDate = new Date(event.date);
                
                switch (timeRange) {
                    case 'thisMonth':
                        return eventDate.getMonth() === now.getMonth() && 
                               eventDate.getFullYear() === now.getFullYear();
                    case 'lastMonth':
                        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1);
                        return eventDate.getMonth() === lastMonth.getMonth() && 
                               eventDate.getFullYear() === lastMonth.getFullYear();
                    case 'thisYear':
                        return eventDate.getFullYear() === now.getFullYear();
                    default: return true;
                }
            });
        }

        // Apply search filter
        if (searchTerm) {
            filtered = filtered.filter(event => 
                event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                event.category.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        // Apply sorting
        filtered.sort((a, b) => {
            let aValue, bValue;
            
            switch (sortBy) {
                case 'revenue':
                    aValue = a.analytics.totalRevenue;
                    bValue = b.analytics.totalRevenue;
                    break;
                case 'tickets':
                    aValue = a.analytics.ticketsSold;
                    bValue = b.analytics.ticketsSold;
                    break;
                case 'roi':
                    aValue = a.analytics.roi;
                    bValue = b.analytics.roi;
                    break;
                case 'date':
                    aValue = new Date(a.date);
                    bValue = new Date(b.date);
                    break;
                case 'title':
                    aValue = a.title.toLowerCase();
                    bValue = b.title.toLowerCase();
                    break;
                default:
                    aValue = a.analytics.totalRevenue;
                    bValue = b.analytics.totalRevenue;
            }

            if (sortOrder === 'asc') {
                return aValue > bValue ? 1 : -1;
            } else {
                return aValue < bValue ? 1 : -1;
            }
        });

        setFilteredEvents(filtered);
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0
        }).format(amount || 0);
    };

    const formatPercentage = (value) => {
        return `${(value || 0).toFixed(1)}%`;
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const getStatusBadge = (event) => {
        const now = new Date();
        const eventDate = new Date(event.date);
        const endDate = new Date(event.endDate || event.date);

        if (eventDate > now) return <span className="status-badge upcoming">Upcoming</span>;
        if (endDate < now) return <span className="status-badge past">Past</span>;
        return <span className="status-badge live">Live</span>;
    };

    const getPerformanceRating = (analytics) => {
        const roi = analytics.roi || 0;
        if (roi >= 300) return { rating: 'Excellent', class: 'excellent' };
        if (roi >= 200) return { rating: 'Good', class: 'good' };
        if (roi >= 100) return { rating: 'Average', class: 'average' };
        return { rating: 'Poor', class: 'poor' };
    };

    const toggleEventSelection = (eventId) => {
        setSelectedEvents(prev => 
            prev.includes(eventId) 
                ? prev.filter(id => id !== eventId)
                : [...prev, eventId]
        );
    };

    const getUniqueCategories = () => {
        return [...new Set(eventsData.map(event => event.category))].filter(Boolean);
    };

    if (loading) {
        return (
            <div className="event-analytics-container">
                <div className="analytics-header">
                    <h2>Event Revenue Analytics</h2>
                    <div className="loading-skeleton">Loading detailed analytics...</div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="event-analytics-container">
                <div className="analytics-header">
                    <h2>Event Revenue Analytics</h2>
                    <div className="error-message">
                        <i className="fas fa-exclamation-triangle"></i>
                        <span>Error: {error}</span>
                        <button onClick={fetchEventAnalytics} className="retry-btn">
                            <i className="fas fa-redo"></i> Retry
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="event-analytics-container">
            {/* Header with summary stats */}
            <div className="analytics-header">
                <div className="header-content">
                    <h2>Event Revenue Analytics</h2>
                    <div className="summary-stats">
                        <div className="summary-item">
                            <span className="summary-label">Total Events</span>
                            <span className="summary-value">{eventsData.length}</span>
                        </div>
                        <div className="summary-item">
                            <span className="summary-label">Total Revenue</span>
                            <span className="summary-value">
                                {formatCurrency(eventsData.reduce((sum, event) => 
                                    sum + (event.analytics?.totalRevenue || 0), 0))}
                            </span>
                        </div>
                        <div className="summary-item">
                            <span className="summary-label">Avg Revenue/Event</span>
                            <span className="summary-value">
                                {formatCurrency(eventsData.length > 0 ? 
                                    eventsData.reduce((sum, event) => 
                                        sum + (event.analytics?.totalRevenue || 0), 0) / eventsData.length : 0)}
                            </span>
                        </div>
                        <div className="summary-item">
                            <span className="summary-label">Total Tickets Sold</span>
                            <span className="summary-value">
                                {eventsData.reduce((sum, event) => 
                                    sum + (event.analytics?.ticketsSold || 0), 0)}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters and Controls */}
            <div className="analytics-controls">
                <div className="controls-row">
                    <div className="search-box">
                        <i className="fas fa-search"></i>
                        <input
                            type="text"
                            placeholder="Search events..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    
                    <div className="filter-group">
                        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                            <option value="all">All Events</option>
                            <option value="upcoming">Upcoming</option>
                            <option value="live">Live</option>
                            <option value="past">Past</option>
                        </select>
                        
                        <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
                            <option value="all">All Categories</option>
                            {getUniqueCategories().map(category => (
                                <option key={category} value={category}>{category}</option>
                            ))}
                        </select>
                        
                        <select value={timeRange} onChange={(e) => setTimeRange(e.target.value)}>
                            <option value="all">All Time</option>
                            <option value="thisMonth">This Month</option>
                            <option value="lastMonth">Last Month</option>
                            <option value="thisYear">This Year</option>
                        </select>
                    </div>
                    
                    <div className="sort-group">
                        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                            <option value="revenue">Revenue</option>
                            <option value="tickets">Tickets Sold</option>
                            <option value="roi">ROI</option>
                            <option value="date">Date</option>
                            <option value="title">Title</option>
                        </select>
                        
                        <button 
                            className={`sort-order ${sortOrder}`}
                            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                        >
                            <i className={`fas fa-sort-amount-${sortOrder === 'asc' ? 'up' : 'down'}`}></i>
                        </button>
                    </div>
                    
                    <div className="view-toggle">
                        <button 
                            className={viewMode === 'table' ? 'active' : ''}
                            onClick={() => setViewMode('table')}
                        >
                            <i className="fas fa-table"></i>
                        </button>
                        <button 
                            className={viewMode === 'cards' ? 'active' : ''}
                            onClick={() => setViewMode('cards')}
                        >
                            <i className="fas fa-th"></i>
                        </button>
                        <button 
                            className={viewMode === 'chart' ? 'active' : ''}
                            onClick={() => setViewMode('chart')}
                        >
                            <i className="fas fa-chart-bar"></i>
                        </button>
                    </div>
                </div>
            </div>

            {/* Results count and bulk actions */}
            <div className="results-info">
                <span className="results-count">
                    Showing {filteredEvents.length} of {eventsData.length} events
                </span>
                {selectedEvents.length > 0 && (
                    <div className="bulk-actions">
                        <span>{selectedEvents.length} selected</span>
                        <button className="bulk-btn">Compare Selected</button>
                        <button className="bulk-btn">Export Data</button>
                    </div>
                )}
            </div>

            {/* Content based on view mode */}
            {viewMode === 'table' && (
                <div className="analytics-table-container">
                    <table className="analytics-table">
                        <thead>
                            <tr>
                                <th>
                                    <input 
                                        type="checkbox"
                                        onChange={(e) => {
                                            if (e.target.checked) {
                                                setSelectedEvents(filteredEvents.map(event => event._id));
                                            } else {
                                                setSelectedEvents([]);
                                            }
                                        }}
                                    />
                                </th>
                                <th>Event</th>
                                <th>Status</th>
                                <th>Revenue</th>
                                <th>Tickets Sold</th>
                                <th>ROI</th>
                                <th>Conversion Rate</th>
                                <th>Performance</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredEvents.map(event => (
                                <tr key={event._id} className="analytics-row">
                                    <td>
                                        <input 
                                            type="checkbox"
                                            checked={selectedEvents.includes(event._id)}
                                            onChange={() => toggleEventSelection(event._id)}
                                        />
                                    </td>
                                    <td className="event-info">
                                        <div className="event-details">
                                            <h4 className="event-title">{event.title}</h4>
                                            <div className="event-meta">
                                                <span className="event-date">{formatDate(event.date)}</span>
                                                <span className="event-category">{event.category}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td>{getStatusBadge(event)}</td>
                                    <td className="revenue-cell">
                                        <span className="revenue-amount">
                                            {formatCurrency(event.analytics?.totalRevenue || 0)}
                                        </span>
                                        <div className="revenue-breakdown">
                                            {event.analytics?.ticketTypeBreakdown?.map(ticket => (
                                                <div key={ticket.name} className="ticket-revenue">
                                                    {ticket.name}: {formatCurrency(ticket.revenue)}
                                                </div>
                                            ))}
                                        </div>
                                    </td>
                                    <td className="tickets-cell">
                                        <span className="tickets-sold">
                                            {event.analytics?.ticketsSold || 0}
                                        </span>
                                        <span className="tickets-capacity">
                                            / {event.capacity || 'No limit'}
                                        </span>
                                        <div className="capacity-bar">
                                            <div 
                                                className="capacity-fill"
                                                style={{ 
                                                    width: `${event.capacity ? 
                                                        (event.analytics?.ticketsSold / event.capacity) * 100 : 0}%` 
                                                }}
                                            ></div>
                                        </div>
                                    </td>
                                    <td className="roi-cell">
                                        <span className={`roi-value ${getPerformanceRating(event.analytics).class}`}>
                                            {formatPercentage(event.analytics?.roi || 0)}
                                        </span>
                                    </td>
                                    <td className="conversion-cell">
                                        {formatPercentage(event.analytics?.conversionRate || 0)}
                                    </td>
                                    <td className="performance-cell">
                                        <span className={`performance-badge ${getPerformanceRating(event.analytics).class}`}>
                                            {getPerformanceRating(event.analytics).rating}
                                        </span>
                                    </td>
                                    <td className="actions-cell">
                                        <button className="action-btn view-details">
                                            <i className="fas fa-chart-line"></i>
                                        </button>
                                        <button className="action-btn edit-event">
                                            <i className="fas fa-edit"></i>
                                        </button>
                                        <button className="action-btn export-data">
                                            <i className="fas fa-download"></i>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {viewMode === 'cards' && (
                <div className="analytics-cards-container">
                    {filteredEvents.map(event => (
                        <div key={event._id} className="event-analytics-card">
                            <div className="card-header">
                                <div className="card-title">
                                    <h3>{event.title}</h3>
                                    {getStatusBadge(event)}
                                </div>
                                <div className="card-meta">
                                    <span className="event-date">{formatDate(event.date)}</span>
                                    <span className="event-category">{event.category}</span>
                                </div>
                            </div>
                            
                            <div className="card-metrics">
                                <div className="metric-item">
                                    <span className="metric-label">Revenue</span>
                                    <span className="metric-value">
                                        {formatCurrency(event.analytics?.totalRevenue || 0)}
                                    </span>
                                </div>
                                <div className="metric-item">
                                    <span className="metric-label">Tickets Sold</span>
                                    <span className="metric-value">
                                        {event.analytics?.ticketsSold || 0}
                                    </span>
                                </div>
                                <div className="metric-item">
                                    <span className="metric-label">ROI</span>
                                    <span className={`metric-value ${getPerformanceRating(event.analytics).class}`}>
                                        {formatPercentage(event.analytics?.roi || 0)}
                                    </span>
                                </div>
                                <div className="metric-item">
                                    <span className="metric-label">Performance</span>
                                    <span className={`metric-value ${getPerformanceRating(event.analytics).class}`}>
                                        {getPerformanceRating(event.analytics).rating}
                                    </span>
                                </div>
                            </div>
                            
                            <div className="card-actions">
                                <button className="card-action-btn primary">
                                    <i className="fas fa-chart-line"></i>
                                    View Details
                                </button>
                                <button className="card-action-btn secondary">
                                    <i className="fas fa-edit"></i>
                                    Edit
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {viewMode === 'chart' && (
                <div className="analytics-chart-container">
                    <div className="chart-header">
                        <h3>Revenue Comparison</h3>
                        <div className="chart-controls">
                            <button className="chart-type-btn active">Bar Chart</button>
                            <button className="chart-type-btn">Line Chart</button>
                            <button className="chart-type-btn">Pie Chart</button>
                        </div>
                    </div>
                    <div className="comparison-chart">
                        {filteredEvents.map((event, index) => (
                            <div key={event._id} className="chart-bar-item">
                                <div className="chart-bar-wrapper">
                                    <div 
                                        className="chart-bar"
                                        style={{ 
                                            height: `${Math.max(
                                                (event.analytics?.totalRevenue || 0) / 
                                                Math.max(...filteredEvents.map(e => e.analytics?.totalRevenue || 0)) * 100, 
                                                2
                                            )}%` 
                                        }}
                                        title={`${event.title}: ${formatCurrency(event.analytics?.totalRevenue || 0)}`}
                                    ></div>
                                </div>
                                <div className="chart-bar-label">
                                    <span className="event-name">{event.title.substring(0, 15)}...</span>
                                    <span className="event-revenue">
                                        {formatCurrency(event.analytics?.totalRevenue || 0)}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {filteredEvents.length === 0 && (
                <div className="no-results">
                    <i className="fas fa-search"></i>
                    <h3>No events found</h3>
                    <p>Try adjusting your filters or search terms</p>
                </div>
            )}
        </div>
    );
};

export default EventRevenueAnalytics;