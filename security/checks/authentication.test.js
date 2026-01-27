// Unit tests for Authentication Security Check
import { AuthenticationCheck } from './authentication.js';

describe('AuthenticationCheck', () => {
    let check;

    beforeEach(() => {
        check = new AuthenticationCheck({
            enabled: true,
            requireAuth: true,
            publicEndpoints: ['/health', '/ping']
        });
    });

    describe('Missing Authentication', () => {
        test('should flag missing authentication on protected endpoint', async () => {
            const request = { method: 'GET', url: 'https://api.example.com/users', headers: {} };
            const response = { status: 200, body: [] };

            const result = await check.execute(request, response, '/users');

            expect(result.findings.some(f => f.type === 'missing-authentication')).toBe(true);
            expect(result.findings.find(f => f.type === 'missing-authentication').severity).toBe('high');
        });

        test('should pass when Authorization header present', async () => {
            const request = {
                method: 'GET',
                url: 'https://api.example.com/users',
                headers: { 'Authorization': 'Bearer token123' }
            };
            const response = { status: 200, body: [] };

            const result = await check.execute(request, response, '/users');

            const missingAuth = result.findings.filter(f => f.type === 'missing-authentication');
            expect(missingAuth).toHaveLength(0);
        });

        test('should pass on public endpoints', async () => {
            const request = { method: 'GET', url: 'https://api.example.com/health', headers: {} };
            const response = { status: 200, body: { status: 'ok' } };

            const result = await check.execute(request, response, '/health');

            expect(result.findings).toHaveLength(0);
        });
    });

    describe('Authentication Scheme Validation', () => {
        test('should validate Bearer scheme', async () => {
            const request = {
                method: 'GET',
                url: 'https://api.example.com/users',
                headers: { 'Authorization': 'Bearer token123' }
            };
            const response = { status: 200, body: [] };

            const result = await check.execute(request, response, '/users');

            const schemeFindings = result.findings.filter(f => f.type === 'invalid-auth-scheme');
            expect(schemeFindings).toHaveLength(0);
        });

        test('should flag malformed Authorization header', async () => {
            const request = {
                method: 'GET',
                url: 'https://api.example.com/users',
                headers: { 'Authorization': 'InvalidFormat' }
            };
            const response = { status: 200, body: [] };

            const result = await check.execute(request, response, '/users');

            expect(result.findings.some(f => f.type === 'invalid-auth-scheme')).toBe(true);
        });

        test('should flag non-preferred authentication scheme', async () => {
            check = new AuthenticationCheck({ preferredScheme: 'bearer' });

            const request = {
                method: 'GET',
                url: 'https://api.example.com/users',
                headers: { 'Authorization': 'Basic dXNlcjpwYXNz' }
            };
            const response = { status: 200, body: [] };

            const result = await check.execute(request, response, '/users');

            expect(result.findings.some(f => f.type === 'non-preferred-auth-scheme')).toBe(true);
        });
    });

    describe('Weak Authentication Detection', () => {
        test('should flag Basic auth over HTTP', async () => {
            const request = {
                method: 'GET',
                url: 'http://api.example.com/users',
                headers: { 'Authorization': 'Basic dXNlcjpwYXNz' }
            };
            const response = { status: 200, body: [] };

            const result = await check.execute(request, response, 'http://api.example.com/users');

            expect(result.findings.some(f => f.type === 'weak-authentication')).toBe(true);
            expect(result.findings.find(f => f.type === 'weak-authentication').severity).toBe('critical');
        });

        test('should pass Basic auth over HTTPS', async () => {
            const request = {
                method: 'GET',
                url: 'https://api.example.com/users',
                headers: { 'Authorization': 'Basic dXNlcjpwYXNz' }
            };
            const response = { status: 200, body: [] };

            const result = await check.execute(request, response, 'https://api.example.com/users');

            const weakAuth = result.findings.filter(f => f.type === 'weak-authentication');
            expect(weakAuth).toHaveLength(0);
        });
    });

    describe('Exposed Credentials Detection', () => {
        test('should flag credentials in URL', async () => {
            const request = {
                method: 'GET',
                url: 'https://api.example.com/login?password=secret123',
                headers: {}
            };
            const response = { status: 200, body: {} };

            const result = await check.execute(request, response, '/login?password=secret123');

            expect(result.findings.some(f => f.type === 'exposed-credentials')).toBe(true);
            expect(result.findings.find(f => f.type === 'exposed-credentials').severity).toBe('critical');
        });

        test('should flag API key in URL', async () => {
            const request = {
                method: 'GET',
                url: 'https://api.example.com/data?apikey=abc123',
                headers: {}
            };
            const response = { status: 200, body: {} };

            const result = await check.execute(request, response, '/data?apikey=abc123');

            expect(result.findings.some(f => f.type === 'exposed-credentials')).toBe(true);
        });
    });

    describe('Alternative Authentication Methods', () => {
        test('should recognize API Key header', async () => {
            const request = {
                method: 'GET',
                url: 'https://api.example.com/users',
                headers: { 'X-API-Key': 'key123' }
            };
            const response = { status: 200, body: [] };

            const result = await check.execute(request, response, '/users');

            const missingAuth = result.findings.filter(f => f.type === 'missing-authentication');
            expect(missingAuth).toHaveLength(0);
        });

        test('should recognize Cookie header', async () => {
            const request = {
                method: 'GET',
                url: 'https://api.example.com/users',
                headers: { 'Cookie': 'session=abc123' }
            };
            const response = { status: 200, body: [] };

            const result = await check.execute(request, response, '/users');

            const missingAuth = result.findings.filter(f => f.type === 'missing-authentication');
            expect(missingAuth).toHaveLength(0);
        });
    });

    describe('Configuration Options', () => {
        test('should not require auth when configured', async () => {
            check = new AuthenticationCheck({ requireAuth: false });

            const request = { method: 'GET', url: 'https://api.example.com/users', headers: {} };
            const response = { status: 200, body: [] };

            const result = await check.execute(request, response, '/users');

            const missingAuth = result.findings.filter(f => f.type === 'missing-authentication');
            expect(missingAuth).toHaveLength(0);
        });

        test('should not flag weak auth when disabled', async () => {
            check = new AuthenticationCheck({ flagWeakAuth: false });

            const request = {
                method: 'GET',
                url: 'http://api.example.com/users',
                headers: { 'Authorization': 'Basic dXNlcjpwYXNz' }
            };
            const response = { status: 200, body: [] };

            const result = await check.execute(request, response, 'http://api.example.com/users');

            const weakAuth = result.findings.filter(f => f.type === 'weak-authentication');
            expect(weakAuth).toHaveLength(0);
        });
    });
});
