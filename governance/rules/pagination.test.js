// Unit tests for Pagination Governance Rule
import { PaginationRule } from './pagination.js';

describe('PaginationRule', () => {
    let rule;

    beforeEach(() => {
        rule = new PaginationRule({ enabled: true, severity: 'warning', threshold: 100 });
    });

    describe('Pagination Detection', () => {
        test('should pass for small collections', async () => {
            const request = { method: 'GET', url: '/api/users' };
            const response = { status: 200, body: Array(50).fill({ id: 1 }) };

            const result = await rule.validate(request, response, '/api/users');

            expect(result.passed).toBe(true);
        });

        test('should flag large collections without pagination', async () => {
            const request = { method: 'GET', url: '/api/users' };
            const response = { status: 200, body: Array(150).fill({ id: 1 }) };

            const result = await rule.validate(request, response, '/api/users');

            expect(result.violations.some(v => v.rule === 'missing-pagination')).toBe(true);
        });

        test('should pass for large collections with offset pagination', async () => {
            const request = { method: 'GET', url: '/api/users' };
            const response = {
                status: 200,
                body: {
                    data: Array(150).fill({ id: 1 }),
                    total: 1000,
                    limit: 150,
                    offset: 0
                }
            };

            const result = await rule.validate(request, response, '/api/users');

            const missingViolations = result.violations.filter(v => v.rule === 'missing-pagination');
            expect(missingViolations).toHaveLength(0);
        });

        test('should pass for large collections with cursor pagination', async () => {
            const request = { method: 'GET', url: '/api/users' };
            const response = {
                status: 200,
                body: {
                    data: Array(150).fill({ id: 1 }),
                    cursor: 'abc123',
                    has_more: true
                }
            };

            const result = await rule.validate(request, response, '/api/users');

            const missingViolations = result.violations.filter(v => v.rule === 'missing-pagination');
            expect(missingViolations).toHaveLength(0);
        });

        test('should pass for large collections with Link header', async () => {
            const request = { method: 'GET', url: '/api/users' };
            const response = {
                status: 200,
                body: Array(150).fill({ id: 1 }),
                headers: {
                    link: '<https://api.example.com/users?page=2>; rel="next"'
                }
            };

            const result = await rule.validate(request, response, '/api/users');

            const missingViolations = result.violations.filter(v => v.rule === 'missing-pagination');
            expect(missingViolations).toHaveLength(0);
        });
    });

    describe('Collection Wrapper Detection', () => {
        test('should detect collections in data wrapper', async () => {
            const request = { method: 'GET', url: '/api/users' };
            const response = {
                status: 200,
                body: { data: Array(150).fill({ id: 1 }) }
            };

            const result = await rule.validate(request, response, '/api/users');

            expect(result.violations.some(v => v.rule === 'missing-pagination')).toBe(true);
        });

        test('should detect collections in items wrapper', async () => {
            const request = { method: 'GET', url: '/api/users' };
            const response = {
                status: 200,
                body: { items: Array(150).fill({ id: 1 }) }
            };

            const result = await rule.validate(request, response, '/api/users');

            expect(result.violations.some(v => v.rule === 'missing-pagination')).toBe(true);
        });

        test('should detect collections in results wrapper', async () => {
            const request = { method: 'GET', url: '/api/users' };
            const response = {
                status: 200,
                body: { results: Array(150).fill({ id: 1 }) }
            };

            const result = await rule.validate(request, response, '/api/users');

            expect(result.violations.some(v => v.rule === 'missing-pagination')).toBe(true);
        });
    });

    describe('Offset Pagination Validation', () => {
        test('should flag incomplete offset pagination', async () => {
            const request = { method: 'GET', url: '/api/users' };
            const response = {
                status: 200,
                body: {
                    data: Array(150).fill({ id: 1 }),
                    limit: 150
                    // Missing total and offset
                }
            };

            const result = await rule.validate(request, response, '/api/users');

            expect(result.violations.some(v => v.rule === 'incomplete-pagination-metadata')).toBe(true);
        });

        test('should flag invalid offset values', async () => {
            const request = { method: 'GET', url: '/api/users' };
            const response = {
                status: 200,
                body: {
                    data: Array(50).fill({ id: 1 }),
                    total: 1000,
                    limit: 50,
                    offset: -1
                }
            };

            const result = await rule.validate(request, response, '/api/users');

            expect(result.violations.some(v => v.rule === 'invalid-pagination-values')).toBe(true);
        });

        test('should flag invalid limit values', async () => {
            const request = { method: 'GET', url: '/api/users' };
            const response = {
                status: 200,
                body: {
                    data: Array(50).fill({ id: 1 }),
                    total: 1000,
                    limit: 0,
                    offset: 0
                }
            };

            const result = await rule.validate(request, response, '/api/users');

            expect(result.violations.some(v => v.rule === 'invalid-pagination-values')).toBe(true);
        });
    });

    describe('Cursor Pagination Validation', () => {
        test('should flag incomplete cursor pagination', async () => {
            const request = { method: 'GET', url: '/api/users' };
            const response = {
                status: 200,
                body: {
                    data: Array(50).fill({ id: 1 }),
                    cursor: 'abc123'
                    // Missing has_more or next
                }
            };

            const result = await rule.validate(request, response, '/api/users');

            expect(result.violations.some(v => v.rule === 'incomplete-pagination-metadata')).toBe(true);
        });

        test('should pass with next_cursor and has_more', async () => {
            const request = { method: 'GET', url: '/api/users' };
            const response = {
                status: 200,
                body: {
                    data: Array(50).fill({ id: 1 }),
                    next_cursor: 'abc123',
                    has_more: true
                }
            };

            const result = await rule.validate(request, response, '/api/users');

            const incompleteViolations = result.violations.filter(v => v.rule === 'incomplete-pagination-metadata');
            expect(incompleteViolations).toHaveLength(0);
        });
    });

    describe('Link Header Pagination', () => {
        test('should pass with proper Link header', async () => {
            const request = { method: 'GET', url: '/api/users' };
            const response = {
                status: 200,
                body: Array(150).fill({ id: 1 }),
                headers: {
                    link: '<https://api.example.com/users?page=2>; rel="next", <https://api.example.com/users?page=1>; rel="prev"'
                }
            };

            const result = await rule.validate(request, response, '/api/users');

            const incompleteViolations = result.violations.filter(v => v.rule === 'incomplete-pagination-metadata');
            expect(incompleteViolations).toHaveLength(0);
        });

        test('should flag Link header without rel', async () => {
            const request = { method: 'GET', url: '/api/users' };
            const response = {
                status: 200,
                body: Array(150).fill({ id: 1 }),
                headers: {
                    link: '<https://api.example.com/users?page=2>'
                }
            };

            const result = await rule.validate(request, response, '/api/users');

            expect(result.violations.some(v => v.rule === 'incomplete-pagination-metadata')).toBe(true);
        });
    });

    describe('Pagination Style Preference', () => {
        test('should flag non-preferred pagination style', async () => {
            rule = new PaginationRule({ preferredStyle: 'cursor' });

            const request = { method: 'GET', url: '/api/users' };
            const response = {
                status: 200,
                body: {
                    data: Array(50).fill({ id: 1 }),
                    total: 1000,
                    limit: 50,
                    offset: 0
                }
            };

            const result = await rule.validate(request, response, '/api/users');

            expect(result.violations.some(v => v.rule === 'inconsistent-pagination-style')).toBe(true);
        });
    });

    describe('Configuration Options', () => {
        test('should use custom threshold', async () => {
            rule = new PaginationRule({ threshold: 50 });

            const request = { method: 'GET', url: '/api/users' };
            const response = { status: 200, body: Array(75).fill({ id: 1 }) };

            const result = await rule.validate(request, response, '/api/users');

            expect(result.violations.some(v => v.rule === 'missing-pagination')).toBe(true);
        });

        test('should allow no pagination when configured', async () => {
            rule = new PaginationRule({ allowNoPagination: true });

            const request = { method: 'GET', url: '/api/users' };
            const response = { status: 200, body: Array(150).fill({ id: 1 }) };

            const result = await rule.validate(request, response, '/api/users');

            expect(result.passed).toBe(true);
        });
    });

    describe('Edge Cases', () => {
        test('should handle non-array response', async () => {
            const request = { method: 'GET', url: '/api/user/1' };
            const response = { status: 200, body: { id: 1, name: 'Test' } };

            const result = await rule.validate(request, response, '/api/user/1');

            expect(result.passed).toBe(true);
        });

        test('should handle empty array', async () => {
            const request = { method: 'GET', url: '/api/users' };
            const response = { status: 200, body: [] };

            const result = await rule.validate(request, response, '/api/users');

            expect(result.passed).toBe(true);
        });

        test('should handle null response', async () => {
            const request = { method: 'GET', url: '/api/users' };
            const response = { status: 204, body: null };

            const result = await rule.validate(request, response, '/api/users');

            expect(result.passed).toBe(true);
        });
    });
});
