import axios, { AxiosError } from 'axios';
import type { InternalAxiosRequestConfig } from 'axios';


const API_BASE_URL = import.meta.env.REACT_APP_API_URL || 'http://localhost:8081';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - Add JWT token
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getStoredToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => Promise.reject(error)
);

// Response interceptor - Handle 401 errors
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Clear all authentication data
      clearStoredToken();
      
      // Only redirect if not already on home/login page
      const currentPath = window.location.pathname;
      if (currentPath !== '/' && !currentPath.includes('/oauth2')) {
        window.location.href = '/';
      }
    }
    return Promise.reject(error);
  }
);

// Token management helpers
export const getStoredToken = (): string | null => {
  // Check URL params first
  const urlParams = new URLSearchParams(window.location.search);
  const urlToken = urlParams.get('jwt') || urlParams.get('token');
  
  if (urlToken) {
    storeToken(urlToken);
    window.history.replaceState({}, '', window.location.pathname);
    return urlToken;
  }

  // Check storage
  return localStorage.getItem('jwt_token') || 
         sessionStorage.getItem('jwt_token') ||
         getCookieToken();
};

const getCookieToken = (): string | null => {
  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (['jwt_token', 'id_token', 'access_token'].includes(name)) {
      return decodeURIComponent(value);
    }
  }
  return null;
};

export const storeToken = (token: string): void => {
  localStorage.setItem('jwt_token', token);
};

export const clearStoredToken = (): void => {
  localStorage.removeItem('jwt_token');
  sessionStorage.clear();
};