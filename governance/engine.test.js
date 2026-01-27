// Unit tests for GovernanceEngine
import { GovernanceEngine } from './engine.js';

describe('GovernanceEngine', () => {
    let engine;

    describe('Initialization', () => {
        test('should initialize with default config', () => {
            engine = new GovernanceEngine({});

            expect(engine.isEnabled()).toBe(false); // No governance config provided
            expect(engine.getRuleCount()).toBe(0);
            expect(engine.getRuleNames()).toEqual([]);
        });

        test('should initialize with governance enabled', () => {
            engine = new GovernanceEngine({
                governance: {
                    enabled: true,
                    rules: {
                        'rest-standards': { enabled: true }
                    }
                }
            });

            expect(engine.isEnabled()).toBe(true);
            expect(engine.getRuleCount()).toBe(1);
            expect(engine.getRuleNames()).toContain('rest-standards');
        });

        test('should load multiple rules', () => {
            engine = new GovernanceEngine({
                governance: {
                    enabled: true,
                    rules: {
                        'rest-standards': { enabled: true },
                        'versioning': { enabled: true },
                        'naming-conventions': { enabled: true }
                    }
                }
            });

            expect(engine.getRuleCount()).toBe(3);
            expect(engine.getRuleNames()).toContain('rest-standards');
            expect(engine.getRuleNames()).toContain('versioning');
            expect(engine.getRuleNames()).toContain('naming-conventions');
        });

        test('should respect rule enabled flag', () => {
            engine = new GovernanceEngine({
                governance: {
                    enabled: true,
                    rules: {
                        'rest-standards': { enabled: true },
                        'versioning': { enabled: false }
                    }
                }
            });

            expect(engine.getRuleCount()).toBe(1);
            expect(engine.getRuleNames()).toContain('rest-standards');
            expect(engine.getRuleNames()).not.toContain('versioning');
        });
    });

    describe('check()', () => {
        beforeEach(() => {
            engine = new GovernanceEngine({
                governance: {
                    enabled: true,
                    rules: {
                        'rest-standards': { enabled: true, severity: 'error' },
                        'versioning': { enabled: true, severity: 'warning' }
                    }
                }
            });
        });

        test('should return empty array when disabled', async () => {
            const disabledEngine = new GovernanceEngine({ governance: { enabled: false } });

            const violations = await disabledEngine.check(
                { method: 'POST', url: '/api/users' },
                { status: 200, body: { id: 1 } },
                '/api/users'
            );

            expect(violations).toEqual([]);
        });

        test('should check request/response against rules', async () => {
            const request = {
                method: 'POST',
                url: 'https://api.example.com/api/users',
                headers: {}
            };
            const response = {
                status: 200, // Should be 201
                body: { id: 1, name: 'Test User' }
            };

            const violations = await engine.check(request, response, '/api/users');

            expect(violations.length).toBeGreaterThan(0);
            expect(violations.some(v => v.rule === 'rest-standards')).toBe(true);
        });

        test('should include test context in violations', async () => {
            const request = { method: 'GET', url: 'https://api.example.com/users' };
            const response = { status: 200, body: [] };
            const testContext = { suite: 'User API', test: 'Get users' };

            const violations = await engine.check(request, response, '/users', testContext);

            violations.forEach(v => {
                expect(v.suite).toBe('User API');
                expect(v.test).toBe('Get users');
            });
        });

        test('should normalize violation format', async () => {
            const request = { method: 'POST', url: '/api/users' };
            const response = { status: 200, body: { id: 1 } };

            const violations = await engine.check(request, response, '/api/users');

            violations.forEach(v => {
                expect(v).toHaveProperty('rule');
                expect(v).toHaveProperty('category');
                expect(v).toHaveProperty('severity');
                expect(v).toHaveProperty('message');
                expect(v).toHaveProperty('endpoint');
                expect(v).toHaveProperty('method');
                expect(v).toHaveProperty('location');
                expect(v).toHaveProperty('remediation');
            });
        });

        test('should handle rule errors gracefully', async () => {
            // Add a rule that throws an error
            const mockRule = {
                validate: async () => {
                    throw new Error('Rule error');
                }
            };
            engine.addRule('mock-error-rule', mockRule);

            const request = { method: 'GET', url: '/api/users' };
            const response = { status: 200, body: [] };

            // Should not throw, just log warning
            const violations = await engine.check(request, response, '/api/users');

            // Should still return violations from other rules
            expect(Array.isArray(violations)).toBe(true);
        });

        test('should handle missing request/response gracefully', async () => {
            const violations = await engine.check(null, null, '/api/users');

            expect(Array.isArray(violations)).toBe(true);
        });
    });

    describe('addRule()', () => {
        beforeEach(() => {
            engine = new GovernanceEngine({ governance: { enabled: true } });
        });

        test('should allow adding custom rules', () => {
            const mockRule = {
                validate: async () => ({ passed: true, violations: [] })
            };

            engine.addRule('custom-rule', mockRule);

            expect(engine.getRuleCount()).toBe(1);
            expect(engine.getRuleNames()).toContain('custom-rule');
        });

        test('should execute added rules', async () => {
            let called = false;
            const mockRule = {
                validate: async () => {
                    called = true;
                    return {
                        passed: false,
                        violations: [{
                            rule: 'custom',
                            message: 'Custom violation',
                            severity: 'warning'
                        }]
                    };
                }
            };

            engine.addRule('custom-rule', mockRule);

            const violations = await engine.check(
                { method: 'GET', url: '/test' },
                { status: 200, body: {} },
                '/test'
            );

            expect(called).toBe(true);
            expect(violations.some(v => v.category === 'custom')).toBe(true);
        });
    });
});
