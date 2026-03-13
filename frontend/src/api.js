import axios from 'axios';

// Get the base URL from environment variables
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

const api = axios.create({
    baseURL: API_BASE_URL,
});

// Interceptor to add JWT token to requests
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('uba_token'); // Or sessionStorage
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

export default api;