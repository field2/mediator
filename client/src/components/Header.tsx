import React, { useState, useEffect, useRef, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import NavigationContext from '../NavigationContext';

type HeaderProps = {
	title?: string;
	children?: React.ReactNode;
};

const Header: React.FC<HeaderProps> = ({ title, children }) => {
	const navigate = useNavigate();
	const { logout, isAuthenticated } = useAuth();
	const { hasPreviousView } = useContext(NavigationContext);
	const [menuOpen, setMenuOpen] = useState(false);
	const menuRef = useRef<HTMLDivElement | null>(null);

	useEffect(() => {
		// No longer needed, handled by NavigationContext
	}, []);

	useEffect(() => {
		const onDocClick = (e: MouseEvent) => {
			if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
		};
		document.addEventListener('click', onDocClick);
		return () => document.removeEventListener('click', onDocClick);
	}, []);

	const handleLogout = () => {
		logout();
		navigate('/');
	};

	return (
		<div className="view-header">
			{hasPreviousView ? (
				<button className="back-button" aria-label="Back" onClick={() => navigate(-1)}>
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
							strokeWidth="2.5"
							strokeLinecap="round"
							strokeLinejoin="round"
						/>
					</svg>
				</button>
			) : (
				<div />
			)}

			<div className="view-label">
				<div className="logo" aria-hidden>
					<svg
						width="148"
						height="20"
						viewBox="0 0 148 20"
						fill="none"
						xmlns="http://www.w3.org/2000/svg"
					>
						<g clip-path="url(#clip0_40_17)">
							<path
								d="M16.2706 6.98744C17.2439 3.5462 17.6856 0.602478 16.8772 0.0942718C16.2004 -0.331793 13.8494 0.732034 11.1474 2.36417C12.1092 2.53045 13.2673 3.3699 13.6109 4.96664C13.6402 5.10287 13.6633 5.24378 13.6804 5.39003C13.7335 5.85483 13.6845 6.4218 13.5638 7.03619C13.0403 9.70878 11.1631 13.2829 10.4304 13.2829C9.69761 13.2829 7.8204 9.70878 7.29691 7.03619C7.17626 6.4218 7.12718 5.85483 7.18035 5.39003C7.19739 5.24378 7.22057 5.10287 7.24988 4.9673C7.59342 3.36989 8.75151 2.53045 9.71329 2.36417C7.01131 0.732034 4.66036 -0.331793 3.9835 0.0942718C3.17509 0.602478 3.61678 3.5462 4.59015 6.98744C1.81523 9.21526 -0.243292 11.3055 0.0232253 12.1056C0.234531 12.7413 2.3953 13.1948 5.24247 13.4459C4.56016 12.8582 4.15663 12.2111 4.15663 11.6408C4.15663 10.6958 4.56084 9.77222 5.1859 8.95281C6.81977 14.0249 9.26137 19.3707 10.4304 19.3707C11.5994 19.3707 14.041 14.0249 15.6748 8.95281C16.2999 9.77222 16.7041 10.6958 16.7041 11.6408C16.7041 12.2111 16.3006 12.8582 15.6183 13.4459C18.4654 13.1948 20.6262 12.7413 20.8375 12.1056C21.104 11.3055 19.0455 9.21526 16.2706 6.98744Z"
								fill="white"
							/>
							<path
								d="M29.569 18.2542H25.8607V4.34801C25.8607 2.01707 26.9556 0.851593 29.1452 0.851593H31.1054C32.3944 0.851593 33.3127 1.2754 33.8601 2.12302C34.3722 1.2754 35.2905 0.851593 36.6149 0.851593H38.575C40.7647 0.851593 41.8595 2.01707 41.8595 4.34801V18.2542H38.1512V4.03016C38.1512 3.88889 38.0982 3.76528 37.9922 3.65932C37.9039 3.55337 37.7892 3.50039 37.6479 3.50039H36.2175C36.0763 3.50039 35.9527 3.55337 35.8467 3.65932C35.7584 3.76528 35.7143 3.88889 35.7143 4.03016V18.2542H32.0059V4.03016C32.0059 3.88889 31.953 3.76528 31.847 3.65932C31.7587 3.55337 31.6439 3.50039 31.5027 3.50039H30.0723C29.931 3.50039 29.8074 3.55337 29.7015 3.65932C29.6132 3.76528 29.569 3.88889 29.569 4.03016V18.2542Z"
								fill="white"
							/>
							<path
								d="M52.0897 15.1816H56.1953V18.2542H48.3813V1.11647H56.1953V4.13611H52.0897V8.16229H55.9304V11.076H52.0897V15.1816Z"
								fill="white"
							/>
							<path
								d="M69.1208 1.11647C71.3105 1.11647 72.4054 2.28195 72.4054 4.61289V14.7578C72.4054 17.0888 71.3105 18.2542 69.1208 18.2542H62.3134V1.11647H69.1208ZM68.697 15.1816V4.1626C68.697 4.02133 68.6441 3.89772 68.5381 3.79176C68.4498 3.68581 68.335 3.63283 68.1938 3.63283H66.0217V15.7114H68.1938C68.335 15.7114 68.4498 15.6584 68.5381 15.5524C68.6441 15.4465 68.697 15.3229 68.697 15.1816Z"
								fill="white"
							/>
							<path d="M82.851 1.11647V18.2542H79.1426V1.11647H82.851Z" fill="white" />
							<path
								d="M96.3901 0.851593C98.5797 0.851593 99.6746 2.01707 99.6746 4.34801V18.2542H95.9662V12.5063H93.291V18.2542H89.5826V4.34801C89.5826 2.01707 90.6775 0.851593 92.8671 0.851593H96.3901ZM93.291 9.64562H95.9662V3.89771C95.9662 3.75645 95.9133 3.63284 95.8073 3.52688C95.719 3.42093 95.6042 3.36796 95.463 3.36796H93.7942C93.653 3.36796 93.5294 3.42093 93.4234 3.52688C93.3351 3.63284 93.291 3.75645 93.291 3.89771V9.64562Z"
								fill="white"
							/>
							<path
								d="M105.432 4.26855V1.11647H114.703V4.26855H111.921V18.2542H108.213V4.26855H105.432Z"
								fill="white"
							/>
							<path
								d="M130.462 4.34801V15.0227C130.462 17.3536 129.367 18.5191 127.177 18.5191H123.654C121.465 18.5191 120.37 17.3536 120.37 15.0227V4.34801C120.37 2.01707 121.465 0.851593 123.654 0.851593H127.177C129.367 0.851593 130.462 2.01707 130.462 4.34801ZM126.753 15.4465V3.89771C126.753 3.75645 126.7 3.63284 126.594 3.52688C126.506 3.42093 126.391 3.36796 126.25 3.36796H124.581C124.44 3.36796 124.317 3.42093 124.211 3.52688C124.122 3.63284 124.078 3.75645 124.078 3.89771V15.4465C124.078 15.5878 124.122 15.7114 124.211 15.8173C124.317 15.9233 124.44 15.9763 124.581 15.9763H126.25C126.391 15.9763 126.506 15.9233 126.594 15.8173C126.7 15.7114 126.753 15.5878 126.753 15.4465Z"
								fill="white"
							/>
							<path
								d="M140.881 11.2349V18.2542H137.173V1.11647H143.769C145.958 1.11647 147.053 2.28195 147.053 4.61289V6.5995C147.053 8.01219 146.55 8.91278 145.543 9.30127C146.426 9.61913 146.868 10.3431 146.868 11.4733V18.2542H143.159V11.7647C143.159 11.4115 142.992 11.2349 142.656 11.2349H140.881ZM140.881 3.63283V8.63907H142.842C142.983 8.63907 143.098 8.5861 143.186 8.48015C143.292 8.37419 143.345 8.25058 143.345 8.10931V4.1626C143.345 4.02133 143.292 3.89772 143.186 3.79176C143.098 3.68581 142.983 3.63283 142.842 3.63283H140.881Z"
								fill="white"
							/>
						</g>
						<defs>
							<clipPath id="clip0_40_17">
								<rect width="147.053" height="19.3707" fill="white" />
							</clipPath>
						</defs>
					</svg>
				</div>
				<h1 className="view-title">{title}</h1>
			</div>

			<div ref={menuRef} className="menu-container">
				<button className="menu-button" aria-label="Menu" onClick={() => setMenuOpen((v) => !v)}>
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
				</button>

				<div className={`menu-content${menuOpen ? ' open' : ''}`}>
					<nav>
						<Link to="/">Home</Link>
						<Link to="/friends">Friends</Link>
						<Link to="/directory">Directory</Link>
						{isAuthenticated ? (
							<>
								<Link to="/account">Account</Link>
								<button onClick={handleLogout}>Logout</button>
							</>
						) : (
							<Link to="/login">Login</Link>
						)}
					</nav>
					{children}
				</div>
			</div>
		</div>
	);
};

export default Header;
