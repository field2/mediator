// ...existing code...
import { BrowserRouter as Router } from 'react-router-dom';
import { AuthProvider } from './AuthContext';
import AnimatedRoutes from './components/AnimatedRoutes';

function App() {
	return (
		<Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
			<AuthProvider>
				<AnimatedRoutes />
			</AuthProvider>
		</Router>
	);
}

export default App;
