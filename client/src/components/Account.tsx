import React from 'react';
import { useAuth } from '../AuthContext';
import { useNavigate } from 'react-router-dom';
import Header from './Header';

const Account: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  console.log('Account view:', { user, isAuthenticated });
  const navigate = useNavigate();

  if (!user) return <div className="account-view">Not signed in.</div>;

  // Assume user.signupDate is ISO string, fallback to 'N/A'
  const signupDate = user.signupDate
    ? new Date(user.signupDate).toLocaleDateString()
    : 'N/A';

  return (
    <div className="account-view page-container">
      <Header title={user.username} />
      <div className="view-body">
        <div className="account-signup-date">Signed up: {signupDate}</div>
        <button
          className="logout-button"
          onClick={() => {
            logout();
            navigate('/');
          }}
        >
          Logout
        </button>
      </div>
    </div>
  );
};

export default Account;
