import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './LiveQA.css';

function LiveQA() {
  const { eventId } = useParams();
  const { user } = useAuth();
  const [event, setEvent] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [newQuestion, setNewQuestion] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // all, pending, answered
  const [sortBy, setSortBy] = useState('newest'); // newest, oldest, popular

  useEffect(() => {
    fetchEvent();
    fetchQuestions();
    
    // Set up polling for real-time updates
    const interval = setInterval(fetchQuestions, 5000);
    return () => clearInterval(interval);
  }, [eventId]);

  const fetchEvent = async () => {
    try {
      const response = await fetch(`http://localhost:3001/api/events/${eventId}`);
      if (response.ok) {
        const eventData = await response.json();
        setEvent(eventData);
      }
    } catch (error) {
      console.error('Error fetching event:', error);
    }
  };

  const fetchQuestions = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:3001/api/qa/${eventId}/questions`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setQuestions(data);
      } else {
        setError('Failed to load questions');
      }
    } catch (error) {
      console.error('Error fetching questions:', error);
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  const submitQuestion = async (e) => {
    e.preventDefault();
    if (!newQuestion.trim()) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:3001/api/qa/${eventId}/questions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          question: newQuestion.trim()
        })
      });

      if (response.ok) {
        setNewQuestion('');
        fetchQuestions(); // Refresh questions
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to submit question');
      }
    } catch (error) {
      console.error('Error submitting question:', error);
      alert('Network error occurred');
    }
  };

  const voteQuestion = async (questionId, voteType) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:3001/api/qa/questions/${questionId}/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ voteType })
      });

      if (response.ok) {
        fetchQuestions(); // Refresh questions
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to vote');
      }
    } catch (error) {
      console.error('Error voting:', error);
      alert('Network error occurred');
    }
  };

  const markAsAnswered = async (questionId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:3001/api/qa/questions/${questionId}/answer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        fetchQuestions(); // Refresh questions
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to mark as answered');
      }
    } catch (error) {
      console.error('Error marking as answered:', error);
      alert('Network error occurred');
    }
  };

  // Filter and sort questions
  const filteredQuestions = questions
    .filter(q => {
      if (filterStatus === 'pending') return !q.isAnswered;
      if (filterStatus === 'answered') return q.isAnswered;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'popular') return b.votes - a.votes;
      if (sortBy === 'oldest') return new Date(a.createdAt) - new Date(b.createdAt);
      return new Date(b.createdAt) - new Date(a.createdAt); // newest
    });

  const userHasVoted = (question) => {
    return question.voters?.includes(user?.id);
  };

  const isOrganizer = event?.organizer === user?.id;

  if (loading) return (
    <div className="qa-container">
      <div className="loading-state">
        <div className="spinner"></div>
        <p>Loading Q&A...</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="qa-container">
      <div className="error-state">
        <p>❌ {error}</p>
        <button onClick={() => window.location.reload()} className="retry-btn">
          Try Again
        </button>
      </div>
    </div>
  );

  return (
    <div className="qa-container">
      {/* Header */}
      <div className="qa-header">
        <div className="header-content">
          <div className="header-left">
            <h1>💬 Live Q&A</h1>
            <p className="event-title">{event?.title}</p>
            <p className="qa-subtitle">
              Ask questions and interact with speakers
            </p>
          </div>
          <div className="qa-stats">
            <div className="stat">
              <span className="stat-number">{questions.length}</span>
              <span className="stat-label">Questions</span>
            </div>
            <div className="stat">
              <span className="stat-number">{questions.filter(q => !q.isAnswered).length}</span>
              <span className="stat-label">Pending</span>
            </div>
            <div className="stat">
              <span className="stat-number">{questions.filter(q => q.isAnswered).length}</span>
              <span className="stat-label">Answered</span>
            </div>
          </div>
        </div>
      </div>

      {/* Question Submission Form */}
      <div className="qa-submission">
        <form onSubmit={submitQuestion} className="question-form">
          <div className="form-header">
            <h3>Ask a Question</h3>
            <p>Your question will be visible to all attendees and the organizer</p>
          </div>
          <div className="input-group">
            <textarea
              value={newQuestion}
              onChange={(e) => setNewQuestion(e.target.value)}
              placeholder="What would you like to know about this event or topic?"
              rows="3"
              maxLength="500"
              required
            />
            <div className="char-count">
              {newQuestion.length}/500 characters
            </div>
          </div>
          <button 
            type="submit" 
            className="submit-btn"
            disabled={!newQuestion.trim()}
          >
            <span className="btn-icon">📝</span>
            Submit Question
          </button>
        </form>
      </div>

      {/* Filters and Sorting */}
      <div className="qa-controls">
        <div className="filter-group">
          <label>Filter:</label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Questions</option>
            <option value="pending">Pending</option>
            <option value="answered">Answered</option>
          </select>
        </div>
        
        <div className="sort-group">
          <label>Sort by:</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="sort-select"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="popular">Most Popular</option>
          </select>
        </div>
      </div>

      {/* Questions List */}
      <div className="questions-section">
        {filteredQuestions.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">❓</div>
            <h3>No questions yet</h3>
            <p>Be the first to ask a question about this event!</p>
          </div>
        ) : (
          <div className="questions-list">
            {filteredQuestions.map((question) => (
              <div key={question._id} className={`question-card ${question.isAnswered ? 'answered' : ''}`}>
                <div className="question-header">
                  <div className="question-author">
                    <div className="author-avatar">
                      {question.author.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="author-info">
                      <span className="author-name">{question.author.name}</span>
                      <span className="question-time">
                        {new Date(question.createdAt).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                  </div>
                  
                  {question.isAnswered && (
                    <div className="answered-badge">
                      ✅ Answered
                    </div>
                  )}
                </div>

                <div className="question-content">
                  <p className="question-text">{question.question}</p>
                </div>

                <div className="question-actions">
                  <div className="vote-section">
                    <button
                      className={`vote-btn ${userHasVoted(question) ? 'voted' : ''}`}
                      onClick={() => voteQuestion(question._id, 'upvote')}
                      disabled={userHasVoted(question)}
                    >
                      👍 {question.votes || 0}
                    </button>
                    <span className="vote-label">
                      {question.votes === 1 ? 'vote' : 'votes'}
                    </span>
                  </div>

                  {isOrganizer && !question.isAnswered && (
                    <button
                      className="answer-btn"
                      onClick={() => markAsAnswered(question._id)}
                    >
                      ✓ Mark as Answered
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default LiveQA;