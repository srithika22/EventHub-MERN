import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../Auth.css';

function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { user, directLogin } = useAuth();

  useEffect(() => {
    if (user) {
      if (user.role === 'organizer') {
        navigate('/organizer-dashboard');
      } else {
        navigate('/participant-dashboard');
      }
    }
  }, [user, navigate]);

  const handleLogin = async (event) => {
    event.preventDefault();
    setIsLoading(true);
    
    try {
      const result = await directLogin(email, password);
      
      if (result.success) {
        // Authentication is handled inside directLogin
        // Just navigate to the appropriate dashboard
        if (result.user.role === 'organizer') {
          navigate('/organizer-dashboard');
        } else {
          navigate('/participant-dashboard');
        }
      } else {
        alert(`Login Failed: ${result.message}`);
      }
    } catch (error) {
      console.error('Login error:', error);
      alert('Login failed: An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-illustration">
          <h1>Welcome Back!</h1>
          <p>Participate in events and organize your own.</p>
        </div>
        <div className="auth-form-container">
          <h2>Log In to EventHub</h2>
          <p className="subtitle">Please enter your details to log in.</p>
          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label htmlFor="loginEmail">Email Address</label>
              <input 
                type="email" 
                id="loginEmail" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required 
              />
            </div>
            <div className="form-group">
              <label htmlFor="loginPassword">Password</label>
              <div className="password-input">
                <input 
                  type="password" 
                  id="loginPassword" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required 
                />
                <i className="fas fa-eye toggle-password"></i>
              </div>
            </div>
            <button type="submit" className="btn-submit" disabled={isLoading}>
              {isLoading ? 'Logging in...' : 'Login'}
            </button>
            <p className="redirect-text">
              Don’t have an account? <Link to="/signup">Sign up</Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;