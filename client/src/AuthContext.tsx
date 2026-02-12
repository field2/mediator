import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from './types';
import { getCurrentUser } from './api';

interface AuthContextType {
	user: User | null;
	login: (user: User, persist?: 'local' | 'session') => Promise<void>;
	logout: () => void;
	isAuthenticated: boolean;
	isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
	const [user, setUser] = useState<User | null>(null);
	const [isLoading, setIsLoading] = useState(true);

	// read persisted user from either localStorage (stay signed in) or sessionStorage
	useEffect(() => {
		const storages = [localStorage, sessionStorage];
		(async () => {
			for (const storage of storages) {
				const token = storage.getItem('token');
				const userId = storage.getItem('userId');
				const username = storage.getItem('username');
				const email = storage.getItem('email');
				if (token && userId && username && email) {
					try {
						const profile = await getCurrentUser(token);
						setUser({
							token,
							userId: parseInt(userId),
							username,
							email,
							signupDate: profile.signupDate,
						});
					} catch (error: any) {
						// If token is invalid (401), clear all stored credentials
						if (error?.message?.includes('401') || error?.message?.includes('Unauthorized')) {
							console.log('Token invalid or expired, clearing credentials');
							localStorage.removeItem('token');
							localStorage.removeItem('userId');
							localStorage.removeItem('username');
							localStorage.removeItem('email');
							sessionStorage.removeItem('token');
							sessionStorage.removeItem('userId');
							sessionStorage.removeItem('username');
							sessionStorage.removeItem('email');
						} else {
							// For other errors (network issues), still set user with cached data
							setUser({ token, userId: parseInt(userId), username, email });
						}
					}
					setIsLoading(false);
					return;
				}
			}
			setIsLoading(false);
		})();
	}, []);

	const login = async (userData: User, persist: 'local' | 'session' = 'local') => {
		const storage = persist === 'session' ? sessionStorage : localStorage;
		// clear the other storage to avoid stale sessions
		localStorage.removeItem('token');
		localStorage.removeItem('userId');
		localStorage.removeItem('username');
		localStorage.removeItem('email');
		sessionStorage.removeItem('token');
		sessionStorage.removeItem('userId');
		sessionStorage.removeItem('username');
		sessionStorage.removeItem('email');

		storage.setItem('token', userData.token);
		storage.setItem('userId', userData.userId.toString());
		storage.setItem('username', userData.username);
		storage.setItem('email', userData.email);
		try {
			console.log('Fetching user profile with token:', userData.token);
			const profile = await getCurrentUser(userData.token);
			console.log('Profile fetched:', profile);
			const mergedUser = { ...userData, signupDate: profile.signupDate };
			console.log('Setting user:', mergedUser);
			setUser(mergedUser);
		} catch (err) {
			console.error('Failed to fetch profile:', err);
			console.log('Setting user without profile:', userData);
			setUser(userData);
		}
	};

	const logout = () => {
		localStorage.removeItem('token');
		localStorage.removeItem('userId');
		localStorage.removeItem('username');
		localStorage.removeItem('email');
		sessionStorage.removeItem('token');
		sessionStorage.removeItem('userId');
		sessionStorage.removeItem('username');
		sessionStorage.removeItem('email');
		setUser(null);
	};

	return (
		<AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user, isLoading }}>
			{children}
		</AuthContext.Provider>
	);
};

export const useAuth = () => {
	const context = useContext(AuthContext);
	if (context === undefined) {
		throw new Error('useAuth must be used within an AuthProvider');
	}
	return context;
};
