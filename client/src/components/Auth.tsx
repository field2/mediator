import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import Header from './Header';
import { login as apiLogin, register as apiRegister, forgotPassword, resetPassword } from '../api';
import { isValidEmail, normalizeEmail } from '../utils/emailValidation';

type AuthView = 'login' | 'register' | 'forgot' | 'reset';

const Auth: React.FC = () => {
	const [searchParams] = useSearchParams();
	const [view, setView] = useState<AuthView>(() =>
		searchParams.get('mode') !== 'register' ? 'login' : 'register'
	);
	const [username, setUsername] = useState('');
	const [identifier, setIdentifier] = useState('');
	const [password, setPassword] = useState('');
	const [error, setError] = useState('');
	const [success, setSuccess] = useState('');
	const [rememberMe, setRememberMe] = useState(true);
	const [resetToken, setResetToken] = useState('');
	const [resetLinkSent, setResetLinkSent] = useState(false);
	const { login } = useAuth();
	const navigate = useNavigate();
	const location = useLocation();
	const fromPath = (location.state as any)?.from?.pathname || '/';

	useEffect(() => {
		const mode = searchParams.get('mode');
		if (mode === 'register') setView('register');
		if (mode === 'login') setView('login');

		const token = searchParams.get('token');
		if (token) {
			setView('reset');
			setResetToken(token);
		}
	}, [searchParams]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError('');
		setSuccess('');

		try {
			if (view === 'login') {
				const userData = await apiLogin(identifier, password);
				await login(userData, rememberMe ? 'local' : 'session');
				navigate(fromPath, { replace: true });
			} else if (view === 'register') {
				const email = normalizeEmail(identifier);
				if (!isValidEmail(email)) {
					setError('Please enter a valid email address');
					return;
				}
				const userData = await apiRegister(username, email, password);
				await login(userData, rememberMe ? 'local' : 'session');
				navigate(fromPath, { replace: true });
			} else if (view === 'forgot') {
				const email = normalizeEmail(identifier);
				if (!isValidEmail(email)) {
					setError('Please enter a valid email address');
					return;
				}
				await forgotPassword(email);
				setSuccess('If that email exists, a password reset link has been sent');
				setIdentifier('');
				setResetLinkSent(true);
			} else if (view === 'reset') {
				await resetPassword(resetToken, password);
				setSuccess('Password reset successfully! You can now login with your new password.');
				setTimeout(() => setView('login'), 2000);
			}
		} catch (err: any) {
			const errorMsg = err.response?.data?.error || 'An error occurred';
			const errorField = err.response?.data?.field;
			if (errorField === 'email' || errorField === 'username') {
				setError(`${errorMsg}. Forgot password? Click below to reset it.`);
			} else {
				setError(errorMsg);
			}
		}
	};

	const getTitle = () => {
		if (view === 'login') return 'Login';
		if (view === 'register') return 'Register';
		if (view === 'forgot') return 'Forgot Password';
		return 'Reset Password';
	};

	const getButtonText = () => {
		if (view === 'login') return 'Login';
		if (view === 'register') return 'Register';
		if (view === 'forgot') return 'Send Reset Link';
		return 'Reset Password';
	};

	return (
		<div className="page-container">
			<Header title="" />
			<div className="view-body pad1">
				<h2>{getTitle()}</h2>
				<form onSubmit={handleSubmit} className="onboard-form">
					{view === 'register' && (
						<div>
							<label>Username</label>
							<input
								type="text"
								value={username}
								onChange={(e) => setUsername(e.target.value)}
								required
							/>
						</div>
					)}
					{view !== 'reset' && !(view === 'forgot' && resetLinkSent) && (
						<div>
							<label>{view === 'login' ? 'Email or Username' : 'Email'}</label>
							<input
								type={view === 'register' || view === 'forgot' ? 'email' : 'text'}
								value={identifier}
								onChange={(e) => setIdentifier(e.target.value)}
								required
								autoComplete={view === 'register' || view === 'forgot' ? 'email' : 'username'}
							/>
						</div>
					)}
					{(view === 'login' || view === 'register' || view === 'reset') && (
						<div>
							<label style={{ display: 'block', marginBottom: '5px' }}>
								{view === 'reset' ? 'New Password' : 'Password'}
							</label>
							<input
								type="password"
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								required
							/>
						</div>
					)}
					{view === 'login' && (
						<div>
							<input
								id="rememberMe"
								type="checkbox"
								checked={rememberMe}
								onChange={(e) => setRememberMe(e.target.checked)}
							/>
							<label htmlFor="rememberMe">Stay signed in</label>
						</div>
					)}
					{error && <div style={{ color: 'red', marginBottom: '15px' }}>{error}</div>}
					{success && <div style={{ color: 'green', marginBottom: '15px' }}>{success}</div>}
					{!(view === 'forgot' && resetLinkSent) && (
						<button type="submit" className="submit button">
							{getButtonText()}
						</button>
					)}
				</form>
				{view === 'login' && (
					<p style={{ marginTop: '15px', textAlign: 'center' }}>
						<a
							onClick={() => {
								setView('forgot');
								setError('');
							}}
							className="auth-toggle-link"
						>
							Forgot password?
						</a>
					</p>
				)}
				{(view === 'login' || view === 'register') && (
					<p style={{ marginTop: '20px', textAlign: 'center' }}>
						{view === 'login' ? "Don't have an account? " : 'Already have an account? '}
						<a
							onClick={() => setView(view === 'login' ? 'register' : 'login')}
							className="auth-toggle-link"
						>
							{view === 'login' ? 'Register' : 'Login'}
						</a>
					</p>
				)}
				{(view === 'forgot' || view === 'reset') && (
					<p style={{ marginTop: '20px', textAlign: 'center' }}>
						<a
							onClick={() => {
								setView('login');
								setResetLinkSent(false);
							}}
							className="auth-toggle-link"
						>
							Back to login
						</a>
					</p>
				)}
			</div>
		</div>
	);
};

export default Auth;
