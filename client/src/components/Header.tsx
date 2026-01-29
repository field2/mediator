import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';

type HeaderProps = {
	title?: string;
	children?: React.ReactNode;
};

const Header: React.FC<HeaderProps> = ({ title, children }) => {
	const navigate = useNavigate();
	const { user, logout, isAuthenticated } = useAuth();
	const [showBack, setShowBack] = useState(false);
	const [menuOpen, setMenuOpen] = useState(false);
	const menuRef = useRef<HTMLDivElement | null>(null);

	useEffect(() => {
		setShowBack(typeof window !== 'undefined' && window.history && window.history.length > 1);
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
			{showBack ? (
				<button
					className="back-button"
					aria-label="Back"
					onClick={() => navigate(-1)}
				>
					<svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
						<path d="M15 6L9 12L15 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
					</svg>
				</button>
			) : (
				<div style={{ width: 40 }} />
			)}

			<div className="view-label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
				<div className="logo" aria-hidden style={{ display: 'flex', alignItems: 'center' }}>
					<svg width="175" height="45" viewBox="0 0 175 45" fill="none" xmlns="http://www.w3.org/2000/svg">
<g clip-path="url(#clip0_40_17)">
<path d="M37.7647 16.2181C40.024 8.23088 41.0492 1.39838 39.1728 0.218809C37.6018 -0.770106 32.1451 1.69908 25.8737 5.48734C28.106 5.87329 30.794 7.82167 31.5914 11.5278C31.6594 11.844 31.7132 12.171 31.7528 12.5105C31.8762 13.5893 31.7623 14.9053 31.4822 16.3313C30.2672 22.5345 25.9101 30.8302 24.2093 30.8302C22.5086 30.8302 18.1515 22.5345 16.9364 16.3313C16.6564 14.9053 16.5425 13.5893 16.6659 12.5105C16.7055 12.171 16.7593 11.844 16.8273 11.5293C17.6247 7.82167 20.3126 5.87329 22.545 5.48734C16.2735 1.69908 10.8169 -0.770106 9.24588 0.218809C7.36951 1.39838 8.39471 8.23088 10.6539 16.2181C4.21323 21.389 -0.564692 26.2406 0.0539069 28.0975C0.544356 29.5732 5.5596 30.6256 12.168 31.2084C10.5843 29.8444 9.64773 28.3424 9.64773 27.0187C9.64773 24.8254 10.5859 22.6817 12.0367 20.7799C15.829 32.5523 21.496 44.9602 24.2093 44.9602C26.9226 44.9602 32.5897 32.5523 36.382 20.7799C37.8328 22.6817 38.7709 24.8254 38.7709 27.0187C38.7709 28.3424 37.8343 29.8444 36.2507 31.2084C42.8591 30.6256 47.8743 29.5732 48.3648 28.0975C48.9834 26.2406 44.2054 21.389 37.7647 16.2181Z" fill="white"/>
<path d="M57.3147 29.3198H53.6063V15.4135C53.6063 13.0826 54.7012 11.9171 56.8909 11.9171H58.851C60.1401 11.9171 61.0583 12.3409 61.6057 13.1885C62.1178 12.3409 63.0361 11.9171 64.3605 11.9171H66.3206C68.5103 11.9171 69.6051 13.0826 69.6051 15.4135V29.3198H65.8968V15.0957C65.8968 14.9544 65.8438 14.8308 65.7379 14.7249C65.6496 14.6189 65.5348 14.5659 65.3935 14.5659H63.9632C63.8219 14.5659 63.6983 14.6189 63.5923 14.7249C63.504 14.8308 63.4599 14.9544 63.4599 15.0957V29.3198H59.7516V15.0957C59.7516 14.9544 59.6986 14.8308 59.5926 14.7249C59.5043 14.6189 59.3896 14.5659 59.2483 14.5659H57.8179C57.6767 14.5659 57.5531 14.6189 57.4471 14.7249C57.3588 14.8308 57.3147 14.9544 57.3147 15.0957V29.3198Z" fill="white"/>
<path d="M79.8353 26.2471H83.9409V29.3198H76.127V12.182H83.9409V15.2016H79.8353V19.2278H83.676V22.1415H79.8353V26.2471Z" fill="white"/>
<path d="M96.8665 12.182C99.0561 12.182 100.151 13.3475 100.151 15.6784V25.8233C100.151 28.1543 99.0561 29.3198 96.8665 29.3198H90.059V12.182H96.8665ZM96.4427 26.2471V15.2281C96.4427 15.0869 96.3897 14.9632 96.2837 14.8573C96.1954 14.7513 96.0807 14.6984 95.9394 14.6984H93.7674V26.7769H95.9394C96.0807 26.7769 96.1954 26.7239 96.2837 26.618C96.3897 26.512 96.4427 26.3884 96.4427 26.2471Z" fill="white"/>
<path d="M110.597 12.182V29.3198H106.888V12.182H110.597Z" fill="white"/>
<path d="M124.136 11.9171C126.325 11.9171 127.42 13.0826 127.42 15.4135V29.3198H123.712V23.5719H121.037V29.3198H117.328V15.4135C117.328 13.0826 118.423 11.9171 120.613 11.9171H124.136ZM121.037 20.7112H123.712V14.9632C123.712 14.822 123.659 14.6984 123.553 14.5924C123.465 14.4865 123.35 14.4335 123.209 14.4335H121.54C121.399 14.4335 121.275 14.4865 121.169 14.5924C121.081 14.6984 121.037 14.822 121.037 14.9632V20.7112Z" fill="white"/>
<path d="M133.177 15.3341V12.182H142.448V15.3341H139.667V29.3198H135.959V15.3341H133.177Z" fill="white"/>
<path d="M158.207 15.4135V26.0882C158.207 28.4192 157.113 29.5846 154.923 29.5846H151.4C149.21 29.5846 148.115 28.4192 148.115 26.0882V15.4135C148.115 13.0826 149.21 11.9171 151.4 11.9171H154.923C157.113 11.9171 158.207 13.0826 158.207 15.4135ZM154.499 26.512V14.9632C154.499 14.822 154.446 14.6984 154.34 14.5924C154.252 14.4865 154.137 14.4335 153.996 14.4335H152.327C152.186 14.4335 152.062 14.4865 151.956 14.5924C151.868 14.6984 151.824 14.822 151.824 14.9632V26.512C151.824 26.6533 151.868 26.7769 151.956 26.8829C152.062 26.9888 152.186 27.0418 152.327 27.0418H153.996C154.137 27.0418 154.252 26.9888 154.34 26.8829C154.446 26.7769 154.499 26.6533 154.499 26.512Z" fill="white"/>
<path d="M168.627 22.3004V29.3198H164.919V12.182H171.514C173.704 12.182 174.799 13.3475 174.799 15.6784V17.665C174.799 19.0777 174.296 19.9783 173.289 20.3668C174.172 20.6847 174.613 21.4087 174.613 22.5388V29.3198H170.905V22.8302C170.905 22.477 170.737 22.3004 170.402 22.3004H168.627ZM168.627 14.6984V19.7046H170.587C170.728 19.7046 170.843 19.6516 170.932 19.5457C171.038 19.4397 171.09 19.3161 171.09 19.1748V15.2281C171.09 15.0869 171.038 14.9632 170.932 14.8573C170.843 14.7513 170.728 14.6984 170.587 14.6984H168.627Z" fill="white"/>
</g>
<defs>
<clipPath id="clip0_40_17">
<rect width="174.799" height="44.9602" fill="white"/>
</clipPath>
</defs>
</svg>


				</div>
				<h1 className="view-title" style={{ margin: 0, fontSize: '1.1rem' }}>{title}</h1>
			</div>

			<div ref={menuRef} style={{ marginLeft: 'auto', position: 'relative' }}>
				<button
					className="menu-button"
					aria-label="Menu"
					onClick={() => setMenuOpen((v) => !v)}
				>
					<svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
						<path d="M4 6H20M4 12H20M4 18H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
					</svg>
				</button>

				{menuOpen && (
					<div className="menu-content" style={{ position: 'absolute', right: 0, top: 'calc(100% + 8px)', background: '#fff', borderRadius: 6, boxShadow: '0 6px 18px rgba(0,0,0,0.12)', padding: '0.5rem', minWidth: 160, zIndex: 1000 }}>
						<nav style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
							<Link to="/">Home</Link>
							<Link to="/search">Search</Link>
							{isAuthenticated ? (
								<>
									<Link to="/account">Account</Link>
									<button onClick={handleLogout} style={{ background: 'none', border: 'none', padding: 0, textAlign: 'left' }}>Logout</button>
								</>
							) : (
								<Link to="/login">Login</Link>
							)}
						</nav>
						{children}
					</div>
				)}
			</div>
		</div>
	);
};

export default Header;
