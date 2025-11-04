// API Guardian - HTTP Client (compatible with postman-request)
import axios from 'axios';

export class HttpClient {
    constructor(config = {}) {
        this.config = {
            baseURL: config.baseURL || process.env.API_BASE_URL || '',
            timeout: config.timeout || 30000,
            headers: config.headers || {},
            validateStatus: () => true,
            ...config
        };
        this.axios = axios.create(this.config);
        this.history = [];
        this.setupInterceptors();
    }

    setupInterceptors() {
        this.axios.interceptors.request.use(config => {
            config.metadata = {startTime: Date.now()};
            return config;
        });

        this.axios.interceptors.response.use(response => {
            const endTime = Date.now();
            const startTime = response.config.metadata?.startTime || endTime;
            response.responseTime = endTime - startTime;
            response.duration = response.responseTime;

            this.history.push({
                request: {
                    method: response.config.method?.toUpperCase(),
                    url: response.config.url,
                    headers: response.config.headers,
                    body: response.config.data
                },
                response: {
                    status: response.status,
                    headers: response.headers,
                    body: response.data,
                    responseTime: response.responseTime
                }
            });

            return response;
        });
    }

    async get(url, options = {}) {
        return this.axios.get(url, {params: options.params || options.qs, ...options});
    }

    async post(url, data = {}, options = {}) {
        // Support both post(url, payload) and post(url, {body: payload})
        const payload = data.body !== undefined ? data.body : (data.data !== undefined ? data.data : data);
        const config = data.body !== undefined || data.data !== undefined ? data : options;
        return this.axios.post(url, payload, config);
    }

    async put(url, data = {}, options = {}) {
        // Support both put(url, payload) and put(url, {body: payload})
        const payload = data.body !== undefined ? data.body : (data.data !== undefined ? data.data : data);
        const config = data.body !== undefined || data.data !== undefined ? data : options;
        return this.axios.put(url, payload, config);
    }

    async patch(url, data = {}, options = {}) {
        // Support both patch(url, payload) and patch(url, {body: payload})
        const payload = data.body !== undefined ? data.body : (data.data !== undefined ? data.data : data);
        const config = data.body !== undefined || data.data !== undefined ? data : options;
        return this.axios.patch(url, payload, config);
    }

    async delete(url, options = {}) {
        return this.axios.delete(url, options);
    }

    async head(url, options = {}) {
        return this.axios.head(url, options);
    }

    async options(url, options = {}) {
        return this.axios.options(url, options);
    }

    getHistory() {
        return this.history;
    }

    clearHistory() {
        this.history = [];
    }
}

export function createClient(config) {
    return new HttpClient(config);
}

export default {HttpClient, createClient};
