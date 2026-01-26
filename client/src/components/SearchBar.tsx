import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { searchMovies, searchBooks, searchAlbums } from '../api';
import IconSearch from '../assets/icon-search.svg';
import IconClose from '../assets/icon-close.svg';
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
      } catch (err) {
        setResults([]);
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


  const handleSelect = (item: SearchResult) => {
    onSelect(item, mediaType);
    if (onMediaSelected) onMediaSelected(item, mediaType);
    setShowResults(false);
    setQuery('');
  };

  const handleInputFocus = () => {
    setShowResults(true);
  };

  

  // Render search results in a portal to the body, as a sibling of .view-body
  // Find the closest .page-container to anchor the results
  const searchResults = showResults ? (
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
  ) : null;

  // Use a portal to render searchResults as a sibling of .view-body
  // Find the closest .page-container to the input
  const searchBarRef = React.useRef<HTMLDivElement>(null);
  const [container, setContainer] = React.useState<HTMLElement | null>(null);
  React.useEffect(() => {
    if (searchBarRef.current) {
      let el = searchBarRef.current.parentElement;
      while (el && !el.classList.contains('page-container')) {
        el = el.parentElement;
      }
      setContainer(el || document.body);
    }
  }, []);

  return (
    <>
      <div className="search-bar" ref={searchBarRef}>
        <input
          className="search-input"
          type="text"
          placeholder={`Search ${mediaType === 'movie' ? 'movies' : mediaType === 'book' ? 'books' : 'albums'}`}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={handleInputFocus}
        />
        {query.trim().length === 0 ? (
          <button className="search-icon-btn" tabIndex={-1} type="button" aria-label="Search">
            <img src={IconSearch} alt="Search" />
          </button>
        ) : (
          <button
            className="search-icon-btn"
            type="button"
            aria-label="Clear search"
            onClick={() => {
              setQuery('');
              setShowResults(false);
            }}
          >
            <img src={IconClose} alt="Clear" />
          </button>
        )}
      </div>
      {container && showResults
        ? createPortal(searchResults, container)
        : null}
    </>
  );
};

export default SearchBar;
