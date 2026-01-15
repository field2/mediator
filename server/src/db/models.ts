import db from './database';

export interface User {
  id: number;
  username: string;
  email: string;
  password_hash: string;
  reset_token: string | null;
  reset_token_expires: string | null;
  created_at: string;
}

export interface List {
  id: number;
  name: string;
  description: string | null;
  user_id: number;
  is_public: number;
  created_at: string;
}

export interface MediaItem {
  id: number;
  list_id: number;
  media_type: 'movie' | 'book' | 'album';
  external_id: string;
  title: string;
  year: string | null;
  poster_url: string | null;
  additional_data: string | null;
  added_by: number;
  added_at: string;
}

export interface Rating {
  id: number;
  media_item_id: number;
  user_id: number;
  rating: number;
  created_at: string;
  updated_at: string;
}

export interface Collaboration {
  id: number;
  list_id: number;
  user_id: number;
  status: 'pending' | 'approved' | 'rejected';
  requested_at: string;
  responded_at: string | null;
}

// User operations
export const UserModel = {
  create: (username: string, email: string, passwordHash: string) => {
    const stmt = db.prepare('INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)');
    const result = stmt.run(username, email, passwordHash);
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid) as User;
    return user;
  },

  findByEmail: (email: string): User | undefined => {
    const stmt = db.prepare('SELECT * FROM users WHERE email = ?');
    return stmt.get(email) as User | undefined;
  },

  findByUsername: (username: string): User | undefined => {
    const stmt = db.prepare('SELECT * FROM users WHERE username = ?');
    return stmt.get(username) as User | undefined;
  },

  findById: (id: number): User | undefined => {
    const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
    return stmt.get(id) as User | undefined;
  },

  setResetToken: (email: string, token: string, expires: string) => {
    const stmt = db.prepare('UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE email = ?');
    stmt.run(token, expires, email);
  },

  findByResetToken: (token: string): User | undefined => {
    const stmt = db.prepare('SELECT * FROM users WHERE reset_token = ?');
    return stmt.get(token) as User | undefined;
  },

  updatePassword: (userId: number, passwordHash: string) => {
    const stmt = db.prepare('UPDATE users SET password_hash = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?');
    stmt.run(passwordHash, userId);
  }
};

// List operations
export const ListModel = {
  create: (name: string, userId: number, description?: string, isPublic: boolean = true) => {
    const stmt = db.prepare('INSERT INTO lists (name, description, user_id, is_public) VALUES (?, ?, ?, ?)');
    const result = stmt.run(name, description || null, userId, isPublic ? 1 : 0);
    return result.lastInsertRowid;
  },

  findById: (id: number): List | undefined => {
    const stmt = db.prepare('SELECT * FROM lists WHERE id = ?');
    return stmt.get(id) as List | undefined;
  },

  findByUserId: (userId: number): List[] => {
    const stmt = db.prepare('SELECT * FROM lists WHERE user_id = ? ORDER BY created_at DESC');
    return stmt.all(userId) as List[];
  },

  findPublicLists: (): List[] => {
    const stmt = db.prepare('SELECT * FROM lists WHERE is_public = 1 ORDER BY created_at DESC');
    return stmt.all() as List[];
  },

  update: (id: number, name: string, description: string, isPublic: boolean) => {
    const stmt = db.prepare('UPDATE lists SET name = ?, description = ?, is_public = ? WHERE id = ?');
    return stmt.run(name, description, isPublic ? 1 : 0, id);
  },

  delete: (id: number) => {
    const stmt = db.prepare('DELETE FROM lists WHERE id = ?');
    return stmt.run(id);
  }
};

// Media item operations
export const MediaItemModel = {
  create: (listId: number, mediaType: string, externalId: string, title: string, addedBy: number, year?: string, posterUrl?: string, additionalData?: any) => {
    const stmt = db.prepare('INSERT INTO media_items (list_id, media_type, external_id, title, year, poster_url, additional_data, added_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
    const result = stmt.run(listId, mediaType, externalId, title, year || null, posterUrl || null, additionalData ? JSON.stringify(additionalData) : null, addedBy);
    return result.lastInsertRowid;
  },

  findById: (id: number): MediaItem | undefined => {
    const stmt = db.prepare('SELECT * FROM media_items WHERE id = ?');
    return stmt.get(id) as MediaItem | undefined;
  },

  findByListId: (listId: number): MediaItem[] => {
    const stmt = db.prepare('SELECT * FROM media_items WHERE list_id = ? ORDER BY added_at DESC');
    return stmt.all(listId) as MediaItem[];
  },

  findByListIdAndType: (listId: number, mediaType: string): MediaItem[] => {
    const stmt = db.prepare('SELECT * FROM media_items WHERE list_id = ? AND media_type = ? ORDER BY added_at DESC');
    return stmt.all(listId, mediaType) as MediaItem[];
  },

  findByListIdAndExternalId: (listId: number, externalId: string): MediaItem | undefined => {
    const stmt = db.prepare('SELECT * FROM media_items WHERE list_id = ? AND external_id = ?');
    return stmt.get(listId, externalId) as MediaItem | undefined;
  },

  delete: (id: number) => {
    const stmt = db.prepare('DELETE FROM media_items WHERE id = ?');
    return stmt.run(id);
  }
};

// Rating operations
export const RatingModel = {
  createOrUpdate: (mediaItemId: number, userId: number, rating: number) => {
    const stmt = db.prepare(`
      INSERT INTO ratings (media_item_id, user_id, rating)
      VALUES (?, ?, ?)
      ON CONFLICT(media_item_id, user_id)
      DO UPDATE SET rating = ?, updated_at = CURRENT_TIMESTAMP
    `);
    const result = stmt.run(mediaItemId, userId, rating, rating);
    return result.lastInsertRowid;
  },

  findByMediaItemId: (mediaItemId: number): Rating[] => {
    const stmt = db.prepare('SELECT * FROM ratings WHERE media_item_id = ?');
    return stmt.all(mediaItemId) as Rating[];
  },

  findByUserAndMediaItem: (mediaItemId: number, userId: number): Rating | undefined => {
    const stmt = db.prepare('SELECT * FROM ratings WHERE media_item_id = ? AND user_id = ?');
    return stmt.get(mediaItemId, userId) as Rating | undefined;
  },

  getAverageRating: (mediaItemId: number): number | null => {
    const stmt = db.prepare('SELECT AVG(rating) as avg_rating FROM ratings WHERE media_item_id = ?');
    const result = stmt.get(mediaItemId) as { avg_rating: number | null };
    return result.avg_rating;
  }
};

// Collaboration operations
export const CollaborationModel = {
  create: (listId: number, userId: number) => {
    const stmt = db.prepare('INSERT INTO collaborations (list_id, user_id, status) VALUES (?, ?, ?)');
    const result = stmt.run(listId, userId, 'pending');
    return result.lastInsertRowid;
  },

  findById: (id: number): Collaboration | undefined => {
    const stmt = db.prepare('SELECT * FROM collaborations WHERE id = ?');
    return stmt.get(id) as Collaboration | undefined;
  },

  findByListId: (listId: number): Collaboration[] => {
    const stmt = db.prepare('SELECT * FROM collaborations WHERE list_id = ? ORDER BY requested_at DESC');
    return stmt.all(listId) as Collaboration[];
  },

  findByUserId: (userId: number): Collaboration[] => {
    const stmt = db.prepare('SELECT * FROM collaborations WHERE user_id = ? ORDER BY requested_at DESC');
    return stmt.all(userId) as Collaboration[];
  },

  updateStatus: (id: number, status: 'approved' | 'rejected') => {
    const stmt = db.prepare('UPDATE collaborations SET status = ?, responded_at = CURRENT_TIMESTAMP WHERE id = ?');
    return stmt.run(status, id);
  },

  isCollaborator: (listId: number, userId: number): boolean => {
    const stmt = db.prepare('SELECT COUNT(*) as count FROM collaborations WHERE list_id = ? AND user_id = ? AND status = ?');
    const result = stmt.get(listId, userId, 'approved') as { count: number };
    return result.count > 0;
  }
};

// Friend operations
export const FriendModel = {
  searchByUsername: (username: string, excludeUserId: number): User[] => {
    const stmt = db.prepare('SELECT id, username, email, created_at FROM users WHERE username LIKE ? AND id != ? LIMIT 20');
    return stmt.all(`%${username}%`, excludeUserId) as User[];
  },

  sendFriendRequest: (fromUserId: number, toUserId: number): number => {
    const stmt = db.prepare('INSERT OR IGNORE INTO friend_requests (from_user_id, to_user_id, status) VALUES (?, ?, ?)');
    const result = stmt.run(fromUserId, toUserId, 'pending');
    return result.lastInsertRowid as number;
  },

  getFriendRequests: (userId: number): any[] => {
    const stmt = db.prepare(`
      SELECT fr.id, fr.from_user_id, u.username, u.email, fr.requested_at, fr.status
      FROM friend_requests fr
      JOIN users u ON fr.from_user_id = u.id
      WHERE fr.to_user_id = ?
      ORDER BY fr.requested_at DESC
    `);
    return stmt.all(userId) as any[];
  },

  respondToFriendRequest: (requestId: number, status: 'approved' | 'rejected') => {
    const stmt = db.prepare('UPDATE friend_requests SET status = ?, responded_at = CURRENT_TIMESTAMP WHERE id = ?');
    stmt.run(status, requestId);

    // If approved, create friendship
    if (status === 'approved') {
      const getReqStmt = db.prepare('SELECT from_user_id, to_user_id FROM friend_requests WHERE id = ?');
      const req = getReqStmt.get(requestId) as any;
      const friendStmt = db.prepare('INSERT OR IGNORE INTO friends (user_id_1, user_id_2) VALUES (?, ?)');
      const userId1 = Math.min(req.from_user_id, req.to_user_id);
      const userId2 = Math.max(req.from_user_id, req.to_user_id);
      friendStmt.run(userId1, userId2);
    }
  },

  getFriends: (userId: number): User[] => {
    const stmt = db.prepare(`
      SELECT u.id, u.username, u.email, u.created_at
      FROM friends f
      JOIN users u ON (
        (f.user_id_1 = ? AND u.id = f.user_id_2) OR
        (f.user_id_2 = ? AND u.id = f.user_id_1)
      )
      ORDER BY u.username
    `);
    return stmt.all(userId, userId) as User[];
  },

  areFriends: (userId1: number, userId2: number): boolean => {
    const id1 = Math.min(userId1, userId2);
    const id2 = Math.max(userId1, userId2);
    const stmt = db.prepare('SELECT COUNT(*) as count FROM friends WHERE user_id_1 = ? AND user_id_2 = ?');
    const result = stmt.get(id1, id2) as { count: number };
    return result.count > 0;
  },

  hasPendingRequest: (fromUserId: number, toUserId: number): boolean => {
    const stmt = db.prepare('SELECT COUNT(*) as count FROM friend_requests WHERE ((from_user_id = ? AND to_user_id = ?) OR (from_user_id = ? AND to_user_id = ?)) AND status = ?');
    const result = stmt.get(fromUserId, toUserId, toUserId, fromUserId, 'pending') as { count: number };
    return result.count > 0;
  }
};
