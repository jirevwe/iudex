import { jest } from '@jest/globals';

/** Axios request config for interceptors */
interface AxiosRequestConfig {
  url?: string;
  method?: string;
  headers?: Record<string, string>;
  data?: unknown;
  params?: Record<string, unknown>;
  qs?: Record<string, unknown>;
  metadata?: {
    startTime: number;
  };
}

/** Axios response for interceptors */
interface AxiosResponse {
  config: AxiosRequestConfig;
  status: number;
  headers: Record<string, string>;
  data: unknown;
  responseTime?: number;
  duration?: number;
}

/** Request interceptor function type */
type RequestInterceptor = (config: AxiosRequestConfig) => AxiosRequestConfig;

/** Response interceptor function type */
type ResponseInterceptor = (response: AxiosResponse) => AxiosResponse;

// Mock axios before importing HttpClient
const mockAxiosInstance = {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
    head: jest.fn(),
    options: jest.fn(),
    interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() }
    }
};

const mockAxiosCreate = jest.fn(() => mockAxiosInstance);

jest.unstable_mockModule('axios', () => ({
    default: {
        create: mockAxiosCreate
    }
}));

const { HttpClient, createClient } = await import('./http-client.js');

describe('HttpClient', () => {
    let client: InstanceType<typeof HttpClient>;
    let requestInterceptor: RequestInterceptor;
    let responseInterceptor: ResponseInterceptor;

    beforeEach(() => {
        // Reset mocks
        jest.clearAllMocks();

        // Capture interceptors when they're registered
        mockAxiosInstance.interceptors.request.use.mockImplementation((interceptor) => {
            requestInterceptor = interceptor;
        });
        mockAxiosInstance.interceptors.response.use.mockImplementation((interceptor) => {
            responseInterceptor = interceptor;
        });

        client = new HttpClient();
    });

    describe('Constructor', () => {
        test('should create instance with default config', () => {
            expect(mockAxiosCreate).toHaveBeenCalledWith(
                expect.objectContaining({
                    baseURL: '',
                    timeout: 30000,
                    headers: {},
                    validateStatus: expect.any(Function)
                })
            );
        });

        test('should use custom config', () => {
            const customConfig = {
                baseURL: 'https://api.example.com',
                timeout: 5000,
                headers: { 'Authorization': 'Bearer token' }
            };

            new HttpClient(customConfig);

            expect(mockAxiosCreate).toHaveBeenCalledWith(
                expect.objectContaining({
                    baseURL: 'https://api.example.com',
                    timeout: 5000,
                    headers: { 'Authorization': 'Bearer token' }
                })
            );
        });

        test('should use environment variable for baseURL', () => {
            const originalEnv = process.env.API_BASE_URL;
            process.env.API_BASE_URL = 'https://env-api.example.com';

            new HttpClient();

            expect(mockAxiosCreate).toHaveBeenCalledWith(
                expect.objectContaining({
                    baseURL: 'https://env-api.example.com'
                })
            );

            process.env.API_BASE_URL = originalEnv;
        });

        test('should initialize empty history', () => {
            expect(client.getHistory()).toEqual([]);
        });
    });

    describe('Interceptors', () => {
        test('should add request metadata', () => {
            const config = { url: '/test' };
            const result = requestInterceptor(config);

            expect(result.metadata).toBeDefined();
            expect(result.metadata.startTime).toBeGreaterThan(0);
        });

        test('should add response timing', () => {
            const startTime = Date.now();
            const response = {
                config: {
                    metadata: { startTime },
                    method: 'GET',
                    url: '/test',
                    headers: {},
                    data: null
                },
                status: 200,
                headers: {},
                data: { success: true }
            };

            const result = responseInterceptor(response);

            expect(result.responseTime).toBeDefined();
            expect(result.duration).toBe(result.responseTime);
        });

        test('should add request/response to history', () => {
            const response = {
                config: {
                    metadata: { startTime: Date.now() },
                    method: 'post',
                    url: '/users',
                    headers: { 'content-type': 'application/json' },
                    data: { name: 'John' }
                },
                status: 201,
                headers: { 'content-type': 'application/json' },
                data: { id: 1, name: 'John' }
            };

            responseInterceptor(response);

            const history = client.getHistory();
            expect(history).toHaveLength(1);
            expect(history[0].request.method).toBe('POST');
            expect(history[0].request.url).toBe('/users');
            expect(history[0].response.status).toBe(201);
        });
    });

    describe('GET method', () => {
        test('should make GET request', async () => {
            const mockResponse = { status: 200, data: { success: true } };
            mockAxiosInstance.get.mockResolvedValue(mockResponse);

            await client.get('/users');

            expect(mockAxiosInstance.get).toHaveBeenCalledWith('/users', expect.any(Object));
        });

        test('should pass query parameters', async () => {
            mockAxiosInstance.get.mockResolvedValue({ status: 200, data: [] });

            await client.get('/users', { params: { page: 1, limit: 10 } });

            expect(mockAxiosInstance.get).toHaveBeenCalledWith('/users', {
                params: { page: 1, limit: 10 }
            });
        });

        test('should support qs parameter for compatibility', async () => {
            mockAxiosInstance.get.mockResolvedValue({ status: 200, data: [] });

            await client.get('/users', { qs: { search: 'john' } });

            expect(mockAxiosInstance.get).toHaveBeenCalledWith('/users', {
                params: { search: 'john' },
                qs: { search: 'john' }
            });
        });
    });

    describe('POST method', () => {
        test('should make POST request with direct payload', async () => {
            mockAxiosInstance.post.mockResolvedValue({ status: 201, data: { id: 1 } });

            const payload = { name: 'John', email: 'john@example.com' };
            await client.post('/users', payload);

            expect(mockAxiosInstance.post).toHaveBeenCalledWith('/users', payload, {});
        });

        test('should support body option', async () => {
            mockAxiosInstance.post.mockResolvedValue({ status: 201, data: { id: 1 } });

            const payload = { name: 'John' };
            await client.post('/users', { body: payload, headers: { 'x-custom': 'value' } });

            expect(mockAxiosInstance.post).toHaveBeenCalledWith(
                '/users',
                payload,
                { body: payload, headers: { 'x-custom': 'value' } }
            );
        });

        test('should support data option', async () => {
            mockAxiosInstance.post.mockResolvedValue({ status: 201, data: { id: 1 } });

            const payload = { name: 'John' };
            await client.post('/users', { data: payload });

            expect(mockAxiosInstance.post).toHaveBeenCalledWith(
                '/users',
                payload,
                { data: payload }
            );
        });
    });

    describe('PUT method', () => {
        test('should make PUT request with direct payload', async () => {
            mockAxiosInstance.put.mockResolvedValue({ status: 200, data: { id: 1 } });

            const payload = { name: 'John Updated' };
            await client.put('/users/1', payload);

            expect(mockAxiosInstance.put).toHaveBeenCalledWith('/users/1', payload, {});
        });

        test('should support body option', async () => {
            mockAxiosInstance.put.mockResolvedValue({ status: 200, data: { id: 1 } });

            const payload = { name: 'John' };
            await client.put('/users/1', { body: payload });

            expect(mockAxiosInstance.put).toHaveBeenCalledWith(
                '/users/1',
                payload,
                { body: payload }
            );
        });
    });

    describe('PATCH method', () => {
        test('should make PATCH request with direct payload', async () => {
            mockAxiosInstance.patch.mockResolvedValue({ status: 200, data: { id: 1 } });

            const payload = { email: 'newemail@example.com' };
            await client.patch('/users/1', payload);

            expect(mockAxiosInstance.patch).toHaveBeenCalledWith('/users/1', payload, {});
        });

        test('should support body option', async () => {
            mockAxiosInstance.patch.mockResolvedValue({ status: 200, data: { id: 1 } });

            const payload = { email: 'new@example.com' };
            await client.patch('/users/1', { body: payload });

            expect(mockAxiosInstance.patch).toHaveBeenCalledWith(
                '/users/1',
                payload,
                { body: payload }
            );
        });
    });

    describe('DELETE method', () => {
        test('should make DELETE request', async () => {
            mockAxiosInstance.delete.mockResolvedValue({ status: 204 });

            await client.delete('/users/1');

            expect(mockAxiosInstance.delete).toHaveBeenCalledWith('/users/1', {});
        });

        test('should pass options', async () => {
            mockAxiosInstance.delete.mockResolvedValue({ status: 204 });

            await client.delete('/users/1', { data: { reason: 'test' } });

            expect(mockAxiosInstance.delete).toHaveBeenCalledWith('/users/1', {
                data: { reason: 'test' }
            });
        });
    });

    describe('HEAD method', () => {
        test('should make HEAD request', async () => {
            mockAxiosInstance.head.mockResolvedValue({ status: 200, headers: {} });

            await client.head('/users/1');

            expect(mockAxiosInstance.head).toHaveBeenCalledWith('/users/1', {});
        });
    });

    describe('OPTIONS method', () => {
        test('should make OPTIONS request', async () => {
            mockAxiosInstance.options.mockResolvedValue({ status: 200, headers: {} });

            await client.options('/users');

            expect(mockAxiosInstance.options).toHaveBeenCalledWith('/users', {});
        });
    });

    describe('History management', () => {
        test('should get request history', () => {
            const history = client.getHistory();
            expect(Array.isArray(history)).toBe(true);
        });

        test('should clear history', () => {
            // Add an item to history via interceptor
            const response = {
                config: {
                    metadata: { startTime: Date.now() },
                    method: 'GET',
                    url: '/test',
                    headers: {},
                    data: null
                },
                status: 200,
                headers: {},
                data: {}
            };

            responseInterceptor(response);
            expect(client.getHistory()).toHaveLength(1);

            client.clearHistory();
            expect(client.getHistory()).toHaveLength(0);
        });
    });

    describe('createClient helper', () => {
        test('should create HttpClient instance', () => {
            const config = { baseURL: 'https://api.example.com' };
            const instance = createClient(config);

            expect(instance).toBeInstanceOf(HttpClient);
        });
    });
});
