// API Client for Assignment Tracker
class APIClient {
    constructor() {
        this.baseURL = window.location.origin;
        this.token = localStorage.getItem('authToken');
    }

    setAuthToken(token) {
        this.token = token;
        localStorage.setItem('authToken', token);
    }

    async request(endpoint, options = {}) {
        const url = `${this.baseURL}/api${endpoint}`;
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };

        if (this.token) {
            config.headers['Authorization'] = `Bearer ${this.token}`;
        }

        if (config.body && typeof config.body === 'object') {
            config.body = JSON.stringify(config.body);
        }

        try {
            const response = await fetch(url, config);
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'API request failed');
            }

            return await response.json();
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    // Authentication
    async login(userData) {
        const response = await this.request('/auth/login', {
            method: 'POST',
            body: userData
        });
        
        if (response.token) {
            this.setAuthToken(response.token);
        }
        
        return response;
    }

    // Assignments
    async getAssignments(filters = {}) {
        const params = new URLSearchParams(filters);
        return await this.request(`/assignments?${params}`);
    }

    async createAssignment(assignmentData) {
        return await this.request('/assignments', {
            method: 'POST',
            body: assignmentData
        });
    }

    async updateAssignment(id, updates) {
        return await this.request(`/assignments/${id}`, {
            method: 'PUT',
            body: updates
        });
    }

    async deleteAssignment(id) {
        return await this.request(`/assignments/${id}`, {
            method: 'DELETE'
        });
    }

    // Sync operations
    async syncCanvas() {
        return await this.request('/canvas/sync', {
            method: 'POST'
        });
    }

    async syncGoogleClassroom() {
        return await this.request('/google/sync', {
            method: 'POST'
        });
    }

    // Courses
    async getCourses() {
        return await this.request('/courses');
    }

    // User credentials
    async updateCredentials(credentials) {
        return await this.request('/user/credentials', {
            method: 'PUT',
            body: credentials
        });
    }
}

// Export for use in app
window.APIClient = APIClient;
