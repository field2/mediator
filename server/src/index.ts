import dotenv from 'dotenv';

// Load environment variables FIRST before any other imports
dotenv.config();

import express from 'express';
import cors from 'cors';
import path from 'path';
import { initializeDatabase } from './db/database';
import authRoutes from './routes/auth';
import searchRoutes from './routes/search';
import listsRoutes from './routes/lists';
import collaborationsRoutes from './routes/collaborations';
import friendsRoutes from './routes/friends';

const app = express();
const PORT = process.env.PORT || 3001;
const isProduction = process.env.NODE_ENV === 'production';

// Initialize database
initializeDatabase();

// Middleware
app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/lists', listsRoutes);
app.use('/api/collaborations', collaborationsRoutes);
app.use('/api/friends', friendsRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Mediator API is running' });
});

// Serve static files in production
if (isProduction) {
  app.use(express.static(path.join(__dirname, '../public')));

  // Serve React app for all non-API routes
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  if (isProduction) {
    console.log('Serving static files from production build');
  }
});
