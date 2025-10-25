import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  }
});

// Add request interceptor to include auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth APIs
export const register = async (username: string, password: string, role: string) => {
  try {
    const response = await api.post('/auth/register', { username, password, role });
    return response.data;
  } catch (error: any) {
    if (error.response) {
      // Handle specific status codes
      if (error.response.status === 400) {
        throw new Error(error.response.data.detail || 'Username already exists');
      }
      // Handle other error responses
      throw new Error(error.response.data.detail || 'Registration failed');
    }
    // Handle network errors or other failures
    throw new Error('Network error occurred');
  }
};

export const login = async (username: string, password: string): Promise<{ access_token: string; role: string }> => {
  try {
    const response = await api.post('/auth/login', { username, password });
    const { access_token, role } = response.data;
    if (!access_token) {
      throw new Error('No access token received');
    }
    localStorage.setItem('token', access_token);
    return { access_token, role };
  } catch (error: any) {
    if (error.response) {
      throw new Error(error.response.data.detail || 'Login failed');
    }
    throw new Error('Network error occurred');
  }
};

export const logout = async () => {
  await api.post('/auth/logout');
  localStorage.removeItem('token');
};

// Test and Study Plan APIs
export const createTest = async (payload: {
  json_path: string;
  course_material_json: string;
}) => {
  const response = await api.post('/create-test', payload);
  return response.data;
};

export const createStudyPlan = async (payload: {
  json_path: string;
  course_material_json: string;
}) => {
  const response = await api.post('/study-plan', payload);
  return response.data;
};

// Health check
export const checkHealth = async () => {
  const response = await api.get('/health');
  return response.data;
};

export default api;