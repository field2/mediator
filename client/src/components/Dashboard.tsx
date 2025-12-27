import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getLists, createList, deleteList, getPublicLists, requestCollaboration } from '../api';
import { List } from '../types';
import { useAuth } from '../AuthContext';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [lists, setLists] = useState<List[]>([]);
  const [publicLists, setPublicLists] = useState<List[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [newListDescription, setNewListDescription] = useState('');
  const [newListIsPublic, setNewListIsPublic] = useState(true);
  const [activeTab, setActiveTab] = useState<'my' | 'public'>('my');
  const [selectedMediaType, setSelectedMediaType] = useState<'movie' | 'book' | 'album' | null>(null);

  const loadLists = async () => {
    try {
      const data = await getLists();
      setLists(data);
    } catch (error) {
      console.error('Error loading lists:', error);
    }
  };

  const loadPublicLists = async () => {
    try {
      const data = await getPublicLists();
      setPublicLists(data.filter(list => list.user_id !== user?.userId));
    } catch (error) {
      console.error('Error loading public lists:', error);
    }
  };

  useEffect(() => {
    loadLists();
    loadPublicLists();
  }, []);

  const handleCreateList = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createList(newListName, newListDescription, newListIsPublic);
      setNewListName('');
      setNewListDescription('');
      setNewListIsPublic(true);
      setShowCreateForm(false);
      await loadLists();
    } catch (error) {
      console.error('Error creating list:', error);
      alert('Failed to create list');
    }
  };

  const handleDeleteList = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this list?')) return;

    try {
      await deleteList(id);
      await loadLists();
    } catch (error) {
      console.error('Error deleting list:', error);
      alert('Failed to delete list');
    }
  };

  const handleRequestCollaboration = async (listId: number) => {
    try {
      await requestCollaboration(listId);
      alert('Collaboration request sent!');
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to send collaboration request');
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h1>Mediator - Your Media Lists</h1>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <span>Welcome, {user?.username}!</span>
          <button onClick={() => navigate('/collaborations')} style={{ padding: '8px 16px', cursor: 'pointer' }}>
            Collaborations
          </button>
          <button onClick={logout} style={{ padding: '8px 16px', cursor: 'pointer' }}>
            Logout
          </button>
        </div>
      </div>

      {!selectedMediaType ? (
        <div style={{ textAlign: 'center', marginTop: '60px' }}>
          <h2 style={{ marginBottom: '40px' }}>What would you like to catalog?</h2>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '30px', flexWrap: 'wrap' }}>
            <button
              onClick={() => setSelectedMediaType('movie')}
              style={{
                width: '200px',
                height: '200px',
                fontSize: '24px',
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '15px',
                boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                transition: 'transform 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              <div style={{ fontSize: '60px' }}>🎬</div>
              <div>Movies</div>
            </button>

            <button
              onClick={() => setSelectedMediaType('book')}
              style={{
                width: '200px',
                height: '200px',
                fontSize: '24px',
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '15px',
                boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                transition: 'transform 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              <div style={{ fontSize: '60px' }}>📚</div>
              <div>Books</div>
            </button>

            <button
              onClick={() => setSelectedMediaType('album')}
              style={{
                width: '200px',
                height: '200px',
                fontSize: '24px',
                backgroundColor: '#dc3545',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '15px',
                boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                transition: 'transform 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              <div style={{ fontSize: '60px' }}>🎵</div>
              <div>Albums</div>
            </button>
          </div>
        </div>
      ) : (
        <>
          <button
            onClick={() => setSelectedMediaType(null)}
            style={{
              marginBottom: '20px',
              padding: '8px 16px',
              cursor: 'pointer',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '4px'
            }}
          >
            ← Back to Media Types
          </button>

          <h2 style={{ marginBottom: '20px' }}>
            {selectedMediaType === 'movie' ? '🎬 Movies' : selectedMediaType === 'book' ? '📚 Books' : '🎵 Albums'}
          </h2>

      <div style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
        <button
          onClick={() => setActiveTab('my')}
          style={{
            padding: '10px 20px',
            backgroundColor: activeTab === 'my' ? '#007bff' : '#f8f9fa',
            color: activeTab === 'my' ? 'white' : '#000',
            border: 'none',
            cursor: 'pointer',
            borderRadius: '4px'
          }}
        >
          My Lists
        </button>
        <button
          onClick={() => setActiveTab('public')}
          style={{
            padding: '10px 20px',
            backgroundColor: activeTab === 'public' ? '#007bff' : '#f8f9fa',
            color: activeTab === 'public' ? 'white' : '#000',
            border: 'none',
            cursor: 'pointer',
            borderRadius: '4px'
          }}
        >
          Public Lists
        </button>
      </div>

      {activeTab === 'my' && (
        <>
          {!showCreateForm ? (
            <button
              onClick={() => setShowCreateForm(true)}
              style={{
                padding: '10px 20px',
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                cursor: 'pointer',
                borderRadius: '4px',
                marginBottom: '20px'
              }}
            >
              + Create New List
            </button>
          ) : (
            <form onSubmit={handleCreateList} style={{ marginBottom: '20px', padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
              <h3>Create New List</h3>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px' }}>Name</label>
                <input
                  type="text"
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  required
                  style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px' }}>Description</label>
                <textarea
                  value={newListDescription}
                  onChange={(e) => setNewListDescription(e.target.value)}
                  style={{ width: '100%', padding: '8px', boxSizing: 'border-box', minHeight: '80px' }}
                />
              </div>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <input
                    type="checkbox"
                    checked={newListIsPublic}
                    onChange={(e) => setNewListIsPublic(e.target.checked)}
                  />
                  Make this list public
                </label>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="submit" style={{ padding: '8px 20px', backgroundColor: '#007bff', color: 'white', border: 'none', cursor: 'pointer', borderRadius: '4px' }}>
                  Create
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  style={{ padding: '8px 20px', backgroundColor: '#6c757d', color: 'white', border: 'none', cursor: 'pointer', borderRadius: '4px' }}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
            {lists.map((list) => (
              <div key={list.id} style={{ border: '1px solid #ddd', padding: '20px', borderRadius: '8px', backgroundColor: 'white' }}>
                <h3 style={{ marginTop: 0 }}>{list.name}</h3>
                {list.description && <p style={{ color: '#666', fontSize: '0.9em' }}>{list.description}</p>}
                <p style={{ fontSize: '0.85em', color: '#999' }}>
                  {list.is_public ? '🌐 Public' : '🔒 Private'}
                </p>
                <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                  <button
                    onClick={() => navigate(`/list/${list.id}?mediaType=${selectedMediaType}`)}
                    style={{
                      flex: 1,
                      padding: '8px',
                      backgroundColor: '#007bff',
                      color: 'white',
                      border: 'none',
                      cursor: 'pointer',
                      borderRadius: '4px'
                    }}
                  >
                    View
                  </button>
                  <button
                    onClick={() => handleDeleteList(list.id)}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#dc3545',
                      color: 'white',
                      border: 'none',
                      cursor: 'pointer',
                      borderRadius: '4px'
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>

          {lists.length === 0 && (
            <p style={{ textAlign: 'center', color: '#666', marginTop: '40px' }}>
              No lists yet. Create your first list to get started!
            </p>
          )}
        </>
        )}
      </>
      )}

      {selectedMediaType && activeTab === 'public' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
          {publicLists.map((list) => (
            <div key={list.id} style={{ border: '1px solid #ddd', padding: '20px', borderRadius: '8px', backgroundColor: 'white' }}>
              <h3 style={{ marginTop: 0 }}>{list.name}</h3>
              {list.description && <p style={{ color: '#666', fontSize: '0.9em' }}>{list.description}</p>}
              <p style={{ fontSize: '0.85em', color: '#999' }}>🌐 Public List</p>
              <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                <button
                  onClick={() => navigate(`/list/${list.id}?mediaType=${selectedMediaType}`)}
                  style={{
                    flex: 1,
                    padding: '8px',
                    backgroundColor: '#007bff',
                    color: 'white',
                    border: 'none',
                    cursor: 'pointer',
                    borderRadius: '4px'
                  }}
                >
                  View
                </button>
                <button
                  onClick={() => handleRequestCollaboration(list.id)}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#28a745',
                    color: 'white',
                    border: 'none',
                    cursor: 'pointer',
                    borderRadius: '4px'
                  }}
                >
                  Collaborate
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedMediaType && activeTab === 'public' && publicLists.length === 0 && (
        <p style={{ textAlign: 'center', color: '#666', marginTop: '40px' }}>
          No public lists available at the moment.
        </p>
      )}
    </div>
  );
};

export default Dashboard;
