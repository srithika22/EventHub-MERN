import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext'; // Import useAuth
import '../Auth.css';

function OrganizerSignup() {
  const [formData, setFormData] = useState({
    yourName: '', organizationName: '', workEmail: '', phone: '',
    countryCode: '+91', password: '', confirmPassword: '', termsAccepted: false,
  });
  const navigate = useNavigate();
  const { api } = useAuth(); // Get api instance from context

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prevData => ({ ...prevData, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      return alert("Passwords do not match!");
    }
    const registrationData = {
      name: formData.yourName,
      email: formData.workEmail,
      password: formData.password,
      role: 'organizer',
    };

    try {
      const response = await api.post('/auth/register', registrationData);
      if (response.status === 201) {
        alert('Organizer account created successfully! Please log in.');
        navigate('/login');
      } else {
        // Axios wraps the error response in `error.response`
        alert(`Registration Failed: ${response.data.message}`);
      }
    } catch (error) {
      alert(error.response?.data?.message || 'Error connecting to the server.');
      console.error('Registration error:', error);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-illustration">
          <h1>For Organizers</h1>
          <p>Host and manage your events seamlessly.</p>
        </div>
        <div className="auth-form-container">
          <h2>Sign up as an Organizer</h2>
          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="yourName">Your Name*</label>
                <input type="text" id="yourName" name="yourName" value={formData.yourName} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label htmlFor="organizationName">Organization Name</label>
                <input type="text" id="organizationName" name="organizationName" value={formData.organizationName} onChange={handleChange} />
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="workEmail">Work Email*</label>
              <input type="email" id="workEmail" name="workEmail" value={formData.workEmail} onChange={handleChange} required />
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

export default OrganizerSignup;