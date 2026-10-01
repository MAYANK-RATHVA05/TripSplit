import React, { createContext, useContext, useState, useEffect } from 'react';
import { api, getStoredToken, setStoredToken, removeStoredToken } from '../lib/api.js';

export interface User {
  id: string;
  name: string;
  email: string;
  preferredCurrency: string;
  avatar?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, preferredCurrency?: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCurrentUser = async () => {
    try {
      const token = getStoredToken();
      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }
      const data = await api.auth.me();
      setUser(data.user);
    } catch (err) {
      removeStoredToken();
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  const login = async (email: string, password: string) => {
    const data = await api.auth.login({ email, password });
    setStoredToken(data.token);
    setUser(data.user);
  };

  const register = async (name: string, email: string, password: string, preferredCurrency: string = 'USD') => {
    const data = await api.auth.register({ name, email, password, preferredCurrency });
    setStoredToken(data.token);
    setUser(data.user);
  };

  const logout = () => {
    removeStoredToken();
    setUser(null);
    api.auth.logout().catch(() => {});
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser: fetchCurrentUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
