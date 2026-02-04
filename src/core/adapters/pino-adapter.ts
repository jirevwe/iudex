/**
 * Pino logger adapter for production-grade logging
 */

import pino, { type Logger as PinoLogger } from 'pino';
import type { Logger } from '../../types/index.js';
import type { LoggerAdapterConfig } from './console-adapter.js';

/** Extended config for Pino adapter with internal logger */
interface PinoAdapterConfig extends LoggerAdapterConfig {
  logger?: PinoLogger;
}

/**
 * Pino-based logger adapter
 */
export class PinoAdapter implements Logger {
  private logger: PinoLogger;

  constructor(config: PinoAdapterConfig) {
    // If a logger instance is passed, use it (for child loggers)
    if (config.logger) {
      this.logger = config.logger;
      return;
    }

    const pinoConfig: pino.LoggerOptions = {
      name: config.name || 'iudex',
      level: config.level || 'info',
    };

    // Silence logging entirely if silent is true
    if (config.silent) {
      pinoConfig.level = 'silent';
    }

    // Use pino-pretty in development
    if (config.pretty && !config.silent) {
      pinoConfig.transport = {
        target: 'pino-pretty',
        options: {
          colorize: true,
          ignore: 'pid,hostname',
          translateTime: 'SYS:HH:MM:ss',
        }
      };
    }

    this.logger = pino(pinoConfig);
  }

  debug(msg: string, ...args: unknown[]): void {
    if (typeof msg === 'object') {
      this.logger.debug(msg as object, args[0] as string);
    } else {
      this.logger.debug({ args: args.length > 0 ? args : undefined }, msg);
    }
  }

  info(msg: string, ...args: unknown[]): void {
    if (typeof msg === 'object') {
      this.logger.info(msg as object, args[0] as string);
    } else {
      this.logger.info({ args: args.length > 0 ? args : undefined }, msg);
    }
  }

  warn(msg: string, ...args: unknown[]): void {
    if (typeof msg === 'object') {
      this.logger.warn(msg as object, args[0] as string);
    } else {
      this.logger.warn({ args: args.length > 0 ? args : undefined }, msg);
    }
  }

  error(msg: string, ...args: unknown[]): void {
    if (typeof msg === 'object') {
      this.logger.error(msg as object, args[0] as string);
    } else {
      this.logger.error({ args: args.length > 0 ? args : undefined }, msg);
    }
  }

  child(bindings: Record<string, unknown>): Logger {
    const childLogger = this.logger.child(bindings);
    return new PinoAdapter({ logger: childLogger });
  }
}
