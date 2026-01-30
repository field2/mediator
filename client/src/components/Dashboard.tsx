import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Header from './Header';
import { useAuth } from '../AuthContext';
import SearchBar from './SearchBar';
import {
	getOrCreateAutoList,
	addMediaToList,
	getList,
	rateMedia,
	deleteMediaFromList,
	getFriendRequests,
	getUserAutoList,
} from '../api';
import { MediaItem } from '../types';
import StarRating from './StarRating';

const Dashboard: React.FC = () => {
	// Add missing helper functions
	const addItemToAutoList = async (item: any, mediaType: 'movie' | 'book' | 'album') => {
		setLoading(true);
		try {
			const externalId = (item.external_id ?? item.id)?.toString?.() || item.id;
			const list = await getOrCreateAutoList(mediaType);
			await addMediaToList(
				list.id,
				mediaType,
				externalId,
				item.title,
				item.year,
				item.Poster || item.cover || item.poster_url,
				item
			);
			setAutoListId(list.id);
			const full = await getList(list.id);
			setAutoItems(Array.isArray(full.mediaItems) ? full.mediaItems : []);
		} catch (error) {
			console.error('Error adding media:', error);
			alert('Failed to add media');
		} finally {
			setLoading(false);
		}
	};

	const handleMediaSelected = async (item: any, mediaType: 'movie' | 'book' | 'album') => {
		if (!isAuthenticated) {
			const guestItem = {
				id: Date.now(),
				title: item.title,
				year: item.year,
				poster_url: item.Poster || item.cover,
				media_type: mediaType,
				averageRating: undefined,
				userRating: undefined,
				external_id: item.id?.toString?.() || '',
				list_id: 0,
				additional_data: null,
				added_by: 0,
				added_at: new Date().toISOString(),
			} as MediaItem;
			setGuestItems((prev) => {
				const updated = { ...prev, [mediaType]: [...prev[mediaType], guestItem] };
				localStorage.setItem(`guestItems_${mediaType}`, JSON.stringify(updated[mediaType]));
				return updated;
			});
			setShowSavePrompt(true);
			return;
		}
		addItemToAutoList(item, mediaType);
	};

	const loadGuestItems = (mediaType: 'movie' | 'book' | 'album') => {
		try {
			const stored = localStorage.getItem(`guestItems_${mediaType}`);
			const parsed = stored ? JSON.parse(stored) : [];
			setGuestItems((prev) => ({ ...prev, [mediaType]: Array.isArray(parsed) ? parsed : [] }));
		} catch {
			setGuestItems((prev) => ({ ...prev, [mediaType]: [] }));
		}
	};
	const { user, isAuthenticated } = useAuth();
	const navigate = useNavigate();
	const { userId } = useParams<{ userId: string }>();
	const viewingOtherUser = userId && parseInt(userId) !== user?.id;
	const [selectedMediaType, setSelectedMediaType] = useState<'movie' | 'book' | 'album'>('movie');
	const [loading, setLoading] = useState(false);
	const [autoListId, setAutoListId] = useState<number | null>(null);
	const [autoItems, setAutoItems] = useState<MediaItem[]>([]);
	const [loadingItems, setLoadingItems] = useState(false);
	const [guestItems, setGuestItems] = useState<Record<'movie' | 'book' | 'album', MediaItem[]>>({
		movie: [],
		book: [],
		album: [],
	});
	const [showSavePrompt, setShowSavePrompt] = useState(false);
	const [, setHasPendingFriendRequests] = useState(false);

	useEffect(() => {
		const fetchFriendRequests = async () => {
			if (!isAuthenticated) {
				setHasPendingFriendRequests(false);
				return;
			}
			try {
				const reqs = await getFriendRequests();
				setHasPendingFriendRequests(
					Array.isArray(reqs) && reqs.some((r) => r.status === 'pending')
				);
			} catch (err) {
				console.error('Error fetching friend requests', err);
				setHasPendingFriendRequests(false);
			}
		};
		fetchFriendRequests();
	}, [isAuthenticated]);

	// load items (server or guest) when media type or auth state changes
	React.useEffect(() => {
		let cancelled = false;
		const load = async () => {
			setLoadingItems(true);
			if (!isAuthenticated) {
				loadGuestItems(selectedMediaType);
				setAutoItems([]);
				setAutoListId(null);
				setLoadingItems(false);
				return;
			}
			try {
				// If viewing another user's content
				if (viewingOtherUser) {
					const full = await getUserAutoList(parseInt(userId!), selectedMediaType);
					if (cancelled) return;
					setAutoListId(full.id);
					setAutoItems(Array.isArray(full.mediaItems) ? full.mediaItems : []);
				} else {
					// Viewing own content
					const list = await getOrCreateAutoList(selectedMediaType);
					if (cancelled) return;
					setAutoListId(list.id);
					const full = await getList(list.id);
					if (cancelled) return;
					setAutoItems(Array.isArray(full.mediaItems) ? full.mediaItems : []);
				}
			} catch (err) {
				console.error('Error loading auto list items:', err);
				setAutoItems([]);
				setAutoListId(null);
			} finally {
				if (!cancelled) setLoadingItems(false);
			}
		};
		load();
		return () => {
			cancelled = true;
		};
	}, [selectedMediaType, isAuthenticated, viewingOtherUser, userId]);

	// If a user signs in after picking items, sync guest items once
	const hasSyncedRef = React.useRef(false);
	React.useEffect(() => {
		const syncGuestItems = async () => {
			if (!isAuthenticated || hasSyncedRef.current) return;
			hasSyncedRef.current = true;

			for (const mediaType of ['movie', 'book', 'album'] as const) {
				const stored = localStorage.getItem(`guestItems_${mediaType}`);
				const parsed: any[] = stored ? JSON.parse(stored) : [];
				for (const item of parsed) {
					await addItemToAutoList(item, mediaType);
				}
				localStorage.removeItem(`guestItems_${mediaType}`);
			}
			setGuestItems({ movie: [], book: [], album: [] });
			setShowSavePrompt(false);
		};
		syncGuestItems();
	}, [isAuthenticated]);

	const handleRate = async (mediaId: number, rating: number) => {
		if (!isAuthenticated || !autoListId) return;
		try {
			await rateMedia(autoListId, mediaId, rating);
			const full = await getList(autoListId);
			setAutoItems(Array.isArray(full.mediaItems) ? full.mediaItems : []);
		} catch (err) {
			console.error('Error rating item:', err);
		}
	};

	const handleRemove = async (mediaId: number) => {
		if (!isAuthenticated) {
			setGuestItems((prev) => {
				const filtered = prev[selectedMediaType].filter((mi) => mi.id !== mediaId);
				const updated = { ...prev, [selectedMediaType]: filtered };
				localStorage.setItem(`guestItems_${selectedMediaType}`, JSON.stringify(filtered));
				return updated;
			});
			return;
		}
		if (!autoListId) return;
		try {
			await deleteMediaFromList(autoListId, mediaId);
			const full = await getList(autoListId);
			setAutoItems(Array.isArray(full.mediaItems) ? full.mediaItems : []);
		} catch (err) {
			console.error('Error removing item:', err);
		}
	};

	return (
		<div className="page-container">
			<Header title="" />
			{!viewingOtherUser && (
				<SearchBar
					onSelect={() => {}}
					mediaType={selectedMediaType}
					setSelectedMediaType={setSelectedMediaType}
					selectedMediaType={selectedMediaType}
					onMediaSelected={handleMediaSelected}
				/>
			)}
			<div className="media-section-body">
				<div className="search-panel">
					{showSavePrompt && !isAuthenticated && (
						<div className="save-prompt">
							<div>
								<div className="save-prompt-title">Saved locally.</div>
								<div className="save-prompt-body">
									Create a free account to keep your media in sync across devices.
								</div>
							</div>
							<div className="save-prompt-actions">
								<button onClick={() => navigate('/auth?mode=register')} className="primary">
									Create account
								</button>
								<button onClick={() => setShowSavePrompt(false)}>Keep browsing</button>
							</div>
						</div>
					)}
					{loading && <div className="loading-text">Adding to your list...</div>}
					<div className="auto-items">
						<h3 className="auto-items-title">
							{(isAuthenticated ? autoItems : guestItems[selectedMediaType]).length ? (
								`Your ${selectedMediaType === 'movie' ? 'Movies' : selectedMediaType === 'book' ? 'Books' : 'Albums'}`
							) : !isAuthenticated ? (
								<>
									<div className="intro">
										<p>Thanks for trying Mediator!</p>
										<p>
											Use it to keep track of the movies you've watched, the books you've read or
											the albums you own.
										</p>
										<p>
											Mediator is a work in progress by Field 2 Design /{' '}
											<a href="https://bendunkle.com" target="_blank">
												Ben Dunkle
											</a>
											.
										</p>
										<p>Copyright 2026 by Ben Dunkle. All Rights Reserved.</p>
									</div>
								</>
							) : (
								`No ${selectedMediaType === 'movie' ? 'Movies' : selectedMediaType === 'book' ? 'Books' : 'Albums'} yet.`
							)}
						</h3>
						{loadingItems ? (
							<div>Loading your items...</div>
						) : (isAuthenticated ? autoItems : guestItems[selectedMediaType]).length > 0 ? (
							<div className="auto-items-grid">
								{(isAuthenticated ? autoItems : guestItems[selectedMediaType]).map((mi) => (
									<div key={mi.id} className="auto-item-card">
										<button
											className="auto-item-remove"
											onClick={() => handleRemove(mi.id)}
											aria-label="Remove item"
										>
											×
										</button>
										<img
											src={mi.poster_url || '/placeholder.png'}
											alt={mi.title}
											className="auto-item-img"
										/>
										<div className="auto-item-title">{mi.title}</div>
										{mi.year && <div className="auto-item-year">{mi.year}</div>}
										<div className="auto-item-rating">
											<StarRating
												rating={mi.userRating || 0}
												onRate={(r) => handleRate(mi.id, r)}
												readonly={!user || !isAuthenticated}
											/>
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
