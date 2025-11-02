import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import './RealTimeQA.css';

function RealTimeQA() {
  const { eventId } = useParams();
  const { user } = useAuth();
  const { socket, joinEvent, emitNewQuestion, emitQuestionAnswered } = useSocket();
  
  const [event, setEvent] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [newQuestion, setNewQuestion] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isOrganizer, setIsOrganizer] = useState(false);
  
  // Filters and sorting
  const [filterStatus, setFilterStatus] = useState('all'); // all, pending, answered, starred
  const [sortBy, setSortBy] = useState('newest'); // newest, oldest, popular, unanswered
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // UI states
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const [showAnswerModal, setShowAnswerModal] = useState(false);
  const [answerText, setAnswerText] = useState('');
  const [questionCategories, setQuestionCategories] = useState([]);
  const [newQuestionCategory, setNewQuestionCategory] = useState('general');
  const [showAnalytics, setShowAnalytics] = useState(false);

  useEffect(() => {
    if (socket && eventId) {
      joinEvent(eventId);
      
      // Socket event listeners for real-time updates
      socket.on('question-added', handleQuestionAdded);
      socket.on('question-updated', handleQuestionUpdated);
      socket.on('question-answered', handleQuestionAnswered);
      socket.on('question-voted', handleQuestionVoted);
      socket.on('question-starred', handleQuestionStarred);

      return () => {
        socket.off('question-added', handleQuestionAdded);
        socket.off('question-updated', handleQuestionUpdated);
        socket.off('question-answered', handleQuestionAnswered);
        socket.off('question-voted', handleQuestionVoted);
        socket.off('question-starred', handleQuestionStarred);
      };
    }
  }, [socket, eventId]);

  useEffect(() => {
    fetchEvent();
    fetchQuestions();
    fetchCategories();
    checkUserRole();
  }, [eventId]);

  const handleQuestionAdded = (question) => {
    setQuestions(prev => [question, ...prev]);
    showNotification(`New question: ${question.question}`, 'info');
  };

  const handleQuestionUpdated = ({ questionId, answer }) => {
    setQuestions(prev => prev.map(q => 
      q._id === questionId ? { ...q, answer, status: 'answered', answeredAt: new Date() } : q
    ));
    showNotification('A question has been answered', 'success');
  };

  const handleQuestionAnswered = (data) => {
    handleQuestionUpdated(data);
  };

  const handleQuestionVoted = ({ questionId, votes, userVote }) => {
    setQuestions(prev => prev.map(q => 
      q._id === questionId ? { ...q, votes, userVote } : q
    ));
  };

  const handleQuestionStarred = ({ questionId, isStarred }) => {
    setQuestions(prev => prev.map(q => 
      q._id === questionId ? { ...q, isStarred } : q
    ));
  };

  const fetchEvent = async () => {
    try {
      const response = await fetch(`http://localhost:3001/api/events/${eventId}`);
      if (response.ok) {
        const eventData = await response.json();
        setEvent(eventData.event || eventData);
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
        setQuestions(data.questions || data);
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

  const fetchCategories = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:3001/api/qa/${eventId}/categories`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setQuestionCategories(data.categories || []);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const checkUserRole = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:3001/api/events/${eventId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        const eventData = data.event || data;
        setIsOrganizer(eventData.organizer === user.id || user.role === 'organizer');
      }
    } catch (error) {
      console.error('Error checking user role:', error);
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
          question: newQuestion.trim(),
          category: newQuestionCategory
        })
      });

      if (response.ok) {
        const data = await response.json();
        
        // Emit real-time event
        emitNewQuestion(eventId, data.question);
        
        setNewQuestion('');
        setNewQuestionCategory('general');
        showNotification('Question submitted successfully!', 'success');
      } else {
        const error = await response.json();
        showNotification(error.message || 'Failed to submit question', 'error');
      }
    } catch (error) {
      console.error('Error submitting question:', error);
      showNotification('Network error occurred', 'error');
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
        const data = await response.json();
        
        // Real-time update will be handled by socket event
        showNotification(`Vote ${voteType === 'up' ? 'added' : 'removed'}!`, 'success');
      } else {
        const error = await response.json();
        showNotification(error.message || 'Failed to vote', 'error');
      }
    } catch (error) {
      console.error('Error voting:', error);
      showNotification('Network error occurred', 'error');
    }
  };

  const answerQuestion = async (questionId, answer) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:3001/api/qa/questions/${questionId}/answer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ answer: answer.trim() })
      });

      if (response.ok) {
        const data = await response.json();
        
        // Emit real-time event
        emitQuestionAnswered(eventId, questionId, data.answer);
        
        setShowAnswerModal(false);
        setAnswerText('');
        setSelectedQuestion(null);
        showNotification('Answer submitted successfully!', 'success');
      } else {
        const error = await response.json();
        showNotification(error.message || 'Failed to submit answer', 'error');
      }
    } catch (error) {
      console.error('Error answering question:', error);
      showNotification('Network error occurred', 'error');
    }
  };

  const starQuestion = async (questionId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:3001/api/qa/questions/${questionId}/star`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        showNotification('Question starred!', 'success');
      }
    } catch (error) {
      console.error('Error starring question:', error);
      showNotification('Failed to star question', 'error');
    }
  };

  const deleteQuestion = async (questionId) => {
    if (!window.confirm('Are you sure you want to delete this question?')) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:3001/api/qa/questions/${questionId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        setQuestions(prev => prev.filter(q => q._id !== questionId));
        showNotification('Question deleted successfully!', 'success');
      }
    } catch (error) {
      console.error('Error deleting question:', error);
      showNotification('Failed to delete question', 'error');
    }
  };

  const showNotification = (message, type) => {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      document.body.removeChild(notification);
    }, 3000);
  };

  const getFilteredQuestions = () => {
    let filtered = [...questions];

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(q => 
        q.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        q.answer?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        q.asker?.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(q => {
        switch (filterStatus) {
          case 'pending':
            return q.status === 'pending';
          case 'answered':
            return q.status === 'answered';
          case 'starred':
            return q.isStarred;
          default:
            return true;
        }
      });
    }

    // Category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(q => q.category === categoryFilter);
    }

    // Sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'oldest':
          return new Date(a.createdAt) - new Date(b.createdAt);
        case 'popular':
          return (b.votes || 0) - (a.votes || 0);
        case 'unanswered':
          if (a.status === 'pending' && b.status === 'answered') return -1;
          if (a.status === 'answered' && b.status === 'pending') return 1;
          return new Date(b.createdAt) - new Date(a.createdAt);
        case 'newest':
        default:
          return new Date(b.createdAt) - new Date(a.createdAt);
      }
    });

    return filtered;
  };

  const getQuestionStats = () => {
    const total = questions.length;
    const answered = questions.filter(q => q.status === 'answered').length;
    const pending = questions.filter(q => q.status === 'pending').length;
    const starred = questions.filter(q => q.isStarred).length;
    
    return { total, answered, pending, starred };
  };

  if (loading) {
    return (
      <div className="qa-loading">
        <div className="spinner"></div>
        <p>Loading Q&A session...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="qa-error">
        <h2>Error</h2>
        <p>{error}</p>
        <button onClick={() => window.location.reload()}>Retry</button>
      </div>
    );
  }

  const stats = getQuestionStats();
  const filteredQuestions = getFilteredQuestions();

  return (
    <div className="real-time-qa">
      <div className="qa-header">
        <div className="header-content">
          <div className="header-left">
            <h1>Live Q&A</h1>
            <p>{event?.title}</p>
          </div>
          <div className="header-actions">
            {isOrganizer && (
              <button 
                className="analytics-btn"
                onClick={() => setShowAnalytics(!showAnalytics)}
              >
                📊 Analytics
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Statistics */}
      <div className="qa-stats">
        <div className="stat-card">
          <span className="stat-value">{stats.total}</span>
          <span className="stat-label">Total Questions</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{stats.answered}</span>
          <span className="stat-label">Answered</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{stats.pending}</span>
          <span className="stat-label">Pending</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{stats.starred}</span>
          <span className="stat-label">Starred</span>
        </div>
      </div>

      {/* Question Submission */}
      <div className="question-submission">
        <form onSubmit={submitQuestion} className="question-form">
          <div className="form-row">
            <input
              type="text"
              value={newQuestion}
              onChange={(e) => setNewQuestion(e.target.value)}
              placeholder="Ask your question here..."
              className="question-input"
              maxLength={500}
            />
            <select
              value={newQuestionCategory}
              onChange={(e) => setNewQuestionCategory(e.target.value)}
              className="category-select"
            >
              <option value="general">General</option>
              <option value="technical">Technical</option>
              <option value="business">Business</option>
              <option value="product">Product</option>
              <option value="other">Other</option>
            </select>
            <button type="submit" disabled={!newQuestion.trim()}>
              Submit Question
            </button>
          </div>
          <div className="char-count">
            {newQuestion.length}/500 characters
          </div>
        </form>
      </div>

      {/* Filters and Sorting */}
      <div className="qa-controls">
        <div className="search-bar">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search questions..."
            className="search-input"
          />
        </div>
        
        <div className="filters">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Questions</option>
            <option value="pending">Pending</option>
            <option value="answered">Answered</option>
            <option value="starred">Starred</option>
          </select>
          
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Categories</option>
            <option value="general">General</option>
            <option value="technical">Technical</option>
            <option value="business">Business</option>
            <option value="product">Product</option>
            <option value="other">Other</option>
          </select>
          
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="filter-select"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="popular">Most Popular</option>
            <option value="unanswered">Unanswered First</option>
          </select>
        </div>
      </div>

      {/* Questions List */}
      <div className="questions-container">
        {filteredQuestions.length === 0 ? (
          <div className="no-questions">
            <h3>No questions yet</h3>
            <p>Be the first to ask a question!</p>
          </div>
        ) : (
          <div className="questions-list">
            {filteredQuestions.map((question) => (
              <QuestionCard
                key={question._id}
                question={question}
                onVote={voteQuestion}
                onAnswer={isOrganizer ? (q) => {
                  setSelectedQuestion(q);
                  setShowAnswerModal(true);
                } : null}
                onStar={isOrganizer ? starQuestion : null}
                onDelete={isOrganizer || question.asker._id === user.id ? deleteQuestion : null}
                isOrganizer={isOrganizer}
                currentUser={user}
              />
            ))}
          </div>
        )}
      </div>

      {/* Answer Modal */}
      {showAnswerModal && selectedQuestion && (
        <div className="modal-overlay" onClick={() => setShowAnswerModal(false)}>
          <div className="answer-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Answer Question</h2>
              <button onClick={() => setShowAnswerModal(false)}>&times;</button>
            </div>
            
            <div className="modal-content">
              <div className="question-preview">
                <h3>Question:</h3>
                <p>{selectedQuestion.question}</p>
                <small>Asked by {selectedQuestion.asker.name}</small>
              </div>
              
              <div className="answer-form">
                <label>Your Answer:</label>
                <textarea
                  value={answerText}
                  onChange={(e) => setAnswerText(e.target.value)}
                  placeholder="Type your answer here..."
                  rows="6"
                  className="answer-textarea"
                />
              </div>
            </div>
            
            <div className="modal-actions">
              <button onClick={() => setShowAnswerModal(false)}>
                Cancel
              </button>
              <button 
                onClick={() => answerQuestion(selectedQuestion._id, answerText)}
                disabled={!answerText.trim()}
                className="submit-answer-btn"
              >
                Submit Answer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Analytics Modal */}
      {showAnalytics && isOrganizer && (
        <QAAnalytics 
          questions={questions} 
          onClose={() => setShowAnalytics(false)} 
        />
      )}
    </div>
  );
}

// Question Card Component
const QuestionCard = ({ question, onVote, onAnswer, onStar, onDelete, isOrganizer, currentUser }) => {
  const [showFullAnswer, setShowFullAnswer] = useState(false);
  
  const handleVote = () => {
    const voteType = question.userVote === 'up' ? 'remove' : 'up';
    onVote(question._id, voteType);
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  const truncateText = (text, maxLength = 200) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  return (
    <div className={`question-card ${question.status} ${question.isStarred ? 'starred' : ''}`}>
      <div className="question-header">
        <div className="question-meta">
          <span className="asker">{question.asker.name}</span>
          <span className="category">{question.category}</span>
          <span className="timestamp">{formatTime(question.createdAt)}</span>
          {question.isStarred && <span className="star-badge">⭐</span>}
        </div>
        
        <div className="question-actions">
          <button 
            onClick={handleVote}
            className={`vote-btn ${question.userVote === 'up' ? 'voted' : ''}`}
          >
            👍 {question.votes || 0}
          </button>
          
          {isOrganizer && (
            <>
              {question.status === 'pending' && (
                <button onClick={() => onAnswer(question)} className="answer-btn">
                  Answer
                </button>
              )}
              <button onClick={() => onStar(question._id)} className="star-btn">
                {question.isStarred ? '⭐' : '☆'}
              </button>
            </>
          )}
          
          {(isOrganizer || question.asker._id === currentUser.id) && (
            <button onClick={() => onDelete(question._id)} className="delete-btn">
              🗑️
            </button>
          )}
        </div>
      </div>
      
      <div className="question-content">
        <h3>{question.question}</h3>
        
        {question.status === 'answered' && question.answer && (
          <div className="answer-section">
            <h4>Answer:</h4>
            <div className="answer-content">
              {showFullAnswer ? question.answer : truncateText(question.answer)}
              {question.answer.length > 200 && (
                <button 
                  onClick={() => setShowFullAnswer(!showFullAnswer)}
                  className="toggle-answer-btn"
                >
                  {showFullAnswer ? 'Show less' : 'Show more'}
                </button>
              )}
            </div>
            <div className="answer-meta">
              Answered on {formatTime(question.answeredAt)}
            </div>
          </div>
        )}
      </div>
      
      <div className="question-footer">
        <span className={`status-badge ${question.status}`}>
          {question.status === 'pending' ? '⏳ Pending' : '✅ Answered'}
        </span>
      </div>
    </div>
  );
};

// Analytics Component
const QAAnalytics = ({ questions, onClose }) => {
  const getAnalytics = () => {
    const totalQuestions = questions.length;
    const answeredQuestions = questions.filter(q => q.status === 'answered').length;
    const pendingQuestions = questions.filter(q => q.status === 'pending').length;
    const starredQuestions = questions.filter(q => q.isStarred).length;
    const totalVotes = questions.reduce((sum, q) => sum + (q.votes || 0), 0);
    
    const categoryStats = questions.reduce((acc, q) => {
      acc[q.category] = (acc[q.category] || 0) + 1;
      return acc;
    }, {});
    
    const responseRate = totalQuestions > 0 ? Math.round((answeredQuestions / totalQuestions) * 100) : 0;
    const avgVotesPerQuestion = totalQuestions > 0 ? Math.round(totalVotes / totalQuestions) : 0;
    
    return {
      totalQuestions,
      answeredQuestions,
      pendingQuestions,
      starredQuestions,
      totalVotes,
      categoryStats,
      responseRate,
      avgVotesPerQuestion
    };
  };

  const analytics = getAnalytics();

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="analytics-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Q&A Analytics</h2>
          <button onClick={onClose}>&times;</button>
        </div>
        
        <div className="analytics-content">
          <div className="analytics-grid">
            <div className="analytics-card">
              <h3>Total Questions</h3>
              <div className="analytics-value">{analytics.totalQuestions}</div>
            </div>
            
            <div className="analytics-card">
              <h3>Response Rate</h3>
              <div className="analytics-value">{analytics.responseRate}%</div>
            </div>
            
            <div className="analytics-card">
              <h3>Total Votes</h3>
              <div className="analytics-value">{analytics.totalVotes}</div>
            </div>
            
            <div className="analytics-card">
              <h3>Avg Votes/Question</h3>
              <div className="analytics-value">{analytics.avgVotesPerQuestion}</div>
            </div>
          </div>
          
          <div className="category-breakdown">
            <h3>Questions by Category</h3>
            <div className="category-stats">
              {Object.entries(analytics.categoryStats).map(([category, count]) => (
                <div key={category} className="category-stat">
                  <span className="category-name">{category}</span>
                  <span className="category-count">{count}</span>
                </div>
              ))}
            </div>
          </div>
          
          <div className="top-questions">
            <h3>Most Popular Questions</h3>
            <div className="popular-questions">
              {questions
                .sort((a, b) => (b.votes || 0) - (a.votes || 0))
                .slice(0, 5)
                .map((question, index) => (
                  <div key={question._id} className="popular-question">
                    <span className="rank">#{index + 1}</span>
                    <span className="question-text">{question.question}</span>
                    <span className="vote-count">{question.votes || 0} votes</span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RealTimeQA;