import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import SearchBar from './SearchBar';
import { getOrCreateAutoList, addMediaToList } from '../api';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [selectedMediaType, setSelectedMediaType] = useState<'movie' | 'book' | 'album'>('movie');
  const [loading, setLoading] = useState(false);

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
      navigate(`/list/${list.id}?mediaType=${mediaType}`);
    } catch (error) {
      console.error('Error adding media:', error);
      alert('Failed to add media');
    } finally {
      setLoading(false);
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
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
