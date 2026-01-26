import { PinoAdapter, ConsoleAdapter } from './adapters/index.js';

/**
 * Logger interface that all adapters must implement
 * @typedef {Object} Logger
 * @property {Function} debug - Debug level logging
 * @property {Function} info - Info level logging
 * @property {Function} warn - Warning level logging
 * @property {Function} error - Error level logging
 * @property {Function} child - Create child logger with additional context
 */

/**
 * Get the adapter class for the given adapter name
 * @param {string|Function} adapterName - Adapter name or custom adapter class
 * @returns {Function} Adapter class constructor
 */
function getAdapter(adapterName) {
  switch (adapterName) {
    case 'pino':
      return PinoAdapter;
    case 'console':
      return ConsoleAdapter;
    default:
      // Allow custom adapter (must be a class/constructor)
      if (typeof adapterName === 'function') {
        return adapterName;
      }
      throw new Error(`Unknown logger adapter: ${adapterName}`);
  }
}

/**
 * Create a logger instance
 * @param {Object} options - Logger configuration
 * @param {string} [options.level] - Log level (debug|info|warn|error)
 * @param {string|Function} [options.adapter] - Adapter name (pino|console) or custom adapter class
 * @param {boolean} [options.pretty] - Use pretty formatting (default: dev mode)
 * @param {boolean} [options.silent] - Disable all logging (default: false)
 * @param {string} [options.name] - Logger name/context
 * @returns {Logger}
 */
export function createLogger(options = {}) {
  const config = {
    level: options.level || process.env.LOG_LEVEL || (process.env.NODE_ENV === 'test' ? 'warn' : 'info'),
    adapter: options.adapter || process.env.LOG_ADAPTER || 'pino',
    pretty: options.pretty ?? (process.env.NODE_ENV !== 'production'),
    silent: options.silent ?? (process.env.LOG_SILENT === 'true'),
    name: options.name || 'iudex',
    ...options
  };

  // Load adapter
  const Adapter = getAdapter(config.adapter);
  return new Adapter(config);
}

// Singleton logger instance for convenience
let defaultLogger;

/**
 * Get the default singleton logger instance
 * @returns {Logger}
 */
export function getLogger() {
  if (!defaultLogger) {
    defaultLogger = createLogger();
  }
  return defaultLogger;
}

/**
 * Reset the default logger (useful for testing)
 */
export function resetLogger() {
  defaultLogger = null;
}
