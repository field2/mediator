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
      await loadRequests();
      if (status === 'approved') await loadFriends();
    } catch (error: any) {
      console.error('Error responding to friend request:', error);
      alert(error.response?.data?.error || 'Failed to update request');
    }
  };

  return (
    <div className="friends-view">
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
        <svg width="56" height="56" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M16 28L40 10V46L16 28Z" fill="white"/>
        </svg>
      </button>

        <h1>Friends</h1>
				</header>
      <div className="view-body">

        <div className="friends-search">
          <input
            type="text"
            placeholder="Search by username"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setShowResults(searchResults.length > 0)}
            onBlur={() => setTimeout(() => setShowResults(false), 150)}
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
