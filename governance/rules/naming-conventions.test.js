// Unit tests for Naming Conventions Governance Rule
import { NamingConventionsRule } from './naming-conventions.js';

describe('NamingConventionsRule', () => {
    let rule;

    beforeEach(() => {
        rule = new NamingConventionsRule({
            enabled: true,
            severity: 'info',
            convention: 'kebab-case'
        });
    });

    describe('Initialization', () => {
        test('should initialize with default config', () => {
            expect(rule.name).toBe('naming-conventions');
            expect(rule.convention).toBe('kebab-case');
            expect(rule.requirePlural).toBe(true);
        });

        test('should respect custom config', () => {
            rule = new NamingConventionsRule({
                enabled: true,
                convention: 'snake_case',
                requirePlural: false,
                allowAbbreviations: true
            });

            expect(rule.convention).toBe('snake_case');
            expect(rule.requirePlural).toBe(false);
            expect(rule.allowAbbreviations).toBe(true);
        });
    });

    describe('Naming Convention Validation - kebab-case', () => {
        beforeEach(() => {
            rule = new NamingConventionsRule({ convention: 'kebab-case' });
        });

        test('should pass for kebab-case names', async () => {
            const request = { method: 'GET', url: '/api/user-profiles', headers: {} };
            const response = { status: 200, body: [] };

            const result = await rule.validate(request, response, '/api/user-profiles');

            const namingViolations = result.violations.filter(v => v.rule === 'inconsistent-naming');
            expect(namingViolations).toHaveLength(0);
        });

        test('should flag camelCase as inconsistent', async () => {
            const request = { method: 'GET', url: '/api/userProfiles', headers: {} };
            const response = { status: 200, body: [] };

            const result = await rule.validate(request, response, '/api/userProfiles');

            expect(result.violations.some(v => v.rule === 'inconsistent-naming')).toBe(true);
        });

        test('should flag snake_case as inconsistent', async () => {
            const request = { method: 'GET', url: '/api/user_profiles', headers: {} };
            const response = { status: 200, body: [] };

            const result = await rule.validate(request, response, '/api/user_profiles');

            expect(result.violations.some(v => v.rule === 'inconsistent-naming')).toBe(true);
        });
    });

    describe('Naming Convention Validation - snake_case', () => {
        beforeEach(() => {
            rule = new NamingConventionsRule({ convention: 'snake_case' });
        });

        test('should pass for snake_case names', async () => {
            const request = { method: 'GET', url: '/api/user_profiles', headers: {} };
            const response = { status: 200, body: [] };

            const result = await rule.validate(request, response, '/api/user_profiles');

            const namingViolations = result.violations.filter(v => v.rule === 'inconsistent-naming');
            expect(namingViolations).toHaveLength(0);
        });

        test('should flag kebab-case as inconsistent', async () => {
            const request = { method: 'GET', url: '/api/user-profiles', headers: {} };
            const response = { status: 200, body: [] };

            const result = await rule.validate(request, response, '/api/user-profiles');

            expect(result.violations.some(v => v.rule === 'inconsistent-naming')).toBe(true);
        });
    });

    describe('Naming Convention Validation - camelCase', () => {
        beforeEach(() => {
            rule = new NamingConventionsRule({ convention: 'camelCase' });
        });

        test('should pass for camelCase names', async () => {
            const request = { method: 'GET', url: '/api/userProfiles', headers: {} };
            const response = { status: 200, body: [] };

            const result = await rule.validate(request, response, '/api/userProfiles');

            const namingViolations = result.violations.filter(v => v.rule === 'inconsistent-naming');
            expect(namingViolations).toHaveLength(0);
        });

        test('should flag PascalCase as inconsistent', async () => {
            const request = { method: 'GET', url: '/api/UserProfiles', headers: {} };
            const response = { status: 200, body: [] };

            const result = await rule.validate(request, response, '/api/UserProfiles');

            expect(result.violations.some(v => v.rule === 'inconsistent-naming')).toBe(true);
        });
    });

    describe('Plural Resource Name Validation', () => {
        test('should pass for plural resource names', async () => {
            const request = { method: 'GET', url: '/api/users', headers: {} };
            const response = { status: 200, body: [] };

            const result = await rule.validate(request, response, '/api/users');

            const pluralViolations = result.violations.filter(v => v.rule === 'singular-resource');
            expect(pluralViolations).toHaveLength(0);
        });

        test('should flag singular resource names', async () => {
            const request = { method: 'GET', url: '/api/user', headers: {} };
            const response = { status: 200, body: [] };

            const result = await rule.validate(request, response, '/api/user');

            expect(result.violations.some(v => v.rule === 'singular-resource')).toBe(true);
        });

        test('should allow singular exceptions', async () => {
            const exceptions = ['auth', 'login', 'logout', 'profile', 'settings'];

            for (const exception of exceptions) {
                const result = await rule.validate(
                    { method: 'POST', url: `/api/${exception}`, headers: {} },
                    { status: 200, body: {} },
                    `/api/${exception}`
                );

                const pluralViolations = result.violations.filter(v => v.rule === 'singular-resource');
                expect(pluralViolations).toHaveLength(0);
            }
        });

        test('should not require plural when disabled', async () => {
            rule = new NamingConventionsRule({ requirePlural: false });

            const request = { method: 'GET', url: '/api/user', headers: {} };
            const response = { status: 200, body: [] };

            const result = await rule.validate(request, response, '/api/user');

            const pluralViolations = result.violations.filter(v => v.rule === 'singular-resource');
            expect(pluralViolations).toHaveLength(0);
        });
    });

    describe('Abbreviation Detection', () => {
        test('should flag abbreviations when not allowed', async () => {
            rule = new NamingConventionsRule({ allowAbbreviations: false });

            const request = { method: 'GET', url: '/api/usr', headers: {} };
            const response = { status: 200, body: [] };

            const result = await rule.validate(request, response, '/api/usr');

            expect(result.violations.some(v => v.rule === 'unclear-naming')).toBe(true);
        });

        test('should not flag abbreviations when allowed', async () => {
            rule = new NamingConventionsRule({ allowAbbreviations: true });

            const request = { method: 'GET', url: '/api/usr', headers: {} };
            const response = { status: 200, body: [] };

            const result = await rule.validate(request, response, '/api/usr');

            const abbrevViolations = result.violations.filter(v => v.rule === 'unclear-naming');
            expect(abbrevViolations).toHaveLength(0);
        });

        test('should detect common abbreviations', async () => {
            rule = new NamingConventionsRule({ allowAbbreviations: false });

            const abbreviations = ['usr', 'pwd', 'msg', 'cfg'];

            for (const abbrev of abbreviations) {
                const result = await rule.validate(
                    { method: 'GET', url: `/api/${abbrev}`, headers: {} },
                    { status: 200, body: [] },
                    `/api/${abbrev}`
                );

                expect(result.violations.some(v => v.rule === 'unclear-naming')).toBe(true);
            }
        });
    });

    describe('RESTful Hierarchy Validation', () => {
        test('should pass for proper hierarchy with IDs', async () => {
            const request = { method: 'GET', url: '/api/users/123/posts', headers: {} };
            const response = { status: 200, body: [] };

            const result = await rule.validate(request, response, '/api/users/123/posts');

            const hierarchyViolations = result.violations.filter(v => v.rule === 'non-restful-hierarchy');
            expect(hierarchyViolations).toHaveLength(0);
        });

        test('should flag missing ID between collections', async () => {
            const request = { method: 'GET', url: '/api/users/posts', headers: {} };
            const response = { status: 200, body: [] };

            const result = await rule.validate(request, response, '/api/users/posts');

            expect(result.violations.some(v => v.rule === 'non-restful-hierarchy')).toBe(true);
        });

        test('should handle UUID IDs', async () => {
            const uuid = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
            const request = { method: 'GET', url: `/api/users/${uuid}/posts`, headers: {} };
            const response = { status: 200, body: [] };

            const result = await rule.validate(request, response, `/api/users/${uuid}/posts`);

            const hierarchyViolations = result.violations.filter(v => v.rule === 'non-restful-hierarchy');
            expect(hierarchyViolations).toHaveLength(0);
        });
    });

    describe('Custom Exceptions', () => {
        test('should skip custom exceptions', async () => {
            rule = new NamingConventionsRule({
                customExceptions: ['api', 'auth', 'v1', 'special']
            });

            const request = { method: 'GET', url: '/api/v1/auth/special/users', headers: {} };
            const response = { status: 200, body: [] };

            const result = await rule.validate(request, response, '/api/v1/auth/special/users');

            // Only 'users' should be checked
            const violations = result.violations.filter(v =>
                v.location && (
                    v.location.includes('api') ||
                    v.location.includes('v1') ||
                    v.location.includes('auth') ||
                    v.location.includes('special')
                )
            );
            expect(violations).toHaveLength(0);
        });
    });

    describe('Edge Cases', () => {
        test('should handle query parameters', async () => {
            const request = { method: 'GET', url: '/api/users?page=1&limit=10', headers: {} };
            const response = { status: 200, body: [] };

            const result = await rule.validate(request, response, '/api/users?page=1&limit=10');

            // Should only check path, not query params
            expect(result.violations.length).toBe(0);
        });

        test('should handle empty URL', async () => {
            const request = { method: 'GET', url: '', headers: {} };
            const response = { status: 200, body: [] };

            const result = await rule.validate(request, response, '');

            expect(result.passed).toBe(true);
        });

        test('should handle root path', async () => {
            const request = { method: 'GET', url: '/', headers: {} };
            const response = { status: 200, body: [] };

            const result = await rule.validate(request, response, '/');

            expect(result.passed).toBe(true);
        });

        test('should filter out numeric IDs', async () => {
            const request = { method: 'GET', url: '/api/users/123/posts/456', headers: {} };
            const response = { status: 200, body: [] };

            const result = await rule.validate(request, response, '/api/users/123/posts/456');

            // Should only check 'api', 'users', 'posts'
            const hierarchyViolations = result.violations.filter(v => v.rule === 'non-restful-hierarchy');
            expect(hierarchyViolations).toHaveLength(0);
        });
    });
});
