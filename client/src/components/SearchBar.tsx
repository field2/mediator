import React, { useState, useEffect, useRef } from 'react';
import { searchMovies, searchBooks, searchAlbums } from '../api';
import { SearchResult } from '../types';

interface SearchBarProps {
  onSelect: (item: SearchResult, mediaType: 'movie' | 'book' | 'album') => void;
  mediaType: 'movie' | 'book' | 'album';
  onMediaSelected?: (item: SearchResult, mediaType: 'movie' | 'book' | 'album') => void;
}

const SearchBar: React.FC<SearchBarProps> = ({ onSelect, mediaType, onMediaSelected }) => {
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

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = window.setTimeout(async () => {
      setLoading(true);
      try {
        let res: SearchResult[] = [];
        if (mediaType === 'movie') res = await searchMovies(query);
        if (mediaType === 'book') res = await searchBooks(query);
        if (mediaType === 'album') res = await searchAlbums(query);
        setResults(res || []);
        setShowResults((res || []).length > 0);
      } catch (err) {
        setResults([]);
        setShowResults(false);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [query, mediaType]);

  // keep page-level class when results are visible so CSS can react
  React.useEffect(() => {
    const page = document.querySelector('.page-container');
    if (showResults) page?.classList.add('search-open');
    else page?.classList.remove('search-open');
    return () => { page?.classList.remove('search-open'); };
  }, [showResults]);

  const shouldShowResults = showResults;

  const handleSelect = (item: SearchResult) => {
    onSelect(item, mediaType);
    if (onMediaSelected) onMediaSelected(item, mediaType);
    setShowResults(false);
    setQuery('');
  };

  return (
    <div className="searchbar">
      <input
        className="search-input"
        type="text"
        placeholder={`Search ${mediaType === 'movie' ? 'movies' : mediaType === 'book' ? 'books' : 'albums'}`}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setShowResults(results.length > 0)}
        onBlur={() => setTimeout(() => setShowResults(false), 150)}
      />

      {(loading || shouldShowResults) && (
        <div className="search-results">
          {loading && (
            <div className="search-loading">
              <div className="spinner"></div>
            </div>
          )}

          {!loading && results.length > 0 && (
            results.filter(r => r.Poster || r.cover).map((r) => (
              <div key={r.id} className="search-result-item" onClick={() => handleSelect(r)}>
                {r.Poster || r.cover ? (
                  <img src={r.Poster || r.cover} alt={r.title} className="result-thumb" />
                ) : (
                  <div className="result-thumb placeholder" />
                )}
                <div className="result-body">
                  <div className="result-title">{r.title}</div>
                  <div className="result-sub">{r.year || r.author || r.artist}</div>
                </div>
              </div>
            ))
          )}

          {!loading && results.length === 0 && query.trim().length >= 2 && (
            <div className="search-no-results">No results found for "{query}"</div>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchBar;
