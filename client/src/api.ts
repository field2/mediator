import axios from 'axios';
import { User, List, MediaItem, Collaboration, SearchResult } from './types';

const API_BASE_URL = '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth
export const register = async (username: string, email: string, password: string): Promise<User> => {
  const response = await api.post('/auth/register', { username, email, password });
  return response.data;
};

export const login = async (email: string, password: string): Promise<User> => {
  const response = await api.post('/auth/login', { email, password });
  return response.data;
};

// Search
export const searchMovies = async (query: string): Promise<SearchResult[]> => {
  const response = await api.get(`/search/movies?q=${encodeURIComponent(query)}`);
  return response.data;
};

export const searchBooks = async (query: string): Promise<SearchResult[]> => {
  const response = await api.get(`/search/books?q=${encodeURIComponent(query)}`);
  return response.data;
};

export const searchAlbums = async (query: string): Promise<SearchResult[]> => {
  const response = await api.get(`/search/albums?q=${encodeURIComponent(query)}`);
  return response.data;
};

// Lists
export const getLists = async (): Promise<List[]> => {
  const response = await api.get('/lists');
  return response.data;
};

export const getPublicLists = async (): Promise<List[]> => {
  const response = await api.get('/lists/public');
  return response.data;
};

export const getList = async (id: number): Promise<any> => {
  const response = await api.get(`/lists/${id}`);
  return response.data;
};

export const createList = async (name: string, description?: string, isPublic?: boolean): Promise<List> => {
  const response = await api.post('/lists', { name, description, isPublic });
  return response.data;
};

export const updateList = async (id: number, name: string, description: string, isPublic: boolean): Promise<List> => {
  const response = await api.put(`/lists/${id}`, { name, description, isPublic });
  return response.data;
};

export const deleteList = async (id: number): Promise<void> => {
  await api.delete(`/lists/${id}`);
};

export const addMediaToList = async (
  listId: number,
  mediaType: string,
  externalId: string,
  title: string,
  year?: string,
  posterUrl?: string,
  additionalData?: any
): Promise<MediaItem> => {
  const response = await api.post(`/lists/${listId}/media`, {
    mediaType,
    externalId,
    title,
    year,
    posterUrl,
    additionalData
  });
  return response.data;
};

export const rateMedia = async (listId: number, mediaId: number, rating: number): Promise<any> => {
  const response = await api.post(`/lists/${listId}/media/${mediaId}/rate`, { rating });
  return response.data;
};

export const deleteMediaFromList = async (listId: number, mediaId: number): Promise<void> => {
  await api.delete(`/lists/${listId}/media/${mediaId}`);
};

// Collaborations
export const requestCollaboration = async (listId: number): Promise<Collaboration> => {
  const response = await api.post('/collaborations/request', { listId });
  return response.data;
};

export const getCollaborationRequests = async (): Promise<Collaboration[]> => {
  const response = await api.get('/collaborations/requests');
  return response.data;
};

export const getMyCollaborationRequests = async (): Promise<Collaboration[]> => {
  const response = await api.get('/collaborations/my-requests');
  return response.data;
};

export const respondToCollaboration = async (id: number, status: 'approved' | 'rejected'): Promise<Collaboration> => {
  const response = await api.put(`/collaborations/requests/${id}`, { status });
  return response.data;
};

export const getCollaborators = async (listId: number): Promise<Collaboration[]> => {
  const response = await api.get(`/collaborations/list/${listId}`);
  return response.data;
};
