import axios from 'axios';

// The base URL of your backend server
const API_URL = 'http://localhost:3001/api'; // Adjust if your port is different

// Create a new Axios instance
const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// VERY IMPORTANT: Interceptor to add the auth token to every request
api.interceptors.request.use(
    (config) => {
        // Get the token from local storage (or wherever you store it)
        const token = localStorage.getItem('accessToken');
        if (token) {
            // If the token exists, add it to the Authorization header
            config.headers['Authorization'] = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

export default api;
