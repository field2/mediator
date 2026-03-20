import express, { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { UserModel } from '../db/models';
import { authenticate, AuthRequest } from '../middleware/auth';
import db from '../db/database';
import { isValidEmail, normalizeEmail } from '../utils/emailValidation';

const mailer = process.env.SMTP_HOST
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    })
  : nodemailer.createTransport({
      sendmail: true,
      newline: 'unix',
      path: '/usr/sbin/sendmail',
    });

const router: Router = express.Router();

// Register
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const normalizedEmail = normalizeEmail(email);

    if (!username || !normalizedEmail || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (!isValidEmail(normalizedEmail)) {
      return res.status(400).json({ error: 'Please enter a valid email address', field: 'email' });
    }

    // Check if email exists
    const existingUserByEmail = await UserModel.findByEmail(normalizedEmail);
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
    const user = UserModel.create(username, normalizedEmail, passwordHash);

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

    res.json({ token, userId: user.id, username: user.username, email: user.email, isAdmin: user.is_admin === 1 });
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
      signupDate: user.created_at,
      isAdmin: user.is_admin === 1
    });
  } catch (error) {
    console.error('Get /me error:', error);
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});

// Get current user stats
router.get('/me/stats', authenticate, (req: AuthRequest, res) => {
  try {
    const userId = req.userId as number;
    const mediaStmt = db.prepare(`
      SELECT mi.media_type, COUNT(*) as count
      FROM media_items mi
      JOIN lists l ON mi.list_id = l.id
      WHERE l.user_id = ?
      GROUP BY mi.media_type
    `);
    const mediaCounts = mediaStmt.all(userId) as { media_type: string; count: number }[];
    const counts: Record<string, number> = { movie: 0, book: 0, album: 0 };
    for (const row of mediaCounts) counts[row.media_type] = row.count;

    const friendsStmt = db.prepare(
      'SELECT COUNT(*) as count FROM friends WHERE user_id_1 = ? OR user_id_2 = ?'
    );
    const { count: friendsCount } = friendsStmt.get(userId, userId) as { count: number };

    res.json({
      movies: counts.movie,
      books: counts.book,
      albums: counts.album,
      friends: friendsCount,
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// Forgot password
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    const identifier = (email || '').trim();

    if (!identifier) {
      return res.status(400).json({ error: 'Email or username is required' });
    }

    // Look up by email or username
    let user = isValidEmail(normalizeEmail(identifier))
      ? await UserModel.findByEmail(normalizeEmail(identifier))
      : null;
    if (!user) {
      user = await UserModel.findByUsername(identifier);
    }

    if (!user) {
      // Don't reveal whether the account exists
      return res.json({ message: 'If that account exists, a password reset link has been sent' });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 3600000).toISOString(); // 1 hour

    UserModel.setResetToken(user.email, resetToken, expires);

    const siteUrl = process.env.SITE_URL || 'https://mediator.field2.com';
    const resetLink = `${siteUrl}/auth?mode=reset&token=${resetToken}`;

    try {
      await mailer.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: user.email,
        subject: 'Mediator — password reset',
        text: `Hi ${user.username},\n\nClick the link below to reset your password (expires in 1 hour):\n\n${resetLink}\n\nIf you didn't request this, you can ignore this email.`,
        html: `<p>Hi ${user.username},</p><p>Click the link below to reset your password (expires in 1 hour):</p><p><a href="${resetLink}">${resetLink}</a></p><p>If you didn't request this, you can ignore this email.</p>`,
      });
    } catch (mailErr) {
      console.error('Failed to send reset email:', mailErr);
      return res.status(500).json({ error: 'Failed to send reset email' });
    }

    res.json({ message: 'If that account exists, a password reset link has been sent' });
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
