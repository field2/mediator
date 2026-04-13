import React, { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { useNavigate } from 'react-router-dom';
import { getUserStats } from '../api';
import Header from './Header';

const Account: React.FC = () => {
	const { user, isAuthenticated, logout } = useAuth();
	console.log('Account view:', { user, isAuthenticated });
	const navigate = useNavigate();
	const [stats, setStats] = useState<{
		movies: number;
		books: number;
		albums: number;
		friends: number;
	} | null>(null);

	useEffect(() => {
		if (user) {
			getUserStats().then(setStats).catch(console.error);
		}
	}, [user]);

	if (!user) return <div className="account-view">Not signed in.</div>;

	// Assume user.signupDate is ISO string, fallback to 'N/A'
	const signupDate = user.signupDate ? new Date(user.signupDate).toLocaleDateString() : 'N/A';

	return (
		<div className="account-view page-container">
			<Header title="Account" />
			<div className="view-body padded-content">
				<h2>{user.username}</h2>
				<div className="account-email">{user.email}</div>
				<div className="account-signup-date">Signed up: {signupDate}</div>
				{stats && (
					<div className="account-signup-date">
						{stats.movies} Movies · {stats.books} Books · {stats.albums} Albums · {stats.friends}{' '}
						Friends
					</div>
				)}
				<button
					className="logout-button"
					onClick={() => {
						logout();
						navigate('/');
					}}
				>
					Logout
				</button>
			</div>
		</div>
	);
};

export default Account;
