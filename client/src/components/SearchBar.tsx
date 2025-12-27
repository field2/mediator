import React, { useState, useEffect, useRef } from 'react';
import { searchMovies, searchBooks, searchAlbums } from '../api';
import { SearchResult } from '../types';

interface SearchBarProps {
  onSelect: (item: SearchResult, mediaType: 'movie' | 'book' | 'album') => void;
  mediaType: 'movie' | 'book' | 'album';
}

const SearchBar: React.FC<SearchBarProps> = ({ onSelect, mediaType }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const debounceTimer = useRef<number | null>(null);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      setShowResults(false);
      return;
    }

    // Debounce search
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(async () => {
      setLoading(true);
      try {
        let data: SearchResult[] = [];
        if (mediaType === 'movie') {
          data = await searchMovies(query);
        } else if (mediaType === 'book') {
          data = await searchBooks(query);
        } else if (mediaType === 'album') {
          data = await searchAlbums(query);
        }
        setResults(data);
        setShowResults(true);
      } catch (error) {
        console.error('Search error:', error);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 500); // Wait 500ms after user stops typing

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [query, mediaType]);

  const handleSelect = (item: SearchResult) => {
    onSelect(item, mediaType);
    setQuery('');
    setResults([]);
    setShowResults(false);
  };

  const mediaLabels = {
    movie: '🎬 Movies',
    book: '📚 Books',
    album: '🎵 Albums'
  };

  return (
    <div style={{ marginBottom: '20px', position: 'relative' }}>
      <div style={{ marginBottom: '10px' }}>
        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#333' }}>
          Search {mediaLabels[mediaType]}
        </label>
        <input
          type="text"
          placeholder={`Type to search for ${mediaType}s...`}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{
            width: '100%',
            padding: '12px',
            fontSize: '16px',
            border: '2px solid #ddd',
            borderRadius: '8px',
            boxSizing: 'border-box'
          }}
        />
        {loading && <div style={{ marginTop: '5px', color: '#666', fontSize: '14px' }}>Searching...</div>}
      </div>

      {showResults && results.length > 0 && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          border: '1px solid #ccc',
          maxHeight: '400px',
          overflowY: 'auto',
          backgroundColor: 'white',
          zIndex: 1000,
          borderRadius: '8px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
        }}>
          {results.map((item) => (
            <div
              key={item.id}
              onClick={() => handleSelect(item)}
              style={{
                padding: '12px',
                cursor: 'pointer',
                borderBottom: '1px solid #eee',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
            >
              {(item.Poster || item.cover) && (
                <img
                  src={item.Poster || item.cover}
                  alt={item.title}
                  style={{ width: '40px', height: '60px', objectFit: 'cover', borderRadius: '4px' }}
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              )}
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>{item.title}</div>
                <div style={{ fontSize: '0.9em', color: '#666' }}>
                  {item.year && `${item.year}`}
                  {(item.author || item.artist) && ` • ${item.author || item.artist}`}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showResults && results.length === 0 && query.trim().length >= 2 && !loading && (
        <div style={{
          marginTop: '10px',
          padding: '12px',
          backgroundColor: '#f8f9fa',
          borderRadius: '8px',
          color: '#666',
          textAlign: 'center'
        }}>
          No results found for "{query}"
        </div>
      )}
    </div>
  );
};

export default SearchBar;
