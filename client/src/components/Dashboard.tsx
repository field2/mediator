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
import AutoItemCard from './AutoItemCard';

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
									<div className="logo-splash" aria-label="Home">
										<svg
											width="21"
											height="20"
											viewBox="0 0 21 20"
											fill="none"
											xmlns="http://www.w3.org/2000/svg"
										>
											<path
												d="M16.2706 6.98744C17.2439 3.5462 17.6856 0.602478 16.8772 0.0942718C16.2004 -0.331793 13.8494 0.732034 11.1474 2.36417C12.1092 2.53045 13.2673 3.3699 13.6109 4.96664C13.6402 5.10287 13.6633 5.24378 13.6804 5.39003C13.7335 5.85483 13.6845 6.4218 13.5638 7.03619C13.0403 9.70878 11.1631 13.2829 10.4304 13.2829C9.69761 13.2829 7.8204 9.70878 7.29691 7.03619C7.17626 6.4218 7.12718 5.85483 7.18035 5.39003C7.19739 5.24378 7.22057 5.10287 7.24988 4.9673C7.59342 3.36989 8.75151 2.53045 9.71329 2.36417C7.01131 0.732034 4.66036 -0.331793 3.9835 0.0942718C3.17509 0.602478 3.61678 3.5462 4.59015 6.98744C1.81523 9.21526 -0.243292 11.3055 0.0232253 12.1056C0.234531 12.7413 2.3953 13.1948 5.24247 13.4459C4.56016 12.8582 4.15663 12.2111 4.15663 11.6408C4.15663 10.6958 4.56084 9.77222 5.1859 8.95281C6.81977 14.0249 9.26137 19.3707 10.4304 19.3707C11.5994 19.3707 14.041 14.0249 15.6748 8.95281C16.2999 9.77222 16.7041 10.6958 16.7041 11.6408C16.7041 12.2111 16.3006 12.8582 15.6183 13.4459C18.4654 13.1948 20.6262 12.7413 20.8375 12.1056C21.104 11.3055 19.0455 9.21526 16.2706 6.98744Z"
												fill="white"
											/>
										</svg>
										<span className="logo-type">mediator</span>
									</div>

									<div className="intro">
										<div className="intro-actions">
											<button onClick={() => navigate('/auth?mode=login')} className="secondary">
												Log in
											</button>
											<button onClick={() => navigate('/auth?mode=register')} className="primary">
												Create account
											</button>
										</div>
										<div className="intro-blurb">
											<p>Thanks for trying Mediator!</p>
											<p>
												Use it to keep track of the movies you've watched, the books you've read or
												the albums you own.
											</p>
											<p>
												Mediator is a work in progress<br></br>by Field 2 Design /{' '}
												<a href="https://bendunkle.com" target="_blank">
													Ben Dunkle
												</a>
												.
											</p>
											<p>
												Copyright 2026 by Ben Dunkle.
												<br />
												All Rights Reserved.
											</p>
										</div>
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
									<AutoItemCard
										key={mi.id}
										item={mi}
										isAuthenticated={isAuthenticated}
										onRate={handleRate}
										onRemove={handleRemove}
									/>
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
