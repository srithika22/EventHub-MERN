import React, { useState } from 'react';
import './CreateEventModal.css';

function CreateEventModal({ isOpen, onClose, onEventCreated }) {
  const [eventData, setEventData] = useState({ title: '', category: '', location: '', date: '', description: '' });
  const [imageFile, setImageFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => setEventData({ ...eventData, [e.target.name]: e.target.value });
  const handleFileChange = (e) => setImageFile(e.target.files[0]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    const token = localStorage.getItem('token');

    const validTicketTypes = ticketTypes.filter(ticket => 
        ticket.name.trim() !== '' && ticket.price.trim() !== '' && ticket.capacity.trim() !== ''
    );

    if (validTicketTypes.length === 0) {
        setIsSubmitting(false);
        return alert('Please add at least one complete ticket type.');
    }
    
    const formData = new FormData();
    formData.append('title', eventData.title);
    formData.append('category', eventData.category);
    formData.append('location', eventData.location);
    formData.append('date', eventData.date);
    formData.append('description', eventData.description);
    if (imageFile) {
      formData.append('image', imageFile);
    }

    try {
      const response = await fetch('http://localhost:3001/api/events', {
        method: 'POST',
        headers: { 'Authorization': token },
        body: formData 
      });

      if (response.ok) {
        alert('Event created successfully!');
        onEventCreated(); // Refresh the event list
        onClose();
      } else {
        const errorData = await response.json();
        alert(`Failed to create event: ${errorData.message}`);
      }
    } catch (error) {
        alert('An error occurred. Please try again.');
    } finally {
        setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Create a New Event</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group"><label>Event Title</label><input type="text" name="title" onChange={handleChange} required /></div>
          <div className="form-group"><label>Category</label><input type="text" name="category" onChange={handleChange} required /></div>
          <div className="form-group"><label>Location</label><input type="text" name="location" onChange={handleChange} required /></div>
          <div className="form-group"><label>Date</label><input type="date" name="date" onChange={handleChange} required /></div>
          <div className="form-group"><label>Event Image</label><input type="file" name="image" onChange={handleFileChange} /></div>
          <div className="form-group"><label>Description</label><textarea name="description" rows="4" onChange={handleChange} required></textarea></div>
          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={isSubmitting}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={isSubmitting}>{isSubmitting ? 'Publishing...' : 'Publish Event'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
export default CreateEventModal;