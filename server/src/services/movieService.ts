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

export const searchMovies = async (query: string, page: number = 1): Promise<{ results: MovieSearchResult[]; page: number; total_pages: number; total_results: number; }> => {
  try {
    const apiKey = process.env.TMDB_API_KEY || process.env.OMDB_API_KEY || '';
    const response = await axios.get(`${TMDB_BASE_URL}/search/movie`, {
      params: {
        api_key: apiKey,
        query: query,
        page
      }
    });

    const resp = response.data || {};
    const results = (resp.results || []).map((movie: any) => ({
      imdbID: movie.id.toString(),
      Title: movie.title,
      Year: movie.release_date ? movie.release_date.substring(0, 4) : '',
      Type: 'movie',
      Poster: movie.poster_path ? `${TMDB_IMAGE_BASE_URL}${movie.poster_path}` : ''
    }));

    return {
      results,
      page: resp.page || page,
      total_pages: resp.total_pages || 1,
      total_results: resp.total_results || results.length,
    };
  } catch (error) {
    console.error('Error searching movies:', error);
    return { results: [], page: 1, total_pages: 1, total_results: 0 };
  }
};

export const getMovieDetails = async (imdbId: string): Promise<MovieDetails | null> => {
  try {
    const apiKey = process.env.TMDB_API_KEY || process.env.OMDB_API_KEY || '';
    const response = await axios.get(`${TMDB_BASE_URL}/movie/${imdbId}`, {
      params: {
        api_key: apiKey
      }
    });

    if (response.data) {
      const movie = response.data;
      return {
        imdbID: movie.imdb_id || imdbId,
        Title: movie.title,
        Year: movie.release_date ? movie.release_date.substring(0, 4) : '',
        Rated: '', // TMDb doesn't have rating
        Released: movie.release_date,
        Runtime: movie.runtime ? `${movie.runtime} min` : '',
        Genre: movie.genres ? movie.genres.map((g: any) => g.name).join(', ') : '',
        Director: '', // Would need credits API
        Actors: '', // Would need credits API
        Plot: movie.overview,
        Poster: movie.poster_path ? `${TMDB_IMAGE_BASE_URL}${movie.poster_path}` : ''
      };
    }
    return null;
  } catch (error) {
    console.error('Error fetching movie details:', error);
    return null;
  }
};
