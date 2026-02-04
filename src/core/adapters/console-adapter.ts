/**
 * Simple console adapter for environments where Pino isn't available
 * or for backward compatibility
 */

import type { Logger, LogLevel } from '../../types/index.js';

/** Logger adapter configuration */
export interface LoggerAdapterConfig {
  name?: string;
  level?: LogLevel;
  silent?: boolean;
  pretty?: boolean;
  adapter?: string | (new (config: LoggerAdapterConfig) => Logger);
}

/** Log level numeric values */
const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
};

/**
 * Console-based logger adapter
 */
export class ConsoleAdapter implements Logger {
  private config: LoggerAdapterConfig;
  private name: string;
  private currentLevel: number;
  private silent: boolean;

  constructor(config: LoggerAdapterConfig) {
    this.config = config;
    this.name = config.name || 'iudex';
    this.currentLevel = LOG_LEVELS[config.level || 'info'] ?? 1;
    this.silent = config.silent ?? false;
  }

  private shouldLog(level: LogLevel): boolean {
    if (this.silent) return false;
    return LOG_LEVELS[level] >= this.currentLevel;
  }

  private format(level: LogLevel, msg: unknown, args: unknown[]): void {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}] ${this.name}:`;

    if (typeof msg === 'object') {
      console.log(prefix, msg, ...args);
    } else {
      console.log(prefix, msg, ...args);
    }
  }

  debug(msg: string, ...args: unknown[]): void {
    if (this.shouldLog('debug')) {
      this.format('debug', msg, args);
    }
  }

  info(msg: string, ...args: unknown[]): void {
    if (this.shouldLog('info')) {
      this.format('info', msg, args);
    }
  }

  warn(msg: string, ...args: unknown[]): void {
    if (this.shouldLog('warn')) {
      this.format('warn', msg, args);
    }
  }

  error(msg: string, ...args: unknown[]): void {
    if (this.shouldLog('error')) {
      this.format('error', msg, args);
    }
  }

  child(bindings: Record<string, unknown>): Logger {
    const childName = `${this.name}:${(bindings.module || bindings.name || 'child') as string}`;
    return new ConsoleAdapter({ ...this.config, name: childName });
  }
}
