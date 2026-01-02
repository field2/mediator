export interface User {
  userId: number;
  username: string;
  email: string;
  token: string;
  signupDate?: string;
  // Some endpoints (friends) return `id`; keep optional for compatibility
  id?: number;
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
  averageRating?: number | null;
  userRating?: number;
  ratings?: Rating[];
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
  listName?: string;
}

export interface SearchResult {
  id: string;
  title: string;
  year?: string;
  author?: string;
  artist?: string;
  poster?: string;
  cover?: string;
  Poster?: string;
}
