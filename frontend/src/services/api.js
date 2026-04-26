// Simple fetch-based API client
const API_BASE_URL = 'https://wasco-billing-c3hz.onrender.com/api';

const api = {
    get: async (endpoint) => {
        const token = localStorage.getItem('token');
        try {
            const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': token ? `Bearer ${token}` : '',
                },
            });
            const data = await response.json();
            if (!response.ok) {
                throw { response: { data, status: response.status } };
            }
            return { data };
        } catch (error) {
            console.error('GET error:', error);
            throw error;
        }
    },

    post: async (endpoint, body) => {
        const token = localStorage.getItem('token');
        try {
            const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': token ? `Bearer ${token}` : '',
                },
                body: JSON.stringify(body),
            });
            const data = await response.json();
            if (!response.ok) {
                throw { response: { data, status: response.status } };
            }
            return { data };
        } catch (error) {
            console.error('POST error:', error);
            throw error;
        }
    },

    put: async (endpoint, body) => {
        const token = localStorage.getItem('token');
        try {
            const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': token ? `Bearer ${token}` : '',
                },
                body: JSON.stringify(body),
            });
            const data = await response.json();
            if (!response.ok) {
                throw { response: { data, status: response.status } };
            }
            return { data };
        } catch (error) {
            console.error('PUT error:', error);
            throw error;
        }
    },

    delete: async (endpoint) => {
        const token = localStorage.getItem('token');
        try {
            const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': token ? `Bearer ${token}` : '',
                },
            });
            const data = await response.json();
            if (!response.ok) {
                throw { response: { data, status: response.status } };
            }
            return { data };
        } catch (error) {
            console.error('DELETE error:', error);
            throw error;
        }
    },
};

export default api;