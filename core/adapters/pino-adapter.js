import pino from 'pino';

export class PinoAdapter {
  constructor(config) {
    // If a logger instance is passed, use it (for child loggers)
    if (config.logger) {
      this.logger = config.logger;
      return;
    }

    const pinoConfig = {
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

  debug(msg, ...args) {
    if (typeof msg === 'object') {
      this.logger.debug(msg, args[0]);
    } else {
      this.logger.debug({ args: args.length > 0 ? args : undefined }, msg);
    }
  }

  info(msg, ...args) {
    if (typeof msg === 'object') {
      this.logger.info(msg, args[0]);
    } else {
      this.logger.info({ args: args.length > 0 ? args : undefined }, msg);
    }
  }

  warn(msg, ...args) {
    if (typeof msg === 'object') {
      this.logger.warn(msg, args[0]);
    } else {
      this.logger.warn({ args: args.length > 0 ? args : undefined }, msg);
    }
  }

  error(msg, ...args) {
    if (typeof msg === 'object') {
      this.logger.error(msg, args[0]);
    } else {
      this.logger.error({ args: args.length > 0 ? args : undefined }, msg);
    }
  }

  child(bindings) {
    const childLogger = this.logger.child(bindings);
    return new PinoAdapter({ logger: childLogger });
  }
}
