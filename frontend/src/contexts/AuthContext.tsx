import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config';

// Global promise to deduplicate refresh requests
// Defined outside component to persist across renders
let globalRefreshPromise: Promise<string> | null = null;

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
  
  const getRefreshToken = useCallback(async (): Promise<string> => {
    if (globalRefreshPromise) return globalRefreshPromise;

    globalRefreshPromise = (async () => {
      try {
        const response = await axios.post(`${API_BASE_URL}/api/auth/refresh`, {}, { withCredentials: true });
        const { accessToken, user: recoveredUser } = response.data;
        
        // Update local storage immediately
        localStorage.setItem('token', accessToken);
        if (recoveredUser) {
           localStorage.setItem('user', JSON.stringify(recoveredUser));
        }
        return accessToken;
      } catch (error) {
        throw error;
      } finally {
        globalRefreshPromise = null;
      }
    })();

    return globalRefreshPromise;
  }, []);

  const logout = useCallback(async () => {
    try {
      await axios.post(`${API_BASE_URL}/api/auth/logout`, {}, { withCredentials: true });
    } catch (err) {
      console.error('Logout failed', err);
    }
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    const initAuth = async () => {
      if (!token) {
        try {
            const accessToken = await getRefreshToken();
            setToken(accessToken);
            const savedUser = localStorage.getItem('user');
            if (savedUser) setUser(JSON.parse(savedUser));
        } catch (err: any) {
            console.log('Session verification failed:', err);
            if (err.response && err.response.status === 401) {
              logout();
            }
        }
      }
      setLoading(false);
    };

    initAuth();
  }, [token, getRefreshToken, logout]); 

  const login = useCallback((accessToken: string, user: User) => {
    localStorage.setItem('token', accessToken);
    localStorage.setItem('user', JSON.stringify(user));
    setToken(accessToken);
    setUser(user);
  }, []);

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
  }, [getRefreshToken, logout]);

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
