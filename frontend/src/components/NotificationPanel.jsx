import React, { useState, useEffect } from 'react';
import { useNotifications } from '../context/NotificationContext';
import './NotificationPanel.css';

const NotificationPanel = ({ isOpen, onClose }) => {
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAll,
    settings,
    updateSettings,
    requestDesktopPermission
  } = useNotifications();

  const [activeTab, setActiveTab] = useState('all');
  const [showSettings, setShowSettings] = useState(false);

  const formatTimeAgo = (date) => {
    const now = new Date();
    const diff = now - new Date(date);
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  const getFilteredNotifications = () => {
    if (activeTab === 'all') return notifications;
    if (activeTab === 'unread') return notifications.filter(n => !n.isRead);
    return notifications.filter(n => n.type === activeTab);
  };

  const getNotificationIcon = (type) => {
    const icons = {
      message: '💬',
      poll_created: '📊',
      poll_vote: '📊',
      question_added: '❓',
      question_answered: '✅',
      forum_discussion: '💭',
      forum_reply: '💬',
      connection_request: '🤝',
      connection_accepted: '✅',
      event_update: '📅',
      engagement_milestone: '🎉'
    };
    return icons[type] || '🔔';
  };

  const handleNotificationClick = (notification) => {
    if (!notification.isRead) {
      markAsRead(notification.id);
    }
    
    // Handle navigation based on notification type
    // This would typically involve routing to the relevant page
    console.log('Navigate to:', notification.data);
  };

  const handleDesktopPermission = async () => {
    const granted = await requestDesktopPermission();
    if (granted) {
      updateSettings({ ...settings, desktop: true });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="notification-panel-overlay" onClick={onClose}>
      <div className="notification-panel" onClick={(e) => e.stopPropagation()}>
        <div className="notification-header">
          <div className="header-left">
            <h3>Notifications</h3>
            {unreadCount > 0 && (
              <span className="unread-badge">{unreadCount}</span>
            )}
          </div>
          
          <div className="header-actions">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="settings-btn"
              title="Notification Settings"
            >
              ⚙️
            </button>
            <button
              onClick={onClose}
              className="close-btn"
              title="Close"
            >
              ✕
            </button>
          </div>
        </div>

        {showSettings && (
          <div className="notification-settings">
            <h4>Notification Settings</h4>
            <div className="settings-grid">
              <label className="setting-item">
                <input
                  type="checkbox"
                  checked={settings.messages}
                  onChange={(e) => updateSettings({ ...settings, messages: e.target.checked })}
                />
                <span>💬 Messages</span>
              </label>
              
              <label className="setting-item">
                <input
                  type="checkbox"
                  checked={settings.polls}
                  onChange={(e) => updateSettings({ ...settings, polls: e.target.checked })}
                />
                <span>📊 Polls</span>
              </label>
              
              <label className="setting-item">
                <input
                  type="checkbox"
                  checked={settings.qa}
                  onChange={(e) => updateSettings({ ...settings, qa: e.target.checked })}
                />
                <span>❓ Q&A</span>
              </label>
              
              <label className="setting-item">
                <input
                  type="checkbox"
                  checked={settings.forum}
                  onChange={(e) => updateSettings({ ...settings, forum: e.target.checked })}
                />
                <span>💭 Forum</span>
              </label>
              
              <label className="setting-item">
                <input
                  type="checkbox"
                  checked={settings.networking}
                  onChange={(e) => updateSettings({ ...settings, networking: e.target.checked })}
                />
                <span>🤝 Networking</span>
              </label>
              
              <label className="setting-item">
                <input
                  type="checkbox"
                  checked={settings.events}
                  onChange={(e) => updateSettings({ ...settings, events: e.target.checked })}
                />
                <span>📅 Events</span>
              </label>
              
              <label className="setting-item">
                <input
                  type="checkbox"
                  checked={settings.sound}
                  onChange={(e) => updateSettings({ ...settings, sound: e.target.checked })}
                />
                <span>🔊 Sound</span>
              </label>
              
              <label className="setting-item">
                <input
                  type="checkbox"
                  checked={settings.desktop}
                  onChange={(e) => {
                    if (e.target.checked) {
                      handleDesktopPermission();
                    } else {
                      updateSettings({ ...settings, desktop: false });
                    }
                  }}
                />
                <span>🖥️ Desktop</span>
              </label>
            </div>
          </div>
        )}

        <div className="notification-tabs">
          <button
            className={activeTab === 'all' ? 'active' : ''}
            onClick={() => setActiveTab('all')}
          >
            All ({notifications.length})
          </button>
          <button
            className={activeTab === 'unread' ? 'active' : ''}
            onClick={() => setActiveTab('unread')}
          >
            Unread ({unreadCount})
          </button>
          <button
            className={activeTab === 'message' ? 'active' : ''}
            onClick={() => setActiveTab('message')}
          >
            Messages
          </button>
          <button
            className={activeTab === 'poll_created' ? 'active' : ''}
            onClick={() => setActiveTab('poll_created')}
          >
            Polls
          </button>
          <button
            className={activeTab === 'networking' ? 'active' : ''}
            onClick={() => setActiveTab('connection_request')}
          >
            Network
          </button>
        </div>

        <div className="notification-actions">
          {unreadCount > 0 && (
            <button onClick={markAllAsRead} className="mark-all-read">
              Mark All Read
            </button>
          )}
          {notifications.length > 0 && (
            <button onClick={clearAll} className="clear-all">
              Clear All
            </button>
          )}
        </div>

        <div className="notification-list">
          {getFilteredNotifications().length === 0 ? (
            <div className="empty-notifications">
              <div className="empty-icon">🔔</div>
              <p>No notifications yet</p>
              <small>
                {activeTab === 'unread' 
                  ? "You're all caught up!" 
                  : "Notifications will appear here"
                }
              </small>
            </div>
          ) : (
            getFilteredNotifications().map((notification) => (
              <div
                key={notification.id}
                className={`notification-item ${notification.isRead ? 'read' : 'unread'}`}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="notification-icon">
                  {getNotificationIcon(notification.type)}
                </div>
                
                <div className="notification-content">
                  <div className="notification-title">
                    {notification.title}
                  </div>
                  <div className="notification-message">
                    {notification.message}
                  </div>
                  <div className="notification-time">
                    {formatTimeAgo(notification.timestamp)}
                  </div>
                </div>
                
                <div className="notification-actions-menu">
                  {!notification.isRead && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        markAsRead(notification.id);
                      }}
                      className="mark-read-btn"
                      title="Mark as read"
                    >
                      ✓
                    </button>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeNotification(notification.id);
                    }}
                    className="remove-btn"
                    title="Remove notification"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationPanel;