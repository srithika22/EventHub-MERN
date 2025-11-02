import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import NotificationBell from './NotificationBell';
import './Header.css';

function Header() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.profile-dropdown')) {
        setIsProfileDropdownOpen(false);
      }
      if (!event.target.closest('.main-nav') && !event.target.closest('.mobile-menu-toggle')) {
        setIsMobileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const toggleProfileDropdown = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsProfileDropdownOpen(!isProfileDropdownOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  const handleDropdownItemClick = (action) => {
    setIsProfileDropdownOpen(false);
    if (action === 'logout') {
      logout();
    }
  };

  // Generate cartoon avatar based on user name
  const getCartoonAvatar = (name) => {
    if (!name) return '👤';
    const avatars = ['👨‍💻', '👩‍💻', '🧑‍🎨', '👨‍🎨', '👩‍🎨', '🧑‍💼', '👨‍💼', '👩‍💼', '🧑‍🔬', '👨‍🔬'];
    const index = name.charCodeAt(0) % avatars.length;
    return avatars[index];
  };

  return (
    <header className={`main-header sticky ${isScrolled ? 'scrolled' : ''}`}>
      <div className="container">
        <Link to="/" className="logo" onClick={closeMobileMenu}>
          <svg width="32" height="32" viewBox="0 0 32 32" className="logo-icon">
            <rect width="32" height="32" rx="8" fill="currentColor"/>
            <path d="M8 12h16v2H8z M8 16h16v2H8z M8 20h12v2H8z" fill="white"/>
          </svg>
          EventHub
        </Link>
        
        <nav className={`main-nav ${isMobileMenuOpen ? 'mobile-nav-open' : ''}`}>
          <a href="/#events" onClick={closeMobileMenu} className={location.hash === '#events' ? 'active' : ''}>
            <i className="fas fa-calendar-alt"></i>
            Explore Events
          </a>
          <a href="/#features" onClick={closeMobileMenu} className={location.hash === '#features' ? 'active' : ''}>
            <i className="fas fa-star"></i>
            Features
          </a>
          <a href="/#blog" onClick={closeMobileMenu} className={location.hash === '#blog' ? 'active' : ''}>
            <i className="fas fa-newspaper"></i>
            Resources
          </a>
          {user?.role === 'organizer' && (
            <Link to="/create-event" onClick={closeMobileMenu} className="nav-create-btn">
              <i className="fas fa-plus"></i>
              Create Event
            </Link>
          )}
        </nav>

        <div className="nav-actions">
          {user ? (
            <>
              <NotificationBell />
              <div className="profile-dropdown">
              <div 
                className="profile-trigger"
                onClick={toggleProfileDropdown}
              >
                <div className="profile-avatar cartoon-avatar">
                  {getCartoonAvatar(user.name)}
                </div>
                <span className="profile-name">{user.name}</span>
                <i className={`fas fa-chevron-down dropdown-arrow ${isProfileDropdownOpen ? 'rotated' : ''}`}></i>
              </div>
              <div className={`dropdown-content ${isProfileDropdownOpen ? 'show' : ''}`}>
                <div className="dropdown-header">
                  <div className="dropdown-avatar cartoon-avatar">
                    {getCartoonAvatar(user.name)}
                  </div>
                  <div>
                    <div className="dropdown-name">{user.name}</div>
                    <div className="dropdown-email">{user.email}</div>
                  </div>
                </div>
                <div className="dropdown-divider"></div>
                {user.role === 'organizer' && (
                  <>
                    <Link 
                      to="/organizer-dashboard" 
                      onClick={() => handleDropdownItemClick('dashboard')}
                      className="dropdown-item"
                    >
                      <i className="fas fa-tachometer-alt"></i>
                      Dashboard
                    </Link>
                    <Link 
                      to="/create-event" 
                      onClick={() => handleDropdownItemClick('create')}
                      className="dropdown-item"
                    >
                      <i className="fas fa-plus"></i>
                      Create Event
                    </Link>
                  </>
                )}
                {user.role === 'participant' && (
                  <>
                    <Link 
                      to="/participant-dashboard" 
                      onClick={() => handleDropdownItemClick('tickets')}
                      className="dropdown-item"
                    >
                      <i className="fas fa-ticket-alt"></i>
                      My Tickets
                    </Link>
                    <Link 
                      to="/participant-dashboard" 
                      onClick={() => handleDropdownItemClick('favorites')}
                      className="dropdown-item"
                    >
                      <i className="fas fa-heart"></i>
                      Favorites
                    </Link>
                  </>
                )}
                <div className="dropdown-divider"></div>
                <button 
                  onClick={() => handleDropdownItemClick('logout')} 
                  className="dropdown-item logout-btn"
                >
                  <i className="fas fa-sign-out-alt"></i>
                  Logout
                </button>
              </div>
            </div>
            </>
          ) : (
            <div className="auth-buttons">
              <Link to="/login" className="btn btn-secondary" onClick={closeMobileMenu}>
                Login
              </Link>
              <Link to="/signup" className="btn btn-primary" onClick={closeMobileMenu}>
                Get Started
              </Link>
            </div>
          )}
          
          <button 
            className={`mobile-menu-toggle ${isMobileMenuOpen ? 'active' : ''}`}
            onClick={toggleMobileMenu}
            aria-label="Toggle mobile menu"
          >
            <span></span>
            <span></span>
            <span></span>
          </button>
        </div>
      </div>
    </header>
  );
}

export default Header;