import React, { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { searchMovies, searchBooks, searchAlbums, getFriends, sendRecommendation } from '../api';
import IconSearch from '../assets/icon-search.svg';
import IconClose from '../assets/icon-close.svg';
import IconMovies from '../assets/icon-movies.svg';
import IconBooks from '../assets/icon-books.svg';
import IconAlbums from '../assets/icon-albums.svg';
import { SearchResult, User } from '../types';
import { useAuth } from '../AuthContext';

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
	const sentinelRef = useRef<HTMLDivElement>(null);
	const scrollContainerRef = useRef<HTMLDivElement>(null);
	const [expandedItem, setExpandedItem] = useState<SearchResult | null>(null);
	const [expandedClosing, setExpandedClosing] = useState(false);
	const [itemOriginRect, setItemOriginRect] = useState<DOMRect | null>(null);
	const expandedCardRef = useRef<HTMLDivElement>(null);
	const flipAnimRef = useRef<{ scaleFrom: number; originX: number; originY: number } | null>(null);
	const [recommendMode, setRecommendMode] = useState(false);
	const [friendsList, setFriendsList] = useState<User[]>([]);
	const [recommendQuery, setRecommendQuery] = useState('');
	const [recommendMatches, setRecommendMatches] = useState<User[]>([]);
	const [sentTo, setSentTo] = useState<Record<string, boolean>>({});
	const { isAuthenticated } = useAuth();

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

	const handleSelect = (item: SearchResult, e: React.MouseEvent) => {
		const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
		setItemOriginRect(rect);
		setExpandedItem(item);
		setExpandedClosing(false);
		setRecommendMode(false);
		setRecommendQuery('');
		setRecommendMatches([]);
	};

	const handleInputFocus = () => {
		setShowResults(true);
	};

	const loadMore = useCallback(async () => {
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
	}, [loading, currentPage, totalPages, mediaType, query, totalResults]);

	// Observe sentinel to trigger infinite scroll
	useEffect(() => {
		const sentinel = sentinelRef.current;
		const container = scrollContainerRef.current;
		if (!sentinel || !container) return;
		const observer = new IntersectionObserver(
			(entries) => {
				if (entries[0].isIntersecting) loadMore();
			},
			{ root: container, threshold: 0 }
		);
		observer.observe(sentinel);
		return () => observer.disconnect();
	}, [loadMore]);

	// Load friends for the recommend feature
	useEffect(() => {
		if (!isAuthenticated) {
			setFriendsList([]);
			return;
		}
		getFriends()
			.then((f) => setFriendsList(Array.isArray(f) ? f : []))
			.catch(() => {});
	}, [isAuthenticated]);

	const fuzzyScore = (q: string, name: string): number => {
		const query = q.toLowerCase().trim();
		const candidate = name.toLowerCase();
		if (!query) return -1;
		if (candidate.includes(query))
			return 100 - candidate.indexOf(query) * 2 - (candidate.length - query.length);
		let qi = 0,
			score = 0;
		for (let i = 0; i < candidate.length && qi < query.length; i++) {
			if (candidate[i] === query[qi]) {
				score += 3;
				qi++;
			} else {
				score -= 1;
			}
		}
		return qi === query.length ? score - (candidate.length - query.length) : -1;
	};

	const updateRecommendMatches = (q: string) => {
		if (!q.trim()) {
			setRecommendMatches([]);
			return;
		}
		const matches = friendsList
			.map((f) => ({ f, score: fuzzyScore(q, f.username) }))
			.filter(({ score }) => score >= 0)
			.sort((a, b) => b.score - a.score)
			.slice(0, 6)
			.map(({ f }) => f);
		setRecommendMatches(matches);
	};

	const handleAddToList = () => {
		if (!expandedItem) return;
		onSelect(expandedItem, mediaType);
		if (onMediaSelected) onMediaSelected(expandedItem, mediaType);
		setExpandedItem(null);
		setRecommendMode(false);
	};

	// FLIP animation: when the expanded card mounts, immediately set it
	// to the item's size/position, then release to let CSS transition carry it to center.
	useLayoutEffect(() => {
		if (!expandedItem || expandedClosing || !expandedCardRef.current || !itemOriginRect) return;
		const card = expandedCardRef.current;
		const cardRect = card.getBoundingClientRect();
		const itemCenterX = itemOriginRect.left + itemOriginRect.width / 2;
		const itemCenterY = itemOriginRect.top + itemOriginRect.height / 2;
		const originX = itemCenterX - cardRect.left;
		const originY = itemCenterY - cardRect.top;
		const scaleFrom = itemOriginRect.width / cardRect.width;
		flipAnimRef.current = { scaleFrom, originX, originY };
		card.style.transformOrigin = `${originX}px ${originY}px`;
		card.style.transition = 'none';
		card.style.transform = `scale(${scaleFrom})`;
		void card.offsetHeight; // force reflow so initial state is painted
		card.style.transition = 'transform 0.28s cubic-bezier(0.34, 1.2, 0.64, 1)';
		card.style.transform = 'scale(1)';
	}, [expandedItem, itemOriginRect]); // eslint-disable-line react-hooks/exhaustive-deps

	const handleCloseExpanded = () => {
		if (expandedClosing) return;
		setExpandedClosing(true);
		if (expandedCardRef.current && flipAnimRef.current) {
			const card = expandedCardRef.current;
			const { scaleFrom, originX, originY } = flipAnimRef.current;
			card.style.transformOrigin = `${originX}px ${originY}px`;
			card.style.transition = 'transform 0.22s ease-in';
			card.style.transform = `scale(${scaleFrom})`;
		}
		setTimeout(() => {
			setExpandedItem(null);
			setExpandedClosing(false);
			setRecommendMode(false);
			setRecommendQuery('');
			setRecommendMatches([]);
		}, 220);
	};

	const handleSendRecommendation = async (friend: User) => {
		if (!expandedItem) return;
		const friendId = (friend as any).id || friend.userId;
		if (!friendId) return;
		const key = `${expandedItem.id}:${friendId}`;
		if (sentTo[key]) return;
		try {
			await sendRecommendation(friendId, {
				mediaType,
				externalId: expandedItem.id,
				title: expandedItem.title,
				year: expandedItem.year,
				posterUrl: expandedItem.Poster || expandedItem.cover,
			});
			setSentTo((prev) => ({ ...prev, [key]: true }));
		} catch {
			// ignore
		}
	};

	// Render search results in a portal to the body, as a sibling of .view-body
	// Find the closest .page-container to anchor the results
	const searchResults = showResults ? (
		<div
			ref={scrollContainerRef}
			className={`search-results ${selectedMediaType === 'book' ? 'book-results' : selectedMediaType === 'album' ? 'album-results' : ''}`}
		>
			{expandedItem && (
				<div
					className={`search-item-expanded-overlay${expandedClosing ? ' closing' : ''}`}
					onClick={handleCloseExpanded}
				>
					<div
						className="search-item-expanded"
						onClick={(e) => e.stopPropagation()}
						ref={expandedCardRef}
					>
						<img
							src={expandedItem.Poster || expandedItem.cover || '/placeholder.png'}
							alt={expandedItem.title}
							className="expanded-poster"
						/>
						<div className="expanded-info">
							<div className="expanded-title">{expandedItem.title}</div>
							{(expandedItem.year || expandedItem.author || expandedItem.artist) && (
								<div className="expanded-sub">
									{expandedItem.year || expandedItem.author || expandedItem.artist}
								</div>
							)}
							{!recommendMode ? (
								<div className="expanded-actions">
									<button className="expanded-btn" onClick={handleAddToList}>
										Watched
									</button>
									<button className="expanded-btn" onClick={handleAddToList}>
										+ Watchlist
									</button>
									{isAuthenticated && (
										<button className="expanded-btn" onClick={() => setRecommendMode(true)}>
											Recommend
										</button>
									)}
									<button
										className="expanded-btn expanded-btn-close"
										onClick={handleCloseExpanded}
										aria-label="Close"
									>
										✕
									</button>
								</div>
							) : (
								<div className="expanded-recommend">
									<input
										type="text"
										placeholder="Search friends..."
										value={recommendQuery}
										autoFocus
										onChange={(e) => {
											setRecommendQuery(e.target.value);
											updateRecommendMatches(e.target.value);
										}}
										className="expanded-recommend-input"
									/>
									<div className="expanded-recommend-results">
										{recommendMatches.map((f) => {
											const friendId = (f as any).id || f.userId;
											const key = `${expandedItem.id}:${friendId}`;
											const sent = !!sentTo[key];
											return (
												<div key={friendId} className="expanded-recommend-row">
													<span className="expanded-recommend-name">{f.username}</span>
													<button
														className="expanded-btn"
														disabled={sent}
														onClick={() => handleSendRecommendation(f)}
													>
														{sent ? 'Sent ✓' : 'Send'}
													</button>
												</div>
											);
										})}
										{recommendQuery.trim() && recommendMatches.length === 0 && (
											<div className="expanded-recommend-empty">No matching friends</div>
										)}
									</div>
									<button
										className="expanded-recommend-back"
										onClick={() => {
											setRecommendMode(false);
											setRecommendQuery('');
											setRecommendMatches([]);
										}}
									>
										← Back
									</button>
								</div>
							)}
						</div>
					</div>
				</div>
			)}
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
						<div key={r.id} className="search-result-item" onClick={(e) => handleSelect(r, e)}>
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

			{currentPage < totalPages && <div ref={sentinelRef} style={{ height: 1 }} />}
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
