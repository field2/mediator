import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import SearchBar from './SearchBar';
import { getOrCreateAutoList, addMediaToList, getList, rateMedia, deleteMediaFromList, getFriendRequests, getUserAutoList } from '../api';
import { MediaItem } from '../types';
import StarRating from './StarRating';

const Dashboard: React.FC = () => {
    const [menuOpen, setMenuOpen] = useState(false);
    const handleMenuToggle = () => setMenuOpen((open) => !open);
    const handleMenuClose = () => setMenuOpen(false);  
  // Close menu when clicking outside
  useEffect(() => {
    if (menuOpen) {
      const handleClickOutside = () => setMenuOpen(false);
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [menuOpen]);
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { userId } = useParams<{ userId: string }>();
  const viewingOtherUser = userId && parseInt(userId) !== user?.id;
  const [selectedMediaType, setSelectedMediaType] = useState<'movie' | 'book' | 'album'>('movie');
  const [loading, setLoading] = useState(false);
  const [autoListId, setAutoListId] = useState<number | null>(null);
  const [autoItems, setAutoItems] = useState<MediaItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [guestItems, setGuestItems] = useState<Record<'movie' | 'book' | 'album', MediaItem[]>>({ movie: [], book: [], album: [] });
  const [showSavePrompt, setShowSavePrompt] = useState(false);
  const [hasPendingFriendRequests, setHasPendingFriendRequests] = useState(false);

  useEffect(() => {
    const fetchFriendRequests = async () => {
      if (!isAuthenticated) {
        setHasPendingFriendRequests(false);
        return;
      }
      try {
        const reqs = await getFriendRequests();
        setHasPendingFriendRequests(Array.isArray(reqs) && reqs.some((r) => r.status === 'pending'));
      } catch (err) {
        console.error('Error fetching friend requests', err);
        setHasPendingFriendRequests(false);
      }
    };

    fetchFriendRequests();
  }, [isAuthenticated]);

  const addItemToAutoList = async (item: any, mediaType: 'movie' | 'book' | 'album') => {
    setLoading(true);
    try {
      const externalId = (item.external_id ?? item.id)?.toString?.() || item.id;
      const list = await getOrCreateAutoList(mediaType);
      await addMediaToList(
        list.id,
        mediaType,
        externalId,
        item.title,
        item.year,
        item.Poster || item.cover || item.poster_url,
        item
      );
      // refresh local items for this media type
      setAutoListId(list.id);
      const full = await getList(list.id);
      setAutoItems(Array.isArray(full.mediaItems) ? full.mediaItems : []);
    } catch (error) {
      console.error('Error adding media:', error);
      alert('Failed to add media');
    } finally {
      setLoading(false);
    }
  };

  const handleMediaSelected = async (item: any, mediaType: 'movie' | 'book' | 'album') => {
    if (!isAuthenticated) {
      // keep locally for now and prompt to save
      const guestItem = {
        id: Date.now(),
        title: item.title,
        year: item.year,
        poster_url: item.Poster || item.cover,
        media_type: mediaType,
        averageRating: undefined,
        userRating: undefined,
        external_id: item.id?.toString?.() || '',
        list_id: 0,
        additional_data: null,
        added_by: 0,
        added_at: new Date().toISOString()
      } as MediaItem;
      setGuestItems((prev) => {
        const updated = { ...prev, [mediaType]: [...prev[mediaType], guestItem] };
        localStorage.setItem(`guestItems_${mediaType}`, JSON.stringify(updated[mediaType]));
        return updated;
      });
      setShowSavePrompt(true);
      return;
    }
    addItemToAutoList(item, mediaType);
  };

  const loadGuestItems = (mediaType: 'movie' | 'book' | 'album') => {
    try {
      const stored = localStorage.getItem(`guestItems_${mediaType}`);
      const parsed = stored ? JSON.parse(stored) : [];
      setGuestItems((prev) => ({ ...prev, [mediaType]: Array.isArray(parsed) ? parsed : [] }));
    } catch {
      setGuestItems((prev) => ({ ...prev, [mediaType]: [] }));
    }
  };

  // Conditionally add guest-user class to body if guest has no items
  React.useEffect(() => {
    if (!isAuthenticated) {
      const totalGuestItems = Object.values(guestItems).reduce((sum, items) => sum + items.length, 0);
      if (totalGuestItems === 0) {
        document.body.classList.add('guest-user');
      } else {
        document.body.classList.remove('guest-user');
      }
    } else {
      document.body.classList.remove('guest-user');
    }
  }, [isAuthenticated, guestItems]);

  // load items (server or guest) when media type or auth state changes
  React.useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoadingItems(true);
      if (!isAuthenticated) {
        loadGuestItems(selectedMediaType);
        setAutoItems([]);
        setAutoListId(null);
        setLoadingItems(false);
        return;
      }
      try {
        // If viewing another user's content
        if (viewingOtherUser) {
          const full = await getUserAutoList(parseInt(userId!), selectedMediaType);
          if (cancelled) return;
          setAutoListId(full.id);
          setAutoItems(Array.isArray(full.mediaItems) ? full.mediaItems : []);
        } else {
          // Viewing own content
          const list = await getOrCreateAutoList(selectedMediaType);
          if (cancelled) return;
          setAutoListId(list.id);
          const full = await getList(list.id);
          if (cancelled) return;
          setAutoItems(Array.isArray(full.mediaItems) ? full.mediaItems : []);
        }
      } catch (err) {
        console.error('Error loading auto list items:', err);
        setAutoItems([]);
        setAutoListId(null);
      } finally {
        if (!cancelled) setLoadingItems(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [selectedMediaType, isAuthenticated, viewingOtherUser, userId]);

  // If a user signs in after picking items, sync guest items once
  const hasSyncedRef = React.useRef(false);
  React.useEffect(() => {
    const syncGuestItems = async () => {
      if (!isAuthenticated || hasSyncedRef.current) return;
      hasSyncedRef.current = true;

      for (const mediaType of ['movie', 'book', 'album'] as const) {
        const stored = localStorage.getItem(`guestItems_${mediaType}`);
        const parsed: any[] = stored ? JSON.parse(stored) : [];
        for (const item of parsed) {
          await addItemToAutoList(item, mediaType);
        }
        localStorage.removeItem(`guestItems_${mediaType}`);
      }
      setGuestItems({ movie: [], book: [], album: [] });
      setShowSavePrompt(false);
    };
    syncGuestItems();
  }, [isAuthenticated]);

    const handleRate = async (mediaId: number, rating: number) => {
      if (!isAuthenticated || !autoListId) return;
      try {
        await rateMedia(autoListId, mediaId, rating);
        const full = await getList(autoListId);
        setAutoItems(Array.isArray(full.mediaItems) ? full.mediaItems : []);
      } catch (err) {
        console.error('Error rating item:', err);
      }
    };

  const handleRemove = async (mediaId: number) => {
    if (!isAuthenticated) {
      setGuestItems((prev) => {
        const filtered = prev[selectedMediaType].filter((mi) => mi.id !== mediaId);
        const updated = { ...prev, [selectedMediaType]: filtered };
        localStorage.setItem(`guestItems_${selectedMediaType}`, JSON.stringify(filtered));
        return updated;
      });
      return;
    }
    if (!autoListId) return;
    try {
      await deleteMediaFromList(autoListId, mediaId);
      const full = await getList(autoListId);
      setAutoItems(Array.isArray(full.mediaItems) ? full.mediaItems : []);
    } catch (err) {
      console.error('Error removing item:', err);
    }
  };

  return (
    <div className="page-container">
      <div className="header">
        {/* Menu Overlay */}
        {menuOpen && (
          <div className="menu-overlay" onClick={handleMenuClose}>
            <div className="menu-content" onClick={e => e.stopPropagation()}>
              {isAuthenticated ? (
                <>
                  <div className="menu-account">
                    <a href="/account" className="menu-username">{user?.username || 'Account'}</a>
                  </div>
                  <a href="/friends" className={`menu-link ${hasPendingFriendRequests ? 'pulse' : ''}`}>Friends</a>
                  <a href="/lists" className="menu-link">Lists</a>
                </>
              ) : (
                <a href="/auth" className="menu-link">Login / Register</a>
              )}
            </div>
          </div>
        )}

        <div className="media-tabs">
          <button onClick={() => setSelectedMediaType('movie')} className={`media-tab ${selectedMediaType === 'movie' ? 'active' : ''}`}>
          <svg width="33" height="37" viewBox="0 0 33 37" fill="none" xmlns="http://www.w3.org/2000/svg">
<path fillRule="evenodd" clipRule="evenodd" d="M32.9512 34.5263C32.9512 35.6309 32.0558 36.5263 30.9512 36.5263H3.95119C2.84662 36.5263 1.95119 35.6309 1.95119 34.5263V16.5263H32.9512V34.5263ZM3.95119 18.5263V23.5263L6.65139 18.5263H3.95119ZM9.34572 18.5263L6.6465 23.5263H9.34572L12.0459 18.5263H9.34572ZM14.75 18.5263L12.0498 23.5263H14.75L17.4492 18.5263H14.75ZM20.1514 18.5263L17.4522 23.5263H20.1514L22.8516 18.5263H20.1514ZM25.5498 18.5263L22.8496 23.5263H25.5498L28.249 18.5263H25.5498ZM28.251 23.5263H30.9512V18.5263L28.251 23.5263Z" fill="white"/>
<path fillRule="evenodd" clipRule="evenodd" d="M27.4734 0.0737671C28.5373 -0.222396 29.6404 0.39981 29.9367 1.46371L31.8133 8.20749L1.95119 16.5263L0.0737564 9.78254C-0.222378 8.71858 0.399809 7.61556 1.4637 7.3192L27.4734 0.0737671ZM3.34027 14.063L5.94142 13.3384L1.99852 9.24637L3.34027 14.063ZM4.59497 8.52308L8.53693 12.6154L11.1381 11.8908L7.19519 7.79875L4.59497 8.52308ZM9.80011 7.0731L13.743 11.1651L16.3442 10.4405L12.4013 6.34851L9.80011 7.0731ZM15.0043 5.62339L18.9463 9.71566L21.5474 8.99107L17.6045 4.89906L15.0043 5.62339ZM20.2038 4.17498L24.1467 8.267L26.7469 7.54266L22.8049 3.45039L20.2038 4.17498ZM25.407 2.72553L29.35 6.81754L28.0082 2.00093L25.407 2.72553Z" fill="white"/>
</svg>



          </button>
          <button onClick={() => setSelectedMediaType('book')} className={`media-tab ${selectedMediaType === 'book' ? 'active' : ''}`}>
           <svg width="25" height="35" viewBox="0 0 25 35" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M24.9994 22.9998H6.75C4.12665 22.9998 2 25.1265 2 27.7498C2 30.3732 4.12665 32.4998 6.75 32.4998H24.9994V34.4998H7C3.13401 34.4998 1.12749e-07 31.3658 0 27.4998L0.00254822 6.99986C0.00254867 3.13386 3.13656 -0.000144705 7.00255 -0.000144705H25.002L24.9994 22.9998Z" fill="white"/>
<path d="M4 25.9998C4 25.4476 4.34822 24.9998 4.77778 24.9998H24.9994V26.9998H4.77778C4.34822 26.9998 4 26.5521 4 25.9998Z" fill="white"/>
<path d="M4 29.4998C4 28.9476 4.34822 28.4998 4.77778 28.4998H24.9994V30.4998H4.77778C4.34822 30.4998 4 30.0521 4 29.4998Z" fill="white"/>
</svg>



          </button>
          <button onClick={() => setSelectedMediaType('album')} className={`media-tab ${selectedMediaType === 'album' ? 'active' : ''}`}>
           <svg width="35" height="35" viewBox="0 0 35 35" fill="none" xmlns="http://www.w3.org/2000/svg">
<path fillRule="evenodd" clipRule="evenodd" d="M17.5 0C27.165 0 35 7.83502 35 17.5C35 27.165 27.165 35 17.5 35C7.83502 35 0 27.165 0 17.5C0 7.83502 7.83502 0 17.5 0ZM17.5 11C13.9101 11 11 13.9101 11 17.5C11 21.0899 13.9101 24 17.5 24C21.0899 24 24 21.0899 24 17.5C24 13.9101 21.0899 11 17.5 11Z" fill="white"/>
<path d="M19 17.5C19 18.3284 18.3284 19 17.5 19C16.6716 19 16 18.3284 16 17.5C16 16.6716 16.6716 16 17.5 16C18.3284 16 19 16.6716 19 17.5Z" fill="white"/>
</svg>

          </button>
        </div>
                          {!viewingOtherUser && <SearchBar onSelect={() => {}} mediaType={selectedMediaType} onMediaSelected={handleMediaSelected} />}
{/* <MainMenu /> */}
<div className={`main-menu ${hasPendingFriendRequests ? 'has-pending' : ''}`} onClick={(e) => { e.stopPropagation(); handleMenuToggle(); }} style={{ cursor: 'pointer' }}>
  <svg width="17" height="35" viewBox="0 0 17 35" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="8.5" cy="6.5" r="3.5" fill="white"/>
    <circle cx="8.5" cy="17.5" r="3.5" fill="white"/>
    <circle cx="8.5" cy="28.5" r="3.5" fill="white"/>
  </svg>
</div>
      </div>

      <div className="media-section-body">
        <div className="search-panel">
          {showSavePrompt && !isAuthenticated && (
            <div className="save-prompt">
              <div>
                <div className="save-prompt-title">Saved locally.</div>
                <div className="save-prompt-body">Create a free account to keep your media in sync across devices.</div>
              </div>
              <div className="save-prompt-actions">
                <button onClick={() => navigate('/auth?mode=register')} className="primary">Create account</button>
                <button onClick={() => setShowSavePrompt(false)}>Keep browsing</button>
              </div>
            </div>
          )}
          {loading && <div className="loading-text">Adding to your list...</div>}
          <div className="auto-items">
            <h3 className="auto-items-title">
              {(isAuthenticated ? autoItems : guestItems[selectedMediaType]).length ? (
                `Your ${selectedMediaType === 'movie' ? 'Movies' : selectedMediaType === 'book' ? 'Books' : 'Albums'}`
              ) : !isAuthenticated ? (
                <>
                  <div className="intro">
                    <p>Thanks for trying Mediator!</p>
                    <p>Use it to keep track of the movies you've watched, the books you've read or the albums you own.</p>
                  <p>
                  Mediator is a work in progress by Field 2 Design / <a href="https://bendunkle.com" target="_blank">Ben Dunkle</a>.</p>
                  <p>Copyright 2026 by Ben Dunkle. All Rights Reserved.</p></div>
                </>
              ) : (
                `No ${selectedMediaType === 'movie' ? 'Movies' : selectedMediaType === 'book' ? 'Books' : 'Albums'} yet.`
              )}
            </h3>
            {loadingItems ? (
              <div>Loading your items...</div>
            ) : (isAuthenticated ? autoItems : guestItems[selectedMediaType]).length > 0 ? (
              <div className="auto-items-grid">
                {(isAuthenticated ? autoItems : guestItems[selectedMediaType]).map((mi) => (
                  <div key={mi.id} className="auto-item-card">
                    <button className="auto-item-remove" onClick={() => handleRemove(mi.id)} aria-label="Remove item">×</button>
                      <img src={mi.poster_url || '/placeholder.png'} alt={mi.title} className="auto-item-img" />
                    <div className="auto-item-title">{mi.title}</div>
                    {mi.year && <div className="auto-item-year">{mi.year}</div>}
                    <div className="auto-item-rating"><StarRating rating={mi.userRating || 0} onRate={(r) => handleRate(mi.id, r)} readonly={!user || !isAuthenticated} /></div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>

    </div>
  );
};

export default Dashboard;
