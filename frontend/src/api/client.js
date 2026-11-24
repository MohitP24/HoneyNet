import axios from 'axios';

// Create axios instance with base configuration
// Automatically resolves either VITE_API_URL or the local Vite reverse proxy (/api)
const rawBase = import.meta.env.VITE_API_URL;
const resolvedBaseUrl = rawBase
    ? (rawBase.endsWith('/api') ? rawBase : `${rawBase.replace(/\/+$/, '')}/api`)
    : '/api';

const apiClient = axios.create({
    baseURL: resolvedBaseUrl,
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

    // Services endpoint
    getServices: async () => {
        const response = await apiClient.get('/services');
        return response.data;
    },

    // Health check
    healthCheck: async () => {
        const response = await apiClient.get('/health');
        return response.data;
    },
};

export default apiClient;
