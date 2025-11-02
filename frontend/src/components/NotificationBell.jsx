import React, { useState } from 'react';
import { useNotifications } from '../context/NotificationContext';
import NotificationPanel from './NotificationPanel';
import './NotificationBell.css';

const NotificationBell = () => {
  const { unreadCount } = useNotifications();
  const [showPanel, setShowPanel] = useState(false);

  const handleBellClick = () => {
    setShowPanel(true);
  };

  const handleClosePanel = () => {
    setShowPanel(false);
  };

  return (
    <>
      <div className="notification-bell" onClick={handleBellClick}>
        <div className="bell-icon">
          🔔
        </div>
        {unreadCount > 0 && (
          <div className="notification-count">
            {unreadCount > 99 ? '99+' : unreadCount}
          </div>
        )}
      </div>
      
      <NotificationPanel 
        isOpen={showPanel} 
        onClose={handleClosePanel} 
      />
    </>
  );
};

export default NotificationBell;