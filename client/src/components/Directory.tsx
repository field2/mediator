import React, { useState, useEffect } from 'react';
import { getAllUsers, sendFriendRequest } from '../api';
import { useAuth } from '../AuthContext';
import { useNavigate } from 'react-router-dom';

interface DirectoryUser {
  id: number;
  username: string;
  isFriend: boolean;
  hasPendingRequest: boolean;
}

const Directory: React.FC = () => {
  const [users, setUsers] = useState<DirectoryUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      loadUsers();
    }
  }, [isAuthenticated]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await getAllUsers();
      setUsers(data);
    } catch (err) {
      console.error('Error loading users:', err);
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleAddFriend = async (userId: number) => {
    try {
      await sendFriendRequest(userId);
      // Refresh users to update pending request status
      await loadUsers();
    } catch (err) {
      console.error('Error sending friend request:', err);
      alert('Failed to send friend request');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="view-body">
        <p>Please log in to view the directory.</p>
      </div>
    );
  }

  if (loading) {
    return <div className="spinner"></div>;
  }

  if (error) {
    return (
      <div className="view-body">
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="view-body">
      
      <header className="view-header">
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
       <svg width="20" height="22" viewBox="0 0 20 22" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M9.5098 0.437519C10.0677 -0.14584 10.972 -0.14584 11.5299 0.437519C12.0878 1.02088 12.0878 1.96646 11.5299 2.54982L4.87715 9.50622H18.5714C19.3604 9.50622 20 10.175 20 11C20 11.825 19.3604 12.4938 18.5714 12.4938H4.87715L11.5299 19.4502C12.0878 20.0335 12.0878 20.9791 11.5299 21.5625C10.972 22.1458 10.0677 22.1458 9.5098 21.5625L0.418421 12.0562C-0.139474 11.4728 -0.139474 10.5272 0.418421 9.94385L9.5098 0.437519Z" fill="white"/>
</svg>

      </button><h1>User Directory</h1>
      </header>
      <div className="directory-list">
        {users.map((user) => (
          <div key={user.id} className="directory-item">
            <div className="directory-user-info">
              <span className="directory-username">{user.username}</span>
            </div>
            <div className="directory-actions">
              {user.isFriend ? (
                <span className="friend-status">Friends</span>
              ) : user.hasPendingRequest ? (
                <span className="pending-status">Request Pending</span>
              ) : (
                <button
                  className="add-friend-button"
                  onClick={() => handleAddFriend(user.id)}
                >
                  Add Friend
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Directory;
