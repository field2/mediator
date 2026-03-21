import React, { useState, useEffect } from 'react';
import { getAdminUsers, deleteUser } from '../api';
import { useAuth } from '../AuthContext';
import Header from './Header';

interface AdminUser {
	id: number;
	username: string;
	email: string;
	created_at: string;
	is_admin: number;
	media_count: number;
}

const Admin: React.FC = () => {
	const [users, setUsers] = useState<AdminUser[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const { user } = useAuth();

	const [confirmOpen, setConfirmOpen] = useState(false);
	const [confirmUserId, setConfirmUserId] = useState<number | null>(null);
	const [confirmUsername, setConfirmUsername] = useState<string>('');

	useEffect(() => {
		loadUsers();
	}, []);

	const loadUsers = async () => {
		try {
			setLoading(true);
			const data = await getAdminUsers();
			setUsers(data);
		} catch (err) {
			console.error('Error loading admin users:', err);
			setError('Failed to load users');
		} finally {
			setLoading(false);
		}
	};

	const openConfirm = (userId: number, username: string) => {
		setConfirmUserId(userId);
		setConfirmUsername(username);
		setConfirmOpen(true);
	};

	const closeConfirm = () => {
		setConfirmOpen(false);
		setConfirmUserId(null);
		setConfirmUsername('');
	};

	const handleConfirm = async () => {
		if (confirmUserId == null) return closeConfirm();
		try {
			await deleteUser(confirmUserId);
			await loadUsers();
		} catch (err) {
			console.error('Delete user failed:', err);
			alert('Failed to delete user');
		} finally {
			closeConfirm();
		}
	};

	if (loading) return <div className="spinner"></div>;

	if (error) {
		return (
			<div className="view-body">
				<p>{error}</p>
			</div>
		);
	}

	return (
		<div className="page-container">
			<Header title="Admin" />
			<div className="view-body">
				<div className="directory-list">
					{users.map((u) => (
						<div key={u.id} className="directory-item">
							<div className="directory-user-info">
								{u.id === user?.userId ? (
									<span className="directory-username">{u.username} (you)</span>
								) : (
									<button
										className="remove-friend-button"
										onClick={() => openConfirm(u.id, u.username)}
										aria-label={`Remove ${u.username}`}
									>
										<span className="directory-username">
											{u.username}
											{u.is_admin ? ' ★' : ''}
										</span>
										<div className="directory-actions">
											<span className="remove-icon">–</span>
										</div>
									</button>
								)}
								<span className="directory-stats">
									{u.media_count} item{u.media_count !== 1 ? 's' : ''}
								</span>
							</div>
						</div>
					))}
				</div>
			</div>

			{confirmOpen && (
				<div className="modal-overlay" onClick={closeConfirm}>
					<div className="modal-content" onClick={(e) => e.stopPropagation()}>
						<p>
							Remove user <strong>{confirmUsername}</strong>? This cannot be undone.
						</p>
						<div className="modal-actions">
							<button className="btn-secondary" onClick={closeConfirm}>
								Cancel
							</button>
							<button className="btn-danger" onClick={handleConfirm}>
								Remove
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
};

export default Admin;
