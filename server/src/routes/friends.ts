import express from 'express';
import { FriendModel } from '../db/models';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = express.Router();

// Get all users (directory)
router.get('/directory', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId as number;
    const users = FriendModel.getAllUsers(userId);
    const enriched = users.map(user => ({
      id: user.id,
      username: user.username,
      isFriend: FriendModel.areFriends(userId, user.id),
      hasPendingRequest: FriendModel.hasPendingRequest(userId, user.id)
    }));
    res.json(enriched);
  } catch (error) {
    console.error('Get directory error:', error);
    res.status(500).json({ error: 'Failed to get directory' });
  }
});

// Search users by username
router.get('/search/:username', authenticate, async (req: AuthRequest, res) => {
  try {
    const { username } = req.params;
    const userId = req.userId as number;

    if (!username || username.length < 2) {
      return res.status(400).json({ error: 'Username must be at least 2 characters' });
    }

    const results = FriendModel.searchByUsername(username, userId);
    const enriched = results.map(user => ({
      id: user.id,
      username: user.username,
      isFriend: FriendModel.areFriends(userId, user.id),
      hasPendingRequest: FriendModel.hasPendingRequest(userId, user.id)
    }));

    res.json(enriched);
  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({ error: 'Failed to search users' });
  }
});

// Get user's friends
router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId as number;
    const friends = FriendModel.getFriends(userId);
    res.json(friends);
  } catch (error) {
    console.error('Get friends error:', error);
    res.status(500).json({ error: 'Failed to get friends' });
  }
});

// Send friend request
router.post('/request', authenticate, async (req: AuthRequest, res) => {
  try {
    const { toUserId } = req.body;
    const fromUserId = req.userId as number;

    if (!toUserId) {
      return res.status(400).json({ error: 'toUserId is required' });
    }

    if (fromUserId === toUserId) {
      return res.status(400).json({ error: 'Cannot send friend request to yourself' });
    }

    // Check if already friends
    if (FriendModel.areFriends(fromUserId, toUserId)) {
      return res.status(400).json({ error: 'Already friends' });
    }

    // Check if pending request exists
    if (FriendModel.hasPendingRequest(fromUserId, toUserId)) {
      return res.status(400).json({ error: 'Friend request already sent' });
    }

    const requestId = FriendModel.sendFriendRequest(fromUserId, toUserId);
    res.json({ message: 'Friend request sent', requestId });
  } catch (error) {
    console.error('Send friend request error:', error);
    res.status(500).json({ error: 'Failed to send friend request' });
  }
});

// Get incoming friend requests
router.get('/requests/incoming', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId as number;
    const requests = FriendModel.getFriendRequests(userId);
    res.json(requests);
  } catch (error) {
    console.error('Get friend requests error:', error);
    res.status(500).json({ error: 'Failed to get friend requests' });
  }
});

// Respond to friend request
router.post('/request/:id/respond', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    FriendModel.respondToFriendRequest(parseInt(id), status);
    res.json({ message: `Friend request ${status}` });
  } catch (error) {
    console.error('Respond to friend request error:', error);
    res.status(500).json({ error: 'Failed to respond to friend request' });
  }
});

// Cancel an outgoing friend request (current user -> toUserId)
router.delete('/request/outgoing/:toUserId', authenticate, async (req: AuthRequest, res) => {
  try {
    const fromUserId = req.userId as number;
    const toUserId = parseInt(req.params.toUserId);
    FriendModel.cancelFriendRequest(fromUserId, toUserId);
    res.json({ message: 'Friend request cancelled' });
  } catch (error) {
    console.error('Cancel friend request error:', error);
    res.status(500).json({ error: 'Failed to cancel friend request' });
  }
});

// Remove a friend relationship
router.delete('/:friendId', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId as number;
    const friendId = parseInt(req.params.friendId);
    FriendModel.removeFriend(userId, friendId);
    res.json({ message: 'Friend removed' });
  } catch (error) {
    console.error('Remove friend error:', error);
    res.status(500).json({ error: 'Failed to remove friend' });
  }
});

export default router;
