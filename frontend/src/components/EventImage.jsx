import React, { useState } from 'react';

const EventImage = ({ 
  src, 
  alt, 
  className = '', 
  fallbackSrc = 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?auto=format&fit=crop&w=800&q=80',
  ...props 
}) => {
  const [imageState, setImageState] = useState({
    loading: true,
    error: false,
    currentSrc: src || fallbackSrc
  });

  const handleLoad = () => {
    setImageState(prev => ({
      ...prev,
      loading: false,
      error: false
    }));
  };

  const handleError = () => {
    // If we're not already showing the fallback, switch to it
    if (imageState.currentSrc !== fallbackSrc) {
      setImageState(prev => ({
        ...prev,
        currentSrc: fallbackSrc,
        error: false,
        loading: true // Reset loading state for fallback image
      }));
    } else {
      // Even fallback failed
      setImageState(prev => ({
        ...prev,
        loading: false,
        error: true
      }));
    }
  };

  if (imageState.error) {
    // Show a placeholder if even the fallback fails
    return (
      <div 
        className={`event-image-placeholder ${className}`}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#f3f4f6',
          color: '#6b7280',
          fontSize: '2rem'
        }}
        {...props}
      >
        <i className="fas fa-calendar-alt"></i>
      </div>
    );
  }

  return (
    <>
      {imageState.loading && (
        <div 
          className={`event-image-skeleton ${className}`}
          style={{
            backgroundColor: '#e5e7eb',
            animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
          }}
          {...props}
        />
      )}
      <img
        src={imageState.currentSrc}
        alt={alt}
        className={`${className} ${imageState.loading ? 'loading' : 'loaded'}`}
        onLoad={handleLoad}
        onError={handleError}
        style={{
          display: imageState.loading ? 'none' : 'block'
        }}
        {...props}
      />
    </>
  );
};

export default EventImage;