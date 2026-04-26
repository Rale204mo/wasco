// Simple fetch-based API client with timeout and error handling
const API_BASE_URL = 'https://wasco-billing-c3hz.onrender.com/api';

// Helper to fetch with timeout
const fetchWithTimeout = (url, options, timeout = 15000) => {
    return Promise.race([
        fetch(url, options),
        new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Request timed out. The backend may be waking up — please try again in 30 seconds.')), timeout)
        )
    ]);
};

const api = {
    get: async (endpoint) => {
        const token = localStorage.getItem('token');
        try {
            const response = await fetchWithTimeout(`${API_BASE_URL}${endpoint}`, {
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
            if (error.message && error.message.includes('timed out')) {
                throw new Error('Backend is waking up. Please wait 30 seconds and try again.');
            }
            if (error.message && error.message.includes('fetch')) {
                throw new Error('Network Error: Cannot connect to backend. The server may be down or waking up from sleep.');
            }
            throw error;
        }
    },

    post: async (endpoint, body) => {
        const token = localStorage.getItem('token');
        try {
            const response = await fetchWithTimeout(`${API_BASE_URL}${endpoint}`, {
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
            if (error.message && error.message.includes('timed out')) {
                throw new Error('Backend is waking up. Please wait 30 seconds and try again.');
            }
            if (error.message && error.message.includes('fetch')) {
                throw new Error('Network Error: Cannot connect to backend. The server may be down or waking up from sleep.');
            }
            throw error;
        }
    },

    put: async (endpoint, body) => {
        const token = localStorage.getItem('token');
        try {
            const response = await fetchWithTimeout(`${API_BASE_URL}${endpoint}`, {
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
            if (error.message && error.message.includes('timed out')) {
                throw new Error('Backend is waking up. Please wait 30 seconds and try again.');
            }
            if (error.message && error.message.includes('fetch')) {
                throw new Error('Network Error: Cannot connect to backend. The server may be down or waking up from sleep.');
            }
            throw error;
        }
    },

    delete: async (endpoint) => {
        const token = localStorage.getItem('token');
        try {
            const response = await fetchWithTimeout(`${API_BASE_URL}${endpoint}`, {
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
            if (error.message && error.message.includes('timed out')) {
                throw new Error('Backend is waking up. Please wait 30 seconds and try again.');
            }
            if (error.message && error.message.includes('fetch')) {
                throw new Error('Network Error: Cannot connect to backend. The server may be down or waking up from sleep.');
            }
            throw error;
        }
    },
};

export default api;

