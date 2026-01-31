// ...existing code...
import { BrowserRouter as Router, useLocation } from 'react-router-dom';
import { AuthProvider } from './AuthContext';
import AnimatedRoutes from './components/AnimatedRoutes';
import { useEffect } from 'react';

const BodyClassManager: React.FC = () => {
	const location = useLocation();
	useEffect(() => {
		const isHome = location.pathname === '/';
		document.body.classList.toggle('home-view', isHome);
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
