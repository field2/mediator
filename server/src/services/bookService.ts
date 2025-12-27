import axios from 'axios';

const OPEN_LIBRARY_SEARCH_URL = 'https://openlibrary.org/search.json';
const OPEN_LIBRARY_WORKS_URL = 'https://openlibrary.org/works/';

export interface BookSearchResult {
  key: string;
  title: string;
  author_name?: string[];
  first_publish_year?: number;
  cover_i?: number;
}

export interface BookDetails {
  key: string;
  title: string;
  authors?: Array<{ name: string }>;
  description?: string | { value: string };
  covers?: number[];
  first_publish_date?: string;
}

export const searchBooks = async (query: string): Promise<BookSearchResult[]> => {
  try {
    const response = await axios.get(OPEN_LIBRARY_SEARCH_URL, {
      params: {
        q: query,
        limit: 10
      }
    });

    return response.data.docs || [];
  } catch (error) {
    console.error('Error searching books:', error);
    return [];
  }
};

export const getBookDetails = async (workId: string): Promise<BookDetails | null> => {
  try {
    const response = await axios.get(`${OPEN_LIBRARY_WORKS_URL}${workId}.json`);
    return response.data;
  } catch (error) {
    console.error('Error fetching book details:', error);
    return null;
  }
};

export const getCoverUrl = (coverId: number, size: 'S' | 'M' | 'L' = 'M'): string => {
  return `https://covers.openlibrary.org/b/id/${coverId}-${size}.jpg`;
};
