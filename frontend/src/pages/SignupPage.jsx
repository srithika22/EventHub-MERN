import React from 'react';
import { Link } from 'react-router-dom';
import '../Auth.css';

function SignupPage() {
  return (
    <div className="auth-page">
      <div className="auth-card">
        {/* Left Illustration Panel */}
        <div className="auth-illustration">
          <h1>Join EventHub</h1>
          <p>Your one-stop platform for discovering, registering for, and hosting events.</p>
        </div>

        {/* Right Form Panel */}
        <div className="auth-form-container">
          <h2>Create a New Account</h2>
          <p className="subtitle">First, tell us what you'd like to do.</p>
          
          <Link to="/signup-participant" className="role-box active">
            <i className="fas fa-user-tie icon"></i>
            <div className="role-text">
              <h3>Sign up as a Participant</h3>
              <p>Discover and register for events.</p>
            </div>
            <i className="fas fa-check-circle check-icon"></i>
          </Link>

          <Link to="/signup-organizer" className="role-box">
            <i className="fas fa-calendar-plus icon"></i>
            <div className="role-text">
              <h3>Sign up as an Organizer</h3>
              <p>Host and manage your own events.</p>
            </div>
            <i className="fas fa-check-circle check-icon"></i>
          </Link>

          <p className="redirect-text">
            Already have an account? <Link to="/login">Login</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default SignupPage;