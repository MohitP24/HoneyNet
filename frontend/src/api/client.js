import axios from 'axios';

// Create axios instance with base configuration
const apiClient = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json',
    },
});

// API functions
export const api = {
    // Stats endpoints
    getStats: async () => {
        const response = await apiClient.get('/stats');
        return response.data;
    },

    getTimeline: async (hours = 24) => {
        const response = await apiClient.get(`/stats/timeline?hours=${hours}`);
        return response.data;
    },

    // Events endpoints
    getEvents: async (params = {}) => {
        const response = await apiClient.get('/events', { params });
        return response.data;
    },

    getEvent: async (id) => {
        const response = await apiClient.get(`/events/${id}`);
        return response.data;
    },

    // Attackers endpoints
    getAttackers: async (params = {}) => {
        const response = await apiClient.get('/attackers', { params });
        return response.data;
    },

    getAttacker: async (id) => {
        const response = await apiClient.get(`/attackers/${id}`);
        return response.data;
    },

    // Adaptations endpoints
    getAdaptations: async (params = {}) => {
        const response = await apiClient.get('/adaptations', { params });
        return response.data;
    },

    // Health check
    healthCheck: async () => {
        const response = await apiClient.get('/health');
        return response.data;
    },
};

export default apiClient;
