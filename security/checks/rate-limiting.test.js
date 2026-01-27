// Unit tests for Rate Limiting Security Check
import { RateLimitingCheck } from './rate-limiting.js';

describe('RateLimitingCheck', () => {
    let check;

    beforeEach(() => {
        check = new RateLimitingCheck({
            enabled: true,
            requireRateLimiting: true,
            publicEndpoints: ['/api/**']
        });
    });

    describe('Missing Rate Limiting', () => {
        test('should flag missing rate limit headers on public endpoint', async () => {
            const request = { method: 'GET', url: 'https://api.example.com/api/users', headers: {} };
            const response = { status: 200, body: [], headers: {} };

            const result = await check.execute(request, response, '/api/users');

            expect(result.findings.some(f => f.type === 'missing-rate-limiting')).toBe(true);
        });

        test('should pass when rate limit headers present', async () => {
            const request = { method: 'GET', url: 'https://api.example.com/api/users', headers: {} };
            const response = {
                status: 200,
                body: [],
                headers: {
                    'X-RateLimit-Limit': '100',
                    'X-RateLimit-Remaining': '95'
                }
            };

            const result = await check.execute(request, response, '/api/users');

            const missingRL = result.findings.filter(f => f.type === 'missing-rate-limiting');
            expect(missingRL).toHaveLength(0);
        });
    });

    describe('Rate Limit Header Validation', () => {
        test('should flag invalid rate limit values', async () => {
            const request = { method: 'GET', url: 'https://api.example.com/api/users', headers: {} };
            const response = {
                status: 200,
                body: [],
                headers: {
                    'X-RateLimit-Limit': 'invalid',
                    'X-RateLimit-Remaining': '95'
                }
            };

            const result = await check.execute(request, response, '/api/users');

            expect(result.findings.some(f => f.type === 'invalid-rate-limit-value')).toBe(true);
        });

        test('should flag negative rate limit values', async () => {
            const request = { method: 'GET', url: 'https://api.example.com/api/users', headers: {} };
            const response = {
                status: 200,
                body: [],
                headers: {
                    'X-RateLimit-Limit': '100',
                    'X-RateLimit-Remaining': '-5'
                }
            };

            const result = await check.execute(request, response, '/api/users');

            expect(result.findings.some(f => f.type === 'invalid-rate-limit-value')).toBe(true);
        });
    });

    describe('Aggressive Rate Limiting', () => {
        test('should flag very low rate limits', async () => {
            const request = { method: 'GET', url: 'https://api.example.com/api/users', headers: {} };
            const response = {
                status: 200,
                body: [],
                headers: {
                    'X-RateLimit-Limit': '5',
                    'X-RateLimit-Remaining': '4'
                }
            };

            const result = await check.execute(request, response, '/api/users');

            expect(result.findings.some(f => f.type === 'aggressive-rate-limiting')).toBe(true);
        });
    });

    describe('Rate Limit Exceeded', () => {
        test('should flag missing Retry-After on 429', async () => {
            const request = { method: 'GET', url: 'https://api.example.com/api/users', headers: {} };
            const response = { status: 429, body: {}, headers: {} };

            const result = await check.execute(request, response, '/api/users');

            expect(result.findings.some(f => f.type === 'missing-retry-after')).toBe(true);
        });

        test('should pass with Retry-After on 429', async () => {
            const request = { method: 'GET', url: 'https://api.example.com/api/users', headers: {} };
            const response = {
                status: 429,
                body: {},
                headers: { 'Retry-After': '60' }
            };

            const result = await check.execute(request, response, '/api/users');

            const missingRetry = result.findings.filter(f => f.type === 'missing-retry-after');
            expect(missingRetry).toHaveLength(0);
        });
    });

    describe('Header Format Support', () => {
        test('should recognize various rate limit header formats', async () => {
            const formats = [
                { 'X-RateLimit-Limit': '100' },
                { 'X-Rate-Limit-Limit': '100' },
                { 'RateLimit-Limit': '100' }
            ];

            for (const headers of formats) {
                const result = await check.execute(
                    { method: 'GET', url: 'https://api.example.com/api/users', headers: {} },
                    { status: 200, body: [], headers },
                    '/api/users'
                );

                const missingRL = result.findings.filter(f => f.type === 'missing-rate-limiting');
                expect(missingRL).toHaveLength(0);
            }
        });
    });
});
