import { describe, test, expect, beforeEach, afterEach } from '../core/dsl.js';

describe('HTTPBin API Examples', () => {
    let baseUrl;

    beforeEach(async (context) => {
        baseUrl = 'https://seal-app-7wdhb.ondigitalocean.app';
        context.testData = { timestamp: Date.now() };
    });

    test('should get basic response', async (context) => {
        const response = await context.request.get(`${baseUrl}/get`, {
            params: { foo: 'bar', test: 'example' }
        });

        expect(response.status).toBe(200);
        expect(response.data.args.foo[0]).toBe('bar');
        expect(response.data.args.test[0]).toBe('example');
        expect(response.data.url).toContain('/get');
    });

    test('should post JSON data', async (context) => {
        const payload = {
            name: 'API Guardian',
            type: 'testing-framework',
            timestamp: context.testData.timestamp
        };

        const response = await context.request.post(`${baseUrl}/post`, payload);

        expect(response.status).toBe(200);
        expect(response.data.json.name).toBe('API Guardian');
        expect(response.data.json.type).toBe('testing-framework');
        expect(response.data.json.timestamp).toBe(context.testData.timestamp);
    });

    test('should handle custom headers', async (context) => {
        const response = await context.request.get(`${baseUrl}/headers`, {
            headers: {
                'X-Custom-Header': 'test-value',
                'X-API-Key': 'secret-key-123'
            }
        });

        expect(response.status).toBe(200);
        expect(response.data.headers['X-Custom-Header'][0]).toBe('test-value');
        expect(response.data.headers['X-Api-Key'][0]).toBe('secret-key-123');
    });

    test('should handle PUT requests', async (context) => {
        const updatedData = {
            id: 123,
            updated: true,
            timestamp: context.testData.timestamp
        };

        const response = await context.request.put(`${baseUrl}/put`, updatedData);

        expect(response.status).toBe(200);
        expect(response.data.json.id).toBe(123);
        expect(response.data.json.updated).toBe(true);
    });

    test('should handle DELETE requests', async (context) => {
        const response = await context.request.delete(`${baseUrl}/delete`, {
            data: { id: 456, reason: 'test cleanup' }
        });

        expect(response.status).toBe(200);

        expect(response.data.json.id).toBe(456);
    });

    test('should verify response status codes', async (context) => {
        const response = await context.request.get(`${baseUrl}/status/201`);
        expect(response.status).toBe(201);
    });

    test('should handle response delay', async (context) => {
        const startTime = Date.now();
        const response = await context.request.get(`${baseUrl}/delay/1`);
        const duration = Date.now() - startTime;

        expect(response.status).toBe(200);
        expect(duration).toBeGreaterThanOrEqual(1000);
    });

    test('should verify response content type', async (context) => {
        const response = await context.request.get(`${baseUrl}/json`);

        expect(response.status).toBe(200);
        expect(response.headers['content-type']).toContain('application/json');
        expect(response.data.slideshow).toBeDefined();
    });

    test('should handle basic auth', async (context) => {
        const response = await context.request.get(`${baseUrl}/basic-auth/user/passwd`, {
            auth: {
                username: 'user',
                password: 'passwd'
            }
        });

        expect(response.status).toBe(200);
        expect(response.data.authorized).toBe(true);
        expect(response.data.user).toBe('user');
    });

    test('should handle query parameters', async (context) => {
        const params = {
            search: 'api testing',
            limit: 10,
            offset: 0,
            sort: 'asc'
        };

        const response = await context.request.get(`${baseUrl}/get`, { params });

        expect(response.status).toBe(200);
        expect(response.data.args.search[0]).toBe('api testing');
        expect(response.data.args.limit[0]).toBe('10');
        expect(response.data.args.offset[0]).toBe('0');
        expect(response.data.args.sort[0]).toBe('asc');
    });
});

describe('HTTPBin Response Format Tests', () => {
    const baseUrl = 'https://seal-app-7wdhb.ondigitalocean.app';

    test('should get HTML response', async (context) => {
        const response = await context.request.get(`${baseUrl}/html`);

        expect(response.status).toBe(200);
        expect(response.headers['content-type']).toContain('text/html');
        expect(response.data).toContain('<!DOCTYPE html>');
    });

    test('should get XML response', async (context) => {
        const response = await context.request.get(`${baseUrl}/xml`);

        expect(response.status).toBe(200);
        expect(response.headers['content-type']).toContain('application/xml');
    });

    test('should verify UUID format', async (context) => {
        const response = await context.request.get(`${baseUrl}/uuid`);

        expect(response.status).toBe(200);
        expect(response.data.uuid).toBeDefined();
        // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
        expect(response.data.uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });

    test('should get user agent info', async (context) => {
        const response = await context.request.get(`${baseUrl}/user-agent`, {
            headers: {
                'User-Agent': 'API-Guardian/1.0'
            }
        });

        expect(response.status).toBe(200);
        expect(response.data['user-agent']).toBe('API-Guardian/1.0');
    });
});

describe('HTTPBin Error Handling', () => {
    const baseUrl = 'https://seal-app-7wdhb.ondigitalocean.app';

    test('should handle 404 errors', async (context) => {
        try {
            await context.request.get(`${baseUrl}/status/404`);
        } catch (error) {
            expect(error.response.status).toBe(404);
        }
    });

    test('should handle 500 errors', async (context) => {
        try {
            await context.request.get(`${baseUrl}/status/500`);
        } catch (error) {
            expect(error.response.status).toBe(500);
        }
    });

    test('should handle redirect', async (context) => {
        const response = await context.request.get(`${baseUrl}/redirect-to`, {
            params: { url: `${baseUrl}/get`, status_code: 302 },
            maxRedirects: 5
        });

        expect(response.status).toBe(200);
        expect(response.data.url).toContain('/get');
    });
});