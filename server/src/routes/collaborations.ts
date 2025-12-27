import express, { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { CollaborationModel, ListModel } from '../db/models';

const router: Router = express.Router();

// Request to collaborate on a list
router.post('/request', authenticate, (req: AuthRequest, res) => {
  try {
    const { listId } = req.body;

    if (!listId) {
      return res.status(400).json({ error: 'List ID is required' });
    }

    const list = ListModel.findById(listId);
    if (!list) {
      return res.status(404).json({ error: 'List not found' });
    }

    if (list.is_public !== 1) {
      return res.status(403).json({ error: 'This list is not public' });
    }

    if (list.user_id === req.userId) {
      return res.status(400).json({ error: 'You cannot request to collaborate on your own list' });
    }

    // Check if already requested
    const existingCollabs = CollaborationModel.findByListId(listId);
    const existing = existingCollabs.find(c => c.user_id === req.userId);

    if (existing) {
      return res.status(400).json({ error: 'Collaboration request already exists' });
    }

    const collabId = CollaborationModel.create(listId, req.userId!);
    const collaboration = CollaborationModel.findById(collabId as number);

    res.status(201).json(collaboration);
  } catch (error) {
    console.error('Error creating collaboration request:', error);
    res.status(500).json({ error: 'Failed to create collaboration request' });
  }
});

// Get collaboration requests for lists owned by user
router.get('/requests', authenticate, (req: AuthRequest, res) => {
  try {
    const userLists = ListModel.findByUserId(req.userId!);
    const allRequests = userLists.flatMap(list => {
      const requests = CollaborationModel.findByListId(list.id);
      return requests.map(r => ({
        ...r,
        listName: list.name
      }));
    });

    res.json(allRequests);
  } catch (error) {
    console.error('Error fetching collaboration requests:', error);
    res.status(500).json({ error: 'Failed to fetch collaboration requests' });
  }
});

// Get user's collaboration requests (sent by user)
router.get('/my-requests', authenticate, (req: AuthRequest, res) => {
  try {
    const requests = CollaborationModel.findByUserId(req.userId!);
    const requestsWithLists = requests.map(r => {
      const list = ListModel.findById(r.list_id);
      return {
        ...r,
        listName: list?.name
      };
    });

    res.json(requestsWithLists);
  } catch (error) {
    console.error('Error fetching user collaboration requests:', error);
    res.status(500).json({ error: 'Failed to fetch collaboration requests' });
  }
});

// Respond to a collaboration request (approve/reject)
router.put('/requests/:id', authenticate, (req: AuthRequest, res) => {
  try {
    const collabId = parseInt(req.params.id);
    const { status } = req.body;

    if (!status || (status !== 'approved' && status !== 'rejected')) {
      return res.status(400).json({ error: 'Status must be either approved or rejected' });
    }

    const collaboration = CollaborationModel.findById(collabId);
    if (!collaboration) {
      return res.status(404).json({ error: 'Collaboration request not found' });
    }

    const list = ListModel.findById(collaboration.list_id);
    if (!list) {
      return res.status(404).json({ error: 'List not found' });
    }

    // Only list owner can approve/reject
    if (list.user_id !== req.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    CollaborationModel.updateStatus(collabId, status);
    const updated = CollaborationModel.findById(collabId);

    res.json(updated);
  } catch (error) {
    console.error('Error updating collaboration request:', error);
    res.status(500).json({ error: 'Failed to update collaboration request' });
  }
});

// Get collaborators for a list
router.get('/list/:listId', authenticate, (req: AuthRequest, res) => {
  try {
    const listId = parseInt(req.params.listId);
    const list = ListModel.findById(listId);

    if (!list) {
      return res.status(404).json({ error: 'List not found' });
    }

    if (list.user_id !== req.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const collaborations = CollaborationModel.findByListId(listId);
    res.json(collaborations);
  } catch (error) {
    console.error('Error fetching collaborators:', error);
    res.status(500).json({ error: 'Failed to fetch collaborators' });
  }
});

export default router;
