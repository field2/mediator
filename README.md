# Mediator - Media Cataloging App

A full-stack web application that allows users to catalog movies, books, and albums they've watched/read/listened to, rate them, and collaborate on shared lists.

## Features

- 🎬 **Movies** - Search via The Movie Database (TMDb) API
- 📚 **Books** - Search via Open Library API
- 🎵 **Albums** - Search via MusicBrainz API
- ⭐ **5-Star Rating System** - Rate any media item
- 📝 **List Management** - Create and organize your media into lists
- 🔍 **Auto-categorization** - Media automatically sorted into "My Movies", "My Books", "My Albums"
- 🌐 **Public/Private Lists** - Control list visibility
- 🤝 **Collaboration** - Request to collaborate on public lists
- 👥 **Multi-user** - User authentication and authorization

## Tech Stack

### Frontend

- React 18 with TypeScript
- Vite for build tooling
- React Router for navigation
- Axios for API calls

### Backend

- Node.js with Express
- TypeScript
- Better-SQLite3 for database
- JWT authentication
- bcryptjs for password hashing

### External APIs

- [The Movie Database (TMDb)](https://www.themoviedb.org/documentation/api) - Movie data (replaces OMDB)
- [Open Library API](https://openlibrary.org/developers/api) - Book data
- [MusicBrainz API](https://musicbrainz.org/doc/MusicBrainz_API) - Album data

## Prerequisites

- Node.js 18+ and npm
- A TMDb API key (get one at https://www.themoviedb.org/settings/api)

## Installation

1. **Clone the repository**

   ```bash
   cd /Users/ben/Documents/mediator
   ```

2. **Install all dependencies**

   ```bash
   npm run install-all
   ```

3. **Set up environment variables**

   Copy the example env file:

   ```bash
   cp server/.env.example server/.env
   ```

   Edit `server/.env` and add your TMDb API key as `TMDB_API_KEY`:

   ```
   PORT=3001
   JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
   TMDB_API_KEY=your-actual-tmdb-api-key-here
   NODE_ENV=development
   ```

## Running the Application

### Development Mode

Run both frontend and backend concurrently:

```bash
npm run dev
```

Or run them separately:

**Backend only:**

```bash
npm run server
```

**Frontend only:**

```bash
npm run client
```

The application will be available at:

- Frontend: http://localhost:3000
- Backend API: http://localhost:3001

## Database

The app uses SQLite with the following schema:

- **users** - User accounts
- **lists** - User-created lists
- **media_items** - Movies, books, albums added to lists
- **ratings** - User ratings for media items
- **collaborations** - Collaboration requests and approvals

The database file (`mediator.db`) is automatically created on first run in the `server` directory.

## API Endpoints

### Authentication

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login

### Search

- `GET /api/search/movies?q=query` - Search movies
- `GET /api/search/books?q=query` - Search books
- `GET /api/search/albums?q=query` - Search albums

### Lists

- `GET /api/lists` - Get user's lists
- `GET /api/lists/public` - Get public lists
- `POST /api/lists` - Create a new list
- `GET /api/lists/:id` - Get list with media items
- `PUT /api/lists/:id` - Update list
- `DELETE /api/lists/:id` - Delete list
- `POST /api/lists/:id/media` - Add media to list
- `POST /api/lists/:listId/media/:mediaId/rate` - Rate a media item
- `DELETE /api/lists/:listId/media/:mediaId` - Delete media from list

### Collaborations

- `POST /api/collaborations/request` - Request collaboration
- `GET /api/collaborations/requests` - Get incoming requests
- `GET /api/collaborations/my-requests` - Get sent requests
- `PUT /api/collaborations/requests/:id` - Approve/reject request

## Usage Guide

### Getting Started

1. **Register/Login** - Create an account or login
2. **Create a List** - Click "Create New List" and give it a name
3. **Add Media** - Use the search bar to find movies, books, or albums
4. **Rate Items** - Click stars to rate any item (1-5 stars)
5. **Organize** - View your media in sections: My Movies, My Books, My Albums

### Collaboration

1. **Make Lists Public** - When creating/editing a list, check "Make this list public"
2. **Browse Public Lists** - Click "Public Lists" tab to see what others are sharing
3. **Request Access** - Click "Collaborate" on any public list
4. **Approve Requests** - List owners can approve/reject requests in the Collaborations page
5. **Collaborate** - Approved collaborators can add media and rate items

## Project Structure

```
mediator/
├── client/               # React frontend
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── App.tsx      # Main app component
│   │   ├── api.ts       # API client
│   │   ├── types.ts     # TypeScript types
│   │   └── AuthContext.tsx
│   └── package.json
├── server/              # Express backend
│   ├── src/
│   │   ├── db/         # Database models
│   │   ├── routes/     # API routes
│   │   ├── services/   # External API services
│   │   ├── middleware/ # Auth middleware
│   │   └── index.ts    # Server entry point
│   └── package.json
└── package.json         # Root package.json

```

## Development

### Adding New Features

1. **Backend** - Add routes in `server/src/routes/`
2. **Frontend** - Create components in `client/src/components/`
3. **API Integration** - Update `client/src/api.ts`

### Database Changes

Modify schema in `server/src/db/database.ts`. Delete `mediator.db` to recreate with new schema.

## Production Deployment

1. Build the frontend:

   ```bash
   cd client && npm run build
   ```

2. Build the backend:

   ```bash
   cd server && npm run build
   ```

3. Set production environment variables
4. Serve frontend build from Express
5. Use PostgreSQL instead of SQLite for better performance

## Troubleshooting

**TMDb API not working?**

- Ensure you have a valid `TMDB_API_KEY` in `server/.env`
- Verify your key and account at https://www.themoviedb.org/settings/api

**Database errors?**

- Delete `server/mediator.db` and restart to recreate

**Port conflicts?**

- Change PORT in `server/.env` and update proxy in `client/vite.config.ts`

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
