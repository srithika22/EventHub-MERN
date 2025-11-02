import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useLocation, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../utils/api';
import StatsCard from '../components/StatsCard';
import RevenueChart from '../components/RevenueChart';
import EventRevenueAnalytics from '../components/EventRevenueAnalytics';
import ParticipantManager from '../components/ParticipantManager';
import EventManagementCard from '../components/EventManagementCard';
import SpeakerManagement from '../components/SpeakerManagement';
import SessionManagement from '../components/SessionManagement';
import EventImage from '../components/EventImage';
import './OrganizerDashboard.css';
import '../components/EventImage.css';

// --- ENHANCED ORGANIZER DASHBOARD COMPONENT ---
function OrganizerDashboard({ tab }) {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const params = useParams();
    const eventId = params.eventId;
    
    // State Management
    const [myEvents, setMyEvents] = useState([]);
    const [pastEvents, setPastEvents] = useState([]);
    const [dashboardStats, setDashboardStats] = useState(null);
    const [revenueData, setRevenueData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [loadingStats, setLoadingStats] = useState(true);
    const [loadingRevenue, setLoadingRevenue] = useState(true);
    const [error, setError] = useState(null);
    const [activePage, setActivePage] = useState(tab || 'dashboard');
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    
    // Filters and Search
    const [eventFilter, setEventFilter] = useState('all');
    const [eventSearchTerm, setEventSearchTerm] = useState('');
    const [showDropdown, setShowDropdown] = useState(false);
    
    // Engagement Features State
    const [selectedEngagementEvent, setSelectedEngagementEvent] = useState(null);
    const [activeEngagementTab, setActiveEngagementTab] = useState('polling');
    const [polls, setPolls] = useState([]);
    const [questions, setQuestions] = useState([]);
    const [networkingData, setNetworkingData] = useState([]);
    const [forumTopics, setForumTopics] = useState([]);
    
    // Polling Analytics State
    const [showPollAnalytics, setShowPollAnalytics] = useState(false);
    const [selectedPollForAnalytics, setSelectedPollForAnalytics] = useState(null);
    const [pollAnalytics, setPollAnalytics] = useState(null);
    const [pollResponses, setPollResponses] = useState([]);
    const [analyticsView, setAnalyticsView] = useState('overview');
    const [loadingPollAnalytics, setLoadingPollAnalytics] = useState(false);
    
    // Quick Poll Creator State
    const [showPollModal, setShowPollModal] = useState(false);
    const [quickPoll, setQuickPoll] = useState({
        question: '',
        options: ['', ''],
        allowMultiple: false,
        isAnonymous: true,
        selectedEventId: null
    });
    const [creatingPoll, setCreatingPoll] = useState(false);
    const [livePolls, setLivePolls] = useState([]);
    
    // Participant Management State
    const [selectedEventForParticipants, setSelectedEventForParticipants] = useState(null);
    
    // Analytics State
    const [analyticsData, setAnalyticsData] = useState(null);
    const [selectedAnalyticsEvent, setSelectedAnalyticsEvent] = useState(null);
    const [analyticsTimeRange, setAnalyticsTimeRange] = useState('3months');
    const [loadingAnalytics, setLoadingAnalytics] = useState(false);
    
    // Settings State
    const [userSettings, setUserSettings] = useState({
        profile: {},
        notifications: {},
        security: {},
        organization: {}
    });
    const [loadingSettings, setLoadingSettings] = useState(false);
    const [savingSettings, setSavingSettings] = useState(false);
    const [activeSettingsTab, setActiveSettingsTab] = useState('profile');
    
    // Q&A Modal State
    const [showAnswerModal, setShowAnswerModal] = useState(false);
    const [selectedQuestion, setSelectedQuestion] = useState(null);
    const [answerText, setAnswerText] = useState('');
    
    // Forum Modal State
    const [showTopicModal, setShowTopicModal] = useState(false);
    const [newTopic, setNewTopic] = useState({ title: '', description: '' });

    // Fetch engagement data for selected event
    const fetchEngagementData = useCallback(async (eventId) => {
        if (!eventId) return;
        
        const token = localStorage.getItem('token');
        if (!token) return;

        try {
            const [pollsResponse, questionsResponse, networkingResponse, forumResponse] = await Promise.all([
                fetch(`${API_BASE_URL}/api/polling/${eventId}/polls`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                }),
                fetch(`${API_BASE_URL}/api/qa/${eventId}/questions`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                }),
                fetch(`${API_BASE_URL}/api/networking/${eventId}/analytics`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                }),
                fetch(`${API_BASE_URL}/api/forum/${eventId}/discussions`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                })
            ]);

            if (pollsResponse.ok) {
                const pollsData = await pollsResponse.json();
                setPolls(pollsData.polls || pollsData);
            }

            if (questionsResponse.ok) {
                const questionsData = await questionsResponse.json();
                setQuestions(questionsData.questions || questionsData);
            }

            if (networkingResponse.ok) {
                const networkingResponseData = await networkingResponse.json();
                setNetworkingData(networkingResponseData.analytics || networkingResponseData);
            } else {
                const errorText = await networkingResponse.text();
                console.warn('Networking analytics not available:', networkingResponse.status, errorText);
                setNetworkingData({
                    totalParticipants: 0,
                    networkingParticipants: 0,
                    totalConnections: 0,
                    pendingConnections: 0,
                    activeParticipants: 0,
                    connectionRate: 0,
                    networkingRate: 0,
                    businessCardsShared: 0,
                    recentConnections: [],
                    industryBreakdown: {},
                    skillsBreakdown: {}
                });
            }

            if (forumResponse.ok) {
                const forumData = await forumResponse.json();
                setForumTopics(forumData.discussions || forumData);
            }

        } catch (error) {
            console.error('Error fetching engagement data:', error);
            
            // Provide fallback data to prevent UI crashes
            setPolls([]);
            setQuestions([]);
            setNetworkingData({
                totalParticipants: 0,
                networkingParticipants: 0,
                totalConnections: 0,
                pendingConnections: 0,
                activeParticipants: 0,
                connectionRate: 0,
                networkingRate: 0,
                businessCardsShared: 0,
                recentConnections: [],
                industryBreakdown: {},
                skillsBreakdown: {}
            });
            setForumTopics([]);
            
            toast.error('Failed to load some engagement data. Check your connection and try again.');
        }
    }, []);

    // Determine active page based on URL or props
    useEffect(() => {
        if (tab) {
            setActivePage(tab);
            return;
        }
        
        const path = location.pathname;
        if (path.includes('/events')) {
            setActivePage('events');
        } else if (path.includes('/past-events')) {
            setActivePage('past-events');
        } else if (path.includes('/analytics')) {
            setActivePage('analytics');
        } else if (path.includes('/participants')) {
            setActivePage('participants');
            if (eventId) {
                const event = myEvents.find(e => e._id === eventId);
                setSelectedEvent(event);
            }
        } else if (path.includes('/settings')) {
            setActivePage('settings');
        } else if (path.includes('/engagement')) {
            setActivePage('engagement');
        } else {
            setActivePage('dashboard');
        }
    }, [location, tab, myEvents, eventId]);

    // Fetch engagement data when event is selected
    useEffect(() => {
        if (selectedEngagementEvent && activePage === 'engagement') {
            fetchEngagementData(selectedEngagementEvent._id);
            
            // Set up real-time updates for engagement data
            const interval = setInterval(() => {
                fetchEngagementData(selectedEngagementEvent._id);
            }, 5000); // Update every 5 seconds
            
            return () => clearInterval(interval);
        }
    }, [selectedEngagementEvent, activePage, fetchEngagementData]);

    // Fetch comprehensive dashboard statistics
    const fetchDashboardStats = useCallback(async () => {
        const token = localStorage.getItem('token');
        if (!token) return;
        
        setLoadingStats(true);
        try {
            const response = await fetch('${API_BASE_URL}/api/events/dashboard-stats', {
                headers: { 'Authorization': token }
            });
            
            if (response.ok) {
                const data = await response.json();
                setDashboardStats(data);
            } else {
                const errorText = await response.text();
                console.error('Dashboard stats error:', response.status, errorText);
            }
        } catch (error) {
            console.error('Error fetching dashboard stats:', error);
        } finally {
            setLoadingStats(false);
        }
    }, []);

    // Fetch revenue analytics
    const fetchRevenueData = useCallback(async (timeRange = '6months') => {
        const token = localStorage.getItem('token');
        if (!token) return;
        
        setLoadingRevenue(true);
        try {
            const response = await fetch(`${API_BASE_URL}/api/events/revenue-analytics?timeRange=${timeRange}`, {
                headers: { 'Authorization': token }
            });
            
            if (response.ok) {
                const data = await response.json();
                setRevenueData(data);
            } else {
                const errorText = await response.text();
                console.error('Revenue analytics error:', response.status, errorText);
            }
        } catch (error) {
            console.error('Error fetching revenue data:', error);
        } finally {
            setLoadingRevenue(false);
        }
    }, []);

    // Fetch events
    const fetchMyEvents = useCallback(async () => {
        const token = localStorage.getItem('token');
        if (!token) {
            navigate('/login');
            return;
        }
        
        setLoading(true);
        setError(null);
        
        try {
            const response = await fetch('${API_BASE_URL}/api/events/my-events', {
                headers: { 'Authorization': token }
            });
            
            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.message || 'Failed to fetch your events');
            }
            
            const data = await response.json();
            const now = new Date();
            
            const upcomingEvents = data.filter(event => new Date(event.date) >= now);
            const pastEventsData = data.filter(event => new Date(event.date) < now);
            
            setMyEvents(upcomingEvents);
            setPastEvents(pastEventsData);
            
        } catch (error) {
            console.error('Error fetching my events:', error);
            setError(error.message);
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    }, [navigate]);

    // Poll management functions
    const createPoll = useCallback(async (pollData) => {
        const token = localStorage.getItem('token');
        if (!token || !selectedEngagementEvent) return;

        setCreatingPoll(true);
        try {
            const response = await fetch(`${API_BASE_URL}/api/polling/${selectedEngagementEvent._id}/polls`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    question: pollData.question,
                    type: 'multiple_choice',
                    options: pollData.options.filter(opt => opt.trim()),
                    allowMultiple: pollData.allowMultiple,
                    isAnonymous: pollData.isAnonymous,
                    timeLimit: 0,
                    description: pollData.description || ''
                })
            });

            if (response.ok) {
                const result = await response.json();
                const newPoll = result.poll || result;
                setPolls(prev => [newPoll, ...prev]);
                toast.success('Poll created successfully!');
                return newPoll;
            } else {
                const error = await response.json();
                throw new Error(error.message || 'Failed to create poll');
            }
        } catch (error) {
            console.error('Error creating poll:', error);
            toast.error('Failed to create poll: ' + error.message);
        } finally {
            setCreatingPoll(false);
        }
    }, [selectedEngagementEvent]);

    // Poll Analytics Functions
    const fetchPollAnalytics = useCallback(async (pollId) => {
        const token = localStorage.getItem('token');
        if (!token || !selectedEngagementEvent) return;
        
        setLoadingPollAnalytics(true);
        try {
            // Try to fetch detailed analytics from server
            const analyticsRes = await fetch(`${API_BASE_URL}/api/polling/${selectedEngagementEvent._id}/polls/${pollId}/analytics`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (analyticsRes.ok) {
                const analyticsData = await analyticsRes.json();
                setPollAnalytics(analyticsData);
                console.log('Fetched poll analytics from server:', analyticsData);
            }

            // Try to fetch detailed responses for additional insights
            const responsesRes = await fetch(`${API_BASE_URL}/api/polling/${selectedEngagementEvent._id}/polls/${pollId}/responses`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (responsesRes.ok) {
                const responsesData = await responsesRes.json();
                setPollResponses(responsesData.responses || responsesData);
                console.log('Fetched poll responses:', responsesData.responses?.length || 0);
            } else {
                console.log('Could not fetch detailed responses, using poll data only');
                setPollResponses([]);
            }

            // Always generate comprehensive analytics from the poll data
            generateComprehensiveAnalytics(pollId);
        } catch (error) {
            console.error('Error fetching poll analytics:', error);
            // Still generate analytics from poll data
            generateComprehensiveAnalytics(pollId);
        } finally {
            setLoadingPollAnalytics(false);
        }
    }, [selectedEngagementEvent]);

    const generateComprehensiveAnalytics = (pollId) => {
        const poll = polls.find(p => p._id === pollId);
        if (!poll) return;

        console.log('Generating comprehensive analytics for poll:', poll);

        const totalResponses = poll.totalVotes || 0;
        const createdAt = new Date(poll.createdAt || Date.now());
        const now = new Date();
        const timeDiff = now - createdAt;
        const hoursActive = Math.max(1, timeDiff / (1000 * 60 * 60));
        
        // Create detailed option breakdown
        const optionBreakdown = poll.options.map((option, index) => {
            const votes = poll.results?.find(r => r.optionIndex === index)?.votes || 0;
            const percentage = totalResponses > 0 ? ((votes / totalResponses) * 100) : 0;
            
            return {
                option,
                votes,
                percentage: percentage.toFixed(1),
                isWinner: false // Will be set below
            };
        });

        // Determine winner(s)
        const maxVotes = Math.max(...optionBreakdown.map(o => o.votes));
        optionBreakdown.forEach(option => {
            if (option.votes === maxVotes && maxVotes > 0) {
                option.isWinner = true;
            }
        });

        // Calculate engagement metrics
        const participationRate = poll.isActive ? 
            ((totalResponses / (selectedEngagementEvent.registrations?.length || 1)) * 100).toFixed(1) : 
            'N/A';
            
        const responseRate = totalResponses > 0 ? (totalResponses / hoursActive).toFixed(2) : '0';
        
        // Generate time-based insights
        const timeInsights = {
            peakHour: `${new Date().getHours()}:00`, // Simplified for demo
            responsePattern: totalResponses > 10 ? 'High engagement' : totalResponses > 5 ? 'Moderate engagement' : 'Low engagement',
            avgResponseTime: '2.3 seconds' // Simplified for demo
        };

        // Calculate competitive analysis
        const competitiveAnalysis = {
            closestRace: optionBreakdown.length > 1 ? 
                Math.abs(optionBreakdown[0].votes - optionBreakdown[1].votes) <= 2 : false,
            landslideWinner: maxVotes > totalResponses * 0.6,
            balancedOptions: optionBreakdown.every(o => Math.abs(o.percentage - (100 / optionBreakdown.length)) < 20)
        };

        const analytics = {
            pollId: poll._id,
            pollQuestion: poll.question,
            status: poll.isActive ? 'Active' : 'Ended',
            totalResponses,
            participationRate,
            responseRate: `${responseRate}/hour`,
            hoursActive: hoursActive.toFixed(1),
            optionBreakdown,
            timeInsights,
            competitiveAnalysis,
            demographics: {
                anonymousResponses: poll.isAnonymous ? totalResponses : 0,
                identifiedResponses: poll.isAnonymous ? 0 : totalResponses
            },
            recommendations: generateRecommendations(poll, optionBreakdown, totalResponses),
            generatedAt: new Date().toISOString()
        };

        console.log('Generated comprehensive analytics:', analytics);
        setPollAnalytics(analytics);
    };

    const generateRecommendations = (poll, optionBreakdown, totalResponses) => {
        const recommendations = [];
        
        if (totalResponses === 0) {
            recommendations.push("Consider promoting this poll to increase participation");
            recommendations.push("Share the poll link with event attendees");
        } else if (totalResponses < 10) {
            recommendations.push("Low participation - consider extending poll duration");
            recommendations.push("Add incentives for participation");
        } else if (totalResponses > 50) {
            recommendations.push("Excellent engagement! Consider creating similar polls");
        }
        
        const maxPercentage = Math.max(...optionBreakdown.map(o => parseFloat(o.percentage)));
        if (maxPercentage > 80) {
            recommendations.push("Overwhelming consensus - consider implementing the popular choice");
        } else if (maxPercentage < 40) {
            recommendations.push("Close competition - may need further discussion");
        }
        
        if (poll.isActive && totalResponses > 20) {
            recommendations.push("Consider ending poll and sharing results");
        }
        
        return recommendations;
    };

    const openPollAnalytics = (poll) => {
        console.log('Opening analytics for poll:', poll);
        setSelectedPollForAnalytics(poll);
        setShowPollAnalytics(true);
        setAnalyticsView('overview');
        // Clear previous analytics
        setPollAnalytics(null);
        setPollResponses([]);
        // Fetch fresh analytics
        fetchPollAnalytics(poll._id);
    };

    const duplicatePoll = (poll) => {
        setQuickPoll({
            question: `${poll.question} (Copy)`,
            options: [...poll.options],
            allowMultiple: poll.allowMultiple,
            isAnonymous: poll.isAnonymous,
            selectedEventId: selectedEngagementEvent._id
        });
        setShowPollModal(true);
    };

    // Quick poll helper functions
    const handleQuickPollChange = (field, value) => {
        setQuickPoll(prev => ({ ...prev, [field]: value }));
    };

    const addPollOption = () => {
        setQuickPoll(prev => ({
            ...prev,
            options: [...prev.options, '']
        }));
    };

    const removePollOption = (index) => {
        setQuickPoll(prev => ({
            ...prev,
            options: prev.options.filter((_, i) => i !== index)
        }));
    };

    const updatePollOption = (index, value) => {
        setQuickPoll(prev => ({
            ...prev,
            options: prev.options.map((opt, i) => i === index ? value : opt)
        }));
    };

    // Q&A management functions
    const answerQuestion = useCallback(async (questionId, answer) => {
        const token = localStorage.getItem('token');
        if (!token) return;

        try {
            const response = await fetch(`${API_BASE_URL}/api/qa/questions/${questionId}/answer`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ answer })
            });

            if (response.ok) {
                const result = await response.json();
                const updatedQuestion = result.question || result;
                setQuestions(prev => prev.map(q => 
                    q._id === questionId ? updatedQuestion : q
                ));
                toast.success('Question answered successfully!');
            } else {
                const error = await response.json();
                throw new Error(error.message || 'Failed to answer question');
            }
        } catch (error) {
            console.error('Error answering question:', error);
            toast.error('Failed to answer question: ' + error.message);
        }
    }, []);

    const featureQuestion = useCallback(async (questionId) => {
        const token = localStorage.getItem('token');
        if (!token) return;

        try {
            const response = await fetch(`${API_BASE_URL}/api/qa/questions/${questionId}/star`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const result = await response.json();
                const updatedQuestion = result.question || result;
                setQuestions(prev => prev.map(q => 
                    q._id === questionId ? updatedQuestion : q
                ));
                toast.success('Question featured successfully!');
            } else {
                const error = await response.json();
                throw new Error(error.message || 'Failed to feature question');
            }
        } catch (error) {
            console.error('Error featuring question:', error);
            toast.error('Failed to feature question: ' + error.message);
        }
    }, []);

    // Q&A Modal handlers
    const openAnswerModal = (question) => {
        setSelectedQuestion(question);
        setAnswerText('');
        setShowAnswerModal(true);
    };

    const submitAnswer = async () => {
        if (!selectedQuestion || !answerText.trim()) return;
        
        await answerQuestion(selectedQuestion._id, answerText);
        setShowAnswerModal(false);
        setSelectedQuestion(null);
        setAnswerText('');
    };

    // Networking functions
    const exportConnections = async () => {
        if (!selectedEngagementEvent) return;
        
        const token = localStorage.getItem('token');
        try {
            const response = await fetch(`${API_BASE_URL}/api/networking/${selectedEngagementEvent._id}/analytics`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (response.ok) {
                const result = await response.json();
                const data = result.analytics || result;
                
                // Create CSV content from the analytics data
                const csvContent = `Event,Total Connections,Pending Connections,Active Participants,Connection Rate,Business Cards Shared
${selectedEngagementEvent.title},${data.totalConnections || 0},${data.pendingConnections || 0},${data.activeParticipants || data.networkingParticipants || 0},${data.connectionRate || 0}%,${data.businessCardsShared || 0}`;
                
                // Create and download CSV file
                const blob = new Blob([csvContent], { type: 'text/csv' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `networking-data-${selectedEngagementEvent.title}.csv`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
                toast.success('Networking data exported successfully!');
            } else {
                const error = await response.json();
                throw new Error(error.message || 'Failed to fetch networking data');
            }
        } catch (error) {
            console.error('Export error:', error);
            toast.error('Failed to export networking data: ' + error.message);
        }
    };

    // Poll Export Functions
    const exportPollData = async (poll) => {
        try {
            const token = localStorage.getItem('token');
            if (!token || !selectedEngagementEvent) return;

            let responses = [];
            let hasDetailedResponses = false;

            // Try to fetch detailed poll responses
            try {
                const response = await fetch(`${API_BASE_URL}/api/polling/${selectedEngagementEvent._id}/polls/${poll._id}/responses`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (response.ok) {
                    const data = await response.json();
                    responses = data.responses || data;
                    hasDetailedResponses = true;
                    console.log('Fetched detailed responses:', responses.length);
                } else {
                    const errorText = await response.text();
                    console.warn('Could not fetch detailed responses:', response.status, errorText);
                }
            } catch (fetchError) {
                console.warn('Error fetching detailed responses:', fetchError.message);
            }

            // Create CSV content for individual poll
            let csvContent = `Poll Question: ${poll.question}\n`;
            csvContent += `Poll Type: ${poll.type}\n`;
            csvContent += `Created: ${new Date(poll.createdAt).toLocaleString()}\n`;
            csvContent += `Status: ${poll.isActive ? 'Active' : 'Inactive'}\n`;
            csvContent += `Total Responses: ${poll.totalVotes || 0}\n\n`;
            
            if (hasDetailedResponses && responses.length > 0) {
                csvContent += `Response Details:\n`;
                csvContent += `Response ID,Voter Email,Selected Options,Response Time,Is Anonymous\n`;
                
                responses.forEach((response, index) => {
                    const selectedOptions = Array.isArray(response.selectedOptions) 
                        ? response.selectedOptions.map(optIndex => poll.options[optIndex] || `Option ${optIndex}`).join('; ')
                        : poll.options[response.selectedOptions] || response.textResponse || 'Unknown';
                    
                    const voterEmail = poll.isAnonymous || !response.voter ? 'Anonymous' : (response.voter?.email || 'Unknown');
                    const responseTime = new Date(response.createdAt).toLocaleString();
                    
                    csvContent += `${index + 1},"${voterEmail}","${selectedOptions}","${responseTime}",${poll.isAnonymous}\n`;
                });
            } else {
                csvContent += `Detailed response data not available.\n`;
                csvContent += `Note: This may be due to privacy settings or system limitations.\n\n`;
            }
                
            // Add option summary
            csvContent += `\nOption Summary:\n`;
            csvContent += `Option,Votes,Percentage\n`;
            
            poll.options.forEach((option, index) => {
                const votes = poll.results?.find(r => r.optionIndex === index)?.votes || 0;
                const percentage = poll.totalVotes > 0 ? ((votes / poll.totalVotes) * 100).toFixed(1) : 0;
                csvContent += `"${option}",${votes},${percentage}%\n`;
            });

            // Create and download CSV file
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `poll-data-${poll.question.substring(0, 30).replace(/[^a-zA-Z0-9]/g, '-')}-${Date.now()}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            toast.success('Poll data exported successfully!');
        } catch (error) {
            console.error('Poll export error:', error);
            toast.error('Failed to export poll data: ' + error.message);
        }
    };

    const exportAllPollsData = async () => {
        try {
            if (!selectedEngagementEvent || !polls.length) {
                toast.error('No polls available to export');
                return;
            }

            let csvContent = `Event Poll Analytics Report\n`;
            csvContent += `Event: ${selectedEngagementEvent.title}\n`;
            csvContent += `Generated: ${new Date().toLocaleString()}\n`;
            csvContent += `Total Polls: ${polls.length}\n\n`;

            // Summary table
            csvContent += `Poll Summary:\n`;
            csvContent += `Poll Question,Status,Total Votes,Response Rate,Created Date\n`;
            
            polls.forEach(poll => {
                const status = poll.isActive ? 'Active' : 'Inactive';
                const totalVotes = poll.totalVotes || 0;
                const responseRate = '0%'; // Would need participant count to calculate
                const createdDate = new Date(poll.createdAt).toLocaleDateString();
                
                csvContent += `"${poll.question}","${status}",${totalVotes},"${responseRate}","${createdDate}"\n`;
            });

            csvContent += `\nDetailed Poll Results:\n\n`;

            // Detailed results for each poll
            for (const poll of polls) {
                csvContent += `Poll: ${poll.question}\n`;
                csvContent += `Type: ${poll.type} | Status: ${poll.isActive ? 'Active' : 'Inactive'} | Votes: ${poll.totalVotes || 0}\n`;
                
                csvContent += `Option,Votes,Percentage\n`;
                poll.options.forEach((option, index) => {
                    const votes = poll.results?.find(r => r.optionIndex === index)?.votes || 0;
                    const percentage = poll.totalVotes > 0 ? ((votes / poll.totalVotes) * 100).toFixed(1) : 0;
                    csvContent += `"${option}",${votes},${percentage}%\n`;
                });
                csvContent += `\n`;
            }

            // Create and download CSV file
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `all-polls-analytics-${selectedEngagementEvent.title.replace(/[^a-zA-Z0-9]/g, '-')}-${Date.now()}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            toast.success('All polls data exported successfully!');
        } catch (error) {
            console.error('All polls export error:', error);
            toast.error('Failed to export all polls data: ' + error.message);
        }
    };

    // Poll Management Functions
    const togglePollStatus = async (pollId, currentStatus) => {
        try {
            const token = localStorage.getItem('token');
            const endpoint = currentStatus 
                ? `${API_BASE_URL}/api/polling/${selectedEngagementEvent._id}/polls/${pollId}/deactivate`
                : `${API_BASE_URL}/api/polling/${selectedEngagementEvent._id}/polls/${pollId}/activate`;

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                await fetchEngagementData(selectedEngagementEvent._id);
                toast.success(`Poll ${currentStatus ? 'deactivated' : 'activated'} successfully!`);
            } else {
                const error = await response.json();
                throw new Error(error.message || 'Failed to update poll status');
            }
        } catch (error) {
            console.error('Toggle poll status error:', error);
            toast.error('Failed to update poll status: ' + error.message);
        }
    };

    const deletePoll = async (pollId) => {
        if (!window.confirm('Are you sure you want to delete this poll? This action cannot be undone.')) {
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/api/polling/${selectedEngagementEvent._id}/polls/${pollId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                await fetchEngagementData(selectedEngagementEvent._id);
                toast.success('Poll deleted successfully!');
            } else {
                const error = await response.json();
                throw new Error(error.message || 'Failed to delete poll');
            }
        } catch (error) {
            console.error('Delete poll error:', error);
            toast.error('Failed to delete poll: ' + error.message);
        }
    };

    // Forum functions
    const createForumTopic = async (topicData) => {
        if (!selectedEngagementEvent) return;
        
        const token = localStorage.getItem('token');
        try {
            const response = await fetch(`${API_BASE_URL}/api/forum/${selectedEngagementEvent._id}/discussions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    title: topicData.title,
                    content: topicData.description,
                    category: 'general'
                })
            });
            
            if (response.ok) {
                const result = await response.json();
                const newTopic = result.discussion || result;
                setForumTopics(prev => [newTopic, ...prev]);
                toast.success('Forum topic created successfully!');
            } else {
                const error = await response.json();
                throw new Error(error.message || 'Failed to create forum topic');
            }
        } catch (error) {
            console.error('Forum creation error:', error);
            toast.error('Failed to create forum topic: ' + error.message);
        }
    };

    // Forum modal handlers
    const openTopicModal = () => {
        setNewTopic({ title: '', description: '' });
        setShowTopicModal(true);
    };

    const submitTopic = async () => {
        if (!newTopic.title.trim() || !newTopic.description.trim()) return;
        
        await createForumTopic(newTopic);
        setShowTopicModal(false);
        setNewTopic({ title: '', description: '' });
    };

    const createQuickPoll = async () => {
        if (!quickPoll.question.trim() || quickPoll.options.filter(opt => opt.trim()).length < 2) {
            toast.error('Please provide a question and at least 2 options');
            return;
        }

        if (!selectedEngagementEvent) {
            toast.error('Please select an event first');
            return;
        }

        const pollData = {
            question: quickPoll.question.trim(),
            eventId: selectedEngagementEvent._id,
            options: quickPoll.options.filter(opt => opt.trim()),
            allowMultiple: quickPoll.allowMultiple,
            isAnonymous: quickPoll.isAnonymous
        };

        const newPoll = await createPoll(pollData);
        if (newPoll) {
            setQuickPoll({
                question: '',
                options: ['', ''],
                allowMultiple: false,
                isAnonymous: true,
                selectedEventId: ''
            });
            setShowPollModal(false);
        }
    };

    // Initial data loading
    useEffect(() => {
        fetchMyEvents();
        fetchDashboardStats();
        fetchRevenueData();
    }, [fetchMyEvents, fetchDashboardStats, fetchRevenueData, refreshTrigger]);

    // Load engagement data when event is selected
    useEffect(() => {
        if (selectedEngagementEvent) {
            fetchEngagementData(selectedEngagementEvent._id);
        }
    }, [selectedEngagementEvent, fetchEngagementData]);

    // Fetch analytics data when needed
    useEffect(() => {
        if (activePage === 'analytics') {
            const fetchAnalyticsData = async () => {
                setLoadingAnalytics(true);
                try {
                    const token = localStorage.getItem('token');
                    
                    // Fetch dashboard stats
                    const dashboardResponse = await fetch('${API_BASE_URL}/api/events/dashboard-stats', {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    
                    if (dashboardResponse.ok) {
                        const dashboardData = await dashboardResponse.json();
                        
                        // Fetch individual event analytics if an event is selected
                        let eventAnalytics = null;
                        if (selectedAnalyticsEvent) {
                            const eventStatsResponse = await fetch(`${API_BASE_URL}/api/registrations/real-time-stats/${selectedAnalyticsEvent._id}`, {
                                headers: { 'Authorization': `Bearer ${token}` }
                            });
                            
                            if (eventStatsResponse.ok) {
                                eventAnalytics = await eventStatsResponse.json();
                            }
                            
                            // Fetch Q&A analytics
                            try {
                                const qaResponse = await fetch(`${API_BASE_URL}/api/qa/${selectedAnalyticsEvent._id}/analytics`, {
                                    headers: { 'Authorization': `Bearer ${token}` }
                                });
                                
                                if (qaResponse.ok) {
                                    const qaData = await qaResponse.json();
                                    eventAnalytics.qaAnalytics = qaData.analytics;
                                }
                            } catch (error) {
                                console.log('Q&A analytics not available:', error);
                            }
                            
                            // Fetch networking analytics
                            try {
                                const networkingResponse = await fetch(`${API_BASE_URL}/api/networking/${selectedAnalyticsEvent._id}/analytics`, {
                                    headers: { 'Authorization': `Bearer ${token}` }
                                });
                                
                                if (networkingResponse.ok) {
                                    const networkingData = await networkingResponse.json();
                                    eventAnalytics.networkingAnalytics = networkingData.analytics || networkingData;
                                }
                            } catch (error) {
                                console.log('Networking analytics not available:', error);
                            }
                        }
                        
                        setAnalyticsData({
                            dashboard: dashboardData,
                            eventSpecific: eventAnalytics
                        });
                    }
                } catch (error) {
                    console.error('Error fetching analytics:', error);
                    toast.error('Failed to load analytics data');
                } finally {
                    setLoadingAnalytics(false);
                }
            };
            
            fetchAnalyticsData();
        }
    }, [activePage, selectedAnalyticsEvent, analyticsTimeRange]);

    // Load settings when needed
    useEffect(() => {
        if (activePage === 'settings') {
            const loadUserSettings = async () => {
                setLoadingSettings(true);
                try {
                    const token = localStorage.getItem('token');
                    const response = await fetch('${API_BASE_URL}/api/auth/profile', {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    
                    if (response.ok) {
                        const userData = await response.json();
                        setUserSettings({
                            profile: {
                                name: userData.name || '',
                                email: userData.email || '',
                                phone: userData.phone || '',
                                bio: userData.bio || '',
                                organization: userData.organization || '',
                                website: userData.website || ''
                            },
                            notifications: {
                                emailNotifications: userData.preferences?.emailNotifications ?? true,
                                smsNotifications: userData.preferences?.smsNotifications ?? false,
                                marketingEmails: userData.preferences?.marketingEmails ?? true,
                                eventReminders: userData.preferences?.eventReminders ?? true,
                                participantUpdates: userData.preferences?.participantUpdates ?? true
                            },
                            security: {
                                twoFactorAuth: userData.security?.twoFactorAuth ?? false,
                                loginAlerts: userData.security?.loginAlerts ?? true,
                                passwordLastChanged: userData.security?.passwordLastChanged || null
                            },
                            organization: {
                                organizationName: userData.organizationDetails?.name || '',
                                organizationType: userData.organizationDetails?.type || 'company',
                                address: userData.organizationDetails?.address || '',
                                taxId: userData.organizationDetails?.taxId || '',
                                website: userData.organizationDetails?.website || ''
                            }
                        });
                    }
                } catch (error) {
                    console.error('Error loading settings:', error);
                    toast.error('Failed to load settings');
                } finally {
                    setLoadingSettings(false);
                }
            };
            
            loadUserSettings();
        }
    }, [activePage]);

    // Handle logout
    const handleLogout = () => {
        logout();
        navigate('/');
    };

    // Main Dashboard Render
    const renderDashboard = () => (
        <div className="dashboard-content">
            <div className="dashboard-header">
                <div className="dashboard-title">
                    <h1>Organizer Dashboard</h1>
                    <p>Welcome back, {user?.name || 'Organizer'}</p>
                </div>
                <div className="dashboard-actions">
                    <Link to="/create-event" className="btn btn-primary">
                        <i className="fas fa-plus"></i> Create Event
                    </Link>
                </div>
            </div>
            
            {/* Dashboard Stats */}
            <div className="stats-grid">
                <StatsCard 
                    icon="fas fa-calendar" 
                    title="Total Events" 
                    value={loadingStats ? "Loading..." : (dashboardStats?.totalEvents || 0)}
                    trend="+12%"
                />
                <StatsCard 
                    icon="fas fa-users" 
                    title="Total Participants" 
                    value={loadingStats ? "Loading..." : (dashboardStats?.totalParticipants || 0)}
                    trend="+8%"
                />
                <StatsCard 
                    icon="fas fa-dollar-sign" 
                    title="Total Revenue" 
                    value={loadingStats ? "Loading..." : `$${(dashboardStats?.totalRevenue || 0).toLocaleString()}`}
                    trend="+15%"
                />
                <StatsCard 
                    icon="fas fa-star" 
                    title="Avg Rating" 
                    value={loadingStats ? "Loading..." : (dashboardStats?.averageRating || 0).toFixed(1)}
                    trend="+3%"
                />
            </div>

            {/* Revenue Chart */}
            <div className="chart-section">
                <RevenueChart 
                    data={revenueData} 
                    loading={loadingRevenue}
                    onTimeRangeChange={fetchRevenueData}
                />
            </div>

            {/* Recent Events */}
            <div className="recent-events">
                <h3>Recent Events</h3>
                <div className="events-grid">
                    {myEvents.slice(0, 3).map(event => (
                        <EventManagementCard 
                            key={event._id} 
                            event={event}
                            onUpdate={() => setRefreshTrigger(prev => prev + 1)}
                        />
                    ))}
                </div>
            </div>
        </div>
    );

    // Event Management Render
    const renderEventManagement = () => (
        <div className="dashboard-content">
            <div className="dashboard-header">
                <div className="dashboard-title">
                    <h1>My Events</h1>
                    <p>Manage your upcoming events</p>
                </div>
                <div className="dashboard-actions">
                    <div className="filter-controls">
                        <select 
                            value={eventFilter} 
                            onChange={(e) => setEventFilter(e.target.value)}
                            className="form-control"
                        >
                            <option value="all">All Events</option>
                            <option value="upcoming">Upcoming</option>
                            <option value="published">Published</option>
                            <option value="draft">Draft</option>
                        </select>
                        <input 
                            type="text"
                            placeholder="Search events..."
                            value={eventSearchTerm}
                            onChange={(e) => setEventSearchTerm(e.target.value)}
                            className="form-control"
                        />
                    </div>
                    <Link to="/create-event" className="btn btn-primary">
                        <i className="fas fa-plus"></i> Create Event
                    </Link>
                </div>
            </div>
            
            {loading ? (
                <div className="loading-state">
                    <i className="fas fa-spinner fa-spin"></i>
                    <p>Loading your events...</p>
                </div>
            ) : error ? (
                <div className="error-state">
                    <i className="fas fa-exclamation-triangle"></i>
                    <p>{error}</p>
                    <button onClick={fetchMyEvents} className="btn btn-primary">
                        Retry
                    </button>
                </div>
            ) : (
                <div className="events-grid">
                    {myEvents.length === 0 ? (
                        <div className="empty-state">
                            <i className="fas fa-calendar-plus fa-3x"></i>
                            <h3>No events yet</h3>
                            <p>Create your first event to get started</p>
                            <Link to="/create-event" className="btn btn-primary">
                                Create Your First Event
                            </Link>
                        </div>
                    ) : (
                        myEvents.filter(event => {
                            // Filter by search term
                            const searchMatch = eventSearchTerm === '' || 
                                event.title.toLowerCase().includes(eventSearchTerm.toLowerCase()) ||
                                event.category.toLowerCase().includes(eventSearchTerm.toLowerCase()) ||
                                event.location.toLowerCase().includes(eventSearchTerm.toLowerCase());
                            
                            // Filter by event filter
                            const filterMatch = eventFilter === 'all' || 
                                (eventFilter === 'upcoming' && new Date(event.date) >= new Date()) ||
                                (eventFilter === 'published' && event.status === 'published') ||
                                (eventFilter === 'draft' && event.status === 'draft');
                            
                            return searchMatch && filterMatch;
                        }).map(event => (
                            <EventManagementCard 
                                key={event._id} 
                                event={event}
                                onEventUpdated={() => setRefreshTrigger(prev => prev + 1)}
                                onEventDeleted={() => setRefreshTrigger(prev => prev + 1)}
                            />
                        ))
                    )}
                </div>
            )}
        </div>
    );

    // Engagement Features Management Render
    const renderEngagementFeatures = () => (
        <div className="dashboard-content">
            <div className="dashboard-header">
                <div className="dashboard-title">
                    <h1>Engagement Features</h1>
                    <p>Manage polls, Q&A, networking, and forums for your events</p>
                </div>
            </div>

            {/* Event Selection */}
            {!selectedEngagementEvent ? (
                <div className="event-selection-section">
                    <h3>Select an Event to Manage</h3>
                    <div className="engagement-events-grid">
                        {myEvents.map(event => (
                            <div 
                                key={event._id} 
                                className="engagement-event-card selectable"
                                onClick={() => setSelectedEngagementEvent(event)}
                            >
                                <div className="event-info">
                                    <h4>{event.title}</h4>
                                    <p>{new Date(event.date).toLocaleDateString()}</p>
                                    <div className="event-stats">
                                        <span><i className="fas fa-users"></i> {event.registrations?.length || 0} registered</span>
                                    </div>
                                </div>
                                <div className="event-actions">
                                    <button className="btn btn-primary">
                                        Manage Features <i className="fas fa-arrow-right"></i>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="engagement-management">
                    {/* Event Header */}
                    <div className="selected-event-header">
                        <div className="event-info">
                            <h3>{selectedEngagementEvent.title}</h3>
                            <p>{new Date(selectedEngagementEvent.date).toLocaleDateString()}</p>
                        </div>
                        <button 
                            className="btn btn-outline"
                            onClick={() => setSelectedEngagementEvent(null)}
                        >
                            <i className="fas fa-arrow-left"></i> Back to Events
                        </button>
                    </div>

                    {/* Feature Tabs */}
                    <div className="feature-tabs">
                        <button 
                            className={`tab-btn ${activeEngagementTab === 'polling' ? 'active' : ''}`}
                            onClick={() => setActiveEngagementTab('polling')}
                        >
                            <i className="fas fa-poll"></i> Live Polling
                        </button>
                        <button 
                            className={`tab-btn ${activeEngagementTab === 'qa' ? 'active' : ''}`}
                            onClick={() => setActiveEngagementTab('qa')}
                        >
                            <i className="fas fa-question-circle"></i> Q&A
                        </button>
                        <button 
                            className={`tab-btn ${activeEngagementTab === 'networking' ? 'active' : ''}`}
                            onClick={() => setActiveEngagementTab('networking')}
                        >
                            <i className="fas fa-network-wired"></i> Networking
                        </button>
                        <button 
                            className={`tab-btn ${activeEngagementTab === 'forum' ? 'active' : ''}`}
                            onClick={() => setActiveEngagementTab('forum')}
                        >
                            <i className="fas fa-comments"></i> Forum
                        </button>
                    </div>

                    {/* Tab Content */}
                    <div className="tab-content">
                        {activeEngagementTab === 'polling' && renderPollingFeature()}
                        {activeEngagementTab === 'qa' && renderQAFeature()}
                        {activeEngagementTab === 'networking' && renderNetworkingFeature()}
                        {activeEngagementTab === 'forum' && renderForumFeature()}
                    </div>
                </div>
            )}
        </div>
    );

    // Render Polling Feature
    const renderPollingFeature = () => (
        <div className="feature-content">
            <div className="feature-header">
                <h3><i className="fas fa-poll"></i> Live Polling Management</h3>
                <button 
                    className="btn btn-primary"
                    onClick={() => setShowPollModal(true)}
                >
                    <i className="fas fa-plus"></i> Create Poll
                </button>
            </div>

            <div className="polls-overview">
                <div className="stats-row">
                    <div className="stat-item">
                        <i className="fas fa-poll"></i>
                        <div>
                            <h4>{polls.length}</h4>
                            <p>Total Polls</p>
                        </div>
                    </div>
                    <div className="stat-item">
                        <i className="fas fa-chart-bar"></i>
                        <div>
                            <h4>{polls.filter(p => p.isActive).length}</h4>
                            <p>Active Polls</p>
                        </div>
                    </div>
                    <div className="stat-item">
                        <i className="fas fa-users"></i>
                        <div>
                            <h4>{polls.reduce((sum, p) => sum + (p.totalVotes || 0), 0)}</h4>
                            <p>Total Votes</p>
                        </div>
                    </div>
                    <div className="stat-item">
                        <i className="fas fa-download"></i>
                        <div>
                            <button 
                                className="btn btn-sm btn-secondary"
                                onClick={exportAllPollsData}
                                disabled={polls.length === 0}
                                title="Export all polls data"
                            >
                                <i className="fas fa-download"></i> Export All
                            </button>
                        </div>
                    </div>
                </div>

                <div className="polls-list">
                    {polls.length === 0 ? (
                        <div className="empty-state">
                            <i className="fas fa-poll fa-3x"></i>
                            <h3>No polls created yet</h3>
                            <p>Create your first poll to engage with participants</p>
                        </div>
                    ) : (
                        polls.map(poll => (
                            <div key={poll._id} className="poll-item">
                                <div className="poll-header">
                                    <h4>{poll.question}</h4>
                                    <div className="poll-status">
                                        <span className={`status-badge ${poll.isActive ? 'active' : 'inactive'}`}>
                                            {poll.isActive ? 'Active' : 'Ended'}
                                        </span>
                                    </div>
                                </div>
                                <div className="poll-content">
                                    <div className="poll-options">
                                        {poll.options.map((optionText, index) => {
                                            const votes = poll.results?.find(r => r.optionIndex === index)?.votes || 0;
                                            const percentage = poll.totalVotes > 0 ? ((votes / poll.totalVotes) * 100).toFixed(1) : 0;
                                            
                                            return (
                                                <div key={index} className="option-result">
                                                    <span className="option-text">{optionText}</span>
                                                    <div className="option-votes">
                                                        <div className="vote-bar">
                                                            <div 
                                                                className="vote-fill" 
                                                                style={{ width: `${percentage}%` }}
                                                            ></div>
                                                        </div>
                                                        <span className="vote-count">{votes} votes ({percentage}%)</span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <div className="poll-actions">
                                        <button 
                                            className="btn btn-sm btn-info"
                                            onClick={() => openPollAnalytics(poll)}
                                            title="View detailed analytics"
                                        >
                                            <i className="fas fa-chart-line"></i> Analytics
                                        </button>
                                        <button 
                                            className="btn btn-sm btn-secondary"
                                            onClick={() => exportPollData(poll)}
                                            title="Export poll data"
                                        >
                                            <i className="fas fa-download"></i> Export
                                        </button>
                                        <button 
                                            className="btn btn-sm btn-warning"
                                            onClick={() => duplicatePoll(poll)}
                                            title="Duplicate this poll"
                                        >
                                            <i className="fas fa-copy"></i> Duplicate
                                        </button>
                                        {poll.isActive ? (
                                            <button 
                                                className="btn btn-sm btn-danger"
                                                onClick={() => togglePollStatus(poll._id, true)}
                                                title="End this poll"
                                            >
                                                <i className="fas fa-stop"></i> End Poll
                                            </button>
                                        ) : (
                                            <button 
                                                className="btn btn-sm btn-success"
                                                onClick={() => togglePollStatus(poll._id, false)}
                                                title="Reactivate this poll"
                                            >
                                                <i className="fas fa-play"></i> Reactivate
                                            </button>
                                        )}
                                        <button 
                                            className="btn btn-sm btn-danger"
                                            onClick={() => deletePoll(poll._id)}
                                            title="Delete this poll permanently"
                                        >
                                            <i className="fas fa-trash"></i> Delete
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Poll Creation Modal */}
            {showPollModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h3>Create New Poll</h3>
                            <button 
                                className="close-btn"
                                onClick={() => setShowPollModal(false)}
                            >
                                <i className="fas fa-times"></i>
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label>Poll Question</label>
                                <input 
                                    type="text"
                                    className="form-control"
                                    placeholder="Enter your poll question..."
                                    value={quickPoll.question}
                                    onChange={(e) => handleQuickPollChange('question', e.target.value)}
                                />
                            </div>
                            <div className="form-group">
                                <label>Options</label>
                                {quickPoll.options.map((option, index) => (
                                    <div key={index} className="option-input">
                                        <input 
                                            type="text"
                                            className="form-control"
                                            placeholder={`Option ${index + 1}`}
                                            value={option}
                                            onChange={(e) => updatePollOption(index, e.target.value)}
                                        />
                                        {quickPoll.options.length > 2 && (
                                            <button 
                                                type="button"
                                                className="btn btn-sm btn-outline"
                                                onClick={() => removePollOption(index)}
                                            >
                                                <i className="fas fa-trash"></i>
                                            </button>
                                        )}
                                    </div>
                                ))}
                                <button 
                                    type="button"
                                    className="btn btn-sm btn-outline"
                                    onClick={addPollOption}
                                >
                                    + Add Option
                                </button>
                            </div>
                            <div className="form-group">
                                <div className="checkbox-group">
                                    <label className="checkbox-label">
                                        <input 
                                            type="checkbox" 
                                            checked={quickPoll.allowMultiple}
                                            onChange={(e) => handleQuickPollChange('allowMultiple', e.target.checked)}
                                        /> Allow multiple choices
                                    </label>
                                    <label className="checkbox-label">
                                        <input 
                                            type="checkbox" 
                                            checked={quickPoll.isAnonymous}
                                            onChange={(e) => handleQuickPollChange('isAnonymous', e.target.checked)}
                                        /> Anonymous voting
                                    </label>
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button 
                                className="btn btn-outline"
                                onClick={() => setShowPollModal(false)}
                            >
                                Cancel
                            </button>
                            <button 
                                className="btn btn-primary"
                                onClick={createQuickPoll}
                                disabled={creatingPoll}
                            >
                                {creatingPoll ? 'Creating...' : 'Create Poll'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Advanced Poll Analytics Modal */}
            {showPollAnalytics && selectedPollForAnalytics && (
                <div className="modal-overlay">
                    <div className="modal-content analytics-modal">
                        <div className="modal-header">
                            <h3>
                                <i className="fas fa-chart-line"></i> 
                                Poll Analytics: {selectedPollForAnalytics.question}
                            </h3>
                            <div className="header-actions">
                                <button 
                                    className="btn btn-sm btn-secondary"
                                    onClick={() => exportPollData(selectedPollForAnalytics)}
                                    title="Export poll data"
                                >
                                    <i className="fas fa-download"></i> Export Data
                                </button>
                                <button 
                                    className="btn btn-sm btn-primary"
                                    onClick={() => fetchPollAnalytics(selectedPollForAnalytics._id)}
                                    title="Refresh analytics"
                                >
                                    <i className="fas fa-sync-alt"></i> Refresh
                                </button>
                                <button 
                                    className="close-btn"
                                    onClick={() => setShowPollAnalytics(false)}
                                >
                                    <i className="fas fa-times"></i>
                                </button>
                            </div>
                        </div>
                        
                        <div className="analytics-tabs">
                            <button 
                                className={`tab ${analyticsView === 'overview' ? 'active' : ''}`}
                                onClick={() => setAnalyticsView('overview')}
                            >
                                <i className="fas fa-chart-pie"></i> Overview
                            </button>
                            <button 
                                className={`tab ${analyticsView === 'detailed' ? 'active' : ''}`}
                                onClick={() => setAnalyticsView('detailed')}
                            >
                                <i className="fas fa-chart-bar"></i> Detailed
                            </button>
                            <button 
                                className={`tab ${analyticsView === 'responses' ? 'active' : ''}`}
                                onClick={() => setAnalyticsView('responses')}
                            >
                                <i className="fas fa-users"></i> Responses
                            </button>
                        </div>

                        <div className="modal-body">
                            {analyticsView === 'overview' && (
                                <div className="analytics-overview">
                                    <div className="analytics-stats">
                                        <div className="stat-card">
                                            <i className="fas fa-users icon"></i>
                                            <div>
                                                <h4>{pollAnalytics?.totalResponses || 0}</h4>
                                                <p>Total Responses</p>
                                            </div>
                                        </div>
                                        <div className="stat-card">
                                            <i className="fas fa-percentage icon"></i>
                                            <div>
                                                <h4>{pollAnalytics?.responseRate || 0}%</h4>
                                                <p>Response Rate</p>
                                            </div>
                                        </div>
                                        <div className="stat-card">
                                            <i className="fas fa-trophy icon"></i>
                                            <div>
                                                <h4>{pollAnalytics?.mostPopular || 'N/A'}</h4>
                                                <p>Most Popular</p>
                                            </div>
                                        </div>
                                        <div className="stat-card">
                                            <i className="fas fa-clock icon"></i>
                                            <div>
                                                <h4>{selectedPollForAnalytics.isActive ? 'Active' : 'Ended'}</h4>
                                                <p>Status</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="results-chart">
                                        <h4>Results Breakdown</h4>
                                        <div className="chart-container">
                                            {selectedPollForAnalytics.options?.map((option, index) => {
                                                const votes = pollAnalytics?.optionBreakdown?.[option] || 0;
                                                const total = pollAnalytics?.totalResponses || 1;
                                                const percentage = Math.round((votes / total) * 100);
                                                
                                                return (
                                                    <div key={index} className="result-bar">
                                                        <div className="option-info">
                                                            <span className="option-text">{option}</span>
                                                            <span className="vote-stats">{votes} votes ({percentage}%)</span>
                                                        </div>
                                                        <div className="progress-bar">
                                                            <div 
                                                                className="progress-fill"
                                                                style={{ width: `${percentage}%` }}
                                                            ></div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {analyticsView === 'detailed' && (
                                <div className="analytics-detailed">
                                    <div className="time-distribution">
                                        <h4><i className="fas fa-clock"></i> Response Time Distribution</h4>
                                        <div className="time-chart">
                                            {Object.entries(pollAnalytics?.timeDistribution || {}).map(([hour, count]) => (
                                                <div key={hour} className="time-bar">
                                                    <span className="time-label">{hour}:00</span>
                                                    <div className="time-progress">
                                                        <div 
                                                            className="time-fill"
                                                            style={{ width: `${(count / Math.max(...Object.values(pollAnalytics?.timeDistribution || {}))) * 100}%` }}
                                                        ></div>
                                                    </div>
                                                    <span className="time-count">{count}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="engagement-metrics">
                                        <h4><i className="fas fa-chart-line"></i> Engagement Metrics</h4>
                                        <div className="metrics-grid">
                                            <div className="metric-item">
                                                <span className="metric-label">Average Response Time</span>
                                                <span className="metric-value">2.3 min</span>
                                            </div>
                                            <div className="metric-item">
                                                <span className="metric-label">Peak Response Hour</span>
                                                <span className="metric-value">14:00</span>
                                            </div>
                                            <div className="metric-item">
                                                <span className="metric-label">Multiple Choice Rate</span>
                                                <span className="metric-value">{selectedPollForAnalytics.allowMultiple ? 'Enabled' : 'Disabled'}</span>
                                            </div>
                                            <div className="metric-item">
                                                <span className="metric-label">Anonymous Voting</span>
                                                <span className="metric-value">{selectedPollForAnalytics.isAnonymous ? 'Yes' : 'No'}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {analyticsView === 'responses' && (
                                <div className="analytics-responses">
                                    <div className="responses-header">
                                        <h4><i className="fas fa-users"></i> Individual Responses</h4>
                                        <button className="btn btn-sm btn-outline">
                                            <i className="fas fa-download"></i> Export CSV
                                        </button>
                                    </div>
                                    
                                    <div className="responses-list">
                                        {pollResponses.length === 0 ? (
                                            <div className="empty-responses">
                                                <i className="fas fa-inbox fa-2x"></i>
                                                <p>No responses yet</p>
                                            </div>
                                        ) : (
                                            pollResponses.map((response, index) => (
                                                <div key={index} className="response-item">
                                                    <div className="response-user">
                                                        <i className="fas fa-user-circle"></i>
                                                        <span>{selectedPollForAnalytics.isAnonymous ? `Participant ${index + 1}` : response.voter?.name || 'Anonymous'}</span>
                                                    </div>
                                                    <div className="response-choice">
                                                        {Array.isArray(response.response) 
                                                            ? response.response.map(choice => selectedPollForAnalytics.options[choice]).join(', ')
                                                            : selectedPollForAnalytics.options[response.response]
                                                        }
                                                    </div>
                                                    <div className="response-time">
                                                        {new Date(response.createdAt).toLocaleString()}
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="modal-footer">
                            <button 
                                className="btn btn-outline"
                                onClick={() => setShowPollAnalytics(false)}
                            >
                                Close
                            </button>
                            <button className="btn btn-primary">
                                <i className="fas fa-share"></i> Share Results
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );

    // Render Q&A Feature
    const renderQAFeature = () => (
        <div className="feature-content">
            <div className="feature-header">
                <h3><i className="fas fa-question-circle"></i> Q&A Management</h3>
                <button className="btn btn-primary">
                    <i className="fas fa-cog"></i> Q&A Settings
                </button>
            </div>
            
            <div className="qa-overview">
                <div className="stats-row">
                    <div className="stat-item">
                        <i className="fas fa-question"></i>
                        <div>
                            <h4>{questions.length}</h4>
                            <p>Total Questions</p>
                        </div>
                    </div>
                    <div className="stat-item">
                        <i className="fas fa-clock"></i>
                        <div>
                            <h4>{questions.filter(q => !q.isAnswered).length}</h4>
                            <p>Pending</p>
                        </div>
                    </div>
                    <div className="stat-item">
                        <i className="fas fa-check"></i>
                        <div>
                            <h4>{questions.filter(q => q.isAnswered).length}</h4>
                            <p>Answered</p>
                        </div>
                    </div>
                </div>

                <div className="questions-list">
                    {questions.length === 0 ? (
                        <div className="empty-state">
                            <i className="fas fa-question-circle fa-3x"></i>
                            <h3>No questions yet</h3>
                            <p>Questions from participants will appear here</p>
                        </div>
                    ) : (
                        questions.map(question => (
                            <div key={question._id} className="question-item">
                                <div className="question-header">
                                    <div className="question-meta">
                                        <span className="participant-name">{question.asker?.name || 'Anonymous'}</span>
                                        <span className="question-time">{new Date(question.createdAt).toLocaleString()}</span>
                                    </div>
                                    <div className="question-status">
                                        <span className={`status-badge ${question.isAnswered ? 'answered' : 'pending'}`}>
                                            {question.isAnswered ? 'Answered' : 'Pending'}
                                        </span>
                                        {question.isStarred && (
                                            <span className="star-badge">
                                                <i className="fas fa-star"></i> Featured
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="question-content">
                                    <p className="question-text">{question.question}</p>
                                    {question.answer && (
                                        <div className="answer-section">
                                            <h5>Answer:</h5>
                                            <p>{question.answer}</p>
                                        </div>
                                    )}
                                </div>
                                <div className="question-actions">
                                    {!question.isAnswered && (
                                        <button 
                                            className="btn btn-sm btn-primary"
                                            onClick={() => openAnswerModal(question)}
                                        >
                                            Answer Question
                                        </button>
                                    )}
                                    <button 
                                        className="btn btn-sm btn-outline"
                                        onClick={() => featureQuestion(question._id)}
                                    >
                                        Feature Question
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Answer Question Modal */}
            {showAnswerModal && (
                <div className="modal-overlay">
                    <div className="modal">
                        <div className="modal-header">
                            <h3>Answer Question</h3>
                            <button 
                                className="close-btn"
                                onClick={() => setShowAnswerModal(false)}
                            >
                                <i className="fas fa-times"></i>
                            </button>
                        </div>
                        <div className="modal-body">
                            {selectedQuestion && (
                                <div className="question-preview">
                                    <h4>Question:</h4>
                                    <p>{selectedQuestion.question}</p>
                                    <div className="form-group">
                                        <label>Your Answer</label>
                                        <textarea 
                                            className="form-control"
                                            rows="4"
                                            placeholder="Type your answer here..."
                                            value={answerText}
                                            onChange={(e) => setAnswerText(e.target.value)}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="modal-footer">
                            <button 
                                className="btn btn-outline"
                                onClick={() => setShowAnswerModal(false)}
                            >
                                Cancel
                            </button>
                            <button 
                                className="btn btn-primary"
                                onClick={submitAnswer}
                                disabled={!answerText.trim()}
                            >
                                Submit Answer
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );

    // Render Networking Feature
    const renderNetworkingFeature = () => (
        <div className="feature-content">
            <div className="feature-header">
                <h3><i className="fas fa-network-wired"></i> Networking Management</h3>
                <button 
                    className="btn btn-primary"
                    onClick={exportConnections}
                    disabled={!selectedEngagementEvent}
                >
                    <i className="fas fa-download"></i> Export Connections
                </button>
            </div>
            
            <div className="networking-overview">
                <div className="stats-row">
                    <div className="stat-item">
                        <i className="fas fa-handshake"></i>
                        <div>
                            <h4>{networkingData.totalConnections || 0}</h4>
                            <p>Total Connections</p>
                        </div>
                    </div>
                    <div className="stat-item">
                        <i className="fas fa-address-card"></i>
                        <div>
                            <h4>{networkingData.cardsExchanged || 0}</h4>
                            <p>Cards Exchanged</p>
                        </div>
                    </div>
                    <div className="stat-item">
                        <i className="fas fa-users"></i>
                        <div>
                            <h4>{networkingData.activeParticipants || 0}</h4>
                            <p>Active Networkers</p>
                        </div>
                    </div>
                </div>

                <div className="networking-activity">
                    <h4>Recent Networking Activity</h4>
                    <div className="activity-list">
                        <div className="empty-state">
                            <i className="fas fa-network-wired fa-3x"></i>
                            <h3>Networking activity will appear here</h3>
                            <p>Participant connections and business card exchanges</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    // Render Forum Feature
    const renderForumFeature = () => (
        <div className="feature-content">
            <div className="feature-header">
                <h3><i className="fas fa-comments"></i> Forum Management</h3>
                <button 
                    className="btn btn-primary"
                    onClick={openTopicModal}
                >
                    <i className="fas fa-plus"></i> Create Topic
                </button>
            </div>
            
            <div className="forum-overview">
                <div className="stats-row">
                    <div className="stat-item">
                        <i className="fas fa-comments"></i>
                        <div>
                            <h4>{forumTopics.length}</h4>
                            <p>Forum Topics</p>
                        </div>
                    </div>
                    <div className="stat-item">
                        <i className="fas fa-reply"></i>
                        <div>
                            <h4>{forumTopics.reduce((sum, topic) => sum + (topic.replies || 0), 0)}</h4>
                            <p>Total Replies</p>
                        </div>
                    </div>
                    <div className="stat-item">
                        <i className="fas fa-fire"></i>
                        <div>
                            <h4>{forumTopics.filter(t => !t.isLocked).length}</h4>
                            <p>Active Topics</p>
                        </div>
                    </div>
                </div>

                <div className="forum-topics">
                    {forumTopics.length === 0 ? (
                        <div className="empty-state">
                            <i className="fas fa-comments fa-3x"></i>
                            <h3>No forum topics yet</h3>
                            <p>Create discussion topics for participants to engage</p>
                            <button 
                                className="btn btn-primary"
                                onClick={openTopicModal}
                            >
                                Create First Topic
                            </button>
                        </div>
                    ) : (
                        forumTopics.map(topic => (
                            <div key={topic._id} className="topic-item">
                                <div className="topic-header">
                                    <h4>{topic.title}</h4>
                                    <span className="topic-replies">{topic.replies?.length || 0} replies</span>
                                    {topic.isPinned && <span className="pinned-badge">📌 Pinned</span>}
                                    {topic.isLocked && <span className="locked-badge">🔒 Locked</span>}
                                </div>
                                <p>{topic.content}</p>
                                <div className="topic-actions">
                                    <button className="btn btn-sm btn-primary">Moderate</button>
                                    <button className="btn btn-sm btn-outline">View Discussion</button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Create Forum Topic Modal */}
            {showTopicModal && (
                <div className="modal-overlay">
                    <div className="modal">
                        <div className="modal-header">
                            <h3>Create Forum Topic</h3>
                            <button 
                                className="close-btn"
                                onClick={() => setShowTopicModal(false)}
                            >
                                <i className="fas fa-times"></i>
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label>Topic Title</label>
                                <input 
                                    type="text"
                                    className="form-control"
                                    placeholder="Enter topic title..."
                                    value={newTopic.title}
                                    onChange={(e) => setNewTopic(prev => ({ ...prev, title: e.target.value }))}
                                />
                            </div>
                            <div className="form-group">
                                <label>Description</label>
                                <textarea 
                                    className="form-control"
                                    rows="3"
                                    placeholder="Describe the topic..."
                                    value={newTopic.description}
                                    onChange={(e) => setNewTopic(prev => ({ ...prev, description: e.target.value }))}
                                />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button 
                                className="btn btn-outline"
                                onClick={() => setShowTopicModal(false)}
                            >
                                Cancel
                            </button>
                            <button 
                                className="btn btn-primary"
                                onClick={submitTopic}
                                disabled={!newTopic.title.trim() || !newTopic.description.trim()}
                            >
                                Create Topic
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );

    // Other render functions (past events, analytics, etc.) remain the same...
    const renderPastEvents = () => (
        <div className="dashboard-content">
            <div className="dashboard-header">
                <div className="dashboard-title">
                    <h1>Past Events</h1>
                    <p>View analytics and data from completed events</p>
                </div>
            </div>
            
            {pastEvents.length === 0 ? (
                <div className="empty-state">
                    <i className="fas fa-history fa-3x"></i>
                    <h3>No past events</h3>
                    <p>Your completed events will appear here</p>
                </div>
            ) : (
                <div className="events-grid">
                    {pastEvents.map(event => (
                        <div key={event._id} className="event-card past-event">
                            <div className="event-info">
                                <h4>{event.title}</h4>
                                <p>{new Date(event.date).toLocaleDateString()}</p>
                                <div className="event-stats">
                                    <span><i className="fas fa-users"></i> {event.registrations?.length || 0} attended</span>
                                    <span><i className="fas fa-star"></i> {event.averageRating || 'N/A'}</span>
                                </div>
                            </div>
                            <div className="event-actions">
                                <button className="btn btn-sm btn-outline">
                                    <i className="fas fa-chart-bar"></i> View Analytics
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );

    // Participant Management Render
    const renderParticipantManagement = () => {
        if (!selectedEventForParticipants) {
            return (
                <div className="dashboard-content">
                    <div className="dashboard-header">
                        <div className="dashboard-title">
                            <h1>Participant Management</h1>
                            <p>Manage participants for your events</p>
                        </div>
                    </div>

                    <div className="event-selection-section">
                        <h3>Select an Event to Manage Participants</h3>
                        <div className="events-grid">
                            {myEvents.filter(event => {
                                // Show both upcoming and recent events
                                const eventDate = new Date(event.date);
                                const now = new Date();
                                const threeDaysAgo = new Date(now.getTime() - (3 * 24 * 60 * 60 * 1000));
                                return eventDate >= threeDaysAgo; // Show events from last 3 days onwards
                            }).map(event => (
                                <div 
                                    key={event._id} 
                                    className="event-card selectable"
                                    onClick={() => setSelectedEventForParticipants(event)}
                                >
                                    <div className="event-info">
                                        <h4>{event.title}</h4>
                                        <p>{new Date(event.date).toLocaleDateString()}</p>
                                        <div className="event-stats">
                                            <span><i className="fas fa-users"></i> {event.registrations?.length || 0} registered</span>
                                            <span><i className="fas fa-calendar"></i> {event.status || 'Active'}</span>
                                        </div>
                                    </div>
                                    <div className="event-actions">
                                        <button className="btn btn-primary">
                                            Manage Participants <i className="fas fa-arrow-right"></i>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        
                        {myEvents.filter(event => {
                            const eventDate = new Date(event.date);
                            const now = new Date();
                            const threeDaysAgo = new Date(now.getTime() - (3 * 24 * 60 * 60 * 1000));
                            return eventDate >= threeDaysAgo;
                        }).length === 0 && (
                            <div className="empty-state">
                                <i className="fas fa-calendar-plus fa-3x"></i>
                                <h3>No events available</h3>
                                <p>Create an event to start managing participants</p>
                                <Link to="/create-event" className="btn btn-primary">
                                    Create Your First Event
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            );
        }

        return (
            <div className="dashboard-content">
                <div className="dashboard-header">
                    <div className="dashboard-title">
                        <h1>Participant Management</h1>
                        <p>Managing participants for: <strong>{selectedEventForParticipants.title}</strong></p>
                    </div>
                    <div className="dashboard-actions">
                        <button 
                            className="btn btn-outline"
                            onClick={() => setSelectedEventForParticipants(null)}
                        >
                            <i className="fas fa-arrow-left"></i> Back to Events
                        </button>
                    </div>
                </div>

                <ParticipantManager 
                    eventId={selectedEventForParticipants._id}
                    eventTitle={selectedEventForParticipants.title}
                    refreshTrigger={refreshTrigger}
                />
            </div>
        );
    };

    // Analytics Dashboard Render
    const renderAnalytics = () => {
        const refreshAnalytics = () => {
            setRefreshTrigger(prev => prev + 1);
        };
        
        const exportAnalyticsData = () => {
            if (!analyticsData) return;
            
            const exportData = {
                generatedAt: new Date().toISOString(),
                timeRange: analyticsTimeRange,
                dashboardStats: analyticsData.dashboard,
                eventSpecific: analyticsData.eventSpecific
            };
            
            const dataStr = JSON.stringify(exportData, null, 2);
            const blob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `analytics-report-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            toast.success('Analytics report exported successfully!');
        };
        
        if (!selectedAnalyticsEvent) {
            return (
                <div className="dashboard-content">
                    <div className="dashboard-header">
                        <div className="dashboard-title">
                            <h1>Analytics Dashboard</h1>
                            <p>Comprehensive insights into your events and performance</p>
                        </div>
                        <div className="dashboard-actions">
                            <button 
                                className="btn btn-outline"
                                onClick={exportAnalyticsData}
                                disabled={!analyticsData}
                            >
                                <i className="fas fa-download"></i> Export Report
                            </button>
                            <button 
                                className="btn btn-primary"
                                onClick={refreshAnalytics}
                                disabled={loadingAnalytics}
                            >
                                <i className={`fas ${loadingAnalytics ? 'fa-spinner fa-spin' : 'fa-sync-alt'}`}></i>
                                Refresh
                            </button>
                        </div>
                    </div>

                    {/* Overall Statistics Cards */}
                    {analyticsData?.dashboard && (
                        <div className="analytics-overview">
                            <div className="stats-grid">
                                <div className="stat-card">
                                    <div className="stat-icon">
                                        <i className="fas fa-calendar"></i>
                                    </div>
                                    <div className="stat-content">
                                        <h3>{analyticsData.dashboard.totalEvents}</h3>
                                        <p>Total Events</p>
                                        <span className="stat-change positive">
                                            +{analyticsData.dashboard.growthMetrics?.eventsThisMonth || 0} this month
                                        </span>
                                    </div>
                                </div>
                                
                                <div className="stat-card">
                                    <div className="stat-icon">
                                        <i className="fas fa-ticket-alt"></i>
                                    </div>
                                    <div className="stat-content">
                                        <h3>{analyticsData.dashboard.totalTicketsSold}</h3>
                                        <p>Tickets Sold</p>
                                        <span className="stat-change positive">
                                            Avg: {analyticsData.dashboard.avgTicketsPerEvent} per event
                                        </span>
                                    </div>
                                </div>
                                
                                <div className="stat-card">
                                    <div className="stat-icon">
                                        <i className="fas fa-dollar-sign"></i>
                                    </div>
                                    <div className="stat-content">
                                        <h3>${analyticsData.dashboard.totalRevenue}</h3>
                                        <p>Total Revenue</p>
                                        <span className="stat-change positive">
                                            ${analyticsData.dashboard.growthMetrics?.revenueThisMonth || 0} this month
                                        </span>
                                    </div>
                                </div>
                                
                                <div className="stat-card">
                                    <div className="stat-icon">
                                        <i className="fas fa-users"></i>
                                    </div>
                                    <div className="stat-content">
                                        <h3>{analyticsData.dashboard.totalRegistrations}</h3>
                                        <p>Total Participants</p>
                                        <span className="stat-change">
                                            Across {analyticsData.dashboard.totalEvents} events
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Event Selection for Detailed Analytics */}
                    <div className="event-selection-section">
                        <h3>Select Event for Detailed Analytics</h3>
                        <div className="events-grid">
                            {myEvents.map(event => (
                                <div 
                                    key={event._id} 
                                    className="event-card selectable"
                                    onClick={() => setSelectedAnalyticsEvent(event)}
                                >
                                    <div className="event-info">
                                        <h4>{event.title}</h4>
                                        <p>{new Date(event.date).toLocaleDateString()}</p>
                                        <div className="event-stats">
                                            <span><i className="fas fa-users"></i> {event.registrations?.length || 0} registered</span>
                                            <span><i className="fas fa-dollar-sign"></i> ${event.ticketTypes?.reduce((sum, tt) => sum + (tt.price * (tt.soldCount || 0)), 0) || 0}</span>
                                        </div>
                                    </div>
                                    <div className="event-actions">
                                        <button className="btn btn-primary">
                                            View Analytics <i className="fas fa-chart-line"></i>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            );
        }

        return (
            <div className="dashboard-content">
                <div className="dashboard-header">
                    <div className="dashboard-title">
                        <h1>Event Analytics</h1>
                        <p>Detailed insights for: <strong>{selectedAnalyticsEvent.title}</strong></p>
                    </div>
                    <div className="dashboard-actions">
                        <select 
                            value={analyticsTimeRange}
                            onChange={(e) => setAnalyticsTimeRange(e.target.value)}
                            className="form-control"
                        >
                            <option value="1month">Last Month</option>
                            <option value="3months">Last 3 Months</option>
                            <option value="6months">Last 6 Months</option>
                            <option value="1year">Last Year</option>
                        </select>
                        <button 
                            className="btn btn-outline"
                            onClick={() => setSelectedAnalyticsEvent(null)}
                        >
                            <i className="fas fa-arrow-left"></i> Back to Overview
                        </button>
                    </div>
                </div>

                {loadingAnalytics ? (
                    <div className="loading-state">
                        <i className="fas fa-spinner fa-spin"></i>
                        <p>Loading analytics...</p>
                    </div>
                ) : analyticsData?.eventSpecific && (
                    <div className="event-analytics">
                        {/* Registration Analytics */}
                        <div className="analytics-section">
                            <h3><i className="fas fa-chart-bar"></i> Registration Analytics</h3>
                            <div className="stats-grid">
                                <div className="stat-card">
                                    <h4>{analyticsData.eventSpecific.totalRegistrations}</h4>
                                    <p>Total Registrations</p>
                                </div>
                                <div className="stat-card">
                                    <h4>{analyticsData.eventSpecific.totalTicketsSold}</h4>
                                    <p>Tickets Sold</p>
                                </div>
                                <div className="stat-card">
                                    <h4>${analyticsData.eventSpecific.totalRevenue}</h4>
                                    <p>Revenue Generated</p>
                                </div>
                                <div className="stat-card">
                                    <h4>{analyticsData.eventSpecific.averageTicketsPerRegistration}</h4>
                                    <p>Avg Tickets/Registration</p>
                                </div>
                            </div>
                        </div>

                        {/* Ticket Type Breakdown */}
                        {analyticsData.eventSpecific.ticketTypeBreakdown && (
                            <div className="analytics-section">
                                <h3><i className="fas fa-ticket-alt"></i> Ticket Type Performance</h3>
                                <div className="ticket-breakdown">
                                    {Object.entries(analyticsData.eventSpecific.ticketTypeBreakdown).map(([type, data]) => (
                                        <div key={type} className="ticket-type-card">
                                            <h4>{type}</h4>
                                            <div className="ticket-stats">
                                                <span>Sold: {data.sold}</span>
                                                <span>Revenue: ${data.revenue}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Q&A Analytics */}
                        {analyticsData.eventSpecific.qaAnalytics && (
                            <div className="analytics-section">
                                <h3><i className="fas fa-question-circle"></i> Q&A Engagement</h3>
                                <div className="stats-grid">
                                    <div className="stat-card">
                                        <h4>{analyticsData.eventSpecific.qaAnalytics.totalQuestions}</h4>
                                        <p>Questions Asked</p>
                                    </div>
                                    <div className="stat-card">
                                        <h4>{analyticsData.eventSpecific.qaAnalytics.answeredQuestions}</h4>
                                        <p>Questions Answered</p>
                                    </div>
                                    <div className="stat-card">
                                        <h4>{analyticsData.eventSpecific.qaAnalytics.featuredQuestions}</h4>
                                        <p>Featured Questions</p>
                                    </div>
                                    <div className="stat-card">
                                        <h4>{analyticsData.eventSpecific.qaAnalytics.uniqueParticipants}</h4>
                                        <p>Active Participants</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Networking Analytics */}
                        {analyticsData.eventSpecific.networkingAnalytics && (
                            <div className="analytics-section">
                                <h3><i className="fas fa-network-wired"></i> Networking Activity</h3>
                                <div className="stats-grid">
                                    <div className="stat-card">
                                        <h4>{analyticsData.eventSpecific.networkingAnalytics.totalConnections}</h4>
                                        <p>Total Connections</p>
                                    </div>
                                    <div className="stat-card">
                                        <h4>{analyticsData.eventSpecific.networkingAnalytics.activeParticipants}</h4>
                                        <p>Active Networkers</p>
                                    </div>
                                    <div className="stat-card">
                                        <h4>{analyticsData.eventSpecific.networkingAnalytics.businessCardsShared}</h4>
                                        <p>Business Cards Shared</p>
                                    </div>
                                    <div className="stat-card">
                                        <h4>{analyticsData.eventSpecific.networkingAnalytics.connectionRate}%</h4>
                                        <p>Connection Rate</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    };

    // Settings Management Render
    const renderSettings = () => {        
        const saveSettings = async (section, data) => {
            setSavingSettings(true);
            try {
                const token = localStorage.getItem('token');
                const response = await fetch('${API_BASE_URL}/api/auth/update-profile', {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ [section]: data })
                });
                
                if (response.ok) {
                    toast.success('Settings updated successfully!');
                    setUserSettings(prev => ({ ...prev, [section]: data }));
                } else {
                    const error = await response.json();
                    throw new Error(error.message || 'Failed to update settings');
                }
            } catch (error) {
                console.error('Error saving settings:', error);
                toast.error('Failed to save settings: ' + error.message);
            } finally {
                setSavingSettings(false);
            }
        };
        
        const handleProfileChange = (field, value) => {
            setUserSettings(prev => ({
                ...prev,
                profile: { ...prev.profile, [field]: value }
            }));
        };
        
        const handleNotificationChange = (field, value) => {
            setUserSettings(prev => ({
                ...prev,
                notifications: { ...prev.notifications, [field]: value }
            }));
        };
        
        const handleSecurityChange = (field, value) => {
            setUserSettings(prev => ({
                ...prev,
                security: { ...prev.security, [field]: value }
            }));
        };
        
        const handleOrganizationChange = (field, value) => {
            setUserSettings(prev => ({
                ...prev,
                organization: { ...prev.organization, [field]: value }
            }));
        };

        return (
            <div className="dashboard-content">
                <div className="dashboard-header">
                    <div className="dashboard-title">
                        <h1>Settings</h1>
                        <p>Manage your account preferences and organization details</p>
                    </div>
                </div>

                {loadingSettings ? (
                    <div className="loading-state">
                        <i className="fas fa-spinner fa-spin"></i>
                        <p>Loading settings...</p>
                    </div>
                ) : (
                    <div className="settings-container">
                        {/* Settings Navigation */}
                        <div className="settings-tabs">
                            <button 
                                className={`tab-btn ${activeSettingsTab === 'profile' ? 'active' : ''}`}
                                onClick={() => setActiveSettingsTab('profile')}
                            >
                                <i className="fas fa-user"></i> Profile
                            </button>
                            <button 
                                className={`tab-btn ${activeSettingsTab === 'notifications' ? 'active' : ''}`}
                                onClick={() => setActiveSettingsTab('notifications')}
                            >
                                <i className="fas fa-bell"></i> Notifications
                            </button>
                            <button 
                                className={`tab-btn ${activeSettingsTab === 'security' ? 'active' : ''}`}
                                onClick={() => setActiveSettingsTab('security')}
                            >
                                <i className="fas fa-shield-alt"></i> Security
                            </button>
                            <button 
                                className={`tab-btn ${activeSettingsTab === 'organization' ? 'active' : ''}`}
                                onClick={() => setActiveSettingsTab('organization')}
                            >
                                <i className="fas fa-building"></i> Organization
                            </button>
                        </div>

                        {/* Profile Settings */}
                        {activeSettingsTab === 'profile' && (
                            <div className="settings-section">
                                <h3>Profile Information</h3>
                                <div className="settings-form">
                                    <div className="form-row">
                                        <div className="form-group">
                                            <label>Full Name</label>
                                            <input
                                                type="text"
                                                value={userSettings.profile.name}
                                                onChange={(e) => handleProfileChange('name', e.target.value)}
                                                className="form-control"
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>Email Address</label>
                                            <input
                                                type="email"
                                                value={userSettings.profile.email}
                                                onChange={(e) => handleProfileChange('email', e.target.value)}
                                                className="form-control"
                                            />
                                        </div>
                                    </div>
                                    <div className="form-row">
                                        <div className="form-group">
                                            <label>Phone Number</label>
                                            <input
                                                type="tel"
                                                value={userSettings.profile.phone}
                                                onChange={(e) => handleProfileChange('phone', e.target.value)}
                                                className="form-control"
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>Website</label>
                                            <input
                                                type="url"
                                                value={userSettings.profile.website}
                                                onChange={(e) => handleProfileChange('website', e.target.value)}
                                                className="form-control"
                                                placeholder="https://example.com"
                                            />
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <label>Bio</label>
                                        <textarea
                                            value={userSettings.profile.bio}
                                            onChange={(e) => handleProfileChange('bio', e.target.value)}
                                            className="form-control"
                                            rows="4"
                                            placeholder="Tell us about yourself..."
                                        />
                                    </div>
                                    <button 
                                        className="btn btn-primary"
                                        onClick={() => saveSettings('profile', userSettings.profile)}
                                        disabled={savingSettings}
                                    >
                                        {savingSettings ? 'Saving...' : 'Save Profile'}
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Notification Settings */}
                        {activeSettingsTab === 'notifications' && (
                            <div className="settings-section">
                                <h3>Notification Preferences</h3>
                                <div className="settings-form">
                                    <div className="setting-item">
                                        <div className="setting-info">
                                            <h4>Email Notifications</h4>
                                            <p>Receive general notifications via email</p>
                                        </div>
                                        <label className="toggle-switch">
                                            <input
                                                type="checkbox"
                                                checked={userSettings.notifications.emailNotifications}
                                                onChange={(e) => handleNotificationChange('emailNotifications', e.target.checked)}
                                            />
                                            <span className="slider"></span>
                                        </label>
                                    </div>
                                    <div className="setting-item">
                                        <div className="setting-info">
                                            <h4>SMS Notifications</h4>
                                            <p>Receive urgent notifications via SMS</p>
                                        </div>
                                        <label className="toggle-switch">
                                            <input
                                                type="checkbox"
                                                checked={userSettings.notifications.smsNotifications}
                                                onChange={(e) => handleNotificationChange('smsNotifications', e.target.checked)}
                                            />
                                            <span className="slider"></span>
                                        </label>
                                    </div>
                                    <div className="setting-item">
                                        <div className="setting-info">
                                            <h4>Event Reminders</h4>
                                            <p>Get reminders about your upcoming events</p>
                                        </div>
                                        <label className="toggle-switch">
                                            <input
                                                type="checkbox"
                                                checked={userSettings.notifications.eventReminders}
                                                onChange={(e) => handleNotificationChange('eventReminders', e.target.checked)}
                                            />
                                            <span className="slider"></span>
                                        </label>
                                    </div>
                                    <div className="setting-item">
                                        <div className="setting-info">
                                            <h4>Participant Updates</h4>
                                            <p>Notifications about new registrations and participant activity</p>
                                        </div>
                                        <label className="toggle-switch">
                                            <input
                                                type="checkbox"
                                                checked={userSettings.notifications.participantUpdates}
                                                onChange={(e) => handleNotificationChange('participantUpdates', e.target.checked)}
                                            />
                                            <span className="slider"></span>
                                        </label>
                                    </div>
                                    <div className="setting-item">
                                        <div className="setting-info">
                                            <h4>Marketing Emails</h4>
                                            <p>Receive tips, updates, and promotional content</p>
                                        </div>
                                        <label className="toggle-switch">
                                            <input
                                                type="checkbox"
                                                checked={userSettings.notifications.marketingEmails}
                                                onChange={(e) => handleNotificationChange('marketingEmails', e.target.checked)}
                                            />
                                            <span className="slider"></span>
                                        </label>
                                    </div>
                                    <button 
                                        className="btn btn-primary"
                                        onClick={() => saveSettings('notifications', userSettings.notifications)}
                                        disabled={savingSettings}
                                    >
                                        {savingSettings ? 'Saving...' : 'Save Preferences'}
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Security Settings */}
                        {activeSettingsTab === 'security' && (
                            <div className="settings-section">
                                <h3>Security & Privacy</h3>
                                <div className="settings-form">
                                    <div className="setting-item">
                                        <div className="setting-info">
                                            <h4>Two-Factor Authentication</h4>
                                            <p>Add an extra layer of security to your account</p>
                                        </div>
                                        <label className="toggle-switch">
                                            <input
                                                type="checkbox"
                                                checked={userSettings.security.twoFactorAuth}
                                                onChange={(e) => handleSecurityChange('twoFactorAuth', e.target.checked)}
                                            />
                                            <span className="slider"></span>
                                        </label>
                                    </div>
                                    <div className="setting-item">
                                        <div className="setting-info">
                                            <h4>Login Alerts</h4>
                                            <p>Get notified when someone logs into your account</p>
                                        </div>
                                        <label className="toggle-switch">
                                            <input
                                                type="checkbox"
                                                checked={userSettings.security.loginAlerts}
                                                onChange={(e) => handleSecurityChange('loginAlerts', e.target.checked)}
                                            />
                                            <span className="slider"></span>
                                        </label>
                                    </div>
                                    <div className="security-actions">
                                        <button className="btn btn-outline">
                                            <i className="fas fa-key"></i> Change Password
                                        </button>
                                        <button className="btn btn-outline">
                                            <i className="fas fa-download"></i> Download Data
                                        </button>
                                        <button className="btn btn-danger">
                                            <i className="fas fa-trash"></i> Delete Account
                                        </button>
                                    </div>
                                    <button 
                                        className="btn btn-primary"
                                        onClick={() => saveSettings('security', userSettings.security)}
                                        disabled={savingSettings}
                                    >
                                        {savingSettings ? 'Saving...' : 'Save Security Settings'}
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Organization Settings */}
                        {activeSettingsTab === 'organization' && (
                            <div className="settings-section">
                                <h3>Organization Details</h3>
                                <div className="settings-form">
                                    <div className="form-row">
                                        <div className="form-group">
                                            <label>Organization Name</label>
                                            <input
                                                type="text"
                                                value={userSettings.organization.organizationName}
                                                onChange={(e) => handleOrganizationChange('organizationName', e.target.value)}
                                                className="form-control"
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>Organization Type</label>
                                            <select
                                                value={userSettings.organization.organizationType}
                                                onChange={(e) => handleOrganizationChange('organizationType', e.target.value)}
                                                className="form-control"
                                            >
                                                <option value="company">Company</option>
                                                <option value="nonprofit">Non-profit</option>
                                                <option value="government">Government</option>
                                                <option value="education">Educational</option>
                                                <option value="individual">Individual</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <label>Address</label>
                                        <textarea
                                            value={userSettings.organization.address}
                                            onChange={(e) => handleOrganizationChange('address', e.target.value)}
                                            className="form-control"
                                            rows="3"
                                        />
                                    </div>
                                    <div className="form-row">
                                        <div className="form-group">
                                            <label>Tax ID / Registration Number</label>
                                            <input
                                                type="text"
                                                value={userSettings.organization.taxId}
                                                onChange={(e) => handleOrganizationChange('taxId', e.target.value)}
                                                className="form-control"
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>Organization Website</label>
                                            <input
                                                type="url"
                                                value={userSettings.organization.website}
                                                onChange={(e) => handleOrganizationChange('website', e.target.value)}
                                                className="form-control"
                                                placeholder="https://example.com"
                                            />
                                        </div>
                                    </div>
                                    <button 
                                        className="btn btn-primary"
                                        onClick={() => saveSettings('organization', userSettings.organization)}
                                        disabled={savingSettings}
                                    >
                                        {savingSettings ? 'Saving...' : 'Save Organization Details'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    };

    // Enhanced Poll Analytics Modal Component
    const renderPollAnalyticsModal = () => {
        if (!showPollAnalytics || !selectedPollForAnalytics) return null;

        return (
            <div className="modal-overlay" onClick={() => setShowPollAnalytics(false)}>
                <div className="analytics-modal" onClick={e => e.stopPropagation()}>
                    <div className="analytics-modal-header">
                        <div className="analytics-header-info">
                            <h2><i className="fas fa-chart-line"></i> Poll Analytics</h2>
                            <p>{selectedPollForAnalytics.question}</p>
                        </div>
                        <button 
                            className="modal-close-btn"
                            onClick={() => setShowPollAnalytics(false)}
                        >
                            <i className="fas fa-times"></i>
                        </button>
                    </div>

                    <div className="analytics-tabs">
                        <button 
                            className={`analytics-tab ${analyticsView === 'overview' ? 'active' : ''}`}
                            onClick={() => setAnalyticsView('overview')}
                        >
                            <i className="fas fa-chart-bar"></i> Overview
                        </button>
                        <button 
                            className={`analytics-tab ${analyticsView === 'detailed' ? 'active' : ''}`}
                            onClick={() => setAnalyticsView('detailed')}
                        >
                            <i className="fas fa-chart-pie"></i> Detailed
                        </button>
                        <button 
                            className={`analytics-tab ${analyticsView === 'insights' ? 'active' : ''}`}
                            onClick={() => setAnalyticsView('insights')}
                        >
                            <i className="fas fa-lightbulb"></i> Insights
                        </button>
                    </div>

                    <div className="analytics-content">
                        {loadingPollAnalytics ? (
                            <div className="analytics-loading">
                                <i className="fas fa-spinner fa-spin"></i>
                                <p>Generating analytics...</p>
                            </div>
                        ) : (
                            <>
                                {analyticsView === 'overview' && renderAnalyticsOverview()}
                                {analyticsView === 'detailed' && renderAnalyticsDetailed()}
                                {analyticsView === 'insights' && renderAnalyticsInsights()}
                            </>
                        )}
                    </div>

                    <div className="analytics-actions">
                        <button 
                            className="btn btn-secondary"
                            onClick={() => exportPollData(selectedPollForAnalytics)}
                        >
                            <i className="fas fa-download"></i> Export Data
                        </button>
                        <button 
                            className="btn btn-primary"
                            onClick={() => setShowPollAnalytics(false)}
                        >
                            <i className="fas fa-check"></i> Done
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    const renderAnalyticsOverview = () => {
        if (!pollAnalytics) return <div>No analytics data available</div>;

        return (
            <div className="analytics-overview">
                <div className="analytics-stats-grid">
                    <div className="analytics-stat-card">
                        <div className="stat-icon responses">
                            <i className="fas fa-users"></i>
                        </div>
                        <div className="stat-content">
                            <h3>{pollAnalytics.totalResponses}</h3>
                            <p>Total Responses</p>
                        </div>
                    </div>
                    
                    <div className="analytics-stat-card">
                        <div className="stat-icon participation">
                            <i className="fas fa-percentage"></i>
                        </div>
                        <div className="stat-content">
                            <h3>{pollAnalytics.participationRate}%</h3>
                            <p>Participation Rate</p>
                        </div>
                    </div>
                    
                    <div className="analytics-stat-card">
                        <div className="stat-icon time">
                            <i className="fas fa-clock"></i>
                        </div>
                        <div className="stat-content">
                            <h3>{pollAnalytics.hoursActive}h</h3>
                            <p>Hours Active</p>
                        </div>
                    </div>
                    
                    <div className="analytics-stat-card">
                        <div className="stat-icon rate">
                            <i className="fas fa-tachometer-alt"></i>
                        </div>
                        <div className="stat-content">
                            <h3>{pollAnalytics.responseRate}</h3>
                            <p>Response Rate</p>
                        </div>
                    </div>
                </div>

                <div className="results-visualization">
                    <h4><i className="fas fa-chart-bar"></i> Results Breakdown</h4>
                    <div className="options-results">
                        {pollAnalytics.optionBreakdown?.map((option, index) => (
                            <div key={index} className={`option-analytics ${option.isWinner ? 'winner' : ''}`}>
                                <div className="option-header">
                                    <span className="option-text">{option.option}</span>
                                    {option.isWinner && <span className="winner-badge">👑 Winner</span>}
                                </div>
                                <div className="option-metrics">
                                    <div className="vote-bar-container">
                                        <div 
                                            className="vote-bar-fill" 
                                            style={{ width: `${option.percentage}%` }}
                                        ></div>
                                    </div>
                                    <div className="vote-details">
                                        <span className="vote-count">{option.votes} votes</span>
                                        <span className="vote-percentage">{option.percentage}%</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    };

    const renderAnalyticsDetailed = () => {
        if (!pollAnalytics) return <div>No detailed analytics available</div>;

        return (
            <div className="analytics-detailed">
                <div className="detailed-sections">
                    <div className="analytics-section">
                        <h4><i className="fas fa-clock"></i> Time-based Insights</h4>
                        <div className="time-insights">
                            <div className="insight-item">
                                <span className="insight-label">Peak Activity:</span>
                                <span className="insight-value">{pollAnalytics.timeInsights?.peakHour}</span>
                            </div>
                            <div className="insight-item">
                                <span className="insight-label">Response Pattern:</span>
                                <span className="insight-value">{pollAnalytics.timeInsights?.responsePattern}</span>
                            </div>
                            <div className="insight-item">
                                <span className="insight-label">Avg Response Time:</span>
                                <span className="insight-value">{pollAnalytics.timeInsights?.avgResponseTime}</span>
                            </div>
                        </div>
                    </div>

                    <div className="analytics-section">
                        <h4><i className="fas fa-users"></i> Demographics</h4>
                        <div className="demographics-info">
                            <div className="demo-item">
                                <span className="demo-label">Anonymous Responses:</span>
                                <span className="demo-value">{pollAnalytics.demographics?.anonymousResponses}</span>
                            </div>
                            <div className="demo-item">
                                <span className="demo-label">Identified Responses:</span>
                                <span className="demo-value">{pollAnalytics.demographics?.identifiedResponses}</span>
                            </div>
                        </div>
                    </div>

                    <div className="analytics-section">
                        <h4><i className="fas fa-trophy"></i> Competitive Analysis</h4>
                        <div className="competitive-analysis">
                            <div className="analysis-indicator">
                                <span className="indicator-label">Close Race:</span>
                                <span className={`indicator-status ${pollAnalytics.competitiveAnalysis?.closestRace ? 'yes' : 'no'}`}>
                                    {pollAnalytics.competitiveAnalysis?.closestRace ? 'Yes' : 'No'}
                                </span>
                            </div>
                            <div className="analysis-indicator">
                                <span className="indicator-label">Landslide Winner:</span>
                                <span className={`indicator-status ${pollAnalytics.competitiveAnalysis?.landslideWinner ? 'yes' : 'no'}`}>
                                    {pollAnalytics.competitiveAnalysis?.landslideWinner ? 'Yes' : 'No'}
                                </span>
                            </div>
                            <div className="analysis-indicator">
                                <span className="indicator-label">Balanced Options:</span>
                                <span className={`indicator-status ${pollAnalytics.competitiveAnalysis?.balancedOptions ? 'yes' : 'no'}`}>
                                    {pollAnalytics.competitiveAnalysis?.balancedOptions ? 'Yes' : 'No'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const renderAnalyticsInsights = () => {
        if (!pollAnalytics) return <div>No insights available</div>;

        return (
            <div className="analytics-insights">
                <div className="insights-section">
                    <h4><i className="fas fa-lightbulb"></i> AI-Powered Recommendations</h4>
                    <div className="recommendations-list">
                        {pollAnalytics.recommendations?.map((recommendation, index) => (
                            <div key={index} className="recommendation-item">
                                <div className="recommendation-icon">
                                    <i className="fas fa-arrow-right"></i>
                                </div>
                                <p>{recommendation}</p>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="insights-section">
                    <h4><i className="fas fa-chart-line"></i> Performance Summary</h4>
                    <div className="performance-summary">
                        <div className="summary-item">
                            <div className="summary-icon">
                                <i className="fas fa-bullseye"></i>
                            </div>
                            <div className="summary-content">
                                <h5>Engagement Level</h5>
                                <p>{pollAnalytics.timeInsights?.responsePattern}</p>
                            </div>
                        </div>
                        <div className="summary-item">
                            <div className="summary-icon">
                                <i className="fas fa-trending-up"></i>
                            </div>
                            <div className="summary-content">
                                <h5>Poll Status</h5>
                                <p>{pollAnalytics.status}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="insights-section">
                    <h4><i className="fas fa-info-circle"></i> Poll Metadata</h4>
                    <div className="metadata-grid">
                        <div className="metadata-item">
                            <span className="metadata-label">Poll ID:</span>
                            <span className="metadata-value">{pollAnalytics.pollId}</span>
                        </div>
                        <div className="metadata-item">
                            <span className="metadata-label">Generated:</span>
                            <span className="metadata-value">{new Date(pollAnalytics.generatedAt).toLocaleString()}</span>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    // Main render return
    return (
        <div className="dashboard-layout">
            <aside className="sidebar">
                <div className="sidebar-header">
                    <div className="sidebar-logo">
                        <i className="fas fa-calendar-check"></i>
                        <span>EventHub</span>
                    </div>
                </div>
                
                <nav className="sidebar-nav">
                    <div className="sidebar-section">
                        <h5 className="sidebar-section-title">Event Management</h5>
                        <ul>
                            <li className={`sidebar-menu-item ${activePage === 'dashboard' ? 'active' : ''}`}>
                                <Link to="/organizer-dashboard">
                                    <i className="fas fa-tachometer-alt"></i> Dashboard
                                </Link>
                            </li>
                            <li className={`sidebar-menu-item ${activePage === 'events' ? 'active' : ''}`}>
                                <Link to="/organizer-dashboard/events">
                                    <i className="fas fa-calendar"></i> My Events
                                </Link>
                            </li>
                            <li className={`sidebar-menu-item ${activePage === 'engagement' ? 'active' : ''}`}>
                                <Link to="/organizer-dashboard/engagement">
                                    <i className="fas fa-users-cog"></i> Engagement Features
                                </Link>
                            </li>
                            <li className={`sidebar-menu-item ${activePage === 'past-events' ? 'active' : ''}`}>
                                <Link to="/organizer-dashboard/past-events">
                                    <i className="fas fa-history"></i> Past Events
                                </Link>
                            </li>
                            <li className={`sidebar-menu-item ${activePage === 'participants' ? 'active' : ''}`}>
                                <Link to="/organizer-dashboard/participants">
                                    <i className="fas fa-users"></i> Participant Management
                                </Link>
                            </li>
                        </ul>
                    </div>
                    
                    <div className="sidebar-section">
                        <h5 className="sidebar-section-title">Analytics</h5>
                        <ul>
                            <li className={`sidebar-menu-item ${activePage === 'analytics' ? 'active' : ''}`}>
                                <Link to="/organizer-dashboard/analytics">
                                    <i className="fas fa-chart-bar"></i> Analytics
                                </Link>
                            </li>
                        </ul>
                    </div>
                    
                    <div className="sidebar-section">
                        <h5 className="sidebar-section-title">Account</h5>
                        <ul>
                            <li className={`sidebar-menu-item ${activePage === 'settings' ? 'active' : ''}`}>
                                <Link to="/organizer-dashboard/settings">
                                    <i className="fas fa-cog"></i> Settings
                                </Link>
                            </li>
                            <li className="sidebar-menu-item">
                                <button onClick={handleLogout} className="logout-btn">
                                    <i className="fas fa-sign-out-alt"></i> Logout
                                </button>
                            </li>
                        </ul>
                    </div>
                </nav>
            </aside>

            <main className="main-content">
                {activePage === 'dashboard' && renderDashboard()}
                {activePage === 'events' && renderEventManagement()}
                {activePage === 'engagement' && renderEngagementFeatures()}
                {activePage === 'past-events' && renderPastEvents()}
                {activePage === 'participants' && renderParticipantManagement()}
                {activePage === 'analytics' && renderAnalytics()}
                {activePage === 'settings' && renderSettings()}
            </main>
        </div>
    );
}

export default OrganizerDashboard;
