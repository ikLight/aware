import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { login as apiLogin, logout as apiLogout } from '@/services/api';

interface AuthContextType {
  isAuthenticated: boolean;
  username: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    // Check if there's a token in localStorage
    const token = localStorage.getItem('token');
    if (token) {
      const storedUsername = localStorage.getItem('username');
      setIsAuthenticated(true);
      setUsername(storedUsername);
    }
  }, []);

  const login = async (username: string, password: string) => {
    try {
      const response = await apiLogin(username, password);
      if (response && response.access_token) {
        setIsAuthenticated(true);
        setUsername(username);
        localStorage.setItem('username', username);
        return response;
      } else {
        throw new Error('Invalid login response');
      }
    } catch (error) {
      setIsAuthenticated(false);
      setUsername(null);
      localStorage.removeItem('username');
      localStorage.removeItem('token');
      throw error;
    }
  };

  const logout = async () => {
    try {
      await apiLogout();
      setIsAuthenticated(false);
      setUsername(null);
      localStorage.removeItem('username');
      localStorage.removeItem('token');
    } catch (error) {
      console.error('Logout error:', error);
      // Still clear local state even if API call fails
      setIsAuthenticated(false);
      setUsername(null);
      localStorage.removeItem('username');
      localStorage.removeItem('token');
    }
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, username, login, logout }}>
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