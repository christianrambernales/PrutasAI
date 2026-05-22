import { Platform } from 'react-native';

// --- ENVIRONMENT CONFIGURATION ---
// For browser/web development (Expo Web on same machine): use 'localhost'
// For physical device over Mobile Hotspot: use your PC's hotspot IP (run `ipconfig`, look for "Local Area Connection* X" → IPv4)
// For physical device on same Wi-Fi: use your PC's Wi-Fi IPv4 (e.g. 192.168.1.5)
const API_BASE_URL = 'http://localhost:3000/api';

async function request(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers = { ...options.headers };

  if (options.token) {
    headers['Authorization'] = `Bearer ${options.token}`;
  }

  if (!options.isMultipart) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(url, {
    ...options,
    headers,
    body: options.isMultipart
      ? options.body
      : options.body ? JSON.stringify(options.body) : undefined
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Request failed');
  }
  return data;
}

export const api = {
  // Auth
  login: (email, password) =>
    request('/auth/login', { method: 'POST', body: { email, password } }),

  register: (name, email, password, preferredLanguage = 'en') =>
    request('/auth/register', { method: 'POST', body: { name, email, password, preferredLanguage } }),

  getSession: (token) =>
    request('/auth/session', { method: 'GET', token }),

  updateLanguage: (token, language) =>
    request('/auth/language', { method: 'PATCH', token, body: { language } }),

  // Scanning
  scanImage: async (token, imageUri) => {
    // Force use of the native browser FormData on web so fetch correctly adds the boundary header
    const NativeFormData = Platform.OS === 'web' ? window.FormData : FormData;
    const formData = new NativeFormData();

    if (Platform.OS === 'web') {
      const response = await fetch(imageUri);
      const blob = await response.blob();
      formData.append('image', blob, 'scan.jpg');
    } else {
      formData.append('image', {
        uri: imageUri,
        type: 'image/jpeg',
        name: 'scan.jpg'
      });
    }

    return request('/scan', { method: 'POST', token, body: formData, isMultipart: true });
  },

  getHistory: (token, page = 1, limit = 20) =>
    request(`/history?page=${page}&limit=${limit}`, { method: 'GET', token }),

  getScan: (token, id) =>
    request(`/history/${id}`, { method: 'GET', token }),

  deleteScan: (token, id) =>
    request(`/history/${id}`, { method: 'DELETE', token }),

  // Diseases
  getDiseases: (token, fruitType = '') =>
    request(`/diseases${fruitType ? `?fruitType=${fruitType}` : ''}`, { method: 'GET', token }),

  getSupportedFruits: (token) =>
    request('/diseases/fruits', { method: 'GET', token }),

  // Recovery
  startRecovery: (token, scanId) =>
    request('/recovery', { method: 'POST', token, body: { scanId } }),

  getRecoverySessions: (token, status = '') =>
    request(`/recovery${status ? `?status=${status}` : ''}`, { method: 'GET', token }),

  getRecoveryReport: (token, id) =>
    request(`/recovery/${id}`, { method: 'GET', token }),

  addFollowUp: (token, sessionId, scanId) =>
    request(`/recovery/${sessionId}/follow-up`, { method: 'POST', token, body: { scanId } }),

  resolveSession: (token, sessionId, status) =>
    request(`/recovery/${sessionId}/resolve`, { method: 'PATCH', token, body: { status } }),
};
