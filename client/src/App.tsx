// ...existing code...
import { BrowserRouter as Router, useLocation } from 'react-router-dom';
import { AuthProvider } from './AuthContext';
import AnimatedRoutes from './components/AnimatedRoutes';
import { useEffect } from 'react';

const BodyClassManager: React.FC = () => {
	const location = useLocation();
	useEffect(() => {
		// Extract view name from pathname
		const pathname = location.pathname;
		let viewName = 'home'; // default

		if (pathname === '/auth') {
			viewName = 'auth';
		} else if (pathname === '/') {
			viewName = 'home';
		} else if (pathname.startsWith('/user/')) {
			viewName = 'user';
		} else if (pathname.startsWith('/list/')) {
			viewName = 'listview';
		} else if (pathname === '/collaborations') {
			viewName = 'collaborations';
		} else if (pathname === '/friends') {
			viewName = 'friends';
		} else if (pathname === '/directory') {
			viewName = 'directory';
		} else if (pathname === '/account') {
			viewName = 'account';
		}

		// Remove all view-* classes and add the current one
		Array.from(document.body.classList).forEach((cls) => {
			if (cls.endsWith('-view')) {
				document.body.classList.remove(cls);
			}
		});
		document.body.classList.add(`${viewName}-view`);
	}, [location.pathname]);
	return null;
};

function App() {
	return (
		<Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
			<AuthProvider>
				<BodyClassManager />
				<AnimatedRoutes />
			</AuthProvider>
		</Router>
	);
}

export default App;
