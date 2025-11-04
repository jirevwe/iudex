// Simple integration test
import { describe, test, expect } from '../core/dsl.js';

describe('Simple Integration Test', () => {
    test('should pass', async () => {
        expect(1 + 1).toBe(2);
    });

    test('should also pass', async () => {
        const result = 'hello';
        expect(result).toBe('hello');
    });
});

describe('Math Tests', () => {
    test('addition works', async () => {
        expect(5 + 3).toBe(8);
    });

    test('subtraction works', async () => {
        expect(10 - 4).toBe(6);
    });
});
