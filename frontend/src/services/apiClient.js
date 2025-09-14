// frontend/src/services/apiClient.js
import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle auth errors
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Check if we're already on login/register pages - don't redirect
      const currentPath = window.location.pathname;
      const isAuthPage = currentPath.includes('/auth/');
      
      if (!isAuthPage) {
        // Only redirect if not already on an auth page
        localStorage.removeItem('authToken');
        localStorage.removeItem('userData');
        window.location.href = '/auth/sign-in';
      } else {
        // If already on auth page, just clear any existing tokens but don't redirect
        localStorage.removeItem('authToken');
        localStorage.removeItem('userData');
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;