import axios from 'axios';

// API Configuration
const API_BASE_URL = 'http://localhost:3000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Scan Service - Disease detection from images
export const scanService = {
  /**
   * Upload image and get disease prediction
   * @param {Object} imageData - Image data to upload
   * @returns {Promise<Object>} Scan result with disease info
   */
  uploadScan: async (imageData) => {
    const formData = new FormData();
    formData.append('image', {
      uri: imageData.uri,
      type: imageData.type || 'image/jpeg',
      name: imageData.name || `scan-${Date.now()}.jpg`,
    });

    const response = await api.post('/scan', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  /**
   * Get scan by ID
   * @param {string} scanId - Scan ID
   * @returns {Promise<Object>} Scan details
   */
  getScan: async (scanId) => {
    const response = await api.get(`/history/${scanId}`);
    return response.data;
  },
};

// Disease Service - Disease information
export const diseaseService = {
  /**
   * Get all diseases
   * @returns {Promise<Object>} List of diseases
   */
  getAll: async () => {
    const response = await api.get('/diseases');
    return response.data;
  },

  /**
   * Get disease by ID
   * @param {string} diseaseId - Disease ID
   * @returns {Promise<Object>} Disease details
   */
  getById: async (diseaseId) => {
    const response = await api.get(`/diseases/${diseaseId}`);
    return response.data;
  },

  /**
   * Get disease by name
   * @param {string} name - Disease name
   * @returns {Promise<Object>} Disease details
   */
  getByName: async (name) => {
    const response = await api.get(`/diseases/name/${encodeURIComponent(name)}`);
    return response.data;
  },
};

// History Service - Scan history
export const historyService = {
  /**
   * Get all scans with pagination
   * @param {Object} params - Query params (limit, skip)
   * @returns {Promise<Object>} Paginated scan history
   */
  getAll: async (params = {}) => {
    const response = await api.get('/history', { params });
    return response.data;
  },

  /**
   * Delete a scan
   * @param {string} scanId - Scan ID to delete
   * @returns {Promise<Object>} Delete result
   */
  delete: async (scanId) => {
    const response = await api.delete(`/history/${scanId}`);
    return response.data;
  },
};

// Progression Service - Disease progression forecasting
export const progressionService = {
  /**
   * Get progression data for a scan
   * @param {string} scanId - Scan ID
   * @returns {Promise<Object>} Progression timeline
   */
  getByScanId: async (scanId) => {
    const response = await api.get(`/progression/${scanId}`);
    return response.data;
  },

  /**
   * Get disease progression forecast
   * @param {Object} data - { diseaseName, currentDay }
   * @returns {Promise<Object>} Forecast data
   */
  getForecast: async (data) => {
    const response = await api.post('/progression/forecast', data);
    return response.data;
  },
};

// Health check
export const healthCheck = async () => {
  const response = await api.get('../health');
  return response.data;
};

export default api;
