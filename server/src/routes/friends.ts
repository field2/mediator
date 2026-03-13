import express from 'express';
import { FriendModel, RecommendationModel, ListModel, MediaItemModel, UserModel } from '../db/models';
import { authenticate, AuthRequest } from '../middleware/auth';
import db from '../db/database';

const router = express.Router();

const buildRecommendationAdditionalData = (
  rawAdditionalData: string | null,
  recommendation: {
    id: number;
    from_user_id: number;
    media_type: 'movie' | 'book' | 'album';
    title: string;
  },
  fromUsername: string
) => {
  let parsedAdditionalData: unknown = undefined;

  if (rawAdditionalData) {
    try {
      parsedAdditionalData = JSON.parse(rawAdditionalData);
    } catch {
      parsedAdditionalData = rawAdditionalData;
    }
  }

  const recommendationMetadata = {
    id: recommendation.id,
    fromUserId: recommendation.from_user_id,
    fromUsername,
    mediaType: recommendation.media_type,
    title: recommendation.title,
  };

  if (
    parsedAdditionalData &&
    typeof parsedAdditionalData === 'object' &&
    !Array.isArray(parsedAdditionalData)
  ) {
    return {
      ...parsedAdditionalData,
      _mediatorRecommendation: recommendationMetadata,
    };
  }

  return {
    _mediatorRecommendation: recommendationMetadata,
    _sourceData: parsedAdditionalData ?? null,
  };
};

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

// Send a media recommendation to a friend
router.post('/recommend', authenticate, async (req: AuthRequest, res) => {
  try {
    const fromUserId = req.userId as number;
    const {
      toUserId,
      mediaType,
      externalId,
      title,
      year,
      posterUrl,
      additionalData
    } = req.body;

    if (!toUserId || !mediaType || !externalId || !title) {
      return res.status(400).json({ error: 'toUserId, mediaType, externalId, and title are required' });
    }

    if (!['movie', 'book', 'album'].includes(mediaType)) {
      return res.status(400).json({ error: 'Invalid mediaType' });
    }

    if (fromUserId === toUserId) {
      return res.status(400).json({ error: 'Cannot recommend media to yourself' });
    }

    if (!FriendModel.areFriends(fromUserId, toUserId)) {
      return res.status(403).json({ error: 'You can only recommend media to friends' });
    }

    if (RecommendationModel.hasPendingRecommendation(fromUserId, toUserId, externalId)) {
      return res.status(400).json({ error: 'Recommendation already pending for this friend' });
    }

    const recommendationId = RecommendationModel.create(
      fromUserId,
      toUserId,
      mediaType,
      externalId,
      title,
      year,
      posterUrl,
      additionalData
    );

    res.json({ message: 'Recommendation sent', recommendationId });
  } catch (error) {
    console.error('Send recommendation error:', error);
    res.status(500).json({ error: 'Failed to send recommendation' });
  }
});

// Get incoming media recommendations
router.get('/recommendations/incoming', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId as number;
    const recommendations = RecommendationModel.getIncomingRecommendations(userId);
    res.json(recommendations);
  } catch (error) {
    console.error('Get incoming recommendations error:', error);
    res.status(500).json({ error: 'Failed to get recommendations' });
  }
});

// Respond to recommendation (approve/deny)
router.post('/recommendations/:id/respond', authenticate, async (req: AuthRequest, res) => {
  try {
    const recommendationId = parseInt(req.params.id);
    const toUserId = req.userId as number;
    const { status } = req.body as { status?: 'approved' | 'rejected' };

    if (!['approved', 'rejected'].includes(status || '')) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const recommendation = RecommendationModel.respondToRecommendation(
      recommendationId,
      toUserId,
      status as 'approved' | 'rejected'
    );

    if (!recommendation) {
      return res.status(404).json({ error: 'Recommendation not found' });
    }

		const fromUsername = UserModel.findById(recommendation.from_user_id)?.username || 'Friend';

    if (status === 'approved') {
      const listName = `My ${recommendation.media_type.charAt(0).toUpperCase() + recommendation.media_type.slice(1)}s`;

      let autoList = ListModel.findByUserId(toUserId).find((list) => list.name === listName);
      if (!autoList) {
        const listId = ListModel.create(
          listName,
          toUserId,
          `Auto-generated list for ${recommendation.media_type}s`,
          false
        );
        autoList = ListModel.findById(listId as number);
      }

      if (autoList) {
        const existingItem = MediaItemModel.findByListIdAndExternalId(
          autoList.id,
          recommendation.external_id
        );

        if (!existingItem) {
          const additionalDataWithRecommendation = buildRecommendationAdditionalData(
				recommendation.additional_data,
				recommendation,
				fromUsername
			);

          MediaItemModel.create(
            autoList.id,
            recommendation.media_type,
            recommendation.external_id,
            recommendation.title,
            toUserId,
            recommendation.year || undefined,
            recommendation.poster_url || undefined,
            additionalDataWithRecommendation
          );
        }
      }
    }

    res.json({ message: `Recommendation ${status}` });
  } catch (error) {
    console.error('Respond to recommendation error:', error);
    res.status(500).json({ error: 'Failed to respond to recommendation' });
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
// Get outgoing friend requests (sent by current user)
router.get('/requests/outgoing', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId as number;
    const stmt = db.prepare(`
      SELECT fr.id, fr.to_user_id as from_user_id, u.username, u.email, fr.requested_at, fr.status
      FROM friend_requests fr
      JOIN users u ON fr.to_user_id = u.id
      WHERE fr.from_user_id = ?
      ORDER BY fr.requested_at DESC
    `);
    const requests = stmt.all(userId) as any[];
    res.json(requests);
  } catch (error) {
    console.error('Get outgoing friend requests error:', error);
    res.status(500).json({ error: 'Failed to get outgoing friend requests' });
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
