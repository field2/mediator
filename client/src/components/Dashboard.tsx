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
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h1>Mediator</h1>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <span>Welcome, {user?.username}!</span>
          <button onClick={() => navigate('/collaborations')} style={{ padding: '8px 16px', cursor: 'pointer' }}>
            Collaborations
          </button>
          <button onClick={logout} style={{ padding: '8px 16px', cursor: 'pointer' }}>
            Logout
          </button>
        </div>
      </div>

      <div style={{ marginTop: '40px' }}>
        <div style={{ display: 'flex', gap: '10px', marginBottom: '30px', borderBottom: '2px solid #ddd' }}>
          <button
            onClick={() => setSelectedMediaType('movie')}
            style={{
              padding: '10px 20px',
              border: 'none',
              backgroundColor: selectedMediaType === 'movie' ? '#007bff' : 'transparent',
              color: selectedMediaType === 'movie' ? 'white' : '#007bff',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            🎬 Movies
          </button>
          <button
            onClick={() => setSelectedMediaType('book')}
            style={{
              padding: '10px 20px',
              border: 'none',
              backgroundColor: selectedMediaType === 'book' ? '#28a745' : 'transparent',
              color: selectedMediaType === 'book' ? 'white' : '#28a745',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            📚 Books
          </button>
          <button
            onClick={() => setSelectedMediaType('album')}
            style={{
              padding: '10px 20px',
              border: 'none',
              backgroundColor: selectedMediaType === 'album' ? '#dc3545' : 'transparent',
              color: selectedMediaType === 'album' ? 'white' : '#dc3545',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            🎵 Albums
          </button>
        </div>

        <div style={{ padding: '40px 20px', backgroundColor: '#f8f9fa', borderRadius: '8px', textAlign: 'center' }}>
          <h2 style={{ marginBottom: '30px' }}>
            Search for {selectedMediaType === 'movie' ? 'a movie' : selectedMediaType === 'book' ? 'a book' : 'an album'}
          </h2>
          <SearchBar onSelect={() => {}} mediaType={selectedMediaType} onMediaSelected={handleMediaSelected} />
          {loading && <div style={{ marginTop: '20px', color: '#007bff', fontWeight: 'bold' }}>Adding to your list...</div>}
          <div style={{ marginTop: '24px', textAlign: 'left' }}>
            <h3 style={{ marginBottom: '12px' }}>{autoItems.length ? `Your ${selectedMediaType === 'movie' ? 'Movies' : selectedMediaType === 'book' ? 'Books' : 'Albums'}` : `No ${selectedMediaType === 'movie' ? 'movies' : selectedMediaType === 'book' ? 'books' : 'albums'} added yet`}</h3>
            {loadingItems ? (
              <div>Loading your items...</div>
            ) : autoItems.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '12px' }}>
                {autoItems.map((mi) => (
                  <div key={mi.id} style={{ background: 'white', borderRadius: 6, overflow: 'hidden', border: '1px solid #eee', padding: 8, display: 'flex', flexDirection: 'column' }}>
                    <img src={mi.poster_url || '/placeholder.png'} alt={mi.title} style={{ width: '100%', height: 180, objectFit: 'cover', borderRadius: 4 }} />
                    <div style={{ marginTop: 8, fontWeight: 600 }}>{mi.title}</div>
                    {mi.year && <div style={{ color: '#666', fontSize: 12 }}>{mi.year}</div>}
                    <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                      <StarRating rating={mi.userRating || 0} onRate={(r) => handleRate(mi.id, r)} readonly={!user} />
                    </div>
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
