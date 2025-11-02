import React, { createContext, useState, useContext, useMemo } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const storedUser = localStorage.getItem('user');
    return storedUser ? JSON.parse(storedUser) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [isAuthenticated, setIsAuthenticated] = useState(() => !!localStorage.getItem('token'));

  // Create axios instance with authentication
  const api = useMemo(() => {
    const instance = axios.create({
      baseURL: 'http://localhost:3001/api',
    });

    // Add request interceptor to include the token in all requests
    instance.interceptors.request.use((config) => {
      const currentToken = localStorage.getItem('token');
      if (currentToken) {
        // Make sure we always have the latest token, even if it changed
        config.headers.Authorization = currentToken;
        console.log("Request with auth token:", currentToken);
      } else {
        console.log("Request without auth token");
      }
      return config;
    });

    return instance;
  }, []);

  // Create a direct login method that doesn't rely on the intercepted API
  const directLogin = async (email, password) => {
    try {
      console.log("Attempting direct login with email:", email);
      
      // Use a fresh axios instance without interceptors for login
      const loginResponse = await axios.post('http://localhost:3001/api/auth/login', {
        email,
        password
      });
      
      const { data } = loginResponse;
      
      if (loginResponse.status === 200 && data.token) {
        console.log("Login successful, token received:", data.token);
        
        // Store authentication data
        localStorage.setItem('user', JSON.stringify(data.user));
        localStorage.setItem('token', data.token);
        
        // Update state
        setUser(data.user);
        setToken(data.token);
        setIsAuthenticated(true);
        
        console.log("Authentication state updated:", data.user);
        return { success: true, user: data.user };
      } else {
        console.error("Login response missing token:", data);
        return { success: false, message: data.message || "Authentication failed" };
      }
    } catch (error) {
      console.error("Login error:", error.response?.data || error);
      return { 
        success: false, 
        message: error.response?.data?.message || "Could not connect to server" 
      };
    }
  };
  
  // Legacy login method for compatibility
  const login = (userData, userToken) => {
    // Log the token we're storing to debug
    console.log("Storing auth token manually:", userToken);
    
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('token', userToken);
    setUser(userData);
    setToken(userToken);
    setIsAuthenticated(true);
  };

  const logout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    setUser(null);
    setToken(null);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      token, 
      isAuthenticated,
      login, 
      directLogin, // Add the new direct login method
      logout, 
      api 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};