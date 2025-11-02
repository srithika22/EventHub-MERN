import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom'; // --- NEW: Import useNavigate
import { API_BASE_URL } from '../utils/api';
import '../Auth.css';

function ParticipantSignup() {
  const [formData, setFormData] = useState({
    firstName: '', lastName: '', email: '', phone: '',
    countryCode: '+91', password: '', confirmPassword: '', termsAccepted: false,
  });
  // --- NEW: Initialize navigate hook ---
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prevData => ({ ...prevData, [name]: type === 'checkbox' ? checked : value }));
  };

  // --- UPDATED: This function now sends registration data to the backend ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      return alert("Passwords do not match!");
    }
    const registrationData = {
      name: `${formData.firstName} ${formData.lastName}`,
      email: formData.email,
      password: formData.password,
      role: 'participant', // Set the role explicitly
    };

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registrationData),
      });

      const data = await response.json();
      if (response.ok) {
        alert('Registration successful! Please log in.');
        navigate('/login'); // Redirect to login after successful signup
      } else {
        alert(`Registration Failed: ${data.message}`);
      }
    } catch (error) {
      alert('Error connecting to the server.');
      console.error('Registration error:', error);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-illustration">
          <h1>For Participants</h1>
          <p>Discover and join amazing events.</p>
        </div>
        <div className="auth-form-container">
          <h2>Sign up as a Participant</h2>
          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="firstName">First Name*</label>
                <input type="text" id="firstName" name="firstName" value={formData.firstName} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label htmlFor="lastName">Last Name</label>
                <input type="text" id="lastName" name="lastName" value={formData.lastName} onChange={handleChange} />
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="email">Email*</label>
              <input type="email" id="email" name="email" value={formData.email} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label htmlFor="phone">Phone*</label>
              <div className="phone-input">
                <select name="countryCode" value={formData.countryCode} onChange={handleChange}>
                  <option>+91</option>
                </select>
                <input type="tel" id="phone" name="phone" value={formData.phone} onChange={handleChange} required />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="password">Password*</label>
                <div className="password-input">
                  <input type="password" id="password" name="password" value={formData.password} onChange={handleChange} required />
                  <i className="fas fa-eye toggle-password"></i>
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="confirmPassword">Confirm Password*</label>
                <input type="password" id="confirmPassword" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} required />
              </div>
            </div>
            <div className="terms-group">
              <input type="checkbox" id="terms" name="termsAccepted" checked={formData.termsAccepted} onChange={handleChange} required />
              <label htmlFor="terms">I agree to the <Link to="/terms">Terms of Use</Link> and <Link to="/privacy">Privacy Policy</Link>.</label>
            </div>
            <button type="submit" className="btn-submit">Create Account</button>
            <p className="redirect-text">Already have an account? <Link to="/login">Login</Link></p>
          </form>
        </div>
      </div>
    </div>
  );
}

export default ParticipantSignup;