import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './AuthContext';
import Auth from './components/Auth';
import Dashboard from './components/Dashboard';
import ListView from './components/ListView';
import Collaborations from './components/Collaborations';
import Account from './components/Account';
import Friends from './components/Friends';

const PrivateRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <div>Loading...</div>;
  return isAuthenticated ? children : <Navigate to="/auth" />;
};

const PublicRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  return !isAuthenticated ? children : <Navigate to="/" />;
};

function App() {
  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <Routes>
          <Route path="/auth" element={<PublicRoute><Auth /></PublicRoute>} />
          <Route path="/" element={<Dashboard />} />
          <Route path="/user/:userId" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
          <Route path="/list/:id" element={<PrivateRoute><ListView /></PrivateRoute>} />
          <Route path="/collaborations" element={<PrivateRoute><Collaborations /></PrivateRoute>} />
          <Route path="/friends" element={<PrivateRoute><Friends /></PrivateRoute>} />
          <Route path="/account" element={<PrivateRoute><Account /></PrivateRoute>} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
