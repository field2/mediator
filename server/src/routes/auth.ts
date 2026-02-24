import express, { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { UserModel } from '../db/models';

const router: Router = express.Router();

// Register
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Check if email exists
    const existingUserByEmail = await UserModel.findByEmail(email);
    if (existingUserByEmail) {
      return res.status(400).json({ error: 'Email already exists', field: 'email' });
    }

    // Check if username exists
    const existingUserByUsername = await UserModel.findByUsername(username);
    if (existingUserByUsername) {
      return res.status(400).json({ error: 'Username already exists', field: 'username' });
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
      payload = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as { userId: number };
    } catch {
      return res.status(401).json({ error: 'Invalid token' });
    }
    const user = await UserModel.findById(payload.userId);
    if (!user) return res.status(401).json({ error: 'User not found' });
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

// Forgot password
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const user = await UserModel.findByEmail(email);
    if (!user) {
      // Don't reveal if email exists or not for security
      return res.json({ message: 'If that email exists, a password reset link has been sent' });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 3600000).toISOString(); // 1 hour from now

    UserModel.setResetToken(email, resetToken, expires);

    // For now, just log the token (in production, send via email)
    console.log(`Password reset token for ${email}: ${resetToken}`);
    console.log(`Reset link: http://localhost:3000/reset-password?token=${resetToken}`);

    res.json({ message: 'If that email exists, a password reset link has been sent', token: resetToken });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Failed to process request' });
  }
});

// Reset password
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({ error: 'Token and password are required' });
    }

    const user = await UserModel.findByResetToken(token);
    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    // Check if token is expired
    if (user.reset_token_expires && new Date(user.reset_token_expires) < new Date()) {
      return res.status(400).json({ error: 'Reset token has expired' });
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(password, 10);
    UserModel.updatePassword(user.id, passwordHash);

    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

export default router;
