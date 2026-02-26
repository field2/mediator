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
	updateMediaNotes,
	getFriendRequests,
	getUserAutoList,
	getWatchedWithFriends,
	addWatchedWithFriend,
	removeWatchedWithFriend,
	getFriends,
} from '../api';
import { MediaItem, User } from '../types';
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
	const [flippedCardId, setFlippedCardId] = useState<number | null>(null);
	const [cardTransform, setCardTransform] = useState({ x: 0, y: 0 });
	const [cardNotes, setCardNotes] = useState<{ [key: number]: string }>({});
	const [editingNotes, setEditingNotes] = useState<{ [key: number]: boolean }>({});
	const textareaRefs = React.useRef<{ [key: number]: HTMLTextAreaElement | null }>({});
	const [watchedWith, setWatchedWith] = useState<{ [key: number]: User[] }>({});
	const [editingWatchedWith, setEditingWatchedWith] = useState<{ [key: number]: boolean }>({});
	const [friendsList, setFriendsList] = useState<User[]>([]);
	const [watchedWithSearch, setWatchedWithSearch] = useState<{ [key: number]: string }>({});

	// Reset flipped card when media type changes
	useEffect(() => {
		setFlippedCardId(null);
	}, [selectedMediaType]);

	// Close flipped card when clicking anywhere
	useEffect(() => {
		const handleClickOutside = () => {
			if (flippedCardId !== null) {
				setFlippedCardId(null);
			}
		};

		if (flippedCardId !== null) {
			document.addEventListener('click', handleClickOutside);
			return () => {
				document.removeEventListener('click', handleClickOutside);
			};
		}
	}, [flippedCardId]);

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

	// Load friends list for watched with feature
	useEffect(() => {
		const loadFriends = async () => {
			if (!isAuthenticated) {
				setFriendsList([]);
				return;
			}
			try {
				const friends = await getFriends();
				setFriendsList(Array.isArray(friends) ? friends : []);
			} catch (err) {
				console.error('Error loading friends:', err);
				setFriendsList([]);
			}
		};
		loadFriends();
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

	const handleFlipCard = (mediaId: number, event: React.MouseEvent) => {
		event.stopPropagation();
		if (flippedCardId === mediaId) {
			setFlippedCardId(null);
			return;
		}

		// Calculate transform to center the card
		const card = (event.currentTarget as HTMLElement).closest('.auto-item-card') as HTMLElement;
		if (card) {
			const rect = card.getBoundingClientRect();
			const root = document.getElementById('root');
			if (root) {
				const rootRect = root.getBoundingClientRect();
				const scale = 4;

				// Calculate how much to translate to center the scaled card
				const centerX = rootRect.width / 2;
				const centerY = rootRect.height / 2;
				const cardCenterX = rect.left - rootRect.left + rect.width / 2;
				const cardCenterY = rect.top - rootRect.top + rect.height / 2;

				// Translate values need to account for the scale
				const translateX = (centerX - cardCenterX) / scale;
				const translateY = (centerY - cardCenterY) / scale;

				setCardTransform({ x: translateX, y: translateY });
			}
		}
		setFlippedCardId(mediaId);
	};

	const formatDate = (dateString: string | null): string => {
		if (!dateString) return '';
		const date = new Date(dateString);
		const day = String(date.getDate()).padStart(2, '0');
		const month = String(date.getMonth() + 1).padStart(2, '0');
		const year = String(date.getFullYear()).slice(-2);
		return `${month}/${day}/${year}`;
	};

	const handleNotesChange = (mediaId: number, notes: string) => {
		setCardNotes((prev) => ({ ...prev, [mediaId]: notes }));
	};

	const handleSaveNotes = async (mediaId: number, listId: number) => {
		if (!isAuthenticated) return;
		try {
			const notes = cardNotes[mediaId] || '';
			await updateMediaNotes(listId, mediaId, notes);
			setEditingNotes((prev) => ({ ...prev, [mediaId]: false }));
		} catch (err) {
			console.error('Error saving notes:', err);
		}
	};

	const handleEditNotes = (mediaId: number) => {
		setEditingNotes((prev) => ({ ...prev, [mediaId]: true }));
		// Focus the textarea after state updates
		setTimeout(() => {
			const textarea = textareaRefs.current[mediaId];
			if (textarea) {
				textarea.focus();
				// Move cursor to end of text
				textarea.selectionStart = textarea.value.length;
				textarea.selectionEnd = textarea.value.length;
			}
		}, 0);
	};

	const handleLoadWatchedWith = async (mediaId: number, listId: number) => {
		if (!isAuthenticated) return;
		try {
			const friends = await getWatchedWithFriends(listId, mediaId);
			setWatchedWith((prev) => ({ ...prev, [mediaId]: Array.isArray(friends) ? friends : [] }));
		} catch (err) {
			console.error('Error loading watched with:', err);
		}
	};

	const handleAddWatchedWithFriend = async (mediaId: number, listId: number, friendId: number) => {
		if (!isAuthenticated) return;
		try {
			const updatedFriends = await addWatchedWithFriend(listId, mediaId, friendId);
			setWatchedWith((prev) => ({
				...prev,
				[mediaId]: Array.isArray(updatedFriends) ? updatedFriends : [],
			}));
			setWatchedWithSearch((prev) => ({ ...prev, [mediaId]: '' }));
		} catch (err) {
			console.error('Error adding watched with friend:', err);
		}
	};

	const handleRemoveWatchedWithFriend = async (
		mediaId: number,
		listId: number,
		friendId: number
	) => {
		if (!isAuthenticated) return;
		try {
			const updatedFriends = await removeWatchedWithFriend(listId, mediaId, friendId);
			setWatchedWith((prev) => ({
				...prev,
				[mediaId]: Array.isArray(updatedFriends) ? updatedFriends : [],
			}));
		} catch (err) {
			console.error('Error removing watched with friend:', err);
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
									<React.Fragment key={mi.id}>
										<div
											className={`auto-item-card${flippedCardId === mi.id ? ' flipped' : ''}`}
											style={
												flippedCardId === mi.id
													? ({
															'--card-translate-x': `${cardTransform.x}px`,
															'--card-translate-y': `${cardTransform.y}px`,
														} as React.CSSProperties)
													: {}
											}
											onClick={(e) => {
												if (flippedCardId === mi.id) {
													e.stopPropagation();
												}
											}}
										>
											<div className="auto-item-card-front">
												<div
													className="auto-item-card-menu"
													onClick={(e) => handleFlipCard(mi.id, e)}
												>
													<svg
														width="30"
														height="16"
														viewBox="0 0 30 16"
														fill="none"
														xmlns="http://www.w3.org/2000/svg"
													>
														<circle cx="7" cy="8" r="2" fill="white" />
														<circle cx="15" cy="8" r="2" fill="white" />
														<circle cx="23" cy="8" r="2" fill="white" />
													</svg>
												</div>
												<img
													src={mi.poster_url || '/placeholder.png'}
													alt={mi.title}
													className="auto-item-img"
												/>
											</div>
											<div className="auto-item-card-back">
												<div
													className="auto-item-card-back-close"
													onClick={() => setFlippedCardId(null)}
													style={{ cursor: 'pointer' }}
												>
													<svg
														width="20"
														height="20"
														viewBox="0 0 20 20"
														fill="none"
														xmlns="http://www.w3.org/2000/svg"
													>
														<path
															d="M14.2427 5.75736C14.6332 6.14788 14.6332 6.78104 14.2427 7.17157L11.4142 10L14.2427 12.8284C14.6332 13.2189 14.6332 13.8521 14.2427 14.2426C13.8521 14.6332 13.219 14.6332 12.8284 14.2426L10 11.4142L7.17158 14.2426C6.78106 14.6332 6.1479 14.6332 5.75737 14.2426C5.36685 13.8521 5.36685 13.2189 5.75737 12.8284L8.5858 10L5.75737 7.17157C5.36685 6.78104 5.36685 6.14788 5.75737 5.75736C6.1479 5.36683 6.78106 5.36683 7.17158 5.75736L10 8.58578L12.8284 5.75736C13.219 5.36683 13.8521 5.36683 14.2427 5.75736Z"
															fill="white"
														/>
													</svg>
												</div>
												<div className="card-info">
													<div className="auto-item-title">
														{mi.title} ({mi.year})
													</div>
												</div>
												<div className="card-info">
													<div className="card-info-label">Date added</div>
													<div className="auto-item-date">{formatDate(mi.added_at)}</div>
												</div>
												<div className="card-info">
													<div className="card-info-label">Rating</div>
													<div className="auto-item-rating">
														<StarRating
															rating={mi.userRating || 0}
															onRate={(r) => handleRate(mi.id, r)}
															readonly={!user || !isAuthenticated}
														/>
													</div>
												</div>
												<div className="card-info">
													<div className="card-info-label">Notes</div>

													<div className="auto-item-notes-container">
														{editingNotes[mi.id] ||
														!(cardNotes[mi.id] !== undefined ? cardNotes[mi.id] : mi.notes) ? (
															<textarea
																ref={(el) => {
																	if (el) textareaRefs.current[mi.id] = el;
																}}
																className="auto-item-notes"
																placeholder="Add notes..."
																value={
																	cardNotes[mi.id] !== undefined ? cardNotes[mi.id] : mi.notes || ''
																}
																onChange={(e) => handleNotesChange(mi.id, e.target.value)}
																onFocus={() => {
																	if (!editingNotes[mi.id]) {
																		handleEditNotes(mi.id);
																	}
																}}
															/>
														) : (
															<div className="auto-item-notes-display">
																{cardNotes[mi.id] !== undefined ? cardNotes[mi.id] : mi.notes}
															</div>
														)}
														<button
															className="auto-item-notes-btn"
															onClick={() => {
																const hasNotes =
																	cardNotes[mi.id] !== undefined ? cardNotes[mi.id] : mi.notes;
																if (editingNotes[mi.id]) {
																	handleSaveNotes(mi.id, mi.list_id);
																} else if (!hasNotes) {
																	handleEditNotes(mi.id);
																} else {
																	handleEditNotes(mi.id);
																}
															}}
															aria-label={editingNotes[mi.id] ? 'Save notes' : 'Edit notes'}
														>
															{editingNotes[mi.id] ? (
																<svg
																	className="icon-checkmark"
																	width="20"
																	height="20"
																	viewBox="0 0 20 20"
																	fill="none"
																	xmlns="http://www.w3.org/2000/svg"
																>
																	<path
																		d="M16.2187 4.12666C16.5637 3.6954 17.1937 3.6254 17.6249 3.97041C18.0562 4.31542 18.1262 4.9454 17.7812 5.37666L9.08293 16.2487L3.29289 10.4587C2.90237 10.0682 2.90237 9.43515 3.29289 9.04463C3.68342 8.65411 4.31643 8.65411 4.70696 9.04463L8.91594 13.2536L16.2187 4.12666Z"
																		fill="white"
																	/>
																</svg>
															) : (cardNotes[mi.id] !== undefined ? cardNotes[mi.id] : mi.notes) ? (
																<svg
																	className="icon-pencil"
																	width="20"
																	height="20"
																	viewBox="0 0 20 20"
																	fill="none"
																	xmlns="http://www.w3.org/2000/svg"
																>
																	<path
																		d="M13.0052 4.16637C13.3958 3.77585 14.0289 3.77585 14.4194 4.16637L15.8337 5.58059C16.2242 5.97111 16.2242 6.60427 15.8337 6.9948L14.4194 8.40901L11.591 5.58059L13.0052 4.16637ZM5.93417 11.2374L10.8839 6.28769L13.7123 9.11612L8.76259 14.0659L4.87351 15.1265L5.93417 11.2374Z"
																		fill="white"
																	/>
																</svg>
															) : (
																<svg
																	className="icon-plus"
																	width="20"
																	height="20"
																	viewBox="0 0 20 20"
																	fill="none"
																	xmlns="http://www.w3.org/2000/svg"
																>
																	<path
																		d="M10 4C10.5523 4 11 4.44772 11 5V9H15C15.5523 9 16 9.44772 16 10C16 10.5523 15.5523 11 15 11H11V15C11 15.5523 10.5523 16 10 16C9.44772 16 9 15.5523 9 15V11H5C4.44772 11 4 10.5523 4 10C4 9.44772 4.44772 9 5 9H9V5C9 4.44772 9.44772 4 10 4Z"
																		fill="white"
																	/>
																</svg>
															)}
														</button>
													</div>
												</div>
												<div className="card-info">
													<div className="card-info-label">Watched with</div>
													<div className="auto-item-watched-with-container">
														{/* Watched with friends list */}
														{watchedWith[mi.id] && watchedWith[mi.id].length > 0 && (
															<div className="auto-item-watched-with-list">
																{watchedWith[mi.id].map((friend) => (
																	<div
																		key={friend.id || friend.userId}
																		className="watched-with-friend"
																	>
																		<span>{friend.username}</span>
																		<button
																			className="remove-watched-with-btn"
																			onClick={() =>
																				handleRemoveWatchedWithFriend(
																					mi.id,
																					mi.list_id,
																					friend.id || friend.userId
																				)
																			}
																			aria-label={`Remove ${friend.username}`}
																		>
																			×
																		</button>
																	</div>
																))}
															</div>
														)}

														{/* Search/Add friends */}
														{editingWatchedWith[mi.id] && (
															<div className="auto-item-watched-with-search">
																<input
																	type="text"
																	placeholder="Search friends..."
																	value={watchedWithSearch[mi.id] || ''}
																	onChange={(e) =>
																		setWatchedWithSearch((prev) => ({
																			...prev,
																			[mi.id]: e.target.value,
																		}))
																	}
																	className="watched-with-search-input"
																/>
																<div className="watched-with-search-results">
																	{(watchedWithSearch[mi.id] || '').trim() &&
																		friendsList
																			.filter(
																				(friend) =>
																					friend.username
																						.toLowerCase()
																						.includes(
																							(watchedWithSearch[mi.id] || '').toLowerCase()
																						) &&
																					!watchedWith[mi.id]?.some(
																						(w) =>
																							(w.id || w.userId) === (friend.id || friend.userId)
																					)
																			)
																			.map((friend) => (
																				<button
																					key={friend.id || friend.userId}
																					className="search-result-item"
																					onClick={() =>
																						handleAddWatchedWithFriend(
																							mi.id,
																							mi.list_id,
																							friend.id || friend.userId
																						)
																					}
																				>
																					{friend.username}
																				</button>
																			))}
																</div>
															</div>
														)}

														<button
															className="auto-item-watched-with-btn"
															onClick={() => {
																if (!editingWatchedWith[mi.id]) {
																	// Load watched with data when first opening
																	if (!watchedWith[mi.id]) {
																		handleLoadWatchedWith(mi.id, mi.list_id);
																	}
																}
																setEditingWatchedWith((prev) => ({
																	...prev,
																	[mi.id]: !prev[mi.id],
																}));
															}}
															aria-label={editingWatchedWith[mi.id] ? 'Done' : 'Edit watched with'}
														>
															<span>Add Friend</span>
															{editingWatchedWith[mi.id] ? (
																<svg
																	className="icon-checkmark"
																	width="20"
																	height="20"
																	viewBox="0 0 20 20"
																	fill="none"
																	xmlns="http://www.w3.org/2000/svg"
																>
																	<path
																		d="M16.2187 4.12666C16.5637 3.6954 17.1937 3.6254 17.6249 3.97041C18.0562 4.31542 18.1262 4.9454 17.7812 5.37666L9.08293 16.2487L3.29289 10.4587C2.90237 10.0682 2.90237 9.43515 3.29289 9.04463C3.68342 8.65411 4.31643 8.65411 4.70696 9.04463L8.91594 13.2536L16.2187 4.12666Z"
																		fill="white"
																	/>
																</svg>
															) : (
																<svg
																	className="icon-plus"
																	width="20"
																	height="20"
																	viewBox="0 0 20 20"
																	fill="none"
																	xmlns="http://www.w3.org/2000/svg"
																>
																	<path
																		d="M10 4C10.5523 4 11 4.44772 11 5V9H15C15.5523 9 16 9.44772 16 10C16 10.5523 15.5523 11 15 11H11V15C11 15.5523 10.5523 16 10 16C9.44772 16 9 15.5523 9 15V11H5C4.44772 11 4 10.5523 4 10C4 9.44772 4.44772 9 5 9H9V5C9 4.44772 9.44772 4 10 4Z"
																		fill="black"
																	/>
																</svg>
															)}
														</button>
													</div>
												</div>
												<div className="card-info">
													<button
														className="auto-item-remove"
														onClick={() => handleRemove(mi.id)}
														aria-label="Remove item"
													>
														<span>Remove from list</span>
														<svg
															width="20"
															height="20"
															viewBox="0 0 20 20"
															fill="none"
															xmlns="http://www.w3.org/2000/svg"
														>
															<rect x="4" y="9" width="12" height="2" rx="1" fill="#000" />
														</svg>
													</button>
												</div>
											</div>
										</div>{' '}
										{flippedCardId === mi.id && <div className="backdrop-overlay" />}{' '}
									</React.Fragment>
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
