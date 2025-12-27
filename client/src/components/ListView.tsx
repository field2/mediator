import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { getList, addMediaToList, rateMedia, deleteMediaFromList } from '../api';
import { MediaItem, SearchResult } from '../types';
import SearchBar from './SearchBar';
import StarRating from './StarRating';

const ListView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [list, setList] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const mediaTypeFromUrl = (searchParams.get('mediaType') as 'movie' | 'book' | 'album') || 'movie';
  const [selectedSection, setSelectedSection] = useState<'movie' | 'book' | 'album'>(mediaTypeFromUrl);

  const loadList = async () => {
    try {
      const data = await getList(parseInt(id!));
      setList(data);
    } catch (error) {
      console.error('Error loading list:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadList();
  }, [id]);

  useEffect(() => {
    setSelectedSection(mediaTypeFromUrl);
  }, [mediaTypeFromUrl]);

  const handleAddMedia = async (item: SearchResult, mediaType: 'movie' | 'book' | 'album') => {
    try {
      await addMediaToList(
        parseInt(id!),
        mediaType,
        item.id,
        item.title,
        item.year,
        item.Poster || item.cover,
        item
      );
      await loadList();
    } catch (error) {
      console.error('Error adding media:', error);
      alert('Failed to add media to list');
    }
  };

  const handleRate = async (mediaId: number, rating: number) => {
    try {
      await rateMedia(parseInt(id!), mediaId, rating);
      await loadList();
    } catch (error) {
      console.error('Error rating media:', error);
      alert('Failed to rate media');
    }
  };

  const handleDelete = async (mediaId: number) => {
    if (!window.confirm('Are you sure you want to delete this item?')) return;

    try {
      await deleteMediaFromList(parseInt(id!), mediaId);
      await loadList();
    } catch (error) {
      console.error('Error deleting media:', error);
      alert('Failed to delete media');
    }
  };

  if (loading) return <div style={{ padding: '20px' }}>Loading...</div>;
  if (!list) return <div style={{ padding: '20px' }}>List not found</div>;

  const canEdit = list.isOwner || list.isCollaborator;
  const movies = list.mediaItems?.filter((item: MediaItem) => item.media_type === 'movie') || [];
  const books = list.mediaItems?.filter((item: MediaItem) => item.media_type === 'book') || [];
  const albums = list.mediaItems?.filter((item: MediaItem) => item.media_type === 'album') || [];

  const renderMediaItems = (items: MediaItem[]) => {
    if (items.length === 0) {
      return <p style={{ color: '#666', fontStyle: 'italic' }}>No items yet</p>;
    }

    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '20px' }}>
        {items.map((item) => (
          <div key={item.id} style={{ border: '1px solid #ddd', padding: '10px', borderRadius: '4px' }}>
            {item.poster_url && (
              <img
                src={item.poster_url}
                alt={item.title}
                style={{ width: '100%', height: '200px', objectFit: 'cover', marginBottom: '10px' }}
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            )}
            <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>{item.title}</div>
            {item.year && <div style={{ fontSize: '0.9em', color: '#666', marginBottom: '5px' }}>{item.year}</div>}

            <div style={{ marginTop: '10px' }}>
              <div style={{ fontSize: '0.8em', color: '#666', marginBottom: '5px' }}>
                {item.averageRating ? `Avg: ${item.averageRating.toFixed(1)}` : 'No ratings yet'}
              </div>
              <StarRating
                rating={item.userRating}
                onRate={(rating) => handleRate(item.id, rating)}
                readonly={!canEdit && !list.is_public}
              />
            </div>

            {list.isOwner && (
              <button
                onClick={() => handleDelete(item.id)}
                style={{
                  marginTop: '10px',
                  width: '100%',
                  padding: '5px',
                  backgroundColor: '#dc3545',
                  color: 'white',
                  border: 'none',
                  cursor: 'pointer',
                  borderRadius: '4px'
                }}
              >
                Delete
              </button>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <button onClick={() => navigate('/')} style={{ marginBottom: '20px', padding: '8px 16px', cursor: 'pointer' }}>
        ← Back to Lists
      </button>

      <h1>{list.name}</h1>
      {list.description && <p style={{ color: '#666' }}>{list.description}</p>}
      <p style={{ fontSize: '0.9em', color: '#666' }}>
        {list.is_public ? '🌐 Public' : '🔒 Private'}
        {list.isCollaborator && ' • You are a collaborator'}
      </p>

      {canEdit && (
        <div style={{ marginTop: '30px', padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
          <h3>Add Media</h3>
          <SearchBar onSelect={handleAddMedia} mediaType={selectedSection} />
        </div>
      )}

      <div style={{ marginTop: '40px' }}>
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: '2px solid #ddd' }}>
          {movies.length > 0 && (
            <button
              onClick={() => setSelectedSection('movie')}
              style={{
                padding: '10px 20px',
                border: 'none',
                backgroundColor: selectedSection === 'movie' ? '#007bff' : 'transparent',
                color: selectedSection === 'movie' ? 'white' : '#007bff',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              My Movies ({movies.length})
            </button>
          )}
          {books.length > 0 && (
            <button
              onClick={() => setSelectedSection('book')}
              style={{
                padding: '10px 20px',
                border: 'none',
                backgroundColor: selectedSection === 'book' ? '#007bff' : 'transparent',
                color: selectedSection === 'book' ? 'white' : '#007bff',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              My Books ({books.length})
            </button>
          )}
          {albums.length > 0 && (
            <button
              onClick={() => setSelectedSection('album')}
              style={{
                padding: '10px 20px',
                border: 'none',
                backgroundColor: selectedSection === 'album' ? '#007bff' : 'transparent',
                color: selectedSection === 'album' ? 'white' : '#007bff',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              My Albums ({albums.length})
            </button>
          )}
        </div>

        {selectedSection === 'movie' && movies.length > 0 && renderMediaItems(movies)}
        {selectedSection === 'book' && books.length > 0 && renderMediaItems(books)}
        {selectedSection === 'album' && albums.length > 0 && renderMediaItems(albums)}
      </div>
    </div>
  );
};

export default ListView;
