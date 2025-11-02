import { Routes, Route } from 'react-router-dom';
import './App.css';

// Import all page components
import LandingPage from './pages/LandingPage';
import Header from './components/Header';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import ParticipantSignup from './pages/ParticipantSignup';
import OrganizerSignup from './pages/OrganizerSignup';
import ParticipantDashboard from './pages/ParticipantDashboard';
import OrganizerDashboard from './pages/OrganizerDashboard';
import EventDetailsPage from './pages/EventDetailsPage'; // The missing import
import CreateEventPage from './pages/CreateEventPage';
import AdvancedEventNetworking from './pages/AdvancedEventNetworking';
import LiveQA from './pages/LiveQA';
import LivePolling from './pages/LivePolling';
import DigitalBusinessCard from './components/DigitalBusinessCard';
import RealTimeForum from './components/RealTimeForum';
import RealTimePolling from './components/RealTimePolling';
import RealTimeQA from './components/RealTimeQA';

// Import the ProtectedRoute component
import ProtectedRoute from './components/ProtectedRoute';

// Import Socket Provider
import { SocketProvider } from './context/SocketContext';
import { NotificationProvider } from './context/NotificationContext';

function App() {
  return (
    <SocketProvider>
      <NotificationProvider>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/signup-participant" element={<ParticipantSignup />} />
        <Route path="/signup-organizer" element={<OrganizerSignup />} />
        <Route path="/events" element={<LandingPage />} /> {/* Browse Events redirects to landing */}
        <Route path="/events/:id" element={<EventDetailsPage />} />
        <Route path="/events/:eventId/networking" element={<ProtectedRoute><AdvancedEventNetworking /></ProtectedRoute>} />
        <Route path="/events/:eventId/qa" element={<ProtectedRoute><RealTimeQA /></ProtectedRoute>} />
        <Route path="/events/:eventId/forum" element={<ProtectedRoute><RealTimeForum /></ProtectedRoute>} />
        <Route path="/events/:eventId/polling" element={<ProtectedRoute><RealTimePolling /></ProtectedRoute>} />
        <Route path="/events/:eventId/live-polling" element={<ProtectedRoute><LivePolling /></ProtectedRoute>} />
        <Route path="/events/:eventId/business-cards" element={<ProtectedRoute><DigitalBusinessCard /></ProtectedRoute>} />
        <Route path="/business-card/:cardId" element={<DigitalBusinessCard />} />

      {/* Protected Routes - Organizer */}
      <Route 
        path="/organizer-dashboard" 
        element={<ProtectedRoute><OrganizerDashboard /></ProtectedRoute>} 
      />
      <Route 
        path="/create-event" 
        element={<ProtectedRoute><CreateEventPage /></ProtectedRoute>} 
      />
      <Route 
        path="/organizer/create-event" 
        element={<ProtectedRoute><CreateEventPage /></ProtectedRoute>} 
      />
      <Route 
        path="/organizer/events" 
        element={<ProtectedRoute><OrganizerDashboard tab="events" /></ProtectedRoute>} 
      />
      <Route 
        path="/organizer/past-events" 
        element={<ProtectedRoute><OrganizerDashboard tab="past-events" /></ProtectedRoute>} 
      />
      <Route 
        path="/organizer/analytics" 
        element={<ProtectedRoute><OrganizerDashboard tab="analytics" /></ProtectedRoute>} 
      />
      <Route 
        path="/organizer/participants" 
        element={<ProtectedRoute><OrganizerDashboard tab="participants" /></ProtectedRoute>} 
      />
      <Route 
        path="/organizer/participants/:eventId" 
        element={<ProtectedRoute><OrganizerDashboard tab="participants" /></ProtectedRoute>} 
      />

      {/* Organizer Dashboard Sub-routes */}
      <Route 
        path="/organizer-dashboard/events" 
        element={<ProtectedRoute><OrganizerDashboard tab="events" /></ProtectedRoute>} 
      />
      <Route 
        path="/organizer-dashboard/engagement" 
        element={<ProtectedRoute><OrganizerDashboard tab="engagement" /></ProtectedRoute>} 
      />
      <Route 
        path="/organizer-dashboard/past-events" 
        element={<ProtectedRoute><OrganizerDashboard tab="past-events" /></ProtectedRoute>} 
      />
      <Route 
        path="/organizer-dashboard/analytics" 
        element={<ProtectedRoute><OrganizerDashboard tab="analytics" /></ProtectedRoute>} 
      />
      <Route 
        path="/organizer-dashboard/participants" 
        element={<ProtectedRoute><OrganizerDashboard tab="participants" /></ProtectedRoute>} 
      />
      <Route 
        path="/organizer-dashboard/settings" 
        element={<ProtectedRoute><OrganizerDashboard tab="settings" /></ProtectedRoute>} 
      />
      
      {/* Protected Routes - Participant */}
      <Route 
        path="/participant-dashboard" 
        element={<ProtectedRoute><ParticipantDashboard /></ProtectedRoute>} 
      />
      <Route 
        path="/participant-dashboard/events" 
        element={<ProtectedRoute><ParticipantDashboard /></ProtectedRoute>} 
      />
      <Route 
        path="/participant-dashboard/past-events" 
        element={<ProtectedRoute><ParticipantDashboard /></ProtectedRoute>} 
      />
      <Route 
        path="/participant-dashboard/browse" 
        element={<ProtectedRoute><ParticipantDashboard /></ProtectedRoute>} 
      />
      <Route 
        path="/participant-dashboard/profile" 
        element={<ProtectedRoute><ParticipantDashboard /></ProtectedRoute>} 
      />
      <Route 
        path="/participant-dashboard/networking" 
        element={<ProtectedRoute><ParticipantDashboard /></ProtectedRoute>} 
      />
      <Route 
        path="/participant-dashboard/qa" 
        element={<ProtectedRoute><ParticipantDashboard /></ProtectedRoute>} 
      />
      <Route 
        path="/participant-dashboard/polling" 
        element={<ProtectedRoute><ParticipantDashboard /></ProtectedRoute>} 
      />
      <Route 
        path="/participant-dashboard/business-cards" 
        element={<ProtectedRoute><ParticipantDashboard /></ProtectedRoute>} 
      />
      <Route 
        path="/participant-dashboard/discussions" 
        element={<ProtectedRoute><ParticipantDashboard /></ProtectedRoute>} 
      />
    </Routes>
      </NotificationProvider>
    </SocketProvider>
  );
}

export default App;