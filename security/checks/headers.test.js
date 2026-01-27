// Unit tests for Security Headers Check
import { HeadersCheck } from './headers.js';

describe('HeadersCheck', () => {
    let check;

    beforeEach(() => {
        check = new HeadersCheck({
            enabled: true,
            requiredHeaders: [
                'Strict-Transport-Security',
                'X-Content-Type-Options',
                'X-Frame-Options'
            ],
            validateCORS: true
        });
    });

    describe('Required Headers', () => {
        test('should flag missing HSTS header', async () => {
            const request = { method: 'GET', url: 'https://api.example.com/users', headers: {} };
            const response = { status: 200, body: [], headers: {} };

            const result = await check.execute(request, response, 'https://api.example.com/users');

            expect(result.findings.some(f => f.type === 'missing-security-header')).toBe(true);
        });

        test('should pass with all required headers', async () => {
            const request = { method: 'GET', url: 'https://api.example.com/users', headers: {} };
            const response = {
                status: 200,
                body: [],
                headers: {
                    'Strict-Transport-Security': 'max-age=31536000',
                    'X-Content-Type-Options': 'nosniff',
                    'X-Frame-Options': 'DENY'
                }
            };

            const result = await check.execute(request, response, 'https://api.example.com/users');

            const missingHeaders = result.findings.filter(f => f.type === 'missing-security-header');
            expect(missingHeaders).toHaveLength(0);
        });

        test('should not require HSTS on HTTP', async () => {
            const request = { method: 'GET', url: 'http://api.example.com/users', headers: {} };
            const response = { status: 200, body: [], headers: {} };

            const result = await check.execute(request, response, 'http://api.example.com/users');

            const hstsFindings = result.findings.filter(f =>
                f.type === 'missing-security-header' &&
                f.description.includes('Strict-Transport-Security')
            );
            expect(hstsFindings).toHaveLength(0);
        });
    });

    describe('HSTS Validation', () => {
        test('should flag missing max-age', async () => {
            const request = { method: 'GET', url: 'https://api.example.com/users', headers: {} };
            const response = {
                status: 200,
                body: [],
                headers: {
                    'Strict-Transport-Security': 'includeSubDomains'
                }
            };

            const result = await check.execute(request, response, 'https://api.example.com/users');

            expect(result.findings.some(f => f.type === 'misconfigured-header')).toBe(true);
        });

        test('should flag short max-age', async () => {
            const request = { method: 'GET', url: 'https://api.example.com/users', headers: {} };
            const response = {
                status: 200,
                body: [],
                headers: {
                    'Strict-Transport-Security': 'max-age=86400' // 1 day, should be at least 1 year
                }
            };

            const result = await check.execute(request, response, 'https://api.example.com/users');

            expect(result.findings.some(f => f.title === 'HSTS max-age Too Short')).toBe(true);
        });

        test('should recommend includeSubDomains', async () => {
            const request = { method: 'GET', url: 'https://api.example.com/users', headers: {} };
            const response = {
                status: 200,
                body: [],
                headers: {
                    'Strict-Transport-Security': 'max-age=31536000'
                }
            };

            const result = await check.execute(request, response, 'https://api.example.com/users');

            expect(result.findings.some(f => f.type === 'missing-hsts-subdomain')).toBe(true);
        });
    });

    describe('X-Content-Type-Options Validation', () => {
        test('should flag incorrect value', async () => {
            const request = { method: 'GET', url: 'https://api.example.com/users', headers: {} };
            const response = {
                status: 200,
                body: [],
                headers: {
                    'X-Content-Type-Options': 'sniff'
                }
            };

            const result = await check.execute(request, response, 'https://api.example.com/users');

            expect(result.findings.some(f => f.title === 'Incorrect X-Content-Type-Options Value')).toBe(true);
        });

        test('should pass with nosniff', async () => {
            const request = { method: 'GET', url: 'https://api.example.com/users', headers: {} };
            const response = {
                status: 200,
                body: [],
                headers: {
                    'X-Content-Type-Options': 'nosniff'
                }
            };

            const result = await check.execute(request, response, 'https://api.example.com/users');

            const contentTypeFindings = result.findings.filter(f =>
                f.description && f.description.includes('X-Content-Type-Options')
            );
            expect(contentTypeFindings).toHaveLength(0);
        });
    });

    describe('X-Frame-Options Validation', () => {
        test('should flag invalid value', async () => {
            const request = { method: 'GET', url: 'https://api.example.com/users', headers: {} };
            const response = {
                status: 200,
                body: [],
                headers: {
                    'X-Frame-Options': 'ALLOW'
                }
            };

            const result = await check.execute(request, response, 'https://api.example.com/users');

            expect(result.findings.some(f => f.title === 'Incorrect X-Frame-Options Value')).toBe(true);
        });

        test('should pass with DENY or SAMEORIGIN', async () => {
            for (const value of ['DENY', 'SAMEORIGIN']) {
                const result = await check.execute(
                    { method: 'GET', url: 'https://api.example.com/users', headers: {} },
                    { status: 200, body: [], headers: { 'X-Frame-Options': value } },
                    'https://api.example.com/users'
                );

                const frameFindings = result.findings.filter(f =>
                    f.title === 'Incorrect X-Frame-Options Value'
                );
                expect(frameFindings).toHaveLength(0);
            }
        });
    });

    describe('CSP Validation', () => {
        test('should flag unsafe-inline', async () => {
            const request = { method: 'GET', url: 'https://api.example.com/users', headers: {} };
            const response = {
                status: 200,
                body: [],
                headers: {
                    'Content-Security-Policy': "default-src 'self'; script-src 'unsafe-inline'"
                }
            };

            const result = await check.execute(request, response, 'https://api.example.com/users');

            expect(result.findings.some(f => f.type === 'weak-csp')).toBe(true);
        });

        test('should flag wildcard in default-src', async () => {
            const request = { method: 'GET', url: 'https://api.example.com/users', headers: {} };
            const response = {
                status: 200,
                body: [],
                headers: {
                    'Content-Security-Policy': "default-src *"
                }
            };

            const result = await check.execute(request, response, 'https://api.example.com/users');

            expect(result.findings.some(f => f.title === 'Permissive CSP Wildcard')).toBe(true);
        });
    });

    describe('CORS Validation', () => {
        test('should flag permissive CORS', async () => {
            const request = { method: 'GET', url: 'https://api.example.com/users', headers: {} };
            const response = {
                status: 200,
                body: [],
                headers: {
                    'Access-Control-Allow-Origin': '*'
                }
            };

            const result = await check.execute(request, response, 'https://api.example.com/users');

            expect(result.findings.some(f => f.type === 'permissive-cors')).toBe(true);
        });

        test('should flag wildcard with credentials', async () => {
            const request = { method: 'GET', url: 'https://api.example.com/users', headers: {} };
            const response = {
                status: 200,
                body: [],
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Credentials': 'true'
                }
            };

            const result = await check.execute(request, response, 'https://api.example.com/users');

            expect(result.findings.some(f => f.type === 'cors-misconfiguration')).toBe(true);
            expect(result.findings.find(f => f.type === 'cors-misconfiguration').severity).toBe('critical');
        });

        test('should pass with specific origin', async () => {
            const request = { method: 'GET', url: 'https://api.example.com/users', headers: {} };
            const response = {
                status: 200,
                body: [],
                headers: {
                    'Access-Control-Allow-Origin': 'https://example.com'
                }
            };

            const result = await check.execute(request, response, 'https://api.example.com/users');

            const permissiveCors = result.findings.filter(f => f.type === 'permissive-cors');
            expect(permissiveCors).toHaveLength(0);
        });
    });

    describe('Configuration Options', () => {
        test('should not flag missing headers when allowed', async () => {
            check = new HeadersCheck({ allowMissingHeaders: true });

            const request = { method: 'GET', url: 'https://api.example.com/users', headers: {} };
            const response = { status: 200, body: [], headers: {} };

            const result = await check.execute(request, response, 'https://api.example.com/users');

            const missingHeaders = result.findings.filter(f =>
                f.type === 'missing-security-header' && f.severity !== 'low'
            );
            expect(missingHeaders).toHaveLength(0);
        });

        test('should not validate CORS when disabled', async () => {
            check = new HeadersCheck({ validateCORS: false });

            const request = { method: 'GET', url: 'https://api.example.com/users', headers: {} };
            const response = {
                status: 200,
                body: [],
                headers: {
                    'Access-Control-Allow-Origin': '*'
                }
            };

            const result = await check.execute(request, response, 'https://api.example.com/users');

            const corsFindings = result.findings.filter(f => f.type === 'permissive-cors');
            expect(corsFindings).toHaveLength(0);
        });
    });
});
