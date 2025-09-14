import apiClient from './apiClient';

const authService = {
  register: async (userData) => {
    try {
      const response = await apiClient.post('/auth/register', userData);
      
      if (response.data.success) {
        localStorage.setItem('authToken', response.data.data.token);
        localStorage.setItem('userData', JSON.stringify(response.data.data.user));
      }
      
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Network error' };
    }
  },

  login: async (credentials) => {
    try {
      const response = await apiClient.post('/auth/login', credentials);
      
      if (response.data.success) {
        localStorage.setItem('authToken', response.data.data.token);
        localStorage.setItem('userData', JSON.stringify(response.data.data.user));
      }
      
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Network error' };
    }
  },

  logout: () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
  },

  getCurrentUser: () => {
    const userData = localStorage.getItem('userData');
    return userData ? JSON.parse(userData) : null;
  },

  isAuthenticated: () => {
    const token = localStorage.getItem('authToken');
    const userData = localStorage.getItem('userData');
    return !!(token && userData);
  },

  getProfile: async () => {
    try {
      const response = await apiClient.get('/auth/profile');
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Network error' };
    }
  },

  updateProfile: async (profileData) => {
    try {
      const response = await apiClient.put('/auth/profile', profileData);
      
      if (response.data.success) {
        const currentUser = JSON.parse(localStorage.getItem('userData') || '{}');
        const updatedUser = { ...currentUser, ...response.data.data };
        localStorage.setItem('userData', JSON.stringify(updatedUser));
      }
      
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Network error' };
    }
  }
};

export default authService;