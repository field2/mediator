import express, { Router } from 'express';
import { searchMovies, getMovieDetails } from '../services/movieService';
import { searchBooks, getBookDetails, getCoverUrl } from '../services/bookService';
import { searchAlbums, getAlbumDetails, getAlbumCoverUrl } from '../services/albumService';

const router: Router = express.Router();

// Search movies
router.get('/movies', async (req, res) => {
  try {
    const query = req.query.q as string;
    if (!query) {
      return res.status(400).json({ error: 'Query parameter is required' });
    }

    const results = await searchMovies(query);
    const formattedResults = results.map(movie => ({
      id: movie.imdbID,
      title: movie.Title,
      year: movie.Year,
      Poster: movie.Poster
    }));

    res.json(formattedResults);
  } catch (error) {
    console.error('Movie search error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

// Get movie details
router.get('/movies/:id', async (req, res) => {
  try {
    const details = await getMovieDetails(req.params.id);
    if (!details) {
      return res.status(404).json({ error: 'Movie not found' });
    }
    res.json(details);
  } catch (error) {
    console.error('Movie details error:', error);
    res.status(500).json({ error: 'Failed to fetch movie details' });
  }
});

// Search books
router.get('/books', async (req, res) => {
  try {
    const query = req.query.q as string;
    if (!query) {
      return res.status(400).json({ error: 'Query parameter is required' });
    }

    const results = await searchBooks(query);
    const formattedResults = results.map(book => ({
      id: book.key,
      title: book.title,
      author: book.author_name?.join(', '),
      year: book.first_publish_year?.toString(),
      cover: book.cover_i ? getCoverUrl(book.cover_i, 'M') : null
    }));

    res.json(formattedResults);
  } catch (error) {
    console.error('Book search error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

// Get book details
router.get('/books/:id', async (req, res) => {
  try {
    const workId = req.params.id.replace('/works/', '');
    const details = await getBookDetails(workId);
    if (!details) {
      return res.status(404).json({ error: 'Book not found' });
    }
    res.json(details);
  } catch (error) {
    console.error('Book details error:', error);
    res.status(500).json({ error: 'Failed to fetch book details' });
  }
});

// Search albums
router.get('/albums', async (req, res) => {
  try {
    const query = req.query.q as string;
    if (!query) {
      return res.status(400).json({ error: 'Query parameter is required' });
    }

    console.log('Searching albums for:', query);
    const results = await searchAlbums(query);
    console.log('Album search results:', results.length, 'albums found');

    const formattedResults = results.map((album) => ({
      id: album.id,
      title: album.title,
      artist: album['artist-credit']?.map(a => a.name).join(', '),
      year: album.date?.substring(0, 4),
      cover: null // Cover art can be fetched on demand if needed
    }));

    res.json(formattedResults);
  } catch (error) {
    console.error('Album search error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

// Get album details
router.get('/albums/:id', async (req, res) => {
  try {
    const details = await getAlbumDetails(req.params.id);
    if (!details) {
      return res.status(404).json({ error: 'Album not found' });
    }

    const coverUrl = await getAlbumCoverUrl(req.params.id);
    res.json({ ...details, coverUrl });
  } catch (error) {
    console.error('Album details error:', error);
    res.status(500).json({ error: 'Failed to fetch album details' });
  }
});

export default router;
