// Governance & Security Demo Tests
// This file demonstrates various governance violations and security findings

import { describe, test, expect } from '../core/dsl.js';

describe('Governance Violations Demo', () => {

    test('POST without 201 status (REST standards)', async ({request}) => {
        // This will trigger: POST for resource creation should return 201
        const response = await request.post('https://httpbin.org/anything', {
            name: 'Test User',
            email: 'test@example.com'
        });

        // httpbin.org returns 200, but should return 201 for creation
        response.status; // Will be 200, triggering governance violation
    });

    test('Missing API versioning', async ({request}) => {
        // This will trigger: Missing API version
        const response = await request.get('https://httpbin.org/users');

        // No version in URL, will trigger versioning violation
        response.status;
    });

    test('Singular resource name', async ({request}) => {
        // This will trigger: Resource should be plural
        const response = await request.get('https://httpbin.org/api/user/123');

        // 'user' is singular, should be 'users'
        response.status;
    });

    test('Large collection without pagination', async ({request}) => {
        // Simulate a large collection response
        const response = await request.get('https://httpbin.org/anything');

        // If response has >100 items without pagination metadata, triggers violation
        response.status;
    });

});

describe('Security Findings Demo', () => {

    test('HTTP instead of HTTPS', async ({request}) => {
        // This will trigger: Unencrypted HTTP connection
        const response = await request.get('http://httpbin.org/get');

        // Using HTTP triggers critical security finding
        response.status;
    });

    test('Missing authentication header', async ({request}) => {
        // This will trigger: Missing authentication
        const response = await request.get('https://httpbin.org/users/123');

        // No Authorization header on sensitive resource
        response.status;
    });

    test('Basic auth over HTTP', async ({request}) => {
        // This will trigger: Weak authentication
        const response = await request.get('http://httpbin.org/basic-auth/user/pass', {
            headers: {
                'Authorization': 'Basic dXNlcjpwYXNz' // Base64: user:pass
            }
        });

        // Basic auth over HTTP is critical vulnerability
        response.status;
    });

    test('Sensitive data in response', async ({request}) => {
        // This will trigger: Sensitive data exposure
        const response = await request.post('https://httpbin.org/anything', {
            username: 'testuser',
            password: 'secretPassword123', // Triggers sensitive data finding
            api_key: 'sk-1234567890abcdef'  // Triggers API key finding
        });

        // Response echoes the request, exposing sensitive fields
        response.status;
    });

    test('Missing security headers', async ({request}) => {
        // This will trigger: Missing security headers
        const response = await request.get('https://httpbin.org/get');

        // httpbin.org doesn't return security headers
        // Triggers findings for missing HSTS, X-Frame-Options, CSP, etc.
        response.status;
    });

    test('Missing rate limit headers', async ({request}) => {
        // This will trigger: Missing rate limiting
        const response = await request.get('https://httpbin.org/api/data');

        // No rate limit headers
        response.status;
    });

    test('Potential IDOR vulnerability', async ({request}) => {
        // This will trigger: Potential IDOR
        const response = await request.get('https://httpbin.org/users/12345');

        // Resource ID in URL without proper authorization
        response.status;
    });

    test('Permissive CORS policy', async ({request}) => {
        // This will trigger: Permissive CORS
        const response = await request.get('https://httpbin.org/get');

        // If Access-Control-Allow-Origin: *, triggers finding
        response.status;
    });
});

describe('Proper API Design Example', () => {
    test('Well-designed endpoint', async ({request}) => {
        // This example shows proper API design with minimal violations
        const response = await request.get('https://httpbin.org/get', {
            headers: {
                'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
                'Accept': 'application/json; version=1'
            }
        });

        // Verify successful response
        expect(response.status).toBe(200);

        // Verify HTTPS is used (httpbin echoes back the URL in the response)
        expect(response.data.url).toContain('https://');

        // Verify response has expected structure from httpbin
        expect(response.data).toHaveProperty('headers');
        expect(response.data).toHaveProperty('url');
        expect(response.data).toHaveProperty('args');

        // Verify headers object exists and has Authorization
        expect(response.data.headers).toHaveProperty('Authorization');

        // Verify the full response structure is valid JSON
        const bodyString = JSON.stringify(response.data);
        expect(bodyString.length).toBeGreaterThan(0);
    });

});
