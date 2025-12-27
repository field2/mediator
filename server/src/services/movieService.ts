import axios from 'axios';

const OMDB_BASE_URL = 'http://www.omdbapi.com/';

export interface MovieSearchResult {
  imdbID: string;
  Title: string;
  Year: string;
  Type: string;
  Poster: string;
}

export interface MovieDetails {
  imdbID: string;
  Title: string;
  Year: string;
  Rated: string;
  Released: string;
  Runtime: string;
  Genre: string;
  Director: string;
  Actors: string;
  Plot: string;
  Poster: string;
}

export const searchMovies = async (query: string): Promise<MovieSearchResult[]> => {
  try {
    const apiKey = process.env.OMDB_API_KEY || '';
    const response = await axios.get(OMDB_BASE_URL, {
      params: {
        apikey: apiKey,
        s: query,
        type: 'movie'
      }
    });

    if (response.data.Response === 'True') {
      return response.data.Search || [];
    }
    return [];
  } catch (error) {
    console.error('Error searching movies:', error);
    return [];
  }
};

export const getMovieDetails = async (imdbId: string): Promise<MovieDetails | null> => {
  try {
    const apiKey = process.env.OMDB_API_KEY || '';
    const response = await axios.get(OMDB_BASE_URL, {
      params: {
        apikey: apiKey,
        i: imdbId
      }
    });

    if (response.data.Response === 'True') {
      return response.data;
    }
    return null;
  } catch (error) {
    console.error('Error fetching movie details:', error);
    return null;
  }
};
