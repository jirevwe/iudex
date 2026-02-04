import {
    describe as dslDescribe,
    test as dslTest,
    expect as dslExpect,
    beforeAll as dslBeforeAll,
    afterAll as dslAfterAll,
    beforeEach as dslBeforeEach,
    afterEach as dslAfterEach,
    getTestSuites
} from './dsl.js';

describe('DSL - Test Definition', () => {
    beforeEach(() => {
        // Clear test suites before each test
        const suites = getTestSuites();
        suites.length = 0;
    });

    test('should create a test suite with describe', () => {
        dslDescribe('Sample Suite', () => {
            dslTest('sample test', () => {});
        });

        const suites = getTestSuites();
        expect(suites.length).toBe(1);
        expect(suites[0].name).toBe('Sample Suite');
    });

    test('should add tests to a suite', () => {
        dslDescribe('Suite with tests', () => {
            dslTest('test 1', () => {});
            dslTest('test 2', () => {});
            dslTest('test 3', () => {});
        });

        const suites = getTestSuites();
        expect(suites[0].tests.length).toBe(3);
        expect(suites[0].tests[0].name).toBe('test 1');
        expect(suites[0].tests[1].name).toBe('test 2');
        expect(suites[0].tests[2].name).toBe('test 3');
    });

    test('should support test.skip', () => {
        dslDescribe('Suite with skip', () => {
            dslTest('normal test', () => {});
            dslTest.skip('skipped test', () => {});
        });

        const suites = getTestSuites();
        expect(suites[0].tests.length).toBe(2);
        expect(suites[0].tests[0].skip).toBe(false);
        expect(suites[0].tests[1].skip).toBe(true);
    });

    test('should support test.only', () => {
        dslDescribe('Suite with only', () => {
            dslTest('normal test', () => {});
            dslTest.only('focused test', () => {});
        });

        const suites = getTestSuites();
        expect(suites[0].tests.length).toBe(2);
        expect(suites[0].tests[0].only).toBe(false);
        expect(suites[0].tests[1].only).toBe(true);
    });

    test('should support test options', () => {
        dslDescribe('Suite with options', () => {
            dslTest('test with options', () => {}, {
                timeout: 5000,
                retry: 3,
                tags: ['smoke', 'api']
            });
        });

        const suites = getTestSuites();
        const testDef = suites[0].tests[0];
        expect(testDef.timeout).toBe(5000);
        expect(testDef.retry).toBe(3);
        expect(testDef.tags).toEqual(['smoke', 'api']);
    });

    test('should add beforeAll hooks', () => {
        dslDescribe('Suite with beforeAll', () => {
            dslBeforeAll(() => {});
            dslBeforeAll(() => {});
            dslTest('test', () => {});
        });

        const suites = getTestSuites();
        expect(suites[0].hooks.beforeAll.length).toBe(2);
    });

    test('should add afterAll hooks', () => {
        dslDescribe('Suite with afterAll', () => {
            dslAfterAll(() => {});
            dslAfterAll(() => {});
            dslTest('test', () => {});
        });

        const suites = getTestSuites();
        expect(suites[0].hooks.afterAll.length).toBe(2);
    });

    test('should add beforeEach hooks', () => {
        dslDescribe('Suite with beforeEach', () => {
            dslBeforeEach(() => {});
            dslBeforeEach(() => {});
            dslTest('test', () => {});
        });

        const suites = getTestSuites();
        expect(suites[0].hooks.beforeEach.length).toBe(2);
    });

    test('should add afterEach hooks', () => {
        dslDescribe('Suite with afterEach', () => {
            dslAfterEach(() => {});
            dslAfterEach(() => {});
            dslTest('test', () => {});
        });

        const suites = getTestSuites();
        expect(suites[0].hooks.afterEach.length).toBe(2);
    });

    test('should support multiple suites', () => {
        dslDescribe('Suite 1', () => {
            dslTest('test 1', () => {});
        });
        dslDescribe('Suite 2', () => {
            dslTest('test 2', () => {});
        });

        const suites = getTestSuites();
        expect(suites.length).toBe(2);
        expect(suites[0].name).toBe('Suite 1');
        expect(suites[1].name).toBe('Suite 2');
    });
});

describe('DSL - Slug-based Test Identity', () => {
    beforeEach(() => {
        const suites = getTestSuites();
        suites.length = 0;
    });

    describe('Auto-slug generation', () => {
        test('should auto-generate slug from test name', () => {
            dslDescribe('Suite', () => {
                dslTest('should fetch user data', () => {});
            });

            const suites = getTestSuites();
            const testDef = suites[0].tests[0];
            expect(testDef.testId).toBe('should-fetch-user-data');
        });

        test('should convert spaces to dashes', () => {
            dslDescribe('Suite', () => {
                dslTest('test with multiple spaces', () => {});
            });

            const suites = getTestSuites();
            expect(suites[0].tests[0].testId).toBe('test-with-multiple-spaces');
        });

        test('should remove special characters', () => {
            dslDescribe('Suite', () => {
                dslTest('test@with#special$chars!', () => {});
            });

            const suites = getTestSuites();
            expect(suites[0].tests[0].testId).toBe('testwithspecialchars');
        });

        test('should preserve dots in slugs', () => {
            dslDescribe('Suite', () => {
                dslTest('api.users.get', () => {});
            });

            const suites = getTestSuites();
            expect(suites[0].tests[0].testId).toBe('api.users.get');
        });

        test('should convert to lowercase', () => {
            dslDescribe('Suite', () => {
                dslTest('Test With UPPERCASE Letters', () => {});
            });

            const suites = getTestSuites();
            expect(suites[0].tests[0].testId).toBe('test-with-uppercase-letters');
        });

        test('should handle multiple consecutive dashes', () => {
            dslDescribe('Suite', () => {
                dslTest('test---with---dashes', () => {});
            });

            const suites = getTestSuites();
            expect(suites[0].tests[0].testId).toBe('test-with-dashes');
        });

        test('should trim leading and trailing dashes', () => {
            dslDescribe('Suite', () => {
                dslTest('---test---', () => {});
            });

            const suites = getTestSuites();
            expect(suites[0].tests[0].testId).toBe('test');
        });
    });

    describe('Explicit test IDs', () => {
        test('should use explicit id when provided', () => {
            dslDescribe('Suite', () => {
                dslTest('Should fetch user data', () => {}, { id: 'get_user' });
            });

            const suites = getTestSuites();
            expect(suites[0].tests[0].testId).toBe('get_user');
        });

        test('should slugify explicit id', () => {
            dslDescribe('Suite', () => {
                dslTest('Test', () => {}, { id: 'Custom ID with Spaces' });
            });

            const suites = getTestSuites();
            expect(suites[0].tests[0].testId).toBe('custom-id-with-spaces');
        });
    });

    describe('Suite prefix support', () => {
        test('should prepend prefix to auto-generated slug', () => {
            dslDescribe('API Tests', { prefix: 'api.users' }, () => {
                dslTest('should create user', () => {});
            });

            const suites = getTestSuites();
            expect(suites[0].tests[0].testId).toBe('api.users.should-create-user');
        });

        test('should prepend prefix to explicit id', () => {
            dslDescribe('API Tests', { prefix: 'api.users' }, () => {
                dslTest('Test', () => {}, { id: 'create' });
            });

            const suites = getTestSuites();
            expect(suites[0].tests[0].testId).toBe('api.users.create');
        });

        test('should work without prefix', () => {
            dslDescribe('Suite without prefix', () => {
                dslTest('test', () => {}, { id: 'my_test' });
            });

            const suites = getTestSuites();
            expect(suites[0].tests[0].testId).toBe('my_test');
        });

        test('should handle multi-level prefixes', () => {
            dslDescribe('Suite', { prefix: 'saas.api.users.onboarding' }, () => {
                dslTest('test', () => {}, { id: 'step1' });
            });

            const suites = getTestSuites();
            expect(suites[0].tests[0].testId).toBe('saas.api.users.onboarding.step1');
        });
    });

    describe('Character limits', () => {
        test('should enforce 512 character limit on test names', () => {
            const longName = 'a'.repeat(513);

            expect(() => {
                dslDescribe('Suite', () => {
                    dslTest(longName, () => {});
                });
            }).toThrow('Test name exceeds 512 characters');
        });

        test('should allow test names up to 512 characters', () => {
            const maxName = 'a'.repeat(512);

            expect(() => {
                dslDescribe('Suite', () => {
                    dslTest(maxName, () => {});
                });
            }).not.toThrow();

            const suites = getTestSuites();
            expect(suites[0].tests[0].name.length).toBe(512);
        });

        test('should truncate slug to 512 characters', () => {
            const longName = 'test-'.repeat(150); // Creates a slug > 512 chars

            dslDescribe('Suite', () => {
                dslTest(longName.substring(0, 512), () => {});
            });

            const suites = getTestSuites();
            const slug = suites[0].tests[0].testId;
            expect(slug.length).toBeLessThanOrEqual(512);
        });

        test('should truncate slug with prefix to 512 characters', () => {
            const longPrefix = 'a'.repeat(300);
            const longId = 'b'.repeat(300);

            dslDescribe('Suite', { prefix: longPrefix }, () => {
                dslTest('test', () => {}, { id: longId });
            });

            const suites = getTestSuites();
            const slug = suites[0].tests[0].testId;
            expect(slug.length).toBeLessThanOrEqual(512);
        });
    });

    describe('Test ID in test object', () => {
        test('should include testId in test object', () => {
            dslDescribe('Suite', () => {
                dslTest('my test', () => {});
            });

            const suites = getTestSuites();
            const testDef = suites[0].tests[0];
            expect(testDef).toHaveProperty('testId');
            expect(testDef.testId).toBe('my-test');
        });

        test('should include endpoint and method when provided', () => {
            dslDescribe('Suite', () => {
                dslTest('test', () => {}, {
                    endpoint: '/api/users',
                    method: 'GET'
                });
            });

            const suites = getTestSuites();
            const testDef = suites[0].tests[0];
            expect(testDef.endpoint).toBe('/api/users');
            expect(testDef.method).toBe('GET');
        });

        test('should have null endpoint and method when not provided', () => {
            dslDescribe('Suite', () => {
                dslTest('test', () => {});
            });

            const suites = getTestSuites();
            const testDef = suites[0].tests[0];
            expect(testDef.endpoint).toBe(null);
            expect(testDef.method).toBe(null);
        });
    });

    describe('Edge cases', () => {
        test('should handle empty string after slugification', () => {
            dslDescribe('Suite', () => {
                dslTest('!!!', () => {});
            });

            const suites = getTestSuites();
            // Should result in empty or minimal slug
            expect(suites[0].tests[0].testId).toBeDefined();
        });

        test('should handle unicode characters', () => {
            dslDescribe('Suite', () => {
                dslTest('test with émojis 🚀', () => {});
            });

            const suites = getTestSuites();
            const slug = suites[0].tests[0].testId;
            expect(slug).toBeDefined();
            expect(slug.length).toBeGreaterThan(0);
        });

        test('should handle numbers in test names', () => {
            dslDescribe('Suite', () => {
                dslTest('test 123 with numbers 456', () => {});
            });

            const suites = getTestSuites();
            expect(suites[0].tests[0].testId).toBe('test-123-with-numbers-456');
        });

        test('should handle underscores', () => {
            dslDescribe('Suite', () => {
                dslTest('test_with_underscores', () => {});
            });

            const suites = getTestSuites();
            expect(suites[0].tests[0].testId).toBe('test_with_underscores');
        });
    });
});

describe('DSL - Expect Matchers', () => {
    describe('toBe', () => {
        test('should pass when values are equal', () => {
            expect(() => dslExpect(5).toBe(5)).not.toThrow();
            expect(() => dslExpect('hello').toBe('hello')).not.toThrow();
        });

        test('should fail when values are not equal', () => {
            expect(() => dslExpect(5).toBe(10)).toThrow('Expected 10, got 5');
        });
    });

    describe('toBeDefined', () => {
        test('should pass when value is defined', () => {
            expect(() => dslExpect(0).toBeDefined()).not.toThrow();
            expect(() => dslExpect('').toBeDefined()).not.toThrow();
            expect(() => dslExpect(null).toBeDefined()).not.toThrow();
        });

        test('should fail when value is undefined', () => {
            expect(() => dslExpect(undefined).toBeDefined()).toThrow('Expected value to be defined');
        });
    });

    describe('toBeArray', () => {
        test('should pass for arrays', () => {
            expect(() => dslExpect([]).toBeArray()).not.toThrow();
            expect(() => dslExpect([1, 2, 3]).toBeArray()).not.toThrow();
        });

        test('should fail for non-arrays', () => {
            expect(() => dslExpect('not array').toBeArray()).toThrow('Expected array');
            expect(() => dslExpect(123).toBeArray()).toThrow('Expected array');
        });
    });

    describe('toHaveLength', () => {
        test('should pass when length matches', () => {
            expect(() => dslExpect([1, 2, 3]).toHaveLength(3)).not.toThrow();
            expect(() => dslExpect('hello').toHaveLength(5)).not.toThrow();
        });

        test('should fail when length does not match', () => {
            expect(() => dslExpect([1, 2]).toHaveLength(3)).toThrow('Expected length 3, got 2');
        });
    });

    describe('toBeGreaterThanOrEqual', () => {
        test('should pass when value is greater than or equal', () => {
            expect(() => dslExpect(10).toBeGreaterThanOrEqual(5)).not.toThrow();
            expect(() => dslExpect(10).toBeGreaterThanOrEqual(10)).not.toThrow();
        });

        test('should fail when value is less', () => {
            expect(() => dslExpect(5).toBeGreaterThanOrEqual(10)).toThrow('Expected 5 to be greater than or equal to 10');
        });
    });

    describe('toContain', () => {
        test('should pass when string contains substring', () => {
            expect(() => dslExpect('hello world').toContain('world')).not.toThrow();
        });

        test('should pass when array contains value', () => {
            expect(() => dslExpect([1, 2, 3]).toContain(2)).not.toThrow();
        });

        test('should fail when not contained', () => {
            expect(() => dslExpect('hello').toContain('xyz')).toThrow();
            expect(() => dslExpect([1, 2, 3]).toContain(5)).toThrow();
        });
    });

    describe('toMatch', () => {
        test('should pass when regex matches', () => {
            expect(() => dslExpect('hello123').toMatch(/\d+/)).not.toThrow();
            expect(() => dslExpect('test@example.com').toMatch(/^[\w.-]+@[\w.-]+\.\w+$/)).not.toThrow();
        });

        test('should fail when regex does not match', () => {
            expect(() => dslExpect('hello').toMatch(/\d+/)).toThrow();
        });
    });

    describe('toHaveProperty', () => {
        test('should pass when property exists', () => {
            const obj = { user: { name: 'John', age: 30 } };
            expect(() => dslExpect(obj).toHaveProperty('user')).not.toThrow();
            expect(() => dslExpect(obj).toHaveProperty('user.name')).not.toThrow();
            expect(() => dslExpect(obj).toHaveProperty('user.age', 30)).not.toThrow();
        });

        test('should fail when property does not exist', () => {
            const obj = { user: { name: 'John' } };
            expect(() => dslExpect(obj).toHaveProperty('missing')).toThrow("Property 'missing' not found");
            expect(() => dslExpect(obj).toHaveProperty('user.email')).toThrow("Property 'user.email' not found");
        });

        test('should fail when property value does not match', () => {
            const obj = { user: { name: 'John' } };
            expect(() => dslExpect(obj).toHaveProperty('user.name', 'Jane')).toThrow("Expected 'user.name' to be Jane, got John");
        });
    });

    describe('toHaveStatus', () => {
        test('should pass when status matches', () => {
            const response = { status: 200 };
            expect(() => dslExpect(response).toHaveStatus(200)).not.toThrow();
        });

        test('should work with statusCode property', () => {
            const response = { statusCode: 404 };
            expect(() => dslExpect(response).toHaveStatus(404)).not.toThrow();
        });

        test('should fail when status does not match', () => {
            const response = { status: 200 };
            expect(() => dslExpect(response).toHaveStatus(404)).toThrow('Expected status 404, got 200');
        });
    });

    describe('toRespondWithin', () => {
        test('should pass when response time is within limit', () => {
            const response = { responseTime: 100 };
            expect(() => dslExpect(response).toRespondWithin(200)).not.toThrow();
        });

        test('should work with duration property', () => {
            const response = { duration: 150 };
            expect(() => dslExpect(response).toRespondWithin(200)).not.toThrow();
        });

        test('should fail when response time exceeds limit', () => {
            const response = { responseTime: 300 };
            expect(() => dslExpect(response).toRespondWithin(200)).toThrow('Response time 300ms exceeds 200ms');
        });
    });

    describe('toHaveHeader', () => {
        test('should pass when header exists', () => {
            const response = { headers: { 'content-type': 'application/json' } };
            expect(() => dslExpect(response).toHaveHeader('content-type')).not.toThrow();
        });

        test('should be case-insensitive', () => {
            const response = { headers: { 'Content-Type': 'application/json' } };
            expect(() => dslExpect(response).toHaveHeader('content-type')).not.toThrow();
        });

        test('should fail when header does not exist', () => {
            const response = { headers: {} };
            expect(() => dslExpect(response).toHaveHeader('content-type')).toThrow('Expected header content-type to exist');
        });
    });

    describe('toHaveSecurityHeaders', () => {
        test('should pass when all security headers exist', () => {
            const response = {
                headers: {
                    'x-content-type-options': 'nosniff',
                    'x-frame-options': 'DENY',
                    'strict-transport-security': 'max-age=31536000'
                }
            };
            expect(() => dslExpect(response).toHaveSecurityHeaders()).not.toThrow();
        });

        test('should fail when security headers are missing', () => {
            const response = { headers: {} };
            expect(() => dslExpect(response).toHaveSecurityHeaders()).toThrow();
        });
    });

    describe('not modifier', () => {
        test('should invert toBe assertion', () => {
            expect(() => dslExpect(5).not.toBe(10)).not.toThrow();
            expect(() => dslExpect(5).not.toBe(5)).toThrow();
        });

        test('should invert toHaveStatus assertion', () => {
            const response = { status: 200 };
            expect(() => dslExpect(response).not.toHaveStatus(404)).not.toThrow();
            expect(() => dslExpect(response).not.toHaveStatus(200)).toThrow();
        });

        test('should invert toHaveHeader assertion', () => {
            const response = { headers: { 'content-type': 'application/json' } };
            expect(() => dslExpect(response).not.toHaveHeader('x-custom')).not.toThrow();
            expect(() => dslExpect(response).not.toHaveHeader('content-type')).toThrow();
        });
    });
});
