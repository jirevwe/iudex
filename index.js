// Main entry point for Iudex API Testing Framework
// Re-export core testing DSL functions

export { describe, test, expect, beforeEach, afterEach, beforeAll, afterAll } from './core/dsl.js';

// Export standard library utilities
export { createStdObject } from './core/utils/index.js';
export * as stdUtils from './core/utils/index.js';
