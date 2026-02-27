import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
	searchUsers,
	sendFriendRequest,
	getFriends,
	getFriendRequests,
	respondToFriendRequest,
} from '../api';
// ...existing code...
import IconSearch from '../assets/icon-search.svg';
import IconClose from '../assets/icon-close.svg';
import { User } from '../types';
import Header from './Header';

const Friends: React.FC = () => {
	const navigate = useNavigate();
	const [query, setQuery] = useState('');
	const [searchResults, setSearchResults] = useState<any[]>([]);
	const [friends, setFriends] = useState<User[]>([]);
	const [loading, setLoading] = useState(false);
	const [requests, setRequests] = useState<any[]>([]);
	const [showResults, setShowResults] = useState(false);
	const debounceTimer = useRef<number | null>(null);
	const inputRef = useRef<HTMLInputElement | null>(null);
	const searchBarRef = useRef<HTMLDivElement | null>(null);
	const [container, setContainer] = useState<HTMLElement | null>(null);
	// ...existing code...

	// Load friends and requests on mount
	useEffect(() => {
		loadFriends();
		loadRequests();
	}, []);

	// (menu handled by shared Header)

	// find container (closest .page-container) to portal the dropdown like SearchBar
	useEffect(() => {
		let portalRoot: HTMLElement | null = null;
		if (searchBarRef.current) {
			let el = searchBarRef.current.parentElement;
			while (el && !el.classList.contains('page-container')) {
				el = el.parentElement;
			}
			const page = el || document.body;
			const viewBody = page.querySelector('.view-body');
			portalRoot = document.createElement('div');
			portalRoot.className = 'search-portal';
			if (viewBody && viewBody.parentElement === page) {
				page.insertBefore(portalRoot, viewBody);
			} else {
				page.appendChild(portalRoot);
			}
			setContainer(portalRoot);
		}

		return () => {
			if (portalRoot && portalRoot.parentElement) portalRoot.parentElement.removeChild(portalRoot);
		};
	}, []);

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
			setRequests(reqs);
		} catch (error) {
			console.error('Error loading friend requests:', error);
		}
	};

	// Search users
	useEffect(() => {
		if (query.trim().length < 1) {
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

				{container && (loading || showResults)
					? createPortal(
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
													<button className="add-button " onClick={() => handleAddFriend(user.id)}>
														Add
													</button>
												)}
											</div>
										))}
									</div>
								)}

								{!loading && searchResults.length === 0 && query.trim().length >= 2 && (
									<div className="no-results">No users found</div>
								)}
							</div>,
							container
						)
					: null}

				<div className="friends-list">
					{requests.length > 0 && (
						<div className="friend-requests">
							<h2>Friend Requests</h2>
							<div className="friend-requests-list">
								{requests.map((req) => (
									<div key={req.id} className="friend-request-item">
										<div className="request-name">{req.username}</div>
										<div className="request-actions">
											<button className="approve" onClick={() => handleRespond(req.id, 'approved')}>
												Approve
											</button>
											<button className="deny" onClick={() => handleRespond(req.id, 'rejected')}>
												Deny
											</button>
										</div>
									</div>
								))}
							</div>
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
										</button>
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
