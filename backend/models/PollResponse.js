const mongoose = require('mongoose');

const pollResponseSchema = new mongoose.Schema({
  poll: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Poll',
    required: true
  },
  voter: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  event: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: true
  },
  response: {
    // For multiple choice/single choice: array of option indices
    selectedOptions: [Number],
    // For rating: single rating value
    rating: Number,
    // For text: text response
    textResponse: String
  },
  isAnonymous: {
    type: Boolean,
    default: true
  },
  submittedAt: {
    type: Date,
    default: Date.now
  },
  ipAddress: {
    type: String
  }
}, {
  timestamps: true
});

// Compound index to prevent duplicate votes (one vote per user per poll)
pollResponseSchema.index({ poll: 1, voter: 1 }, { unique: true });

// Index for better query performance
pollResponseSchema.index({ poll: 1, submittedAt: 1 });
pollResponseSchema.index({ event: 1, voter: 1 });

// Method to validate response based on poll type
pollResponseSchema.methods.validateResponse = function(pollType, pollOptions, allowMultiple) {
  const response = this.response;
  
  switch (pollType) {
    case 'single_choice':
      return response.selectedOptions && 
             response.selectedOptions.length === 1 && 
             response.selectedOptions[0] >= 0 && 
             response.selectedOptions[0] < pollOptions.length;
             
    case 'multiple_choice':
      if (!response.selectedOptions || response.selectedOptions.length === 0) {
        return false;
      }
      if (!allowMultiple && response.selectedOptions.length > 1) {
        return false;
      }
      return response.selectedOptions.every(index => 
        index >= 0 && index < pollOptions.length
      );
      
    case 'rating':
      return response.rating && 
             response.rating >= 1 && 
             response.rating <= 5;
             
    case 'text':
      return response.textResponse && 
             response.textResponse.trim().length > 0 &&
             response.textResponse.length <= 1000;
             
    default:
      return false;
  }
};

// Static method to get poll statistics
pollResponseSchema.statics.getPollStatistics = async function(pollId) {
  const responses = await this.find({ poll: pollId });
  
  const stats = {
    totalResponses: responses.length,
    uniqueVoters: new Set(responses.map(r => r.voter.toString())).size,
    responsesByOption: {},
    responsesByRating: {},
    averageRating: 0,
    textResponses: []
  };
  
  responses.forEach(response => {
    // Count option selections
    if (response.response.selectedOptions) {
      response.response.selectedOptions.forEach(optionIndex => {
        stats.responsesByOption[optionIndex] = (stats.responsesByOption[optionIndex] || 0) + 1;
      });
    }
    
    // Count rating selections
    if (response.response.rating) {
      stats.responsesByRating[response.response.rating] = 
        (stats.responsesByRating[response.response.rating] || 0) + 1;
    }
    
    // Collect text responses
    if (response.response.textResponse) {
      stats.textResponses.push({
        text: response.response.textResponse,
        submittedAt: response.submittedAt,
        isAnonymous: response.isAnonymous,
        voter: response.isAnonymous ? null : response.voter
      });
    }
  });
  
  // Calculate average rating
  if (Object.keys(stats.responsesByRating).length > 0) {
    const totalRating = Object.entries(stats.responsesByRating)
      .reduce((sum, [rating, count]) => sum + (parseInt(rating) * count), 0);
    const totalRatingResponses = Object.values(stats.responsesByRating)
      .reduce((sum, count) => sum + count, 0);
    stats.averageRating = totalRating / totalRatingResponses;
  }
  
  return stats;
};

module.exports = mongoose.model('PollResponse', pollResponseSchema);