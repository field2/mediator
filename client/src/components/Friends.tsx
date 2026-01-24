import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { searchUsers, sendFriendRequest, getFriends, getFriendRequests, respondToFriendRequest } from '../api';
import { User } from '../types';

const Friends: React.FC = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [friends, setFriends] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [requests, setRequests] = useState<any[]>([]);
  const [showResults, setShowResults] = useState(false);
  const debounceTimer = useRef<number | null>(null);

  // Load friends and requests on mount
  useEffect(() => {
    loadFriends();
    loadRequests();
  }, []);

  const loadFriends = async () => {
    try {
      const friendsList = await getFriends();
      setFriends(friendsList);
    } catch (error) {
      console.error('Error loading friends:', error);
    }
  };

  const loadRequests = async () => {
    try {
      const reqs = await getFriendRequests();
      setRequests(reqs);
    } catch (error) {
      console.error('Error loading friend requests:', error);
    }
  };

  // Search users
  useEffect(() => {
    if (query.trim().length < 2) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = window.setTimeout(async () => {
      setLoading(true);
      try {
        const results = await searchUsers(query);
        setSearchResults(results || []);
        setShowResults((results || []).length > 0);
      } catch (err) {
        console.error('Error searching users:', err);
        setSearchResults([]);
        setShowResults(false);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [query]);

  const handleAddFriend = async (userId: number) => {
    try {
      await sendFriendRequest(userId);
      alert('Friend request sent!');
      // Update the results to show pending status
      setSearchResults(
        searchResults.map(r =>
          r.id === userId ? { ...r, hasPendingRequest: true } : r
        )
      );
    } catch (error: any) {
      console.error('Error sending friend request:', error);
      alert(error.response?.data?.error || 'Failed to send friend request');
    }
  };

  const handleRespond = async (requestId: number, status: 'approved' | 'rejected') => {
    try {
      await respondToFriendRequest(requestId, status);
      // Immediately remove from UI
      setRequests(requests.filter(req => req.id !== requestId));
      if (status === 'approved') await loadFriends();
    } catch (error: any) {
      console.error('Error responding to friend request:', error);
      alert(error.response?.data?.error || 'Failed to update request');
      // Reload on error
      await loadRequests();
    }
  };

  return (
    <div className="page-container">
			<header className="view-header">
        <div className="view-label">
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

      </button>

        <h1>Friends</h1></div>
        <div className="search-bar">

          <input
            type="text"
            placeholder="Search users"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setShowResults(searchResults.length > 0)}
            onBlur={() => setTimeout(() => setShowResults(false), 250)}
            className="search-input"
          />

          {(loading || showResults) && (
            <div className="search-dropdown">
              {loading && <div className="loading">Searching...</div>}

              {!loading && searchResults.length > 0 && (
                <div className="search-list">
                  {searchResults.map((user) => (
                    <div key={user.id} className="search-user-item">
                      <span className="username">{user.username}</span>
                      {user.isFriend ? (
                        <span className="badge friends">Friends</span>
                      ) : user.hasPendingRequest ? (
                        <span className="badge pending">Pending</span>
                      ) : (
                        <button
                          className="add-button"
                          onClick={() => handleAddFriend(user.id)}
                        >
                          Add
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {!loading && searchResults.length === 0 && query.trim().length >= 2 && (
                <div className="no-results">No users found</div>
              )}
            </div>
          )}

        </div>
				</header>
      <div className="view-body">

        

        <div className="friends-list">
          {requests.length > 0 && (
            <div className="friend-requests">
              <h2>Friend Requests</h2>
              <div className="friend-requests-list">
                {requests.map((req) => (
                  <div key={req.id} className="friend-request-item">
                    <div className="request-name">{req.username}</div>
                    <div className="request-actions">
                      <button className="approve" onClick={() => handleRespond(req.id, 'approved')}>Approve</button>
                      <button className="deny" onClick={() => handleRespond(req.id, 'rejected')}>Deny</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <h2>Your Friends ({friends.length})</h2>
          {friends.length > 0 ? (
            <div className="friends-grid">
              {friends.map((friend) => (
                <div key={friend.id ?? friend.userId} className="friend-card">
                  <div className="friend-username">{friend.username}</div>
                  <div className="friend-links">
                    <button onClick={() => navigate(`/user/${friend.id ?? friend.userId}`)}>
                      View Media
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="empty">No friends yet. Search to add some!</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Friends;
