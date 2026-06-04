const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;

exports.register = async (req, res, next) => {
  try {
    const { email, password, role } = req.body;
    
    if (!email || !email.includes('@')) {
      return res.status(400).json({ success: false, message: 'Please provide a valid email address.' });
    }
    if (!password || password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long.' });
    }

    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ success: false, message: 'An account with this email already exists.' });
    }

    const assignedRole = ['admin','mentor'].includes(role) ? role : 'user';

    user = new User({ email, password, role: assignedRole, username: email?.split('@')[0], fullName: '' });
    await user.save();

    const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ success: true, token, user: { id: user._id, email: user.email, role: user.role } });
  } catch (err) {
    next(err);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    console.log(`[LOGIN] Attempting login for email: ${email}`);
    
    if (!email || !password) {
      console.log(`[LOGIN] Missing email or password`);
      return res.status(400).json({ success: false, message: 'Please provide both email and password.' });
    }

    const user = await User.findOne({ email });
    console.log(`[LOGIN] User lookup result:`, user ? `Found (Role: ${user.role})` : 'Not Found');
    
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const isMatch = await user.matchPassword(password);
    console.log(`[LOGIN] Password match result: ${isMatch}`);
    
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    console.log(`[LOGIN] Generating JWT token...`);
    const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    const isBanned = !!(user.bannedUntil && user.bannedUntil > Date.now());
    
    console.log(`[LOGIN] Login successful for: ${email}`);
    res.json({ success: true, token, user: { id: user._id, email: user.email, role: user.role, reputation: user.reputation, spurtiPoints: user.spurtiPoints, isBanned, username: user.username, fullName: user.fullName } });
  } catch (err) {
    console.error(`[LOGIN ERROR]:`, err);
    next(err);
  }
};

exports.me = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }
    const isBanned = !!(user.bannedUntil && user.bannedUntil > Date.now());
    res.json({ success: true, user: { ...user.toObject(), isBanned } });
  } catch (err) {
    next(err);
  }
};
