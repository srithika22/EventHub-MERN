import axios from 'axios';

// Environment-based API configuration
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://eventhub-backend-xv3i.onrender.com';
export const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_URL || 'https://eventhub-backend-xv3i.onrender.com';

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