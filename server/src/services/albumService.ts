import axios from 'axios';

const MUSICBRAINZ_BASE_URL = 'http://musicbrainz.org/ws/2';
const COVER_ART_BASE_URL = 'https://coverartarchive.org';

export interface AlbumSearchResult {
  id: string;
  title: string;
  'artist-credit'?: Array<{ name: string }>;
  date?: string;
  status?: string;
  cover?: string;
}

export interface AlbumDetails {
  id: string;
  title: string;
  'artist-credit': Array<{ name: string }>;
  date?: string;
  status?: string;
  'cover-art-archive'?: {
    artwork: boolean;
    count: number;
  };
}

export const searchAlbums = async (query: string): Promise<AlbumSearchResult[]> => {
  try {
    const response = await axios.get('https://api.deezer.com/search/album', {
      params: {
        q: query
      },
      timeout: 5000
    });

    console.log('Deezer raw response:', response.data);
    const albums = response.data.data || [];
    console.log('Deezer albums array:', albums);
    const mapped = albums.map((album: any) => ({
      id: album.id.toString(),
      title: album.title,
      'artist-credit': [{ name: album.artist.name }],
      date: album.release_date || '',
      status: album.record_type || '',
      cover: album.cover_medium || album.cover || null
    }));
    console.log('Mapped album results:', mapped);
    return mapped;
  } catch (error) {
    console.error('Error searching albums:', (error as any).message || error);
    return [];
  }
};

export const getAlbumDetails = async (releaseId: string): Promise<AlbumDetails | null> => {
  try {
    const response = await axios.get(`${MUSICBRAINZ_BASE_URL}/release/${releaseId}`, {
      params: {
        fmt: 'json',
        inc: 'artist-credits'
      },
      headers: {
        'User-Agent': 'Mediator/1.0.0 (contact@example.com)'
      }
    });

    return response.data;
  } catch (error) {
    console.error('Error fetching album details:', error);
    return null;
  }
};

export const getAlbumCoverUrl = async (releaseId: string): Promise<string | null> => {
  try {
    const response = await axios.get(`${COVER_ART_BASE_URL}/release/${releaseId}`);

    if (response.data.images && response.data.images.length > 0) {
      return response.data.images[0].thumbnails?.large || response.data.images[0].image;
    }
    return null;
  } catch (error) {
    return null;
  }
};
