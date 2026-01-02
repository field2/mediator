import React from 'react';
import { useAuth } from '../AuthContext';
import { useNavigate } from 'react-router-dom';

const Account: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  console.log('Account view:', { user, isAuthenticated });
  const navigate = useNavigate();

  if (!user) return <div className="account-view">Not signed in.</div>;

  // Assume user.signupDate is ISO string, fallback to 'N/A'
  const signupDate = user.signupDate
    ? new Date(user.signupDate).toLocaleDateString()
    : 'N/A';

  return (
    <div className="account-view">
      <button
        className="back-button"
        onClick={() => {
          if (window.history.length > 1) {
            navigate(-1);
          } else {
            navigate('/');
          }
        }}
      >
        <svg width="56" height="56" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M16 28L40 10V46L16 28Z" fill="white"/>
</svg>
</button>
      <h1 className="account-title">{user.username}</h1>
      <div className="account-signup-date">Signed up: {signupDate}</div>
    </div>
  );
};

export default Account;
