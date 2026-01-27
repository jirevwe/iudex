// Unit tests for HTTP Methods Governance Rule
import { HttpMethodsRule } from './http-methods.js';

describe('HttpMethodsRule', () => {
    let rule;

    beforeEach(() => {
        rule = new HttpMethodsRule({ enabled: true, severity: 'error' });
    });

    describe('POST Method Validation', () => {
        test('should flag POST with 200 when resource created', async () => {
            const request = { method: 'POST', url: '/api/users' };
            const response = { status: 200, body: { id: 1, name: 'Test' } };

            const result = await rule.validate(request, response, '/api/users');

            expect(result.violations.some(v => v.rule === 'wrong-status-code')).toBe(true);
        });

        test('should pass POST with 201', async () => {
            const request = { method: 'POST', url: '/api/users' };
            const response = { status: 201, body: { id: 1, name: 'Test' } };

            const result = await rule.validate(request, response, '/api/users');

            const statusViolations = result.violations.filter(v => v.rule === 'wrong-status-code');
            expect(statusViolations).toHaveLength(0);
        });

        test('should pass POST with 200 for non-creation operations', async () => {
            const request = { method: 'POST', url: '/api/search' };
            const response = { status: 200, body: { results: [] } };

            const result = await rule.validate(request, response, '/api/search');

            expect(result.violations).toHaveLength(0);
        });
    });

    describe('DELETE Method Validation', () => {
        test('should flag DELETE with 200 and no body', async () => {
            const request = { method: 'DELETE', url: '/api/users/1' };
            const response = { status: 200, body: null };

            const result = await rule.validate(request, response, '/api/users/1');

            expect(result.violations.some(v => v.rule === 'wrong-status-code')).toBe(true);
        });

        test('should flag DELETE with 204 and body', async () => {
            const request = { method: 'DELETE', url: '/api/users/1' };
            const response = { status: 204, body: { success: true } };

            const result = await rule.validate(request, response, '/api/users/1');

            expect(result.violations.some(v => v.rule === 'wrong-status-code')).toBe(true);
        });

        test('should pass DELETE with 204 and no body', async () => {
            const request = { method: 'DELETE', url: '/api/users/1' };
            const response = { status: 204, body: null };

            const result = await rule.validate(request, response, '/api/users/1');

            const statusViolations = result.violations.filter(v => v.rule === 'wrong-status-code');
            expect(statusViolations).toHaveLength(0);
        });

        test('should pass DELETE with 200 and body', async () => {
            const request = { method: 'DELETE', url: '/api/users/1' };
            const response = { status: 200, body: { deleted: 1, name: 'Test' } };

            const result = await rule.validate(request, response, '/api/users/1');

            const statusViolations = result.violations.filter(v => v.rule === 'wrong-status-code');
            expect(statusViolations).toHaveLength(0);
        });
    });

    describe('GET Method Validation', () => {
        test('should flag GET with side effects', async () => {
            const request = { method: 'GET', url: '/api/users' };
            const response = { status: 200, body: { created: true, users: [] } };

            const result = await rule.validate(request, response, '/api/users');

            expect(result.violations.some(v => v.rule === 'unsafe-method')).toBe(true);
        });

        test('should pass GET without side effects', async () => {
            const request = { method: 'GET', url: '/api/users' };
            const response = { status: 200, body: { users: [] } };

            const result = await rule.validate(request, response, '/api/users');

            const unsafeViolations = result.violations.filter(v => v.rule === 'unsafe-method');
            expect(unsafeViolations).toHaveLength(0);
        });
    });

    describe('Status Code Validation', () => {
        test('should flag unexpected status codes', async () => {
            const request = { method: 'GET', url: '/api/users' };
            const response = { status: 201, body: [] }; // GET shouldn't return 201

            const result = await rule.validate(request, response, '/api/users');

            expect(result.violations.some(v => v.rule === 'unexpected-status-code')).toBe(true);
        });

        test('should allow common error codes', async () => {
            const errorCodes = [400, 401, 403, 404, 500];

            for (const status of errorCodes) {
                const result = await rule.validate(
                    { method: 'GET', url: '/api/users' },
                    { status, body: { error: 'Error' } },
                    '/api/users'
                );

                const unexpectedViolations = result.violations.filter(v => v.rule === 'unexpected-status-code');
                expect(unexpectedViolations).toHaveLength(0);
            }
        });

        test('should flag unknown HTTP methods', async () => {
            const request = { method: 'BREW', url: '/api/coffee' }; // Non-standard method
            const response = { status: 200, body: {} };

            const result = await rule.validate(request, response, '/api/coffee');

            expect(result.violations.some(v => v.rule === 'unknown-method')).toBe(true);
        });
    });

    describe('Configuration Options', () => {
        test('should skip semantics check when disabled', async () => {
            rule = new HttpMethodsRule({ enforceSemantics: false });

            const request = { method: 'GET', url: '/api/users' };
            const response = { status: 200, body: { created: true } };

            const result = await rule.validate(request, response, '/api/users');

            const unsafeViolations = result.violations.filter(v => v.rule === 'unsafe-method');
            expect(unsafeViolations).toHaveLength(0);
        });

        test('should skip strict status codes when disabled', async () => {
            rule = new HttpMethodsRule({ strictStatusCodes: false });

            const request = { method: 'GET', url: '/api/users' };
            const response = { status: 999, body: [] };

            const result = await rule.validate(request, response, '/api/users');

            const unexpectedViolations = result.violations.filter(v => v.rule === 'unexpected-status-code');
            expect(unexpectedViolations).toHaveLength(0);
        });
    });

    describe('PUT Validation', () => {
        test('should pass for full resource replacement', async () => {
            const request = {
                method: 'PUT',
                url: '/api/users/123',
                body: {
                    name: 'John Doe',
                    email: 'john@example.com',
                    role: 'admin',
                    active: true
                }
            };
            const response = {
                status: 200,
                body: {
                    id: 123,
                    name: 'John Doe',
                    email: 'john@example.com',
                    role: 'admin',
                    active: true,
                    updated_at: '2024-01-01T00:00:00Z'
                }
            };

            const result = await rule.validate(request, response, '/api/users/123');

            const methodViolations = result.violations.filter(v => v.rule === 'wrong-method');
            expect(methodViolations).toHaveLength(0);
        });

        test('should flag partial update (should use PATCH)', async () => {
            const request = {
                method: 'PUT',
                url: '/api/users/123',
                body: {
                    name: 'John Doe'
                }
            };
            const response = {
                status: 200,
                body: {
                    id: 123,
                    name: 'John Doe',
                    email: 'john@example.com',
                    role: 'user',
                    active: true,
                    created_at: '2023-01-01T00:00:00Z',
                    updated_at: '2024-01-01T00:00:00Z'
                }
            };

            const result = await rule.validate(request, response, '/api/users/123');

            expect(result.violations.some(v =>
                v.rule === 'wrong-method' && v.message.includes('partial update')
            )).toBe(true);
        });

        test('should flag missing response body with 200 status', async () => {
            const request = { method: 'PUT', url: '/api/users/123', body: { name: 'Test' } };
            const response = { status: 200, body: null };

            const result = await rule.validate(request, response, '/api/users/123');

            expect(result.violations.some(v =>
                v.rule === 'wrong-status-code' && v.message.includes('204 No Content')
            )).toBe(true);
        });
    });

    describe('PATCH Validation', () => {
        test('should pass for partial update', async () => {
            const request = {
                method: 'PATCH',
                url: '/api/users/123',
                body: {
                    name: 'Jane Doe'
                }
            };
            const response = {
                status: 200,
                body: {
                    id: 123,
                    name: 'Jane Doe',
                    email: 'jane@example.com',
                    role: 'user',
                    active: true,
                    updated_at: '2024-01-01T00:00:00Z'
                }
            };

            const result = await rule.validate(request, response, '/api/users/123');

            const methodViolations = result.violations.filter(v => v.rule === 'wrong-method');
            expect(methodViolations).toHaveLength(0);
        });

        test('should flag full resource replacement (should use PUT)', async () => {
            const request = {
                method: 'PATCH',
                url: '/api/users/123',
                body: {
                    name: 'Jane Doe',
                    email: 'jane@example.com',
                    role: 'admin',
                    active: false
                }
            };
            const response = {
                status: 200,
                body: {
                    id: 123,
                    name: 'Jane Doe',
                    email: 'jane@example.com',
                    role: 'admin',
                    active: false,
                    updated_at: '2024-01-01T00:00:00Z'
                }
            };

            const result = await rule.validate(request, response, '/api/users/123');

            expect(result.violations.some(v =>
                v.rule === 'wrong-method' && v.message.includes('full replacement')
            )).toBe(true);
        });

        test('should flag invalid fields in request', async () => {
            const request = {
                method: 'PATCH',
                url: '/api/users/123',
                body: {
                    invalidField: 'value'
                }
            };
            const response = {
                status: 200,
                body: {
                    id: 123,
                    name: 'Test',
                    email: 'test@example.com'
                }
            };

            const result = await rule.validate(request, response, '/api/users/123');

            expect(result.violations.some(v =>
                v.rule === 'unexpected-response' && v.message.includes('not present in response')
            )).toBe(true);
        });

        test('should flag missing response body with 200 status', async () => {
            const request = { method: 'PATCH', url: '/api/users/123', body: { name: 'Test' } };
            const response = { status: 200, body: null };

            const result = await rule.validate(request, response, '/api/users/123');

            expect(result.violations.some(v =>
                v.rule === 'wrong-status-code' && v.message.includes('204 No Content')
            )).toBe(true);
        });
    });

    describe('Edge Cases', () => {
        test('should handle missing method', async () => {
            const request = { url: '/api/users' };
            const response = { status: 200, body: [] };

            const result = await rule.validate(request, response, '/api/users');

            expect(result.violations.some(v => v.rule === 'unknown-method')).toBe(true);
        });

        test('should handle lowercase methods', async () => {
            const request = { method: 'get', url: '/api/users' };
            const response = { status: 200, body: [] };

            const result = await rule.validate(request, response, '/api/users');

            expect(result.passed).toBe(true);
        });
    });
});
