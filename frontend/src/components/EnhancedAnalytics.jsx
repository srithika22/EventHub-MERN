import React, { useState, useEffect } from 'react';
import './EnhancedAnalytics.css';

const EnhancedAnalytics = ({ organizerId }) => {
    const [analyticsData, setAnalyticsData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('overview');

    useEffect(() => {
        fetchEnhancedAnalytics();
    }, [organizerId]);

    const fetchEnhancedAnalytics = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const response = await fetch('/api/events/enhanced-analytics', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch enhanced analytics');
            }

            const data = await response.json();
            setAnalyticsData(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
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

    if (loading) {
        return (
            <div className="enhanced-analytics">
                <div className="analytics-header">
                    <h2>Enhanced Analytics</h2>
                    <p>Loading detailed insights...</p>
                </div>
                <div className="loading-grid">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="metric-card skeleton"></div>
                    ))}
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="enhanced-analytics">
                <div className="analytics-header">
                    <h2>Enhanced Analytics</h2>
                    <div className="error-message">
                        <i className="fas fa-exclamation-triangle"></i>
                        <p>{error}</p>
                        <button onClick={fetchEnhancedAnalytics} className="retry-btn">
                            Retry
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    const renderOverviewTab = () => (
        <div className="analytics-grid">
            <div className="metric-card revenue">
                <div className="metric-header">
                    <h3>Total Revenue</h3>
                    <i className="fas fa-dollar-sign"></i>
                </div>
                <div className="metric-value">{formatCurrency(analyticsData.totalRevenue)}</div>
                <div className="metric-change positive">
                    <i className="fas fa-arrow-up"></i>
                    +{formatPercentage(analyticsData.revenueGrowth)}
                </div>
            </div>

            <div className="metric-card tickets">
                <div className="metric-header">
                    <h3>Tickets Sold</h3>
                    <i className="fas fa-ticket-alt"></i>
                </div>
                <div className="metric-value">{analyticsData.totalTickets?.toLocaleString()}</div>
                <div className="metric-subtitle">
                    Avg: {Math.round(analyticsData.avgTicketsPerEvent)} per event
                </div>
            </div>

            <div className="metric-card conversion">
                <div className="metric-header">
                    <h3>Conversion Rate</h3>
                    <i className="fas fa-chart-pie"></i>
                </div>
                <div className="metric-value">{formatPercentage(analyticsData.conversionRate)}</div>
                <div className="metric-subtitle">Views to registrations</div>
            </div>

            <div className="metric-card revenue-per-event">
                <div className="metric-header">
                    <h3>Revenue per Event</h3>
                    <i className="fas fa-calendar-check"></i>
                </div>
                <div className="metric-value">{formatCurrency(analyticsData.avgRevenuePerEvent)}</div>
                <div className="metric-subtitle">
                    {analyticsData.totalEvents} events total
                </div>
            </div>
        </div>
    );

    const renderTicketTypesTab = () => (
        <div className="ticket-analytics">
            <h3>Revenue by Ticket Type</h3>
            <div className="ticket-breakdown">
                {analyticsData.ticketTypeBreakdown?.map((ticket, index) => (
                    <div key={index} className="ticket-type-item">
                        <div className="ticket-info">
                            <span className="ticket-name">{ticket.name}</span>
                            <span className="ticket-price">{formatCurrency(ticket.price)}</span>
                        </div>
                        <div className="ticket-metrics">
                            <div className="ticket-sold">
                                {ticket.sold} sold
                            </div>
                            <div className="ticket-revenue">
                                {formatCurrency(ticket.totalRevenue)}
                            </div>
                        </div>
                        <div className="ticket-progress">
                            <div 
                                className="progress-bar"
                                style={{ width: `${(ticket.totalRevenue / analyticsData.totalRevenue) * 100}%` }}
                            ></div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    const renderCategoriesTab = () => (
        <div className="category-analytics">
            <h3>Performance by Category</h3>
            <div className="category-grid">
                {analyticsData.categoryBreakdown?.map((category, index) => (
                    <div key={index} className="category-card">
                        <div className="category-header">
                            <h4>{category.name}</h4>
                            <span className="event-count">{category.eventCount} events</span>
                        </div>
                        <div className="category-metrics">
                            <div className="category-revenue">
                                <span className="label">Revenue</span>
                                <span className="value">{formatCurrency(category.revenue)}</span>
                            </div>
                            <div className="category-attendance">
                                <span className="label">Attendance</span>
                                <span className="value">{category.totalAttendance}</span>
                            </div>
                            <div className="category-avg">
                                <span className="label">Avg per event</span>
                                <span className="value">{formatCurrency(category.avgRevenue)}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    return (
        <div className="enhanced-analytics">
            <div className="analytics-header">
                <h2>Enhanced Analytics</h2>
                <div className="analytics-tabs">
                    <button 
                        className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
                        onClick={() => setActiveTab('overview')}
                    >
                        <i className="fas fa-chart-bar"></i>
                        Overview
                    </button>
                    <button 
                        className={`tab-btn ${activeTab === 'tickets' ? 'active' : ''}`}
                        onClick={() => setActiveTab('tickets')}
                    >
                        <i className="fas fa-ticket-alt"></i>
                        Ticket Types
                    </button>
                    <button 
                        className={`tab-btn ${activeTab === 'categories' ? 'active' : ''}`}
                        onClick={() => setActiveTab('categories')}
                    >
                        <i className="fas fa-tags"></i>
                        Categories
                    </button>
                </div>
            </div>

            <div className="analytics-content">
                {activeTab === 'overview' && renderOverviewTab()}
                {activeTab === 'tickets' && renderTicketTypesTab()}
                {activeTab === 'categories' && renderCategoriesTab()}
            </div>
        </div>
    );
};

export default EnhancedAnalytics;