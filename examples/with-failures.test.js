// Integration test with failures
import { describe, test, expect } from '../core/dsl.js';

describe('Tests with Failures', () => {
    test('should pass', async () => {
        expect(2 + 2).toBe(4);
    });

    test('should fail - wrong value', async () => {
        expect(1 + 1).toBe(3); // This will fail
    });

    test('should also pass', async () => {
        expect('hello').toBe('hello');
    });

    test('should fail - error thrown', async () => {
        throw new Error('Something went wrong!');
    });

    test.skip('should be skipped', async () => {
        expect(true).toBe(false);
    });
});
