import express, { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { ListModel, MediaItemModel, RatingModel, CollaborationModel } from '../db/models';

const router: Router = express.Router();

// Get all lists for authenticated user
router.get('/', authenticate, (req: AuthRequest, res) => {
  try {
    const lists = ListModel.findByUserId(req.userId!);
    res.json(lists);
  } catch (error) {
    console.error('Error fetching lists:', error);
    res.status(500).json({ error: 'Failed to fetch lists' });
  }
});

// Get public lists
router.get('/public', (req, res) => {
  try {
    const lists = ListModel.findPublicLists();
    res.json(lists);
  } catch (error) {
    console.error('Error fetching public lists:', error);
    res.status(500).json({ error: 'Failed to fetch public lists' });
  }
});

// Get or create auto-generated list for a media type
router.post('/auto', authenticate, (req: AuthRequest, res) => {
  try {
    const { mediaType } = req.body;

    if (!mediaType || !['movie', 'book', 'album'].includes(mediaType)) {
      return res.status(400).json({ error: 'Valid mediaType is required (movie, book, or album)' });
    }

    const listName = `My ${mediaType.charAt(0).toUpperCase() + mediaType.slice(1)}s`;

    // Check if auto-list already exists
    const existingLists = ListModel.findByUserId(req.userId!);
    let autoList = existingLists.find((list) => list.name === listName);

    // If not exists, create it
    if (!autoList) {
      const listId = ListModel.create(listName, req.userId!, `Auto-generated list for ${mediaType}s`, false);
      autoList = ListModel.findById(listId as number);
    }

    res.json(autoList);
  } catch (error) {
    console.error('Error getting/creating auto list:', error);
    res.status(500).json({ error: 'Failed to get or create auto list' });
  }
});

// Create a new list
router.post('/', authenticate, (req: AuthRequest, res) => {
  try {
    const { name, description, isPublic } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'List name is required' });
    }

    const listId = ListModel.create(name, req.userId!, description, isPublic !== false);
    const list = ListModel.findById(listId as number);

    res.status(201).json(list);
  } catch (error) {
    console.error('Error creating list:', error);
    res.status(500).json({ error: 'Failed to create list' });
  }
});

// Get a specific list with its media items
router.get('/:id', authenticate, (req: AuthRequest, res) => {
  try {
    const listId = parseInt(req.params.id);
    const list = ListModel.findById(listId);

    if (!list) {
      return res.status(404).json({ error: 'List not found' });
    }

    // Check if user has access
    const isOwner = list.user_id === req.userId;
    const isCollaborator = CollaborationModel.isCollaborator(listId, req.userId!);
    const isPublic = list.is_public === 1;

    if (!isOwner && !isCollaborator && !isPublic) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const mediaItems = MediaItemModel.findByListId(listId);

    // Get ratings for each media item
    const itemsWithRatings = mediaItems.map(item => {
      const ratings = RatingModel.findByMediaItemId(item.id);
      const avgRating = RatingModel.getAverageRating(item.id);
      const userRating = RatingModel.findByUserAndMediaItem(item.id, req.userId!);

      return {
        ...item,
        ratings,
        averageRating: avgRating,
        userRating: userRating?.rating
      };
    });

    res.json({
      ...list,
      mediaItems: itemsWithRatings,
      isOwner,
      isCollaborator
    });
  } catch (error) {
    console.error('Error fetching list:', error);
    res.status(500).json({ error: 'Failed to fetch list' });
  }
});

// Update a list
router.put('/:id', authenticate, (req: AuthRequest, res) => {
  try {
    const listId = parseInt(req.params.id);
    const list = ListModel.findById(listId);

    if (!list) {
      return res.status(404).json({ error: 'List not found' });
    }

    if (list.user_id !== req.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { name, description, isPublic } = req.body;
    ListModel.update(listId, name, description, isPublic);

    const updatedList = ListModel.findById(listId);
    res.json(updatedList);
  } catch (error) {
    console.error('Error updating list:', error);
    res.status(500).json({ error: 'Failed to update list' });
  }
});

// Delete a list
router.delete('/:id', authenticate, (req: AuthRequest, res) => {
  try {
    const listId = parseInt(req.params.id);
    const list = ListModel.findById(listId);

    if (!list) {
      return res.status(404).json({ error: 'List not found' });
    }

    if (list.user_id !== req.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    ListModel.delete(listId);
    res.json({ message: 'List deleted successfully' });
  } catch (error) {
    console.error('Error deleting list:', error);
    res.status(500).json({ error: 'Failed to delete list' });
  }
});

// Add media item to a list
router.post('/:id/media', authenticate, (req: AuthRequest, res) => {
  try {
    const listId = parseInt(req.params.id);
    const list = ListModel.findById(listId);

    if (!list) {
      return res.status(404).json({ error: 'List not found' });
    }

    // Check if user can add to this list
    const isOwner = list.user_id === req.userId;
    const isCollaborator = CollaborationModel.isCollaborator(listId, req.userId!);

    if (!isOwner && !isCollaborator) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { mediaType, externalId, title, year, posterUrl, additionalData } = req.body;

    if (!mediaType || !externalId || !title) {
      return res.status(400).json({ error: 'Media type, external ID, and title are required' });
    }

    const mediaItemId = MediaItemModel.create(
      listId,
      mediaType,
      externalId,
      title,
      req.userId!,
      year,
      posterUrl,
      additionalData
    );

    const mediaItem = MediaItemModel.findById(mediaItemId as number);
    res.status(201).json(mediaItem);
  } catch (error) {
    console.error('Error adding media item:', error);
    res.status(500).json({ error: 'Failed to add media item' });
  }
});

// Rate a media item
router.post('/:listId/media/:mediaId/rate', authenticate, (req: AuthRequest, res) => {
  try {
    const mediaId = parseInt(req.params.mediaId);
    const { rating } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    const mediaItem = MediaItemModel.findById(mediaId);
    if (!mediaItem) {
      return res.status(404).json({ error: 'Media item not found' });
    }

    // Check access
    const list = ListModel.findById(mediaItem.list_id);
    if (!list) {
      return res.status(404).json({ error: 'List not found' });
    }

    const isOwner = list.user_id === req.userId;
    const isCollaborator = CollaborationModel.isCollaborator(list.id, req.userId!);
    const isPublic = list.is_public === 1;

    if (!isOwner && !isCollaborator && !isPublic) {
      return res.status(403).json({ error: 'Access denied' });
    }

    RatingModel.createOrUpdate(mediaId, req.userId!, rating);
    const avgRating = RatingModel.getAverageRating(mediaId);

    res.json({ message: 'Rating saved', averageRating: avgRating });
  } catch (error) {
    console.error('Error rating media item:', error);
    res.status(500).json({ error: 'Failed to rate media item' });
  }
});

// Delete media item from a list
router.delete('/:listId/media/:mediaId', authenticate, (req: AuthRequest, res) => {
  try {
    const mediaId = parseInt(req.params.mediaId);
    const mediaItem = MediaItemModel.findById(mediaId);

    if (!mediaItem) {
      return res.status(404).json({ error: 'Media item not found' });
    }

    const list = ListModel.findById(mediaItem.list_id);
    if (!list) {
      return res.status(404).json({ error: 'List not found' });
    }

    // Only owner can delete items
    if (list.user_id !== req.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    MediaItemModel.delete(mediaId);
    res.json({ message: 'Media item deleted successfully' });
  } catch (error) {
    console.error('Error deleting media item:', error);
    res.status(500).json({ error: 'Failed to delete media item' });
  }
});

export default router;
