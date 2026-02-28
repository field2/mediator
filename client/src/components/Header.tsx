import React, { useState, useEffect, useRef, useContext } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { getFriendRequests } from '../api';
import NavigationContext from '../NavigationContext';

type HeaderProps = {
	title?: string;
	children?: React.ReactNode;
};

const Header: React.FC<HeaderProps> = ({ title, children }) => {
	const navigate = useNavigate();
	const location = useLocation();
	const { isAuthenticated } = useAuth();
	const [hasPending, setHasPending] = useState(false);
	const { hasPreviousView } = useContext(NavigationContext);
	const [menuOpen, setMenuOpen] = useState(false);
	const [menuNoAnim, setMenuNoAnim] = useState(false);
	const [menuHidden, setMenuHidden] = useState(true);
	const menuRef = useRef<HTMLDivElement | null>(null);
	// Close menu (no animation) on route change
	useEffect(() => {
		if (menuOpen) {
			setMenuNoAnim(true);
			setMenuOpen(false);
			setMenuHidden(true);
			setTimeout(() => setMenuNoAnim(false), 1);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [location.pathname]);

	useEffect(() => {
		// No longer needed, handled by NavigationContext
	}, []);

	useEffect(() => {
		const onDocClick = (e: MouseEvent) => {
			if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
				setMenuOpen(false);
				setMenuHidden(true);
			}
		};
		document.addEventListener('click', onDocClick);
		return () => document.removeEventListener('click', onDocClick);
	}, []);

	useEffect(() => {
		let cancelled = false;
		const fetchPending = async () => {
			if (!isAuthenticated) {
				setHasPending(false);
				return;
			}
			try {
				const reqs: any = await getFriendRequests();
				if (cancelled) return;
				setHasPending(Array.isArray(reqs) && reqs.some((r: any) => r.status === 'pending'));
			} catch (err) {
				console.error('Error fetching friend requests in Header:', err);
				setHasPending(false);
			}
		};

		const onUpdated = (e?: Event) => {
			// If an updater indicates requests were resolved, clear indicator immediately
			const detail = (e as CustomEvent)?.detail;
			if (detail && detail.cleared) setHasPending(false);
			// re-fetch when other parts of the app signal updates
			fetchPending();
		};

		document.addEventListener('friend-requests-updated', onUpdated as EventListener);
		fetchPending();
		return () => {
			cancelled = true;
			document.removeEventListener('friend-requests-updated', onUpdated as EventListener);
		};
	}, [isAuthenticated]);

	// Close menu instantly (no slide), remove it from DOM, and wait a tick for paint
	const closeMenuAndWait = async () => {
		if (!menuOpen) return;
		setMenuNoAnim(true);
		setMenuOpen(false);
		setMenuHidden(true);
		// wait a tick so DOM updates / paint happen before navigation
		await new Promise((res) => setTimeout(res, 20));
	};

	return (
		<div className="view-header">
			{hasPreviousView && location.pathname !== '/' ? (
				<button
					className="back-button "
					aria-label="Back"
					onClick={async () => {
						// ensure menu closes and animation completes before navigating
						await closeMenuAndWait();
						navigate(-1);
					}}
				>
					<svg
						width="28"
						height="28"
						viewBox="0 0 24 24"
						fill="none"
						xmlns="http://www.w3.org/2000/svg"
					>
						<path
							d="M15 6L9 12L15 18"
							stroke="#fff"
							strokeWidth="1.5"
							strokeLinecap="round"
							strokeLinejoin="round"
						/>
					</svg>
				</button>
			) : (
				<div />
			)}

			<div className="view-label">
				<Link to="/" className="logo" aria-label="Home">
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
					mediator
				</Link>
				<h1 className="view-title">{title}</h1>
			</div>

			{!isAuthenticated ? (
				<button className="login-button" onClick={() => navigate('/auth')} aria-label="Login">
					Login
				</button>
			) : (
				<div ref={menuRef} className="menu-container">
					<button
						className={`menu-button${hasPending ? ' has-pending' : ''}`}
						aria-label={menuOpen ? 'Close menu' : 'Menu'}
						onClick={() => {
							setMenuNoAnim(false);
							setMenuHidden(false);
							const newOpen = !menuOpen;
							setMenuOpen(newOpen);
							if (newOpen) {
								// notify listeners (e.g., SearchBar) that menu was opened
								const ev = new CustomEvent('menu:opened', { detail: { open: true } });
								document.dispatchEvent(ev);
							}
						}}
					>
						{menuOpen ? (
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
									stroke="white"
									strokeWidth="2"
									strokeLinecap="round"
									strokeLinejoin="round"
								/>
							</svg>
						) : (
							<svg
								width="28"
								height="28"
								viewBox="0 0 24 24"
								fill="none"
								xmlns="http://www.w3.org/2000/svg"
							>
								<rect width="28" height="28" fill="none" />
								<path
									d="M4 6H20M4 12H20M4 18H20"
									stroke="white"
									strokeWidth="2"
									strokeLinecap="round"
									strokeLinejoin="round"
								/>
							</svg>
						)}
					</button>

					{!menuHidden && (
						<div
							className={`menu-content${menuOpen ? ' open' : ''}${menuNoAnim ? ' no-anim' : ''}`}
						>
							<nav className="main-nav">
								<Link
									to="/"
									onClick={async (e) => {
										e.preventDefault();
										await closeMenuAndWait();
										navigate('/');
									}}
								>
									Home
								</Link>
								<Link
									to="/friends"
									className={hasPending ? 'has-pending' : ''}
									onClick={async (e) => {
										e.preventDefault();
										await closeMenuAndWait();
										navigate('/friends');
									}}
								>
									Friends
								</Link>
								<Link
									to="/directory"
									onClick={async (e) => {
										e.preventDefault();
										await closeMenuAndWait();
										navigate('/directory');
									}}
								>
									Directory
								</Link>
								<Link
									to="/account"
									onClick={async (e) => {
										e.preventDefault();
										await closeMenuAndWait();
										navigate('/account');
									}}
								>
									Account
								</Link>
								<Link
									to="/about"
									onClick={async (e) => {
										e.preventDefault();
										await closeMenuAndWait();
										navigate('/about');
									}}
								>
									About
								</Link>
								{/* logout removed */}
							</nav>
							{children}
						</div>
					)}
				</div>
			)}
		</div>
	);
};

export default Header;
