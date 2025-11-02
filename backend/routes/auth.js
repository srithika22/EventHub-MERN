const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User'); // Import the Mongoose User model
const authMiddleware = require('../middleware/auth'); // Import auth middleware

// === REGISTRATION ENDPOINT (with Database) ===
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    // Use Mongoose to check if user exists in the database
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User with this email already exists.' });
    }

    // Create a new user with the Mongoose model
    const user = new User({ name, email, password, role });
    // This will trigger the password hashing pre-save hook in your User.js model
    await user.save();

    res.status(201).json({ message: 'User registered successfully!' });

  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// === LOGIN ENDPOINT (with Database) ===
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Use Mongoose to find the user in the database
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials.' });
    }

    // Use the method from our User.js model to compare hashed passwords
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials.' });
    }

    // If credentials are correct, create a JWT
    const payload = { id: user._id, name: user.name, role: user.role };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1d' });

    res.status(200).json({
      success: true,
      token: `Bearer ${token}`,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });

  } catch (error) {
    console.error("Login route crashed:", error); 
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// === GET PROFILE ENDPOINT ===
router.get('/profile', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone || '',
      bio: user.bio || '',
      organization: user.organization || '',
      website: user.website || '',
      preferences: user.preferences || {
        emailNotifications: true,
        smsNotifications: false,
        marketingEmails: true,
        eventReminders: true,
        participantUpdates: true
      },
      security: user.security || {
        twoFactorAuth: false,
        loginAlerts: true,
        passwordLastChanged: user.updatedAt
      },
      organizationDetails: user.organizationDetails || {
        name: '',
        type: 'company',
        address: '',
        taxId: '',
        website: ''
      }
    });

  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// === UPDATE PROFILE ENDPOINT ===
router.put('/update-profile', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const updates = req.body;

    // Find the user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update different sections based on what's provided
    if (updates.profile) {
      user.name = updates.profile.name || user.name;
      user.email = updates.profile.email || user.email;
      user.phone = updates.profile.phone || user.phone;
      user.bio = updates.profile.bio || user.bio;
      user.organization = updates.profile.organization || user.organization;
      user.website = updates.profile.website || user.website;
    }

    if (updates.notifications) {
      user.preferences = {
        ...user.preferences,
        ...updates.notifications
      };
    }

    if (updates.security) {
      user.security = {
        ...user.security,
        ...updates.security
      };
    }

    if (updates.organization) {
      user.organizationDetails = {
        ...user.organizationDetails,
        ...updates.organization
      };
    }

    await user.save();

    res.json({
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;