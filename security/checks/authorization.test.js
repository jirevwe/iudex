// Unit tests for Authorization Security Check
import { AuthorizationCheck } from './authorization.js';

describe('AuthorizationCheck', () => {
    let check;

    beforeEach(() => {
        check = new AuthorizationCheck({
            enabled: true,
            checkIDOR: true,
            sensitiveResources: ['admin', 'users', 'accounts']
        });
    });

    describe('IDOR Detection', () => {
        test('should flag potential IDOR with numeric ID', async () => {
            const request = { method: 'GET', url: 'https://api.example.com/users/123', headers: {} };
            const response = { status: 200, body: { id: 123, name: 'Test' } };

            const result = await check.execute(request, response, '/users/123');

            expect(result.findings.some(f => f.type === 'potential-idor')).toBe(true);
        });

        test('should flag potential IDOR with UUID', async () => {
            const uuid = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
            const request = { method: 'GET', url: `https://api.example.com/users/${uuid}`, headers: {} };
            const response = { status: 200, body: { id: uuid } };

            const result = await check.execute(request, response, `/users/${uuid}`);

            expect(result.findings.some(f => f.type === 'potential-idor')).toBe(true);
        });

        test('should pass when authorization present', async () => {
            const request = {
                method: 'GET',
                url: 'https://api.example.com/users/123',
                headers: { 'Authorization': 'Bearer token123' }
            };
            const response = { status: 200, body: { id: 123 } };

            const result = await check.execute(request, response, '/users/123');

            const idorFindings = result.findings.filter(f => f.type === 'potential-idor');
            expect(idorFindings.length).toBe(0);
        });
    });

    describe('Missing Authorization', () => {
        test('should flag missing authorization on sensitive resource', async () => {
            const request = { method: 'GET', url: 'https://api.example.com/admin/settings', headers: {} };
            const response = { status: 200, body: {} };

            const result = await check.execute(request, response, '/admin/settings');

            expect(result.findings.some(f => f.type === 'missing-authorization')).toBe(true);
        });

        test('should pass on non-sensitive resources', async () => {
            const request = { method: 'GET', url: 'https://api.example.com/public/data', headers: {} };
            const response = { status: 200, body: {} };

            const result = await check.execute(request, response, '/public/data');

            const missingAuth = result.findings.filter(f => f.type === 'missing-authorization');
            expect(missingAuth).toHaveLength(0);
        });
    });

    describe('Privilege Escalation Detection', () => {
        test('should flag accessing admin endpoint', async () => {
            const request = { method: 'GET', url: 'https://api.example.com/admin/users', headers: {} };
            const response = { status: 200, body: [] };

            const result = await check.execute(request, response, '/admin/users');

            expect(result.findings.some(f => f.type === 'privilege-escalation')).toBe(true);
            expect(result.findings.find(f => f.type === 'privilege-escalation').severity).toBe('critical');
        });

        test('should pass with admin role header', async () => {
            const request = {
                method: 'GET',
                url: 'https://api.example.com/admin/users',
                headers: { 'X-User-Role': 'admin' }
            };
            const response = { status: 200, body: [] };

            const result = await check.execute(request, response, '/admin/users');

            const privEsc = result.findings.filter(f => f.type === 'privilege-escalation');
            expect(privEsc.length).toBe(0);
        });
    });

    describe('Configuration Options', () => {
        test('should not check IDOR when disabled', async () => {
            check = new AuthorizationCheck({ checkIDOR: false });

            const request = { method: 'GET', url: 'https://api.example.com/users/123', headers: {} };
            const response = { status: 200, body: { id: 123 } };

            const result = await check.execute(request, response, '/users/123');

            const idorFindings = result.findings.filter(f => f.type === 'potential-idor');
            expect(idorFindings).toHaveLength(0);
        });

        test('should check custom sensitive resources', async () => {
            check = new AuthorizationCheck({ sensitiveResources: ['custom'] });

            const request = { method: 'GET', url: 'https://api.example.com/custom/data', headers: {} };
            const response = { status: 200, body: {} };

            const result = await check.execute(request, response, '/custom/data');

            expect(result.findings.some(f => f.type === 'missing-authorization')).toBe(true);
        });
    });
});
