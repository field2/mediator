import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { searchMovies, searchBooks, searchAlbums } from '../api';
import IconSearch from '../assets/icon-search.svg';
import IconClose from '../assets/icon-close.svg';
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
						className={`ignore-default-button-styles media-tab ${selectedMediaType === 'movie' ? 'active' : ''}`}
					>
						<svg
							width="33"
							height="37"
							viewBox="0 0 33 37"
							fill="none"
							xmlns="http://www.w3.org/2000/svg"
						>
							<path
								fillRule="evenodd"
								clipRule="evenodd"
								d="M32.9512 34.5263C32.9512 35.6309 32.0558 36.5263 30.9512 36.5263H3.95119C2.84662 36.5263 1.95119 35.6309 1.95119 34.5263V16.5263H32.9512V34.5263ZM3.95119 18.5263V23.5263L6.65139 18.5263H3.95119ZM9.34572 18.5263L6.6465 23.5263H9.34572L12.0459 18.5263H9.34572ZM14.75 18.5263L12.0498 23.5263H14.75L17.4492 18.5263H14.75ZM20.1514 18.5263L17.4522 23.5263H20.1514L22.8516 18.5263H20.1514ZM25.5498 18.5263L22.8496 23.5263H25.5498L28.249 18.5263H25.5498ZM28.251 23.5263H30.9512V18.5263L28.251 23.5263Z"
								fill="white"
							/>
							<path
								fillRule="evenodd"
								clipRule="evenodd"
								d="M27.4734 0.0737671C28.5373 -0.222396 29.6404 0.39981 29.9367 1.46371L31.8133 8.20749L1.95119 16.5263L0.0737564 9.78254C-0.222378 8.71858 0.399809 7.61556 1.4637 7.3192L27.4734 0.0737671ZM3.34027 14.063L5.94142 13.3384L1.99852 9.24637L3.34027 14.063ZM4.59497 8.52308L8.53693 12.6154L11.1381 11.8908L7.19519 7.79875L4.59497 8.52308ZM9.80011 7.0731L13.743 11.1651L16.3442 10.4405L12.4013 6.34851L9.80011 7.0731ZM15.0043 5.62339L18.9463 9.71566L21.5474 8.99107L17.6045 4.89906L15.0043 5.62339ZM20.2038 4.17498L24.1467 8.267L26.7469 7.54266L22.8049 3.45039L20.2038 4.17498ZM25.407 2.72553L29.35 6.81754L28.0082 2.00093L25.407 2.72553Z"
								fill="white"
							/>
						</svg>
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
						className={`ignore-default-button-styles media-tab ${selectedMediaType === 'book' ? 'active' : ''}`}
					>
						<svg
							width="25"
							height="35"
							viewBox="0 0 25 35"
							fill="none"
							xmlns="http://www.w3.org/2000/svg"
						>
							<path
								d="M24.9994 22.9998H6.75C4.12665 22.9998 2 25.1265 2 27.7498C2 30.3732 4.12665 32.4998 6.75 32.4998H24.9994V34.4998H7C3.13401 34.4998 1.12749e-07 31.3658 0 27.4998L0.00254822 6.99986C0.00254867 3.13386 3.13656 -0.000144705 7.00255 -0.000144705H25.002L24.9994 22.9998Z"
								fill="white"
							/>
							<path
								d="M4 25.9998C4 25.4476 4.34822 24.9998 4.77778 24.9998H24.9994V26.9998H4.77778C4.34822 26.9998 4 26.5521 4 25.9998Z"
								fill="white"
							/>
							<path
								d="M4 29.4998C4 28.9476 4.34822 28.4998 4.77778 28.4998H24.9994V30.4998H4.77778C4.34822 30.4998 4 30.0521 4 29.4998Z"
								fill="white"
							/>
						</svg>
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
						className={`ignore-default-button-styles media-tab ${selectedMediaType === 'album' ? 'active' : ''}`}
					>
						<svg
							width="35"
							height="35"
							viewBox="0 0 35 35"
							fill="none"
							xmlns="http://www.w3.org/2000/svg"
						>
							<path
								fillRule="evenodd"
								clipRule="evenodd"
								d="M17.5 0C27.165 0 35 7.83502 35 17.5C35 27.165 27.165 35 17.5 35C7.83502 35 0 27.165 0 17.5C0 7.83502 7.83502 0 17.5 0ZM17.5 11C13.9101 11 11 13.9101 11 17.5C11 21.0899 13.9101 24 17.5 24C21.0899 24 24 21.0899 24 17.5C24 13.9101 21.0899 11 17.5 11Z"
								fill="white"
							/>
							<path
								d="M19 17.5C19 18.3284 18.3284 19 17.5 19C16.6716 19 16 18.3284 16 17.5C16 16.6716 16.6716 16 17.5 16C18.3284 16 19 16.6716 19 17.5Z"
								fill="white"
							/>
						</svg>
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
					<button
						className="search-icon-btn ignore-default-button-styles "
						tabIndex={-1}
						type="button"
						aria-label="Search"
					>
						<img src={IconSearch} alt="Search" />
					</button>
				) : (
					<button
						className="search-icon-btn ignore-default-button-styles"
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
