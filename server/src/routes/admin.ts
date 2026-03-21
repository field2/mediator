import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { UserModel } from '../db/models';
import db from '../db/database';

const router = Router();

const requireAdmin = (req: AuthRequest, res: Response, next: () => void) => {
  const user = UserModel.findById(req.userId!);
  if (!user?.is_admin) return res.status(403).json({ error: 'Forbidden' });
  next();
};

// Get all users with media count
router.get('/users', authenticate, requireAdmin as any, (req: AuthRequest, res: Response) => {
  try {
    const stmt = db.prepare(`
      SELECT u.id, u.username, u.email, u.created_at, u.is_admin,
        COUNT(DISTINCT mi.id) as media_count
      FROM users u
      LEFT JOIN media_items mi ON mi.added_by = u.id
      GROUP BY u.id
      ORDER BY u.username
    `);
    res.json(stmt.all());
  } catch (error) {
    console.error('Admin get users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Delete a user
router.delete('/users/:id', authenticate, requireAdmin as any, (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid user id' });
    if (id === req.userId) return res.status(400).json({ error: 'Cannot delete yourself' });
    const user = UserModel.findById(id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    UserModel.delete(id);
    res.json({ success: true });
  } catch (error) {
    console.error('Admin delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

export default router;
