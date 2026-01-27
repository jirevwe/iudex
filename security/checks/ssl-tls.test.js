// Unit tests for SSL/TLS Security Check
import { SslTlsCheck } from './ssl-tls.js';

describe('SslTlsCheck', () => {
    let check;

    beforeEach(() => {
        check = new SslTlsCheck({
            enabled: true,
            requireHTTPS: true,
            requireSecureCookies: true
        });
    });

    describe('HTTP vs HTTPS', () => {
        test('should flag HTTP usage', async () => {
            const request = { method: 'GET', url: 'http://api.example.com/users', headers: {} };
            const response = { status: 200, body: [], headers: {} };

            const result = await check.execute(request, response, 'http://api.example.com/users');

            expect(result.findings.some(f => f.type === 'http-usage')).toBe(true);
            expect(result.findings.find(f => f.type === 'http-usage').severity).toBe('critical');
        });

        test('should pass HTTPS usage', async () => {
            const request = { method: 'GET', url: 'https://api.example.com/users', headers: {} };
            const response = { status: 200, body: [], headers: {} };

            const result = await check.execute(request, response, 'https://api.example.com/users');

            const httpUsage = result.findings.filter(f => f.type === 'http-usage');
            expect(httpUsage).toHaveLength(0);
        });

        test('should allow localhost HTTP when configured', async () => {
            check = new SslTlsCheck({ allowLocalhost: true });

            const request = { method: 'GET', url: 'http://localhost:3000/users', headers: {} };
            const response = { status: 200, body: [], headers: {} };

            const result = await check.execute(request, response, 'http://localhost:3000/users');

            const httpUsage = result.findings.filter(f => f.type === 'http-usage');
            expect(httpUsage).toHaveLength(0);
        });
    });

    describe('Secure Cookie Validation', () => {
        test('should flag missing Secure flag', async () => {
            const request = { method: 'POST', url: 'https://api.example.com/login', headers: {} };
            const response = {
                status: 200,
                body: {},
                headers: {
                    'Set-Cookie': 'session=abc123; Path=/; HttpOnly'
                }
            };

            const result = await check.execute(request, response, 'https://api.example.com/login');

            expect(result.findings.some(f => f.type === 'insecure-cookies')).toBe(true);
        });

        test('should flag missing HttpOnly flag', async () => {
            const request = { method: 'POST', url: 'https://api.example.com/login', headers: {} };
            const response = {
                status: 200,
                body: {},
                headers: {
                    'Set-Cookie': 'session=abc123; Path=/; Secure'
                }
            };

            const result = await check.execute(request, response, 'https://api.example.com/login');

            expect(result.findings.some(f => f.type === 'insecure-cookies')).toBe(true);
        });

        test('should flag missing SameSite flag', async () => {
            const request = { method: 'POST', url: 'https://api.example.com/login', headers: {} };
            const response = {
                status: 200,
                body: {},
                headers: {
                    'Set-Cookie': 'session=abc123; Path=/; Secure; HttpOnly'
                }
            };

            const result = await check.execute(request, response, 'https://api.example.com/login');

            expect(result.findings.some(f => f.type === 'insecure-cookies')).toBe(true);
        });

        test('should pass with all secure flags', async () => {
            const request = { method: 'POST', url: 'https://api.example.com/login', headers: {} };
            const response = {
                status: 200,
                body: {},
                headers: {
                    'Set-Cookie': 'session=abc123; Path=/; Secure; HttpOnly; SameSite=Strict'
                }
            };

            const result = await check.execute(request, response, 'https://api.example.com/login');

            const insecureCookies = result.findings.filter(f => f.type === 'insecure-cookies');
            expect(insecureCookies).toHaveLength(0);
        });
    });

    describe('Mixed Content Detection', () => {
        test('should flag HTTP URLs in HTTPS response', async () => {
            const request = { method: 'GET', url: 'https://api.example.com/config', headers: {} };
            const response = {
                status: 200,
                body: {
                    imageUrl: 'http://cdn.example.com/image.jpg',
                    apiUrl: 'https://api.example.com'
                },
                headers: {}
            };

            const result = await check.execute(request, response, 'https://api.example.com/config');

            expect(result.findings.some(f => f.type === 'mixed-content')).toBe(true);
        });

        test('should ignore localhost URLs', async () => {
            const request = { method: 'GET', url: 'https://api.example.com/config', headers: {} };
            const response = {
                status: 200,
                body: {
                    localUrl: 'http://localhost:3000/test'
                },
                headers: {}
            };

            const result = await check.execute(request, response, 'https://api.example.com/config');

            const mixedContent = result.findings.filter(f => f.type === 'mixed-content');
            expect(mixedContent).toHaveLength(0);
        });
    });

    describe('Configuration Options', () => {
        test('should not require HTTPS when disabled', async () => {
            check = new SslTlsCheck({ requireHTTPS: false });

            const request = { method: 'GET', url: 'http://api.example.com/users', headers: {} };
            const response = { status: 200, body: [], headers: {} };

            const result = await check.execute(request, response, 'http://api.example.com/users');

            const httpUsage = result.findings.filter(f => f.type === 'http-usage');
            expect(httpUsage).toHaveLength(0);
        });

        test('should not check cookies when disabled', async () => {
            check = new SslTlsCheck({ requireSecureCookies: false });

            const request = { method: 'POST', url: 'https://api.example.com/login', headers: {} };
            const response = {
                status: 200,
                body: {},
                headers: {
                    'Set-Cookie': 'session=abc123'
                }
            };

            const result = await check.execute(request, response, 'https://api.example.com/login');

            const insecureCookies = result.findings.filter(f => f.type === 'insecure-cookies');
            expect(insecureCookies).toHaveLength(0);
        });
    });
});
