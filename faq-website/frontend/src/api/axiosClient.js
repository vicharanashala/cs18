import axios from 'axios';
import axiosRetry from 'axios-retry';
import { v4 as uuidv4 } from 'uuid';
import toast from 'react-hot-toast';

// Ensure baseURL is strictly the domain so Axios absolute paths work correctly
let base = import.meta.env.VITE_API_URL || 'http://localhost:3001';
if (base.endsWith('/api')) base = base.slice(0, -4);
if (base.endsWith('/')) base = base.slice(0, -1);

export const API_ROUTES = {
  LOGIN: "/api/auth/login",
  REGISTER: "/api/auth/register",
  ME: "/api/auth/me",
};

const API_URL = base;

console.log('[API CONFIG] Current Backend Base URL:', API_URL);

const axiosClient = axios.create({
  baseURL: API_URL,
  timeout: 15000,
});

// Configure robust retry logic with exponential backoff
axiosRetry(axiosClient, {
  retries: 3,
  retryDelay: (retryCount) => {
    return Math.min(1000 * (2 ** retryCount), 10000);
  },
  retryCondition: (error) => {
    // Never retry auth requests or 4xx errors
    if (error.config?.url?.includes('/auth/login')) return false;
    if (error.response?.status === 401) return false;   // ← don't retry invalid-token requests
    if (error.response?.status === 403) return false;
    return axiosRetry.isNetworkOrIdempotentRequestError(error) ||
           (error.response && error.response.status >= 500);
  }
});

// Request Interceptor
axiosClient.interceptors.request.use(config => {
  // Ensure the URL starts with /api if it doesn't already
  let urlPath = config.url;
  if (!urlPath.startsWith('/api')) {
    urlPath = `/api${urlPath.startsWith('/') ? '' : '/'}${urlPath}`;
  }
  config.url = urlPath;
  
  const fullUrl = `${config.baseURL}${config.url}`;
  

  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  // Inject trace ID for backend debugging
  config.headers['x-request-id'] = uuidv4();
  return config;
}, (error) => Promise.reject(error));

// Response Interceptor
axiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const isDev = import.meta.env.DEV;
    
    // Eliminate noisy 500 spam by only logging structured trace data in dev
    if (isDev && error.response) {
      // Suppress known 401/403 log spam
      const status = error.response.status;
      const url = error.config?.url || '';
      const isExpectedAuthError = (status === 401 && url.includes('/auth/me')) || 
                                  (status === 403 && url.includes('/admin/'));
      
      if (!isExpectedAuthError) {
        console.warn(`[API WARNING] ${url} failed with ${status}. TraceID: ${error.response.data?.traceId || 'unknown'}`);
      }
    }

    if (error.response?.status === 401) {
      const url = error.config?.url || '';
      if (!url.includes('/auth/me') && !url.includes('/auth/login')) {
        localStorage.removeItem('token');
        // Dispatch a custom event so the UI can redirect without reloading the page violently
        window.dispatchEvent(new Event('auth-expired'));
      }
    }

    if (error.response?.status === 429) {
      toast.error('Too many requests. Please wait a moment.');
    }

    // Pass the formatted error forward
    return Promise.reject(error);
  }
);

export default axiosClient;
