import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import SearchBar from './SearchBar';
import { getOrCreateAutoList, addMediaToList, getList, rateMedia } from '../api';
import { MediaItem } from '../types';
import StarRating from './StarRating';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [selectedMediaType, setSelectedMediaType] = useState<'movie' | 'book' | 'album'>('movie');
  const [loading, setLoading] = useState(false);
  const [autoListId, setAutoListId] = useState<number | null>(null);
  const [autoItems, setAutoItems] = useState<MediaItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);

  const handleMediaSelected = async (item: any, mediaType: 'movie' | 'book' | 'album') => {
    setLoading(true);
    try {
      const list = await getOrCreateAutoList(mediaType);
      await addMediaToList(
        list.id,
        mediaType,
        item.id,
        item.title,
        item.year,
        item.Poster || item.cover,
        item
      );
      // refresh local items for this media type
      setAutoListId(list.id);
      const full = await getList(list.id);
      setAutoItems(full.mediaItems || []);
    } catch (error) {
      console.error('Error adding media:', error);
      alert('Failed to add media');
    } finally {
      setLoading(false);
    }
  };

  // load user's auto list items when media type changes
  React.useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoadingItems(true);
      try {
        const list = await getOrCreateAutoList(selectedMediaType);
        if (cancelled) return;
        setAutoListId(list.id);
        const full = await getList(list.id);
        if (cancelled) return;
        setAutoItems(full.mediaItems || []);
      } catch (err) {
        console.error('Error loading auto list items:', err);
        setAutoItems([]);
        setAutoListId(null);
      } finally {
        if (!cancelled) setLoadingItems(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [selectedMediaType]);

    const handleRate = async (mediaId: number, rating: number) => {
      if (!autoListId) return;
      try {
        await rateMedia(autoListId, mediaId, rating);
        const full = await getList(autoListId);
        setAutoItems(full.mediaItems || []);
      } catch (err) {
        console.error('Error rating item:', err);
      }
    };

  return (
    <div className="page-container">
      <div className="header">
        <h1>Mediator</h1>
        {/* <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <span>Welcome, {user?.username}!</span>
          <button onClick={() => navigate('/collaborations')} style={{ padding: '8px 16px', cursor: 'pointer' }}>
            Collaborations
          </button>
          <button onClick={logout} style={{ padding: '8px 16px', cursor: 'pointer' }}>
            Logout
          </button>
        </div> */}
        <div className="media-tabs">
          <button onClick={() => setSelectedMediaType('movie')} className={`media-tab ${selectedMediaType === 'movie' ? 'active' : ''}`}>
            🎬 Movies
          </button>
          <button onClick={() => setSelectedMediaType('book')} className={`media-tab ${selectedMediaType === 'book' ? 'active' : ''}`}>
            📚 Books
          </button>
          <button onClick={() => setSelectedMediaType('album')} className={`media-tab ${selectedMediaType === 'album' ? 'active' : ''}`}>
            🎵 Albums
          </button>
        </div>
      </div>

      <div className="media-section-body">
        <div className="search-panel">
          <SearchBar onSelect={() => {}} mediaType={selectedMediaType} onMediaSelected={handleMediaSelected} />
          {loading && <div className="loading-text">Adding to your list...</div>}
          <div className="auto-items">
            <h3 className="auto-items-title">{autoItems.length ? `Your ${selectedMediaType === 'movie' ? 'Movies' : selectedMediaType === 'book' ? 'Books' : 'Albums'}` : `No ${selectedMediaType === 'movie' ? 'movies' : selectedMediaType === 'book' ? 'books' : 'albums'} added yet`}</h3>
            {loadingItems ? (
              <div>Loading your items...</div>
            ) : autoItems.length > 0 ? (
              <div className="auto-items-grid">
                {autoItems.map((mi) => (
                  <div key={mi.id} className="auto-item-card">
                    <img src={mi.poster_url || '/placeholder.png'} alt={mi.title} className="auto-item-img" />
                    <div className="auto-item-title">{mi.title}</div>
                    {mi.year && <div className="auto-item-year">{mi.year}</div>}
                    <div className="auto-item-rating"><StarRating rating={mi.userRating || 0} onRate={(r) => handleRate(mi.id, r)} readonly={!user} /></div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
