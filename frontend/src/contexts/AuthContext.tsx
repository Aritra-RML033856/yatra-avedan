import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config';

interface User {
  id: number;
  username: string;
  userid: string;
  email: string;
  designation: string;
  department: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (accessToken: string, user: User) => void;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  login: () => {},
  logout: () => {},
  loading: true,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));
  const [user, setUser] = useState<User | null>(() => {
    const savedUser = localStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [loading, setLoading] = useState(true); // Initial loading state
  const [isInterceptorSetup, setIsInterceptorSetup] = useState(false);

  // Global promise to deduplicate refresh requests
  // This prevents React Strict Mode or concurrent API calls from triggering
  // a "Double Refresh" which would invalidate the first token and clear the cookie.
  let isRefreshing = false;
  let refreshPromise: Promise<string> | null = null;

  const getRefreshToken = async (): Promise<string> => {
    if (refreshPromise) return refreshPromise;

    refreshPromise = (async () => {
      try {
        const response = await axios.post(`${API_BASE_URL}/api/auth/refresh`, {}, { withCredentials: true });
        const { accessToken, user: recoveredUser } = response.data;
        
        // Update local storage immediately to ensure subsequent calls see it
        localStorage.setItem('token', accessToken);
        if (recoveredUser) {
           localStorage.setItem('user', JSON.stringify(recoveredUser));
        }
        return accessToken;
      } catch (error) {
        throw error;
      } finally {
        refreshPromise = null;
      }
    })();

    return refreshPromise;
  };

  useEffect(() => {
    const initAuth = async () => {
      // PROACTIVELY Refresh on mount.
      // 1. If valid cookie exists -> Token rotates, session verified.
      // 2. If cookie missing (User deleted it) -> 401 -> Logout (Kill zombie session).
      // 3. If offline/network error -> Keep existing token if available (Graceful degradation).
      
      try {
          const accessToken = await getRefreshToken();
          setToken(accessToken);
          const savedUser = localStorage.getItem('user');
          if (savedUser) setUser(JSON.parse(savedUser));
      } catch (err: any) {
          console.log('Session verification failed:', err);
          // Only logout if it's explicitly an Auth error (missing cookie/invalid token)
          // Do NOT logout on network errors (keep offline access)
          if (err.response && err.response.status === 401) {
            logout();
          }
      }
      setLoading(false);
    };

    initAuth();
  }, []); // Run ONCE on mount

  const login = (accessToken: string, user: User) => {
    localStorage.setItem('token', accessToken);
    localStorage.setItem('user', JSON.stringify(user));
    setToken(accessToken);
    setUser(user);
  };

  const logout = async () => {
    try {
      await axios.post(`${API_BASE_URL}/api/auth/logout`, {}, { withCredentials: true });
    } catch (err) {
      console.error('Logout failed', err);
    }
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  // Axios Interceptor
  useEffect(() => {
    const requestInterceptor = axios.interceptors.request.use(
      (config) => {
        const currentToken = localStorage.getItem('token');
        if (currentToken) {
          config.headers.Authorization = `Bearer ${currentToken}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    const responseInterceptor = axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;
        
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;
          
            try {
              const accessToken = await getRefreshToken();
              
              setToken(accessToken);
              const savedUser = localStorage.getItem('user');
              if (savedUser) setUser(JSON.parse(savedUser));
              
              originalRequest.headers.Authorization = `Bearer ${accessToken}`;
              return axios(originalRequest);
            } catch (err) {
              logout();
              return Promise.reject(err);
            }
        }
        return Promise.reject(error);
      }
    );

    setIsInterceptorSetup(true);

    return () => {
      axios.interceptors.request.eject(requestInterceptor);
      axios.interceptors.response.eject(responseInterceptor);
      setIsInterceptorSetup(false);
    };
  }, []); // Run ONCE on mount

  // Block rendering until interceptors are set up and auth check is done
  if (!isInterceptorSetup || loading) {
     // You might want a better loading spinner here
    return null; 
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading }}>
        {children}
    </AuthContext.Provider>
  );
};
