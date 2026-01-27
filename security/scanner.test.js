// Unit tests for SecurityScanner
import { SecurityScanner } from './scanner.js';

describe('SecurityScanner', () => {
    let scanner;

    describe('Initialization', () => {
        test('should initialize with default config', () => {
            scanner = new SecurityScanner({});

            expect(scanner.isEnabled()).toBe(false);
            expect(scanner.getCheckCount()).toBe(0);
        });

        test('should initialize with security enabled', () => {
            scanner = new SecurityScanner({
                security: {
                    enabled: true,
                    checks: {
                        'sensitive-data': { enabled: true }
                    }
                }
            });

            expect(scanner.isEnabled()).toBe(true);
            expect(scanner.getCheckCount()).toBe(1);
            expect(scanner.getCheckNames()).toContain('sensitive-data');
        });

        test('should load multiple checks', () => {
            scanner = new SecurityScanner({
                security: {
                    enabled: true,
                    checks: {
                        'sensitive-data': { enabled: true },
                        'authentication': { enabled: true },
                        'ssl-tls': { enabled: true }
                    }
                }
            });

            expect(scanner.getCheckCount()).toBe(3);
            expect(scanner.getCheckNames()).toContain('sensitive-data');
            expect(scanner.getCheckNames()).toContain('authentication');
        });

        test('should respect check enabled flag', () => {
            scanner = new SecurityScanner({
                security: {
                    enabled: true,
                    checks: {
                        'sensitive-data': { enabled: true },
                        'authentication': { enabled: false }
                    }
                }
            });

            expect(scanner.getCheckCount()).toBe(1);
            expect(scanner.getCheckNames()).toContain('sensitive-data');
            expect(scanner.getCheckNames()).not.toContain('authentication');
        });
    });

    describe('scan()', () => {
        beforeEach(() => {
            scanner = new SecurityScanner({
                security: {
                    enabled: true,
                    checks: {
                        'sensitive-data': { enabled: true },
                        'ssl-tls': { enabled: true }
                    }
                }
            });
        });

        test('should return empty array when disabled', async () => {
            const disabledScanner = new SecurityScanner({ security: { enabled: false } });

            const findings = await disabledScanner.scan(
                { method: 'POST', url: 'http://api.example.com/users' },
                { status: 200, body: { password: 'secret' } },
                '/users'
            );

            expect(findings).toEqual([]);
        });

        test('should scan request/response against checks', async () => {
            const request = {
                method: 'POST',
                url: 'http://api.example.com/users', // HTTP not HTTPS
                headers: {}
            };
            const response = {
                status: 200,
                body: { id: 1, password: 'secret123' } // Sensitive data
            };

            const findings = await scanner.scan(request, response, '/users');

            expect(findings.length).toBeGreaterThan(0);
        });

        test('should include test context in findings', async () => {
            const request = { method: 'GET', url: 'https://api.example.com/users' };
            const response = { status: 200, body: { password: 'secret' } };
            const testContext = { suite: 'Security Suite', test: 'Test password exposure' };

            const findings = await scanner.scan(request, response, '/users', testContext);

            findings.forEach(f => {
                expect(f.suite).toBe('Security Suite');
                expect(f.test).toBe('Test password exposure');
            });
        });

        test('should normalize finding format', async () => {
            const request = { method: 'GET', url: 'http://api.example.com/users' };
            const response = { status: 200, body: {} };

            const findings = await scanner.scan(request, response, '/users');

            findings.forEach(f => {
                expect(f).toHaveProperty('check');
                expect(f).toHaveProperty('severity');
                expect(f).toHaveProperty('title');
                expect(f).toHaveProperty('description');
                expect(f).toHaveProperty('endpoint');
                expect(f).toHaveProperty('method');
                expect(f).toHaveProperty('location');
                expect(f).toHaveProperty('cwe');
                expect(f).toHaveProperty('remediation');
            });
        });

        test('should handle check errors gracefully', async () => {
            const mockCheck = {
                execute: async () => {
                    throw new Error('Check error');
                }
            };
            scanner.addCheck('mock-error-check', mockCheck);

            const request = { method: 'GET', url: 'https://api.example.com/users' };
            const response = { status: 200, body: {} };

            const findings = await scanner.scan(request, response, '/users');

            expect(Array.isArray(findings)).toBe(true);
        });
    });

    describe('generateTitle()', () => {
        beforeEach(() => {
            scanner = new SecurityScanner({ security: { enabled: true } });
        });

        test('should generate title from type', () => {
            const title = scanner.generateTitle('missing-authentication', 'authentication');

            expect(title).toBe('Missing Authentication');
        });

        test('should handle hyphens and underscores', () => {
            const title = scanner.generateTitle('weak_auth_scheme', 'authentication');

            expect(title).toBe('Weak Auth Scheme');
        });

        test('should handle missing type', () => {
            const title = scanner.generateTitle(null, 'authentication');

            expect(title).toBe('authentication finding');
        });
    });

    describe('getCWE()', () => {
        beforeEach(() => {
            scanner = new SecurityScanner({ security: { enabled: true } });
        });

        test('should map known types to CWE', () => {
            const cwe = scanner.getCWE('password', 'sensitive-data');

            expect(cwe).toContain('CWE-200');
        });

        test('should return default CWE for unknown types', () => {
            const cwe = scanner.getCWE('unknown-type', 'unknown-check');

            expect(cwe).toContain('CWE-1000');
        });
    });

    describe('addCheck()', () => {
        beforeEach(() => {
            scanner = new SecurityScanner({ security: { enabled: true } });
        });

        test('should allow adding custom checks', () => {
            const mockCheck = {
                execute: async () => ({ vulnerable: false, findings: [] })
            };

            scanner.addCheck('custom-check', mockCheck);

            expect(scanner.getCheckCount()).toBe(1);
            expect(scanner.getCheckNames()).toContain('custom-check');
        });

        test('should execute added checks', async () => {
            let called = false;
            const mockCheck = {
                execute: async () => {
                    called = true;
                    return {
                        vulnerable: true,
                        findings: [{
                            type: 'custom',
                            severity: 'high',
                            description: 'Custom finding'
                        }]
                    };
                }
            };

            scanner.addCheck('custom-check', mockCheck);

            const findings = await scanner.scan(
                { method: 'GET', url: 'https://test.com' },
                { status: 200, body: {} },
                '/test'
            );

            expect(called).toBe(true);
            expect(findings.some(f => f.type === 'custom')).toBe(true);
        });
    });
});
