/**
 * Logger factory and singleton management
 */

import { PinoAdapter, ConsoleAdapter, type LoggerAdapterConfig } from './adapters/index.js';
import type { Logger, LogLevel } from '../types/index.js';

/** Logger adapter constructor type */
type LoggerAdapterConstructor = new (config: LoggerAdapterConfig) => Logger;

/** Extended logger options */
export interface LoggerOptions {
  /** Log level (debug|info|warn|error) */
  level?: LogLevel;
  /** Adapter name (pino|console) or custom adapter class */
  adapter?: string | LoggerAdapterConstructor;
  /** Use pretty formatting (default: dev mode) */
  pretty?: boolean;
  /** Disable all logging (default: false) */
  silent?: boolean;
  /** Logger name/context */
  name?: string;
}

/**
 * Get the adapter class for the given adapter name
 * @param adapterName - Adapter name or custom adapter class
 * @returns Adapter class constructor
 */
function getAdapter(adapterName: string | LoggerAdapterConstructor): LoggerAdapterConstructor {
  if (typeof adapterName === 'function') {
    return adapterName;
  }

  switch (adapterName) {
    case 'pino':
      return PinoAdapter;
    case 'console':
      return ConsoleAdapter;
    default:
      throw new Error(`Unknown logger adapter: ${adapterName}`);
  }
}

/**
 * Create a logger instance
 * @param options - Logger configuration
 * @returns Logger instance
 */
export function createLogger(options: LoggerOptions = {}): Logger {
  const config: LoggerAdapterConfig = {
    level: options.level || (process.env.LOG_LEVEL as LogLevel) || (process.env.NODE_ENV === 'test' ? 'warn' : 'info'),
    adapter: options.adapter || process.env.LOG_ADAPTER || 'pino',
    pretty: options.pretty ?? (process.env.NODE_ENV !== 'production'),
    silent: options.silent ?? (process.env.LOG_SILENT === 'true'),
    name: options.name || 'iudex',
    ...options
  };

  // Load adapter
  const Adapter = getAdapter(config.adapter as string | LoggerAdapterConstructor);
  return new Adapter(config);
}

// Singleton logger instance for convenience
let defaultLogger: Logger | null = null;

/**
 * Get the default singleton logger instance
 * @returns Logger instance
 */
export function getLogger(): Logger {
  if (!defaultLogger) {
    defaultLogger = createLogger();
  }
  return defaultLogger;
}

/**
 * Reset the default logger (useful for testing)
 */
export function resetLogger(): void {
  defaultLogger = null;
}

export type { Logger, LogLevel };
