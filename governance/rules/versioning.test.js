// Unit tests for Versioning Governance Rule
import { VersioningRule } from './versioning.js';

describe('VersioningRule', () => {
    let rule;

    beforeEach(() => {
        rule = new VersioningRule({ enabled: true, severity: 'warning' });
    });

    describe('Initialization', () => {
        test('should initialize with default config', () => {
            expect(rule.name).toBe('versioning');
            expect(rule.severity).toBe('warning');
            expect(rule.enabled).toBe(true);
        });

        test('should respect custom config', () => {
            rule = new VersioningRule({
                enabled: true,
                severity: 'error',
                requireVersion: false,
                preferredLocation: 'header'
            });

            expect(rule.severity).toBe('error');
            expect(rule.requireVersion).toBe(false);
            expect(rule.preferredLocation).toBe('header');
        });
    });

    describe('Version Detection in URL', () => {
        test('should detect version in URL path', async () => {
            const request = { method: 'GET', url: 'https://api.example.com/v1/users', headers: {} };
            const response = { status: 200, body: [] };

            const result = await rule.validate(request, response, '/v1/users');

            expect(result.passed).toBe(true);
            expect(result.violations).toHaveLength(0);
        });

        test('should detect version with /api/ prefix', async () => {
            const request = { method: 'GET', url: '/api/v2/users', headers: {} };
            const response = { status: 200, body: [] };

            const result = await rule.validate(request, response, '/api/v2/users');

            expect(result.passed).toBe(true);
        });

        test('should detect different version formats', async () => {
            const versions = ['/v1/', '/v2/', '/V1/', '/api/v3/', '/api/V10/'];

            for (const version of versions) {
                const result = await rule.validate(
                    { method: 'GET', url: version + 'users', headers: {} },
                    { status: 200, body: [] },
                    version + 'users'
                );

                expect(result.passed).toBe(true);
            }
        });

        test('should flag missing version in URL', async () => {
            const request = { method: 'GET', url: '/api/users', headers: {} };
            const response = { status: 200, body: [] };

            const result = await rule.validate(request, response, '/api/users');

            expect(result.passed).toBe(false);
            expect(result.violations).toHaveLength(1);
            expect(result.violations[0].rule).toBe('missing-api-version');
        });
    });

    describe('Version Detection in Headers', () => {
        test('should detect API-Version header', async () => {
            const request = {
                method: 'GET',
                url: '/api/users',
                headers: { 'API-Version': 'v1' }
            };
            const response = { status: 200, body: [] };

            const result = await rule.validate(request, response, '/api/users');

            expect(result.passed).toBe(true);
        });

        test('should detect Accept-Version header', async () => {
            const request = {
                method: 'GET',
                url: '/api/users',
                headers: { 'Accept-Version': 'v2' }
            };
            const response = { status: 200, body: [] };

            const result = await rule.validate(request, response, '/api/users');

            expect(result.passed).toBe(true);
        });

        test('should detect version header case-insensitive', async () => {
            const request = {
                method: 'GET',
                url: '/api/users',
                headers: { 'api-version': 'v1' }
            };
            const response = { status: 200, body: [] };

            const result = await rule.validate(request, response, '/api/users');

            expect(result.passed).toBe(true);
        });

        test('should detect version in Accept header', async () => {
            const request = {
                method: 'GET',
                url: '/api/users',
                headers: { 'Accept': 'application/json; version=1' }
            };
            const response = { status: 200, body: [] };

            const result = await rule.validate(request, response, '/api/users');

            expect(result.passed).toBe(true);
        });
    });

    describe('Preferred Location Validation', () => {
        test('should flag version in wrong location (URL preferred)', async () => {
            rule = new VersioningRule({
                enabled: true,
                preferredLocation: 'url'
            });

            const request = {
                method: 'GET',
                url: '/api/users',
                headers: { 'API-Version': 'v1' }
            };
            const response = { status: 200, body: [] };

            const result = await rule.validate(request, response, '/api/users');

            const wrongLocationViolation = result.violations.find(
                v => v.rule === 'version-in-wrong-location'
            );
            expect(wrongLocationViolation).toBeDefined();
            expect(wrongLocationViolation.severity).toBe('info');
        });

        test('should flag version in wrong location (header preferred)', async () => {
            rule = new VersioningRule({
                enabled: true,
                preferredLocation: 'header'
            });

            const request = {
                method: 'GET',
                url: '/api/v1/users',
                headers: {}
            };
            const response = { status: 200, body: [] };

            const result = await rule.validate(request, response, '/api/v1/users');

            const wrongLocationViolation = result.violations.find(
                v => v.rule === 'version-in-wrong-location'
            );
            expect(wrongLocationViolation).toBeDefined();
        });

        test('should flag incomplete versioning when both required', async () => {
            rule = new VersioningRule({
                enabled: true,
                preferredLocation: 'both'
            });

            const request = {
                method: 'GET',
                url: '/api/v1/users',
                headers: {}
            };
            const response = { status: 200, body: [] };

            const result = await rule.validate(request, response, '/api/v1/users');

            const incompleteViolation = result.violations.find(
                v => v.rule === 'incomplete-versioning'
            );
            expect(incompleteViolation).toBeDefined();
        });

        test('should pass when both URL and header have version', async () => {
            rule = new VersioningRule({
                enabled: true,
                preferredLocation: 'both'
            });

            const request = {
                method: 'GET',
                url: '/api/v1/users',
                headers: { 'API-Version': 'v1' }
            };
            const response = { status: 200, body: [] };

            const result = await rule.validate(request, response, '/api/v1/users');

            expect(result.passed).toBe(true);
        });
    });

    describe('Configuration Options', () => {
        test('should not require version when requireVersion is false', async () => {
            rule = new VersioningRule({
                enabled: true,
                requireVersion: false
            });

            const request = { method: 'GET', url: '/api/users', headers: {} };
            const response = { status: 200, body: [] };

            const result = await rule.validate(request, response, '/api/users');

            expect(result.passed).toBe(true);
            expect(result.violations).toHaveLength(0);
        });

        test('should use custom version pattern', async () => {
            rule = new VersioningRule({
                enabled: true,
                versionPattern: /version-\d+/
            });

            const request = { method: 'GET', url: '/api/version-2/users', headers: {} };
            const response = { status: 200, body: [] };

            const result = await rule.validate(request, response, '/api/version-2/users');

            expect(result.passed).toBe(true);
        });
    });

    describe('Edge Cases', () => {
        test('should handle missing URL gracefully', async () => {
            const request = { method: 'GET', headers: {} };
            const response = { status: 200, body: [] };

            const result = await rule.validate(request, response, '');

            expect(result.violations).toHaveLength(1);
        });

        test('should handle missing headers gracefully', async () => {
            const request = { method: 'GET', url: '/api/users' };
            const response = { status: 200, body: [] };

            const result = await rule.validate(request, response, '/api/users');

            expect(result.violations).toHaveLength(1);
        });

        test('should handle endpoint object format', async () => {
            const request = { method: 'GET', url: '/api/v1/users', headers: {} };
            const response = { status: 200, body: [] };

            const result = await rule.validate(request, response, { url: '/api/v1/users' });

            expect(result.passed).toBe(true);
        });
    });
});
