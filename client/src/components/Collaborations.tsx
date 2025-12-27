import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCollaborationRequests, getMyCollaborationRequests, respondToCollaboration } from '../api';
import { Collaboration } from '../types';

const Collaborations: React.FC = () => {
  const navigate = useNavigate();
  const [incomingRequests, setIncomingRequests] = useState<Collaboration[]>([]);
  const [myRequests, setMyRequests] = useState<Collaboration[]>([]);
  const [activeTab, setActiveTab] = useState<'incoming' | 'outgoing'>('incoming');

  const loadRequests = async () => {
    try {
      const incoming = await getCollaborationRequests();
      const outgoing = await getMyCollaborationRequests();
      setIncomingRequests(incoming);
      setMyRequests(outgoing);
    } catch (error) {
      console.error('Error loading collaboration requests:', error);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const handleRespond = async (id: number, status: 'approved' | 'rejected') => {
    try {
      await respondToCollaboration(id, status);
      await loadRequests();
      alert(`Request ${status}!`);
    } catch (error) {
      console.error('Error responding to request:', error);
      alert('Failed to respond to request');
    }
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      pending: '#ffc107',
      approved: '#28a745',
      rejected: '#dc3545'
    };
    return (
      <span
        style={{
          padding: '4px 8px',
          borderRadius: '4px',
          fontSize: '0.8em',
          backgroundColor: colors[status] || '#6c757d',
          color: 'white'
        }}
      >
        {status.toUpperCase()}
      </span>
    );
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <button onClick={() => navigate('/')} style={{ marginBottom: '20px', padding: '8px 16px', cursor: 'pointer' }}>
        ← Back to Dashboard
      </button>

      <h1>Collaborations</h1>

      <div style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
        <button
          onClick={() => setActiveTab('incoming')}
          style={{
            padding: '10px 20px',
            backgroundColor: activeTab === 'incoming' ? '#007bff' : '#f8f9fa',
            color: activeTab === 'incoming' ? 'white' : '#000',
            border: 'none',
            cursor: 'pointer',
            borderRadius: '4px'
          }}
        >
          Incoming Requests ({incomingRequests.filter(r => r.status === 'pending').length})
        </button>
        <button
          onClick={() => setActiveTab('outgoing')}
          style={{
            padding: '10px 20px',
            backgroundColor: activeTab === 'outgoing' ? '#007bff' : '#f8f9fa',
            color: activeTab === 'outgoing' ? 'white' : '#000',
            border: 'none',
            cursor: 'pointer',
            borderRadius: '4px'
          }}
        >
          My Requests ({myRequests.length})
        </button>
      </div>

      {activeTab === 'incoming' && (
        <div>
          <h2>Incoming Collaboration Requests</h2>
          {incomingRequests.length === 0 ? (
            <p style={{ color: '#666' }}>No collaboration requests.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {incomingRequests.map((request) => (
                <div
                  key={request.id}
                  style={{
                    border: '1px solid #ddd',
                    padding: '20px',
                    borderRadius: '8px',
                    backgroundColor: 'white'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h3 style={{ margin: 0 }}>{request.listName}</h3>
                      <p style={{ color: '#666', fontSize: '0.9em', margin: '5px 0' }}>
                        User ID: {request.user_id}
                      </p>
                      <p style={{ color: '#999', fontSize: '0.85em' }}>
                        Requested: {new Date(request.requested_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {getStatusBadge(request.status)}
                      {request.status === 'pending' && (
                        <div style={{ display: 'flex', gap: '5px' }}>
                          <button
                            onClick={() => handleRespond(request.id, 'approved')}
                            style={{
                              padding: '8px 16px',
                              backgroundColor: '#28a745',
                              color: 'white',
                              border: 'none',
                              cursor: 'pointer',
                              borderRadius: '4px'
                            }}
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleRespond(request.id, 'rejected')}
                            style={{
                              padding: '8px 16px',
                              backgroundColor: '#dc3545',
                              color: 'white',
                              border: 'none',
                              cursor: 'pointer',
                              borderRadius: '4px'
                            }}
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'outgoing' && (
        <div>
          <h2>My Collaboration Requests</h2>
          {myRequests.length === 0 ? (
            <p style={{ color: '#666' }}>You haven't requested any collaborations yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {myRequests.map((request) => (
                <div
                  key={request.id}
                  style={{
                    border: '1px solid #ddd',
                    padding: '20px',
                    borderRadius: '8px',
                    backgroundColor: 'white'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h3 style={{ margin: 0 }}>{request.listName}</h3>
                      <p style={{ color: '#999', fontSize: '0.85em', margin: '5px 0' }}>
                        Requested: {new Date(request.requested_at).toLocaleDateString()}
                      </p>
                      {request.responded_at && (
                        <p style={{ color: '#999', fontSize: '0.85em' }}>
                          Responded: {new Date(request.responded_at).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    {getStatusBadge(request.status)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Collaborations;
