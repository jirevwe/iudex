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

    async post(url, options = {}) {
        return this.axios.post(url, options.body || options.data, options);
    }

    async put(url, options = {}) {
        return this.axios.put(url, options.body || options.data, options);
    }

    async patch(url, options = {}) {
        return this.axios.patch(url, options.body || options.data, options);
    }

    async delete(url, options = {}) {
        return this.axios.delete(url, {data: options.body || options.data, ...options});
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
