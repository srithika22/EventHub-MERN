import axios from 'axios';

// Environment-based API configuration with robust fallbacks
const PRODUCTION_API_URL = 'https://eventhub-backend-xv3i.onrender.com';
const DEV_API_URL = 'http://localhost:3001';

// Get the API URL with multiple fallback strategies
const getApiUrl = () => {
  // First try environment variable
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  
  // Then check if we're in production (Vercel domain)
  if (window.location.hostname.includes('vercel.app')) {
    return PRODUCTION_API_URL;
  }
  
  // Local development
  if (window.location.hostname === 'localhost') {
    return DEV_API_URL;
  }
  
  // Final fallback to production
  return PRODUCTION_API_URL;
};

export const API_BASE_URL = getApiUrl();
export const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || API_BASE_URL;

// Debug logging for environment variables
console.log('🔧 Environment Variables Debug:');
console.log('VITE_API_URL:', import.meta.env.VITE_API_URL);
console.log('VITE_SOCKET_URL:', import.meta.env.VITE_SOCKET_URL);
console.log('window.location.hostname:', window.location.hostname);
console.log('Final API_BASE_URL:', API_BASE_URL);
console.log('Final SOCKET_URL:', SOCKET_URL);

// Create axios instance with base configuration
export const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  timeout: 10000,
});

// Add request interceptor for authentication
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = token;
  }
  return config;
});

// Helper functions for common API patterns
export const apiGet = (endpoint, options = {}) => {
  return fetch(`${API_BASE_URL}/api${endpoint}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': localStorage.getItem('token') || '',
      ...options.headers,
    },
    ...options,
  });
};

export const apiPost = (endpoint, data, options = {}) => {
  return fetch(`${API_BASE_URL}/api${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': localStorage.getItem('token') || '',
      ...options.headers,
    },
    body: JSON.stringify(data),
    ...options,
  });
};

export const apiPut = (endpoint, data, options = {}) => {
  return fetch(`${API_BASE_URL}/api${endpoint}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': localStorage.getItem('token') || '',
      ...options.headers,
    },
    body: JSON.stringify(data),
    ...options,
  });
};

export const apiDelete = (endpoint, options = {}) => {
  return fetch(`${API_BASE_URL}/api${endpoint}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': localStorage.getItem('token') || '',
      ...options.headers,
    },
    ...options,
  });
};

export default api;