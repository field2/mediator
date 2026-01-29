import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { getList, addMediaToList, rateMedia, deleteMediaFromList } from '../api';
import { MediaItem, SearchResult } from '../types';
import SearchBar from './SearchBar';
import StarRating from './StarRating';
import Header from './Header';

const ListView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  
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

  if (loading) return <div className="list-loading">Loading...</div>;
  if (!list) return <div className="list-not-found">List not found</div>;

  const canEdit = list.isOwner || list.isCollaborator;
  const movies = list.mediaItems?.filter((item: MediaItem) => item.media_type === 'movie') || [];
  const books = list.mediaItems?.filter((item: MediaItem) => item.media_type === 'book') || [];
  const albums = list.mediaItems?.filter((item: MediaItem) => item.media_type === 'album') || [];

  const renderMediaItems = (items: MediaItem[]) => {
    if (items.length === 0) {
      return <p className="no-items">No items yet</p>;
    }

    return (
      <div className="media-grid">
        {items.map((item) => (
          <div key={item.id} className="media-card">
            {item.poster_url && (
              <img
                src={item.poster_url}
                alt={item.title}
                className="media-card-img"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            )}
            <div className="media-card-title">{item.title}</div>
            {item.year && <div className="media-card-year">{item.year}</div>}

            <div className="media-card-meta">
              <div className="avg-rating">{item.averageRating ? `Avg: ${item.averageRating.toFixed(1)}` : 'No ratings yet'}</div>
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
    <div className="page-container">
      <Header title={list.name} />
      {list.description && <p className="list-description">{list.description}</p>}
      <p className="list-meta">{list.is_public ? '🌐 Public' : '🔒 Private'}{list.isCollaborator && ' • You are a collaborator'}</p>

      {/* Move SearchBar outside of .add-media-panel, as a sibling of .view-body */}
      {canEdit && <SearchBar onSelect={handleAddMedia} mediaType={selectedSection} />}

      <div className="sections">
        <div className="tabs">
          {movies.length > 0 && (
            <button onClick={() => setSelectedSection('movie')} className={`tab-button ${selectedSection === 'movie' ? 'active' : ''}`}>My Movies ({movies.length})</button>
          )}
          {books.length > 0 && (
            <button onClick={() => setSelectedSection('book')} className={`tab-button ${selectedSection === 'book' ? 'active' : ''}`}>My Books ({books.length})</button>
          )}
          {albums.length > 0 && (
            <button onClick={() => setSelectedSection('album')} className={`tab-button ${selectedSection === 'album' ? 'active' : ''}`}>My Albums ({albums.length})</button>
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
