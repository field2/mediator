import axios from 'axios';

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';

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
    const apiKey = process.env.TMDB_API_KEY || process.env.OMDB_API_KEY || '';
    const response = await axios.get(`${TMDB_BASE_URL}/search/movie`, {
      params: {
        api_key: apiKey,
        query: query
      }
    });

    if (response.data.results) {
      return response.data.results.map((movie: any) => ({
        imdbID: movie.id.toString(),
        Title: movie.title,
        Year: movie.release_date ? movie.release_date.substring(0, 4) : '',
        Type: 'movie',
        Poster: movie.poster_path ? `${TMDB_IMAGE_BASE_URL}${movie.poster_path}` : ''
      }));
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
