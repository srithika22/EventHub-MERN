import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import './ParticipantManager.css';

const ParticipantManager = ({ eventId, eventTitle, refreshTrigger = 0 }) => {
    const [participants, setParticipants] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedParticipants, setSelectedParticipants] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [ticketTypeFilter, setTicketTypeFilter] = useState('all');
    const [sortBy, setSortBy] = useState('registrationDate');
    const [sortOrder, setSortOrder] = useState('desc');
    
    const fetchParticipants = async () => {
        if (!eventId) return;
        
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const authHeader = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
            
            const response = await fetch(`http://localhost:3001/api/registrations/event/${eventId}/participants`, {
                headers: { 'Authorization': authHeader }
            });
            
            if (!response.ok) {
                if (response.status === 404) {
                    setParticipants([]);
                    return;
                }
                throw new Error('Failed to fetch participants');
            }
            
            const data = await response.json();
            setParticipants(data);
        } catch (error) {
            console.error('Error fetching participants:', error);
            toast.error('Failed to load participants');
        } finally {
            setLoading(false);
        }
    };
    
    useEffect(() => {
        fetchParticipants();
    }, [eventId, refreshTrigger]);
    
    const handleSelectParticipant = (participantId) => {
        setSelectedParticipants(prev => 
            prev.includes(participantId) 
                ? prev.filter(id => id !== participantId)
                : [...prev, participantId]
        );
    };
    
    const handleSelectAll = () => {
        if (selectedParticipants.length === filteredParticipants.length) {
            setSelectedParticipants([]);
        } else {
            setSelectedParticipants(filteredParticipants.map(p => p._id));
        }
    };
    
    const handleBulkStatusUpdate = async (newStatus) => {
        if (selectedParticipants.length === 0) {
            toast.warning('Please select participants first');
            return;
        }
        
        try {
            const token = localStorage.getItem('token');
            const authHeader = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
            
            const response = await fetch('http://localhost:3001/api/registrations/bulk-status', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': authHeader
                },
                body: JSON.stringify({
                    registrationIds: selectedParticipants,
                    status: newStatus,
                    eventId: eventId
                })
            });
            
            if (!response.ok) {
                throw new Error('Failed to update participant status');
            }
            
            const result = await response.json();
            toast.success(result.message);
            
            // Refresh participants data
            await fetchParticipants();
            setSelectedParticipants([]);
        } catch (error) {
            console.error('Error updating participant status:', error);
            toast.error('Failed to update participant status');
        }
    };
    
    const handleExportData = async () => {
        try {
            const token = localStorage.getItem('token');
            const authHeader = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
            
            const response = await fetch(`http://localhost:3001/api/registrations/export/${eventId}`, {
                headers: { 'Authorization': authHeader }
            });
            
            if (!response.ok) {
                throw new Error('Failed to export data');
            }
            
            const exportData = await response.json();
            
            // Convert to CSV and download
            const csvContent = convertToCSV(exportData.data);
            downloadCSV(csvContent, `${exportData.eventTitle}_participants.csv`);
            
            toast.success('Participant data exported successfully');
        } catch (error) {
            console.error('Error exporting data:', error);
            toast.error('Failed to export participant data');
        }
    };
    
    const convertToCSV = (data) => {
        if (data.length === 0) return '';
        
        const headers = Object.keys(data[0]);
        const csvRows = [];
        
        // Add headers
        csvRows.push(headers.join(','));
        
        // Add data rows
        data.forEach(row => {
            const values = headers.map(header => {
                const value = row[header] || '';
                // Escape commas and quotes
                return `"${value.toString().replace(/"/g, '""')}"`;
            });
            csvRows.push(values.join(','));
        });
        
        return csvRows.join('\n');
    };
    
    const downloadCSV = (csvContent, filename) => {
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };
    
    // Filter and sort participants
    const filteredParticipants = participants
        .filter(participant => {
            const matchesSearch = 
                (participant.participant?.name?.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (participant.participant?.email?.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (participant.attendeeInfo?.name?.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (participant.attendeeInfo?.email?.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (participant.ticketCode?.toLowerCase().includes(searchTerm.toLowerCase()));
            
            const matchesStatus = statusFilter === 'all' || participant.status === statusFilter;
            const matchesTicketType = ticketTypeFilter === 'all' || participant.ticketTypeName === ticketTypeFilter;
            
            return matchesSearch && matchesStatus && matchesTicketType;
        })
        .sort((a, b) => {
            let aValue, bValue;
            
            switch (sortBy) {
                case 'name':
                    aValue = a.participant?.name || a.attendeeInfo?.name || '';
                    bValue = b.participant?.name || b.attendeeInfo?.name || '';
                    break;
                case 'email':
                    aValue = a.participant?.email || a.attendeeInfo?.email || '';
                    bValue = b.participant?.email || b.attendeeInfo?.email || '';
                    break;
                case 'ticketType':
                    aValue = a.ticketTypeName || '';
                    bValue = b.ticketTypeName || '';
                    break;
                case 'status':
                    aValue = a.status || '';
                    bValue = b.status || '';
                    break;
                case 'registrationDate':
                default:
                    aValue = new Date(a.createdAt);
                    bValue = new Date(b.createdAt);
                    break;
            }
            
            if (sortOrder === 'asc') {
                return aValue > bValue ? 1 : -1;
            } else {
                return aValue < bValue ? 1 : -1;
            }
        });
    
    // Get unique ticket types for filter (with fallback)
    const ticketTypes = participants.length > 0 ? [...new Set(participants.map(p => p.ticketTypeName).filter(Boolean))] : [];
    
    // Reset ticket type filter if current selection is no longer available
    useEffect(() => {
        if (ticketTypeFilter !== 'all' && !ticketTypes.includes(ticketTypeFilter)) {
            setTicketTypeFilter('all');
        }
    }, [ticketTypes, ticketTypeFilter]);
    
    const getStatusBadgeClass = (status) => {
        switch (status) {
            case 'confirmed': return 'status-confirmed';
            case 'attended': return 'status-attended';
            case 'canceled': return 'status-canceled';
            default: return 'status-default';
        }
    };
    
    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    if (!eventId) {
        return (
            <div className="participant-manager">
                <div className="empty-state">
                    <i className="fas fa-users"></i>
                    <h3>Select an Event</h3>
                    <p>Choose an event to view and manage participants</p>
                </div>
            </div>
        );
    }

    return (
        <div className="participant-manager">
            <div className="participant-manager-header">
                <div className="header-title">
                    <h2>Participants</h2>
                    {eventTitle && <p className="event-title">{eventTitle}</p>}
                </div>
                
                <div className="header-actions">
                    <button 
                        className="btn btn-outline"
                        onClick={handleExportData}
                        disabled={participants.length === 0}
                    >
                        <i className="fas fa-download"></i>
                        Export CSV
                    </button>
                    
                    <button 
                        className="btn btn-primary"
                        onClick={fetchParticipants}
                        disabled={loading}
                    >
                        <i className={`fas ${loading ? 'fa-spinner fa-spin' : 'fa-sync-alt'}`}></i>
                        Refresh
                    </button>
                </div>
            </div>
            
            <div className="participant-filters">
                <div className="filter-row">
                    <div className="search-box">
                        <i className="fas fa-search"></i>
                        <input
                            type="text"
                            placeholder="Search participants..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    
                    <select 
                        value={statusFilter} 
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="filter-select"
                    >
                        <option value="all">All Statuses</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="attended">Attended</option>
                        <option value="canceled">Canceled</option>
                    </select>
                    
                    <select 
                        value={ticketTypeFilter} 
                        onChange={(e) => setTicketTypeFilter(e.target.value)}
                        className="filter-select"
                    >
                        <option value="all">All Ticket Types</option>
                        {ticketTypes.map((type, index) => (
                            <option key={`ticket-type-${index}-${type}`} value={type}>{type}</option>
                        ))}
                    </select>
                    
                    <select 
                        value={`${sortBy}-${sortOrder}`} 
                        onChange={(e) => {
                            const [field, order] = e.target.value.split('-');
                            setSortBy(field);
                            setSortOrder(order);
                        }}
                        className="filter-select"
                    >
                        <option value="registrationDate-desc">Latest First</option>
                        <option value="registrationDate-asc">Oldest First</option>
                        <option value="name-asc">Name A-Z</option>
                        <option value="name-desc">Name Z-A</option>
                        <option value="ticketType-asc">Ticket Type</option>
                        <option value="status-asc">Status</option>
                    </select>
                </div>
                
                {selectedParticipants.length > 0 && (
                    <div className="bulk-actions">
                        <span className="selected-count">
                            {selectedParticipants.length} participant{selectedParticipants.length > 1 ? 's' : ''} selected
                        </span>
                        
                        <div className="bulk-buttons">
                            <button 
                                className="btn btn-sm btn-success"
                                onClick={() => handleBulkStatusUpdate('attended')}
                            >
                                Mark Attended
                            </button>
                            <button 
                                className="btn btn-sm btn-warning"
                                onClick={() => handleBulkStatusUpdate('confirmed')}
                            >
                                Mark Confirmed
                            </button>
                            <button 
                                className="btn btn-sm btn-danger"
                                onClick={() => handleBulkStatusUpdate('canceled')}
                            >
                                Mark Canceled
                            </button>
                        </div>
                    </div>
                )}
            </div>
            
            {loading ? (
                <div className="loading-state">
                    <div className="spinner"></div>
                    <p>Loading participants...</p>
                </div>
            ) : filteredParticipants.length === 0 ? (
                <div className="empty-state">
                    <i className="fas fa-user-times"></i>
                    <h3>No Participants Found</h3>
                    <p>
                        {participants.length === 0 
                            ? 'No one has registered for this event yet'
                            : 'No participants match your current filters'
                        }
                    </p>
                </div>
            ) : (
                <div className="participants-table-container">
                    <table className="participants-table">
                        <thead>
                            <tr>
                                <th className="checkbox-col">
                                    <input
                                        type="checkbox"
                                        checked={selectedParticipants.length === filteredParticipants.length}
                                        onChange={handleSelectAll}
                                    />
                                </th>
                                <th>Participant</th>
                                <th>Contact</th>
                                <th>Ticket</th>
                                <th>Status</th>
                                <th>Registered</th>
                                <th>Code</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredParticipants.map(participant => (
                                <tr key={participant._id}>
                                    <td className="checkbox-col">
                                        <input
                                            type="checkbox"
                                            checked={selectedParticipants.includes(participant._id)}
                                            onChange={() => handleSelectParticipant(participant._id)}
                                        />
                                    </td>
                                    <td className="participant-info">
                                        <div className="participant-details">
                                            <div className="participant-name">
                                                {participant.attendeeInfo?.name || participant.participant?.name || 'N/A'}
                                            </div>
                                            {participant.participant?.name && 
                                                participant.attendeeInfo?.name && 
                                                participant.participant.name !== participant.attendeeInfo.name && (
                                                    <div className="registered-by">
                                                        Registered by: {participant.participant.name}
                                                    </div>
                                                )
                                            }
                                        </div>
                                    </td>
                                    <td className="contact-info">
                                        <div className="email">
                                            {participant.attendeeInfo?.email || participant.participant?.email || 'N/A'}
                                        </div>
                                        {participant.attendeeInfo?.phone && (
                                            <div className="phone">{participant.attendeeInfo.phone}</div>
                                        )}
                                    </td>
                                    <td className="ticket-info">
                                        <div className="ticket-type">{participant.ticketTypeName}</div>
                                        <div className="ticket-quantity">Qty: {participant.quantity}</div>
                                    </td>
                                    <td className="status-col">
                                        <span className={`status-badge ${getStatusBadgeClass(participant.status)}`}>
                                            {participant.status}
                                        </span>
                                    </td>
                                    <td className="date-col">
                                        {formatDate(participant.createdAt)}
                                    </td>
                                    <td className="ticket-code">
                                        <code>{participant.ticketCode}</code>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            
            <div className="participant-summary">
                <div className="summary-stats">
                    <div className="stat-item">
                        <span className="stat-value">{participants.length}</span>
                        <span className="stat-label">Total</span>
                    </div>
                    <div className="stat-item">
                        <span className="stat-value">
                            {participants.filter(p => p.status === 'confirmed').length}
                        </span>
                        <span className="stat-label">Confirmed</span>
                    </div>
                    <div className="stat-item">
                        <span className="stat-value">
                            {participants.filter(p => p.status === 'attended').length}
                        </span>
                        <span className="stat-label">Attended</span>
                    </div>
                    <div className="stat-item">
                        <span className="stat-value">
                            {participants.reduce((sum, p) => sum + (p.quantity || 0), 0)}
                        </span>
                        <span className="stat-label">Total Tickets</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ParticipantManager;