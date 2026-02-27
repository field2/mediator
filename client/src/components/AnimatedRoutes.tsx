import React, { useRef, useEffect, useState } from 'react';
import { Routes, Route, useLocation, useNavigationType, Navigate } from 'react-router-dom';
import Auth from './Auth';
import Dashboard from './Dashboard';
import ListView from './ListView';
import Collaborations from './Collaborations';
import Account from './Account';
import Friends from './Friends';
import Directory from './Directory';
import About from './About';
import { useAuth } from '../AuthContext';
import NavigationContext from '../NavigationContext';

type Direction = 'forward' | 'back' | 'none';

const PrivateRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => {
	const { isAuthenticated, isLoading } = useAuth();
	const location = useLocation();
	if (isLoading) return <div>Loading...</div>;
	if (!isAuthenticated) {
		return <Navigate to="/" state={{ from: location }} replace />;
	}
	return children;
};

const PublicRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => {
	const { isAuthenticated } = useAuth();
	return !isAuthenticated ? children : <div />;
};

const ROUTE_ANIM_MS = 420;

const AnimatedRoutes: React.FC = () => {
	const location = useLocation();
	const navType = useNavigationType();
	const activeKey = location.key && location.key !== 'default' ? location.key : location.pathname;
	const [direction, setDirection] = React.useState<Direction>('none');
	const [prevLocation, setPrevLocation] = React.useState<any | null>(null);
	const [prevDirection, setPrevDirection] = React.useState<Direction | null>(null);

	const historyStackRef = useRef<string[]>([]);
	const initialRef = useRef(true);
	const lastLocationRef = useRef(location);

	// Navigation context state
	const [hasPreviousView, setHasPreviousView] = useState(false);

	useEffect(() => {
		// initialize simple in-memory history stack for direction detection
		historyStackRef.current = [location.pathname];
		const id = setTimeout(() => (initialRef.current = false), 0);
		return () => clearTimeout(id);
	}, []);

	// update in-memory stack on PUSH/REPLACE
	useEffect(() => {
		if (navType === 'PUSH') {
			const top = historyStackRef.current[historyStackRef.current.length - 1];
			if (top !== location.pathname) historyStackRef.current.push(location.pathname);
		} else if (navType === 'REPLACE') {
			historyStackRef.current[historyStackRef.current.length - 1] = location.pathname;
		}
		// Set hasPreviousView: true if stack has more than 1 entry
		setHasPreviousView(historyStackRef.current.length > 1);
	}, [activeKey, navType, location.pathname]);

	useEffect(() => {
		if (initialRef.current) {
			setDirection('none');
			lastLocationRef.current = location;
			return;
		}

		// compute direction using in-memory stack when possible
		let isBack = false;
		if (navType === 'POP') {
			const idx = historyStackRef.current.lastIndexOf(location.pathname);
			const lastIdx = historyStackRef.current.length - 1;
			if (idx !== -1 && idx < lastIdx) {
				isBack = true;
				historyStackRef.current = historyStackRef.current.slice(0, idx + 1);
			} else {
				isBack = true;
			}
		} else {
			// For PUSH/REPLACE we already updated stack in the other effect; default to forward
			isBack = false;
		}

		const newDirection: Direction = isBack ? 'back' : 'forward';
		console.log('[AnimatedRoutes] location change', {
			pathname: location.pathname,
			navType,
			isBack,
			newDirection,
			stack: historyStackRef.current.slice(),
		});

		// keep previous location mounted so it can animate out
		setPrevLocation(lastLocationRef.current);
		setPrevDirection(newDirection);
		setDirection(newDirection);

		// after animation, clear prev
		const t = setTimeout(() => {
			setPrevLocation(null);
			setPrevDirection(null);
		}, ROUTE_ANIM_MS + 40);

		lastLocationRef.current = location;
		// Set hasPreviousView: true if stack has more than 1 entry
		setHasPreviousView(historyStackRef.current.length > 1);
		return () => clearTimeout(t);
	}, [location, navType]);

	// Render-time debug log to verify component receives location updates
	console.log('[AnimatedRoutes] render', {
		pathname: location.pathname,
		activeKey,
		direction,
		hasPrev: !!prevLocation,
		navType,
	});

	const renderRoutes = (loc: any) => (
		<Routes location={loc}>
			<Route
				path="/auth"
				element={
					<PublicRoute>
						<Auth />
					</PublicRoute>
				}
			/>
			<Route path="/" element={<Dashboard />} />
			<Route
				path="/user/:userId"
				element={
					<PrivateRoute>
						<Dashboard />
					</PrivateRoute>
				}
			/>
			<Route
				path="/list/:id"
				element={
					<PrivateRoute>
						<ListView />
					</PrivateRoute>
				}
			/>
			<Route
				path="/collaborations"
				element={
					<PrivateRoute>
						<Collaborations />
					</PrivateRoute>
				}
			/>
			<Route
				path="/friends"
				element={
					<PrivateRoute>
						<Friends />
					</PrivateRoute>
				}
			/>
			<Route
				path="/directory"
				element={
					<PrivateRoute>
						<Directory />
					</PrivateRoute>
				}
			/>
			<Route
				path="/account"
				element={
					<PrivateRoute>
						<Account />
					</PrivateRoute>
				}
			/>
			<Route path="/about" element={<About />} />
		</Routes>
	);

	// keys force remount so CSS animations reliably run on each navigation
	const enteringKey = activeKey;
	const exitingKey = prevLocation
		? prevLocation.key && prevLocation.key !== 'default'
			? `prev-${prevLocation.key}`
			: `prev-${prevLocation.pathname}`
		: undefined;

	return (
		<NavigationContext.Provider value={{ hasPreviousView, setHasPreviousView }}>
			<div
				className="route-animate"
				style={{ position: 'relative', overflow: 'hidden', width: '100%', minHeight: '100vh' }}
			>
				{prevLocation && prevDirection && (
					<div key={exitingKey} className={`route outgoing ${prevDirection}`} style={{ zIndex: 0 }}>
						{renderRoutes(prevLocation)}
					</div>
				)}
				<div
					key={enteringKey}
					className={`route ${direction === 'none' ? '' : direction}`}
					style={{ zIndex: 1 }}
				>
					{renderRoutes(location)}
				</div>
			</div>
		</NavigationContext.Provider>
	);
};

export default AnimatedRoutes;
