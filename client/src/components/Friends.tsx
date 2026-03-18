import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
	searchUsers,
	sendFriendRequest,
	getFriends,
	getFriendRequests,
	respondToFriendRequest,
	getIncomingRecommendations,
	respondToRecommendation,
	removeFriend,
} from '../api';
// ...existing code...
import IconSearch from '../assets/icon-search.svg';
import IconClose from '../assets/icon-close-black.svg';
import IconCloseSmall from '../assets/icon-close-black-small.svg';
import IconCheckmark from '../assets/icon-checkmark.svg';
import IconFriendAdd from '../assets/icon-friend-add-black.svg';
import { User, Recommendation } from '../types';
import Header from './Header';

const Friends: React.FC = () => {
	const navigate = useNavigate();
	const [query, setQuery] = useState('');
	const [searchResults, setSearchResults] = useState<any[]>([]);
	const [friends, setFriends] = useState<User[]>([]);
	const [loading, setLoading] = useState(false);
	const [requests, setRequests] = useState<any[]>([]);
	const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
	const [showResults, setShowResults] = useState(false);
	const debounceTimer = useRef<number | null>(null);
	const inputRef = useRef<HTMLInputElement | null>(null);
	const searchBarRef = useRef<HTMLDivElement | null>(null);
	// ...existing code...

	// Load friends and requests on mount
	useEffect(() => {
		loadFriends();
		loadRequests();
		loadRecommendations();
	}, []);

	// (menu handled by shared Header)

	const loadFriends = async () => {
		try {
			const friendsList = await getFriends();
			setFriends(friendsList);
		} catch (error) {
			console.error('Error loading friends:', error);
		}
	};

	const loadRequests = async () => {
		try {
			const reqs = await getFriendRequests();
			setRequests((Array.isArray(reqs) ? reqs : []).filter((req) => req.status === 'pending'));
		} catch (error) {
			console.error('Error loading friend requests:', error);
		}
	};

	const loadRecommendations = async () => {
		try {
			const incoming = await getIncomingRecommendations();
			setRecommendations(Array.isArray(incoming) ? incoming : []);
		} catch (error) {
			console.error('Error loading recommendations:', error);
		}
	};

	// Search users
	useEffect(() => {
		if (query.trim().length < 2) {
			setSearchResults([]);
			setShowResults(false);
			return;
		}

		if (debounceTimer.current) {
			clearTimeout(debounceTimer.current);
		}

		debounceTimer.current = window.setTimeout(async () => {
			setLoading(true);
			try {
				const resp = await searchUsers(query);
				console.log('searchUsers response:', resp);
				const results = Array.isArray(resp)
					? resp
					: ((resp as any)?.users ?? (resp as any)?.data ?? []);
				setSearchResults(results || []);
				setShowResults(true);
			} catch (err) {
				console.error('Error searching users:', err);
				setSearchResults([]);
				setShowResults(true);
			} finally {
				setLoading(false);
			}
		}, 300);

		return () => {
			if (debounceTimer.current) clearTimeout(debounceTimer.current);
		};
	}, [query]);

	// Keep page-level class when results are visible so CSS can react (matches SearchBar behavior)
	useEffect(() => {
		const page = document.querySelector('.page-container');
		if (showResults) page?.classList.add('search-open');
		else page?.classList.remove('search-open');
		return () => {
			page?.classList.remove('search-open');
		};
	}, [showResults]);

	const handleAddFriend = async (userId: number) => {
		try {
			await sendFriendRequest(userId);
			alert('Friend request sent!');
			// Update the results to show pending status
			setSearchResults(
				searchResults.map((r) => (r.id === userId ? { ...r, hasPendingRequest: true } : r))
			);
			// notify header/other components to refresh pending indicator
			document.dispatchEvent(new CustomEvent('friend-requests-updated'));
		} catch (error: any) {
			console.error('Error sending friend request:', error);
			alert(error.response?.data?.error || 'Failed to send friend request');
		}
	};

	const handleRespond = async (requestId: number, status: 'approved' | 'rejected') => {
		try {
			await respondToFriendRequest(requestId, status);
			// Immediately remove from UI
			setRequests(requests.filter((req) => req.id !== requestId));
			if (status === 'approved') await loadFriends();
			// notify header/other components that pending requests changed
			document.dispatchEvent(
				new CustomEvent('friend-requests-updated', { detail: { cleared: true } })
			);
		} catch (error: any) {
			console.error('Error responding to friend request:', error);
			alert(error.response?.data?.error || 'Failed to update request');
			// Reload on error
			await loadRequests();
		}
	};

	const handleRemoveFriend = async (friendId: number) => {
		if (!window.confirm('Remove this friend?')) return;
		try {
			await removeFriend(friendId);
			setFriends((prev) => prev.filter((f) => (f.id ?? f.userId) !== friendId));
			document.dispatchEvent(new CustomEvent('friend-requests-updated'));
		} catch (error: any) {
			console.error('Error removing friend:', error);
			alert(error.response?.data?.error || 'Failed to remove friend');
		}
	};

	const handleRecommendationRespond = async (
		recommendationId: number,
		status: 'approved' | 'rejected'
	) => {
		try {
			await respondToRecommendation(recommendationId, status);
			setRecommendations((prev) => prev.filter((rec) => rec.id !== recommendationId));
			document.dispatchEvent(new CustomEvent('friend-requests-updated'));
		} catch (error: any) {
			console.error('Error responding to recommendation:', error);
			alert(error.response?.data?.error || 'Failed to update recommendation');
			await loadRecommendations();
		}
	};

	return (
		<div className="page-container">
			<Header title="Friends" />
			<div className="view-body">
				<div className="search-bar" ref={searchBarRef}>
					<input
						ref={inputRef}
						type="text"
						placeholder="Search users"
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						onFocus={() => setShowResults(true)}
						className="search-input"
					/>

					<button
						className="search-icon-btn "
						tabIndex={-1}
						type="button"
						aria-label={showResults ? 'Close search' : 'Search'}
						onClick={(e) => {
							e.stopPropagation();
							if (showResults) {
								setQuery('');
								setSearchResults([]);
								setShowResults(false);
								inputRef.current?.blur();
							} else {
								inputRef.current?.focus();
								setShowResults(searchResults.length > 0);
							}
						}}
					>
						{showResults ? (
							<img src={IconClose} alt="Clear" />
						) : (
							<img src={IconSearch} alt="Search" />
						)}
					</button>
				</div>

				{(loading || showResults) && (
					<div className="search-dropdown">
						{loading && <div className="loading">Searching...</div>}

						{!loading && searchResults.length > 0 && (
							<div className="search-list">
								{searchResults.map((user) => (
									<div key={user.id} className="search-user-item">
										<span className="username">{user.username}</span>
										{user.isFriend ? (
											<span className="badge friends">Friends</span>
										) : user.hasPendingRequest ? (
											<span className="badge pending">Pending</span>
										) : (
											<button className="tap-icon" onClick={() => handleAddFriend(user.id)}>
												<img src={IconFriendAdd} alt="Add friend" />
											</button>
										)}
									</div>
								))}
							</div>
						)}

						{!loading && searchResults.length === 0 && query.trim().length >= 2 && (
							<div className="no-results">No users found</div>
						)}
					</div>
				)}

				<div className="friends-list">
					{(requests.length > 0 || recommendations.length > 0) && (
						<div className="friend-requests">
							{requests.length > 0 && (
								<div className="requests-section">
									<h2>Friend Requests</h2>
									<div className="friend-requests-list">
										{requests.map((req) => (
											<div key={req.id} className="friend-request-item">
												<div className="request-name">{req.username}</div>
												<div className="request-actions">
													<button
														className="tap-icon"
														onClick={() => handleRespond(req.id, 'approved')}
													>
														<img src={IconCheckmark} alt="" />
													</button>
													<button
														className="tap-icon"
														onClick={() => handleRespond(req.id, 'rejected')}
													>
														<img src={IconClose} alt="" />
													</button>
												</div>
											</div>
										))}
									</div>
								</div>
							)}

							{recommendations.length > 0 && (
								<div className="requests-section">
									<h2>Recommendations</h2>
									<div className="friend-requests-list">
										{recommendations.map((rec) => (
											<div key={rec.id} className="friend-request-item recommendation-item">
												<div className="recommendation-poster-wrap">
													<img
														src={rec.poster_url || '/placeholder.png'}
														alt={rec.title}
														className="recommendation-poster"
													/>
												</div>
												<div className="request-name">
													<div>
														{rec.title}
														{rec.year ? ` (${rec.year})` : ''}
													</div>
													<div className="request-meta">From {rec.from_username}</div>
												</div>
												<div className="request-actions">
													<button
														className="tap-icon"
														onClick={() => handleRecommendationRespond(rec.id, 'approved')}
													>
														<img src={IconCheckmark} alt="Clear" />
													</button>
													<button
														className="tap-icon"
														onClick={() => handleRecommendationRespond(rec.id, 'rejected')}
													>
														<img src={IconClose} alt="Clear" />
													</button>
												</div>
											</div>
										))}
									</div>
								</div>
							)}
						</div>
					)}
					<h2>Your Friends ({friends.length})</h2>
					{friends.length > 0 ? (
						<div className="friends-grid">
							{friends.map((friend) => (
								<div key={friend.id ?? friend.userId} className="friend-card">
									<div className="friend-links">
										<button onClick={() => navigate(`/user/${friend.id ?? friend.userId}`)}>
											{friend.username}
										</button>{' '}
										<button
											className="remove-friend-btn"
											aria-label={`Remove ${friend.username}`}
											onClick={() => handleRemoveFriend(friend.id ?? friend.userId!)}
										>
											<img src={IconCloseSmall} alt="Clear" />
										</button>{' '}
									</div>
								</div>
							))}
						</div>
					) : (
						<p className="empty">No friends yet. Search to add some!</p>
					)}
				</div>
			</div>
		</div>
	);
};

export default Friends;
