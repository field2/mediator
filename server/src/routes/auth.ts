import express, { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { UserModel } from '../db/models';

const router: Router = express.Router();

// Register
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Check if user exists
    const existingUser = await UserModel.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const user = UserModel.create(username, email, passwordHash);

    // Generate token
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET || 'fallback-secret', { expiresIn: '7d' });

    res.status(201).json({ token, userId: user.id, username: user.username, email: user.email, signupDate: user.created_at });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    console.log('Login request body:', req.body);
    const { email, username, password, identifier } = req.body;
    // identifier can be email or username
    const loginId = identifier || email || username;
    if (!loginId || !password) {
      console.error('Missing loginId or password', { loginId, password });
      return res.status(400).json({ error: 'Email/username and password are required' });
    }

    // Find user by email or username
    let user = await UserModel.findByEmail(loginId);
    if (!user) {
      user = await UserModel.findByUsername(loginId);
    }
    if (!user) {
      console.error('User not found for loginId:', loginId);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check password
    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      console.error('Invalid password for user:', user.id);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate token
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET || 'fallback-secret', { expiresIn: '7d' });

    res.json({ token, userId: user.id, username: user.username, email: user.email });
  } catch (error) {
    console.error('Login error:', error, 'Request body:', req.body);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Get current user profile
router.get('/me', async (req, res) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid token' });
    }
    const token = authHeader.split(' ')[1];
    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
    } catch {
      return res.status(401).json({ error: 'Invalid token' });
    }
    const user = await UserModel.findById(payload.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({
      userId: user.id,
      username: user.username,
      email: user.email,
      signupDate: user.created_at
    });
  } catch (error) {
    console.error('Get /me error:', error);
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});

export default router;
