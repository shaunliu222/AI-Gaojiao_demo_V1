import axios from 'axios';

const request = axios.create({
  baseURL: '',
  timeout: 30000,
});

request.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

request.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default request;

export const authApi = {
  login: (data: { username: string; password: string }) =>
    request.post('/api/auth/login', data),
  userinfo: () => request.get('/api/auth/userinfo'),
  logout: () => request.post('/api/auth/logout'),
};

export const healthApi = {
  check: () => request.get('/api/health'),
};
