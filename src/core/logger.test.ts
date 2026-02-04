// Unit tests for Logger
import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { createLogger, getLogger, resetLogger } from './logger.js';
import { PinoAdapter } from './adapters/pino-adapter.js';
import { ConsoleAdapter } from './adapters/console-adapter.js';

/** Logger adapter interface for custom adapters */
interface LoggerAdapter {
  debug: (...args: unknown[]) => void;
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
  child: (bindings: Record<string, unknown>) => LoggerAdapter;
}

/** Custom adapter class for testing */
type CustomAdapterClass = new (config: Record<string, unknown>) => LoggerAdapter;

describe('Logger', () => {
  // Store original environment variables
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
    resetLogger();
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('createLogger', () => {
    test('creates pino adapter by default', () => {
      const logger = createLogger();
      expect(logger).toBeInstanceOf(PinoAdapter);
    });

    test('creates console adapter when specified', () => {
      const logger = createLogger({ adapter: 'console' });
      expect(logger).toBeInstanceOf(ConsoleAdapter);
    });

    test('accepts custom adapter class', () => {
      class CustomAdapter {
        constructor(config) {
          this.config = config;
        }
        debug() {}
        info() {}
        warn() {}
        error() {}
        child() { return this; }
      }

      const logger = createLogger({ adapter: CustomAdapter });
      expect(logger).toBeInstanceOf(CustomAdapter);
    });

    test('throws error for unknown adapter string', () => {
      expect(() => {
        createLogger({ adapter: 'unknown' });
      }).toThrow('Unknown logger adapter: unknown');
    });

    test('respects LOG_LEVEL environment variable', () => {
      process.env.LOG_LEVEL = 'error';
      const logger = createLogger();
      expect(logger.logger.level).toBe('error');
    });

    test('respects LOG_ADAPTER environment variable', () => {
      process.env.LOG_ADAPTER = 'console';
      const logger = createLogger();
      expect(logger).toBeInstanceOf(ConsoleAdapter);
    });

    test('respects LOG_SILENT environment variable', () => {
      process.env.LOG_SILENT = 'true';
      const logger = createLogger();
      expect(logger.logger.level).toBe('silent');
    });

    test('defaults to warn level in test environment', () => {
      process.env.NODE_ENV = 'test';
      delete process.env.LOG_LEVEL;
      const logger = createLogger();
      expect(logger.logger.level).toBe('warn');
    });

    test('defaults to info level in non-test environment', () => {
      process.env.NODE_ENV = 'production';
      delete process.env.LOG_LEVEL;
      const logger = createLogger();
      expect(logger.logger.level).toBe('info');
    });

    test('options override environment variables', () => {
      process.env.LOG_LEVEL = 'error';
      const logger = createLogger({ level: 'debug' });
      expect(logger.logger.level).toBe('debug');
    });

    test('creates logger with pretty formatting in development', () => {
      process.env.NODE_ENV = 'development';
      const logger = createLogger();
      // Just verify logger was created successfully
      expect(logger).toBeInstanceOf(PinoAdapter);
      expect(logger.logger).toBeDefined();
    });

    test('creates logger without pretty formatting in production', () => {
      process.env.NODE_ENV = 'production';
      const logger = createLogger();
      // Just verify logger was created successfully
      expect(logger).toBeInstanceOf(PinoAdapter);
      expect(logger.logger).toBeDefined();
    });

    test('accepts custom logger name', () => {
      const logger = createLogger({ name: 'test-logger' });
      expect(logger.logger.bindings().name).toBe('test-logger');
    });
  });

  describe('getLogger', () => {
    test('returns a logger instance', () => {
      const logger = getLogger();
      expect(logger).toBeDefined();
      expect(logger.debug).toBeInstanceOf(Function);
      expect(logger.info).toBeInstanceOf(Function);
      expect(logger.warn).toBeInstanceOf(Function);
      expect(logger.error).toBeInstanceOf(Function);
    });

    test('returns same instance on multiple calls', () => {
      const logger1 = getLogger();
      const logger2 = getLogger();
      expect(logger1).toBe(logger2);
    });

    test('returns new instance after reset', () => {
      const logger1 = getLogger();
      resetLogger();
      const logger2 = getLogger();
      expect(logger1).not.toBe(logger2);
    });
  });

  describe('PinoAdapter', () => {
    test('has all required methods', () => {
      const logger = new PinoAdapter({ name: 'test', level: 'info' });
      expect(logger.debug).toBeInstanceOf(Function);
      expect(logger.info).toBeInstanceOf(Function);
      expect(logger.warn).toBeInstanceOf(Function);
      expect(logger.error).toBeInstanceOf(Function);
      expect(logger.child).toBeInstanceOf(Function);
    });

    test('child logger inherits config', () => {
      const logger = new PinoAdapter({ name: 'test', level: 'error' });
      const child = logger.child({ module: 'test-module' });
      expect(child).toBeInstanceOf(PinoAdapter);
      expect(child.logger.level).toBe('error');
    });

    test('handles string messages', () => {
      const logger = new PinoAdapter({ name: 'test', level: 'info', silent: true });
      // Should not throw
      expect(() => logger.info('test message')).not.toThrow();
    });

    test('handles object messages', () => {
      const logger = new PinoAdapter({ name: 'test', level: 'info', silent: true });
      // Should not throw
      expect(() => logger.info({ key: 'value' }, 'test message')).not.toThrow();
    });

    test('respects silent option', () => {
      const logger = new PinoAdapter({ name: 'test', level: 'info', silent: true });
      expect(logger.logger.level).toBe('silent');
    });
  });

  describe('ConsoleAdapter', () => {
    let consoleLogSpy: jest.SpiedFunction<typeof console.log>;

    beforeEach(() => {
      consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    });

    afterEach(() => {
      consoleLogSpy.mockRestore();
    });

    test('has all required methods', () => {
      const logger = new ConsoleAdapter({ name: 'test', level: 'info' });
      expect(logger.debug).toBeInstanceOf(Function);
      expect(logger.info).toBeInstanceOf(Function);
      expect(logger.warn).toBeInstanceOf(Function);
      expect(logger.error).toBeInstanceOf(Function);
      expect(logger.child).toBeInstanceOf(Function);
    });

    test('respects log level', () => {
      const logger = new ConsoleAdapter({ name: 'test', level: 'error' });
      logger.debug('debug message');
      logger.info('info message');
      logger.warn('warn message');
      logger.error('error message');
      // Only error should be logged
      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
    });

    test('respects silent option', () => {
      const logger = new ConsoleAdapter({ name: 'test', level: 'info', silent: true });
      logger.info('test message');
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });

    test('formats log messages correctly', () => {
      const logger = new ConsoleAdapter({ name: 'test', level: 'info' });
      logger.info('test message');
      expect(consoleLogSpy).toHaveBeenCalled();
      const call = consoleLogSpy.mock.calls[0][0];
      expect(call).toContain('[INFO]');
      expect(call).toContain('test:');
    });

    test('child logger inherits config', () => {
      const logger = new ConsoleAdapter({ name: 'test', level: 'error' });
      const child = logger.child({ module: 'test-module' });
      expect(child).toBeInstanceOf(ConsoleAdapter);
      expect(child.currentLevel).toBe(3); // error level
      expect(child.name).toBe('test:test-module');
    });

    test('handles string messages', () => {
      const logger = new ConsoleAdapter({ name: 'test', level: 'info' });
      expect(() => logger.info('test message')).not.toThrow();
    });

    test('handles object messages', () => {
      const logger = new ConsoleAdapter({ name: 'test', level: 'info' });
      expect(() => logger.info({ key: 'value' })).not.toThrow();
    });
  });

  describe('Logger interface', () => {
    test('logger has consistent interface across adapters', () => {
      const pinoLogger = createLogger({ adapter: 'pino' });
      const consoleLogger = createLogger({ adapter: 'console' });

      const requiredMethods = ['debug', 'info', 'warn', 'error', 'child'];

      requiredMethods.forEach(method => {
        expect(pinoLogger[method]).toBeInstanceOf(Function);
        expect(consoleLogger[method]).toBeInstanceOf(Function);
      });
    });
  });
});
