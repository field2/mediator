import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { searchMovies, searchBooks, searchAlbums } from '../api';
import IconSearch from '../assets/icon-search.svg';
import IconClose from '../assets/icon-close.svg';
import IconMovies from '../assets/icon-movies.svg';
import IconBooks from '../assets/icon-books.svg';
import IconAlbums from '../assets/icon-albums.svg';
import { SearchResult } from '../types';

interface SearchBarProps {
	onSelect: (item: SearchResult, mediaType: 'movie' | 'book' | 'album') => void;
	mediaType: 'movie' | 'book' | 'album';
	setSelectedMediaType: (type: 'movie' | 'book' | 'album') => void;
	selectedMediaType: 'movie' | 'book' | 'album';
	onMediaSelected?: (item: SearchResult, mediaType: 'movie' | 'book' | 'album') => void;
}

const SearchBar: React.FC<SearchBarProps> = ({
	onSelect,
	mediaType,
	setSelectedMediaType,
	selectedMediaType,
	onMediaSelected,
}) => {
	const [query, setQuery] = useState('');
	const [results, setResults] = useState<SearchResult[]>([]);
	const [currentPage, setCurrentPage] = useState(1);
	const [totalPages, setTotalPages] = useState(1);
	const [totalResults, setTotalResults] = useState(0);
	const [loading, setLoading] = useState(false);
	const [showResults, setShowResults] = useState(false);
	const debounceTimer = useRef<number | null>(null);

	useEffect(() => {
		if (query.trim().length < 2) {
			setResults([]);
			setCurrentPage(1);
			setTotalPages(1);
			setTotalResults(0);
			return;
		}

		if (debounceTimer.current) {
			clearTimeout(debounceTimer.current);
		}

		debounceTimer.current = window.setTimeout(async () => {
			setLoading(true);
			try {
				let resp: any = null;
				if (mediaType === 'movie') resp = await searchMovies(query, 1);
				if (mediaType === 'book') resp = await searchBooks(query, 1, 10);
				if (mediaType === 'album') resp = await searchAlbums(query, 1, 10);
				const list = resp?.results || [];
				setResults(list || []);
				setCurrentPage(resp?.page || 1);
				setTotalPages(resp?.total_pages || 1);
				setTotalResults(resp?.total_results || list.length);
			} catch (err) {
				setResults([]);
				setCurrentPage(1);
				setTotalPages(1);
				setTotalResults(0);
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
		return () => {
			page?.classList.remove('search-open');
		};
	}, [showResults]);

	// Clear search when menu opens elsewhere in the UI
	React.useEffect(() => {
		const onMenuOpened = () => {
			setQuery('');
			setResults([]);
			setShowResults(false);
			if (debounceTimer.current) {
				clearTimeout(debounceTimer.current);
				debounceTimer.current = null;
			}
		};

		document.addEventListener('menu:opened', onMenuOpened as EventListener);
		return () => {
			document.removeEventListener('menu:opened', onMenuOpened as EventListener);
		};
	}, []);

	const handleSelect = (item: SearchResult) => {
		onSelect(item, mediaType);
		if (onMediaSelected) onMediaSelected(item, mediaType);
		setShowResults(false);
		setQuery('');
	};

	const handleInputFocus = () => {
		setShowResults(true);
	};

	const loadMore = async () => {
		if (loading) return;
		if (currentPage >= totalPages) return;
		const next = currentPage + 1;
		setLoading(true);
		try {
			let resp: any = null;
			if (mediaType === 'movie') resp = await searchMovies(query, next);
			if (mediaType === 'book') resp = await searchBooks(query, next, 10);
			if (mediaType === 'album') resp = await searchAlbums(query, next, 10);
			const list = resp?.results || [];
			setResults((prev) => [...prev, ...list]);
			setCurrentPage(resp?.page || next);
			setTotalPages(resp?.total_pages || currentPage);
			setTotalResults(resp?.total_results || totalResults + list.length);
		} catch (err) {
			// ignore
		} finally {
			setLoading(false);
		}
	};

	// Render search results in a portal to the body, as a sibling of .view-body
	// Find the closest .page-container to anchor the results
	const searchResults = showResults ? (
		<div
			className={`search-results ${selectedMediaType === 'book' ? 'book-results' : selectedMediaType === 'album' ? 'album-results' : ''}`}
		>
			{loading && (
				<div className="search-loading">
					<div className="spinner"></div>
				</div>
			)}

			{!loading &&
				results.length > 0 &&
				results
					.filter((r) => r.Poster || r.cover)
					.map((r) => (
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
					))}

			{!loading && results.length === 0 && query.trim().length >= 2 && (
				<div className="search-no-results">No results found for "{query}"</div>
			)}

			{!loading && results.length > 0 && currentPage < totalPages && (
				<div className="search-load-more">
					<button onClick={loadMore}>Load more</button>
				</div>
			)}
		</div>
	) : null;

	// Use a portal to render searchResults as a sibling of .view-body
	// Find the closest .page-container to the input
	const searchBarRef = React.useRef<HTMLDivElement>(null);
	const [container, setContainer] = React.useState<HTMLElement | null>(null);
	React.useEffect(() => {
		// Render search results into document.body so they aren't clipped
		// by route containers with overflow:hidden and so they can be scrolled
		setContainer(document.body);
	}, []);

	return (
		<>
			<div className="search-bar" ref={searchBarRef}>
				<div className="media-tabs">
					<button
						onClick={() => {
							if (debounceTimer.current) {
								clearTimeout(debounceTimer.current);
								debounceTimer.current = null;
							}
							setQuery('');
							setResults([]);
							setShowResults(false);
							setSelectedMediaType('movie');
						}}
						className={` media-tab ${selectedMediaType === 'movie' ? 'active' : ''}`}
					>
						<img src={IconMovies} alt="" />
					</button>
					<button
						onClick={() => {
							if (debounceTimer.current) {
								clearTimeout(debounceTimer.current);
								debounceTimer.current = null;
							}
							setQuery('');
							setResults([]);
							setShowResults(false);
							setSelectedMediaType('book');
						}}
						className={` media-tab ${selectedMediaType === 'book' ? 'active' : ''}`}
					>
						<img src={IconBooks} alt="" />
					</button>
					<button
						onClick={() => {
							if (debounceTimer.current) {
								clearTimeout(debounceTimer.current);
								debounceTimer.current = null;
							}
							setQuery('');
							setResults([]);
							setShowResults(false);
							setSelectedMediaType('album');
						}}
						className={` media-tab ${selectedMediaType === 'album' ? 'active' : ''}`}
					>
						<img src={IconAlbums} alt="" />
					</button>
				</div>
				<input
					className="search-input"
					type="text"
					placeholder={`Search ${mediaType === 'movie' ? 'movies' : mediaType === 'book' ? 'books' : 'albums'}`}
					value={query}
					onChange={(e) => setQuery(e.target.value)}
					onFocus={handleInputFocus}
				/>
				{query.trim().length === 0 ? (
					<button className="search-icon-btn  " tabIndex={-1} type="button" aria-label="Search">
						<img src={IconSearch} alt="Search" />
					</button>
				) : (
					<button
						className="search-icon-btn "
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
			{container && showResults ? createPortal(searchResults, container) : null}
		</>
	);
};

export default SearchBar;
