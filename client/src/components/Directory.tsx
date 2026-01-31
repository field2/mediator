import React, { useState, useEffect } from 'react';
import { getAllUsers, sendFriendRequest } from '../api';
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
		} catch (err) {
			console.error('Error sending friend request:', err);
			alert('Failed to send friend request');
		}
	};

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
			<Header title="User Directory" />
			<div className="view-body">
				<div className="directory-list">
					{users.map((user) => (
						<div key={user.id} className="directory-item">
							<div className="directory-user-info">
								<span className="directory-username">{user.username}</span>
							</div>
							<div className="directory-actions">
								{user.isFriend ? (
									<span className="friend-status">Friends</span>
								) : user.hasPendingRequest ? (
									<span className="pending-status">Request Pending</span>
								) : (
									<button className="add-friend-button" onClick={() => handleAddFriend(user.id)}>
										+
									</button>
								)}
							</div>
						</div>
					))}
				</div>
			</div>
		</div>
	);
};

export default Directory;
