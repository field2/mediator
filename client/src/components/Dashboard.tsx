import React, { useState } from 'react';
import { useAuth } from '../AuthContext';
import SearchBar from './SearchBar';
import { getOrCreateAutoList, addMediaToList, getList, rateMedia } from '../api';
import { MediaItem } from '../types';
import StarRating from './StarRating';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [selectedMediaType, setSelectedMediaType] = useState<'movie' | 'book' | 'album'>('movie');
  const [loading, setLoading] = useState(false);
  const [autoListId, setAutoListId] = useState<number | null>(null);
  const [autoItems, setAutoItems] = useState<MediaItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);

  const handleMediaSelected = async (item: any, mediaType: 'movie' | 'book' | 'album') => {
    setLoading(true);
    try {
      const list = await getOrCreateAutoList(mediaType);
      await addMediaToList(
        list.id,
        mediaType,
        item.id,
        item.title,
        item.year,
        item.Poster || item.cover,
        item
      );
      // refresh local items for this media type
      setAutoListId(list.id);
      const full = await getList(list.id);
      setAutoItems(full.mediaItems || []);
    } catch (error) {
      console.error('Error adding media:', error);
      alert('Failed to add media');
    } finally {
      setLoading(false);
    }
  };

  // load user's auto list items when media type changes
  React.useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoadingItems(true);
      try {
        const list = await getOrCreateAutoList(selectedMediaType);
        if (cancelled) return;
        setAutoListId(list.id);
        const full = await getList(list.id);
        if (cancelled) return;
        setAutoItems(full.mediaItems || []);
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
  }, [selectedMediaType]);

    const handleRate = async (mediaId: number, rating: number) => {
      if (!autoListId) return;
      try {
        await rateMedia(autoListId, mediaId, rating);
        const full = await getList(autoListId);
        setAutoItems(full.mediaItems || []);
      } catch (err) {
        console.error('Error rating item:', err);
      }
    };

  return (
    <div className="page-container">
      <div className="header">

        <div className="media-tabs">
          <button onClick={() => setSelectedMediaType('movie')} className={`media-tab ${selectedMediaType === 'movie' ? 'active' : ''}`}>
          <svg width="33" height="37" viewBox="0 0 33 37" fill="none" xmlns="http://www.w3.org/2000/svg">
<path fill-rule="evenodd" clip-rule="evenodd" d="M32.9512 34.5263C32.9512 35.6309 32.0558 36.5263 30.9512 36.5263H3.95119C2.84662 36.5263 1.95119 35.6309 1.95119 34.5263V16.5263H32.9512V34.5263ZM3.95119 18.5263V23.5263L6.65139 18.5263H3.95119ZM9.34572 18.5263L6.6465 23.5263H9.34572L12.0459 18.5263H9.34572ZM14.75 18.5263L12.0498 23.5263H14.75L17.4492 18.5263H14.75ZM20.1514 18.5263L17.4522 23.5263H20.1514L22.8516 18.5263H20.1514ZM25.5498 18.5263L22.8496 23.5263H25.5498L28.249 18.5263H25.5498ZM28.251 23.5263H30.9512V18.5263L28.251 23.5263Z" fill="white"/>
<path fill-rule="evenodd" clip-rule="evenodd" d="M27.4734 0.0737671C28.5373 -0.222396 29.6404 0.39981 29.9367 1.46371L31.8133 8.20749L1.95119 16.5263L0.0737564 9.78254C-0.222378 8.71858 0.399809 7.61556 1.4637 7.3192L27.4734 0.0737671ZM3.34027 14.063L5.94142 13.3384L1.99852 9.24637L3.34027 14.063ZM4.59497 8.52308L8.53693 12.6154L11.1381 11.8908L7.19519 7.79875L4.59497 8.52308ZM9.80011 7.0731L13.743 11.1651L16.3442 10.4405L12.4013 6.34851L9.80011 7.0731ZM15.0043 5.62339L18.9463 9.71566L21.5474 8.99107L17.6045 4.89906L15.0043 5.62339ZM20.2038 4.17498L24.1467 8.267L26.7469 7.54266L22.8049 3.45039L20.2038 4.17498ZM25.407 2.72553L29.35 6.81754L28.0082 2.00093L25.407 2.72553Z" fill="white"/>
</svg>



          </button>
          <button onClick={() => setSelectedMediaType('book')} className={`media-tab ${selectedMediaType === 'book' ? 'active' : ''}`}>
            <svg width="25" height="35" viewBox="0 0 25 35" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M24.9994 22.9998H6.75C4.12665 22.9998 2 25.1265 2 27.7498C2 30.3732 4.12665 32.4998 6.75 32.4998H24.9994V34.4998H7C3.13401 34.4998 1.12749e-07 31.3658 0 27.4998L0.00254822 6.99986C0.00254867 3.13386 3.13656 -0.000144705 7.00255 -0.000144705H25.002L24.9994 22.9998Z" fill="white"/>
<path d="M4 25.9998C4 25.4476 4.34822 24.9998 4.77778 24.9998H24.9994V26.9998H4.77778C4.34822 26.9998 4 26.5521 4 25.9998Z" fill="black"/>
<path d="M4 29.4998C4 28.9476 4.34822 28.4998 4.77778 28.4998H24.9994V30.4998H4.77778C4.34822 30.4998 4 30.0521 4 29.4998Z" fill="black"/>
</svg>


          </button>
          <button onClick={() => setSelectedMediaType('album')} className={`media-tab ${selectedMediaType === 'album' ? 'active' : ''}`}>
           <svg width="35" height="35" viewBox="0 0 35 35" fill="none" xmlns="http://www.w3.org/2000/svg">
<path fill-rule="evenodd" clip-rule="evenodd" d="M17.5 0C27.165 0 35 7.83502 35 17.5C35 27.165 27.165 35 17.5 35C7.83502 35 0 27.165 0 17.5C0 7.83502 7.83502 0 17.5 0ZM17.5 11C13.9101 11 11 13.9101 11 17.5C11 21.0899 13.9101 24 17.5 24C21.0899 24 24 21.0899 24 17.5C24 13.9101 21.0899 11 17.5 11Z" fill="white"/>
<path d="M19 17.5C19 18.3284 18.3284 19 17.5 19C16.6716 19 16 18.3284 16 17.5C16 16.6716 16.6716 16 17.5 16C18.3284 16 19 16.6716 19 17.5Z" fill="black"/>
</svg>

          </button>
        </div>
                          <SearchBar onSelect={() => {}} mediaType={selectedMediaType} onMediaSelected={handleMediaSelected} />

      </div>

      <div className="media-section-body">
        <div className="search-panel">
          {loading && <div className="loading-text">Adding to your list...</div>}
          <div className="auto-items">
            <h3 className="auto-items-title">{autoItems.length ? `Your ${selectedMediaType === 'movie' ? 'Movies' : selectedMediaType === 'book' ? 'Books' : 'Albums'}` : `No ${selectedMediaType === 'movie' ? 'movies' : selectedMediaType === 'book' ? 'books' : 'albums'} added yet`}</h3>
            {loadingItems ? (
              <div>Loading your items...</div>
            ) : autoItems.length > 0 ? (
              <div className="auto-items-grid">
                {autoItems.map((mi) => (
                  <div key={mi.id} className="auto-item-card">
                    <img src={mi.poster_url || '/placeholder.png'} alt={mi.title} className="auto-item-img" />
                    <div className="auto-item-title">{mi.title}</div>
                    {mi.year && <div className="auto-item-year">{mi.year}</div>}
                    <div className="auto-item-rating"><StarRating rating={mi.userRating || 0} onRate={(r) => handleRate(mi.id, r)} readonly={!user} /></div>
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
