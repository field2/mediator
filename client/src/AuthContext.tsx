import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from './types';

interface AuthContextType {
  user: User | null;
  login: (user: User, persist?: 'local' | 'session') => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);

  // read persisted user from either localStorage (stay signed in) or sessionStorage
  useEffect(() => {
    const storages = [localStorage, sessionStorage];
    for (const storage of storages) {
      const token = storage.getItem('token');
      const userId = storage.getItem('userId');
      const username = storage.getItem('username');
      const email = storage.getItem('email');

      if (token && userId && username && email) {
        setUser({ token, userId: parseInt(userId), username, email });
        break;
      }
    }
  }, []);

  const login = (userData: User, persist: 'local' | 'session' = 'local') => {
    const storage = persist === 'session' ? sessionStorage : localStorage;
    // clear the other storage to avoid stale sessions
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    localStorage.removeItem('username');
    localStorage.removeItem('email');
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('userId');
    sessionStorage.removeItem('username');
    sessionStorage.removeItem('email');

    storage.setItem('token', userData.token);
    storage.setItem('userId', userData.userId.toString());
    storage.setItem('username', userData.username);
    storage.setItem('email', userData.email);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    localStorage.removeItem('username');
    localStorage.removeItem('email');
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('userId');
    sessionStorage.removeItem('username');
    sessionStorage.removeItem('email');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
