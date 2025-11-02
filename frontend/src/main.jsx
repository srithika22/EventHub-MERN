import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

// Import react-toastify for notifications
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// 1. This import is essential for routing to work
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/* 2. <BrowserRouter> MUST wrap your <App /> component */}
    <BrowserRouter>
      <AuthProvider>
          <App />
          <ToastContainer position="top-right" autoClose={5000} hideProgressBar={false} 
            newestOnTop={true} closeOnClick rtl={false} pauseOnFocusLoss 
            draggable pauseOnHover theme="light" />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
);