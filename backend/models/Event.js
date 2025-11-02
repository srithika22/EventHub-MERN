const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  date: { type: Date, required: true },
  endDate: { type: Date }, // For multi-day events
  location: { type: String, trim: true },
  imageUrl: { type: String },
  category: { type: String, trim: true },
  status: {
    type: String,
    enum: ['draft', 'published', 'live', 'completed', 'cancelled'],
    default: 'draft',
  },
  eventType: {
    type: String,
    enum: ['single-day', 'multi-day', 'conference', 'workshop', 'seminar', 'webinar'],
    default: 'single-day'
  },
  totalTicketsSold: {
    type: Number,
    default: 0
  },
  organizer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  ticketTypes: [
    {
      name: { type: String, required: true },
      price: { type: Number, required: true },
      capacity: { type: Number, required: true },
      ticketsSold: { type: Number, default: 0 },
      description: { type: String },
      earlyBird: { type: Boolean, default: false },
      earlyBirdEnds: { type: Date },
      saleEnds: { type: Date },
    }
  ],
  virtualEvent: { type: Boolean, default: false },
  meetingLink: { type: String },
  additionalInfo: { type: String },
  providesCertificate: { type: Boolean, default: false },
  ageRestriction: { type: String, default: 'all' },
  customAgeLimit: { type: String },
  accessibility: {
    wheelchairAccessible: { type: Boolean, default: false },
    assistiveListeningDevices: { type: Boolean, default: false },
    signLanguageInterpreter: { type: Boolean, default: false }
  },
  socialSharing: { type: Boolean, default: true },
  faq: [
    {
      question: { type: String },
      answer: { type: String }
    }
  ],
  // Advanced Event Features
  agenda: {
    enabled: { type: Boolean, default: false },
    allowCustomSchedule: { type: Boolean, default: true },
    sessions: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Session'
    }]
  },
  speakers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Speaker'
  }],
  // AI generated images and certificate configuration
  aiGeneratedImages: [{ type: String }],
  certificateSettings: {
    enabled: { type: Boolean, default: false },
    template: { type: String, default: 'standard' },
    issuer: { type: String, default: '' }
  },
  livestream: {
    enabled: { type: Boolean, default: false },
    platform: {
      type: String,
      enum: ['youtube', 'zoom', 'teams', 'custom', 'none'],
      default: 'none'
    },
    url: { type: String, trim: true },
    recordingEnabled: { type: Boolean, default: false },
    chatEnabled: { type: Boolean, default: true }
  },
  hybrid: {
    isHybrid: { type: Boolean, default: false },
    inPersonCapacity: { type: Number, default: 0 },
    virtualCapacity: { type: Number, default: 0 },
    hybridTicketTypes: {
      inPerson: { type: Boolean, default: true },
      virtual: { type: Boolean, default: false },
      hybrid: { type: Boolean, default: false }
    }
  },
  venue: {
    name: { type: String, trim: true },
    address: {
      street: { type: String, trim: true },
      city: { type: String, trim: true },
      state: { type: String, trim: true },
      zipCode: { type: String, trim: true },
      country: { type: String, trim: true }
    },
    coordinates: {
      latitude: { type: Number },
      longitude: { type: Number }
    },
    facilities: [{
      type: String,
      enum: ['wifi', 'parking', 'catering', 'av_equipment', 'accessibility', 'security']
    }],
    rooms: [{
      name: { type: String, trim: true },
      capacity: { type: Number },
      features: [{ type: String }]
    }]
  },
  pricing: {
    currency: { type: String, default: 'USD' },
    earlyBirdDiscount: {
      enabled: { type: Boolean, default: false },
      percentage: { type: Number, default: 0 },
      endDate: { type: Date }
    },
    groupDiscount: {
      enabled: { type: Boolean, default: false },
      minQuantity: { type: Number, default: 5 },
      percentage: { type: Number, default: 10 }
    },
    promoCodes: [{
      code: { type: String, trim: true },
      discount: { type: Number },
      isPercentage: { type: Boolean, default: true },
      maxUses: { type: Number },
      usedCount: { type: Number, default: 0 },
      validUntil: { type: Date },
      isActive: { type: Boolean, default: true }
    }]
  },
  engagement: {
    networkingEnabled: { type: Boolean, default: true },
    qaEnabled: { type: Boolean, default: true },
    pollingEnabled: { type: Boolean, default: true },
    businessCardsEnabled: { type: Boolean, default: true },
    forumEnabled: { type: Boolean, default: true },
    gamificationEnabled: { type: Boolean, default: false },
    liveStreamChat: { type: Boolean, default: false }
  },
  requirements: {
    ageRestriction: { type: String, default: 'all' },
    skillLevel: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced', 'all'],
      default: 'all'
    },
    prerequisites: [{ type: String, trim: true }],
    equipmentNeeded: [{ type: String, trim: true }]
  },
  analytics: {
    totalViews: { type: Number, default: 0 },
    totalRegistrations: { type: Number, default: 0 },
    totalRevenue: { type: Number, default: 0 },
    engagementScore: { type: Number, default: 0 },
    attendanceRate: { type: Number, default: 0 },
    satisfactionScore: { type: Number, default: 0 }
  }
}, { timestamps: true });

module.exports = mongoose.model('Event', eventSchema);