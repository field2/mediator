import React, { useState, useEffect } from 'react';
import { getAllUsers, sendFriendRequest, cancelFriendRequest, removeFriend } from '../api';
import { useAuth } from '../AuthContext';

import Header from './Header';

interface DirectoryUser {
	id: number;
	username: string;
	isFriend: boolean;
	hasPendingRequest: boolean;
}

const Directory: React.FC = () => {
	const [users, setUsers] = useState<DirectoryUser[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const { isAuthenticated } = useAuth();

	useEffect(() => {
		if (isAuthenticated) {
			loadUsers();
		}
	}, [isAuthenticated]);

	const loadUsers = async () => {
		try {
			setLoading(true);
			const data = await getAllUsers();
			setUsers(data);
		} catch (err) {
			console.error('Error loading users:', err);
			setError('Failed to load users');
		} finally {
			setLoading(false);
		}
	};

	const handleAddFriend = async (userId: number) => {
		try {
			await sendFriendRequest(userId);
			// Refresh users to update pending request status
			await loadUsers();
			// notify other components (e.g., Header) to refresh pending state
			document.dispatchEvent(new CustomEvent('friend-requests-updated'));
		} catch (err) {
			console.error('Error sending friend request:', err);
			alert('Failed to send friend request');
		}
	};

	// Confirmation modal state
	const [confirmOpen, setConfirmOpen] = useState(false);
	const [confirmUserId, setConfirmUserId] = useState<number | null>(null);
	const [confirmType, setConfirmType] = useState<'add' | 'cancel' | 'remove' | null>(null);

	const openConfirm = (type: 'add' | 'cancel' | 'remove', userId: number) => {
		setConfirmType(type);
		setConfirmUserId(userId);
		setConfirmOpen(true);
	};

	const closeConfirm = () => {
		setConfirmOpen(false);
		setConfirmUserId(null);
		setConfirmType(null);
	};

	const handleConfirm = async () => {
		if (confirmUserId == null || !confirmType) return closeConfirm();
		try {
			if (confirmType === 'add') {
				await handleAddFriend(confirmUserId);
			} else if (confirmType === 'cancel') {
				await cancelFriendRequest(confirmUserId);
				// refresh and notify header to clear pending
				await loadUsers();
				document.dispatchEvent(
					new CustomEvent('friend-requests-updated', { detail: { cleared: true } })
				);
			} else if (confirmType === 'remove') {
				await removeFriend(confirmUserId);
				// refresh users
				await loadUsers();
				document.dispatchEvent(new CustomEvent('friend-requests-updated'));
			}
		} catch (err) {
			console.error('Friend action failed:', err);
			alert('Action failed');
		} finally {
			closeConfirm();
		}
	};

	// handlers invoked by UI
	const handlePendingFriend = (userId: number) => openConfirm('cancel', userId);
	const handleRemoveFriend = (userId: number) => openConfirm('remove', userId);

	if (!isAuthenticated) {
		return (
			<div className="view-body">
				<p>Please log in to view the directory.</p>
			</div>
		);
	}

	if (loading) {
		return <div className="spinner"></div>;
	}

	if (error) {
		return (
			<div className="view-body">
				<p>{error}</p>
			</div>
		);
	}

	return (
		<div className="page-container">
			<Header title="Directory" />
			<div className="view-body">
				<div className="directory-list">
					{users.map((user) => (
						<div key={user.id} className="directory-item">
							{user.isFriend ? (
								<>
									<div className="directory-user-info">
										<button
											className="remove-friend-button"
											onClick={() => handleRemoveFriend(user.id)}
											aria-label={`Remove ${user.username}`}
										>
											<span className="directory-username">{user.username}</span>{' '}
											<div className="directory-actions">
												<span className="remove-icon">–</span>
											</div>
										</button>
									</div>
								</>
							) : user.hasPendingRequest ? (
								<>
									<div className="directory-user-info">
										<button
											className="pending-friend-button"
											onClick={() => handlePendingFriend(user.id)}
											aria-label={`Pending ${user.username}`}
										>
											<span className="directory-username">{user.username}</span>{' '}
											<div className="directory-actions">
												<span className="pending-icon">...</span>
											</div>
										</button>
									</div>
								</>
							) : (
								<>
									<div className="directory-user-info">
										<button
											className="add-friend-button"
											onClick={() => openConfirm('add', user.id)}
											aria-label={`Add ${user.username}`}
										>
											<span className="directory-username">{user.username}</span>{' '}
											<div className="directory-actions">
												<span className="add-icon">+</span>
											</div>
										</button>
									</div>
								</>
							)}
						</div>
					))}
				</div>
				{confirmOpen && (
					<div className="modal" role="dialog" aria-modal="true">
						<div className="modal-content">
							<div className="modal-body">
								<p>
									{confirmType === 'add'}
									{confirmType === 'cancel'}
									{confirmType === 'remove'}
								</p>
								<div className="modal-actions">
									<button onClick={handleConfirm} className="primary">
										{confirmType === 'add'
											? 'Confirm request'
											: confirmType === 'cancel'
												? 'Cancel request'
												: 'Remove friend'}
									</button>
								</div>
							</div>
							<button className="modal-close" aria-label="Close" onClick={closeConfirm}>
								<svg
									width="28"
									height="28"
									viewBox="0 0 24 24"
									fill="none"
									xmlns="http://www.w3.org/2000/svg"
								>
									<rect width="28" height="28" fill="none" />
									<path
										d="M6 6L18 18M6 18L18 6"
										stroke="black"
										strokeWidth="2"
										strokeLinecap="round"
										strokeLinejoin="round"
									/>
								</svg>
							</button>
						</div>
					</div>
				)}
			</div>
		</div>
	);
};

export default Directory;
