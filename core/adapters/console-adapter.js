/**
 * Simple console adapter for environments where Pino isn't available
 * or for backward compatibility
 */
export class ConsoleAdapter {
  constructor(config) {
    this.config = config;
    this.name = config.name || 'iudex';
    this.levels = { debug: 0, info: 1, warn: 2, error: 3 };
    this.currentLevel = this.levels[config.level] ?? 1;
    this.silent = config.silent ?? false;
  }

  _shouldLog(level) {
    if (this.silent) return false;
    return this.levels[level] >= this.currentLevel;
  }

  _format(level, msg, args) {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}] ${this.name}:`;

    if (typeof msg === 'object') {
      console.log(prefix, msg, ...args);
    } else {
      console.log(prefix, msg, ...args);
    }
  }

  debug(msg, ...args) {
    if (this._shouldLog('debug')) {
      this._format('debug', msg, args);
    }
  }

  info(msg, ...args) {
    if (this._shouldLog('info')) {
      this._format('info', msg, args);
    }
  }

  warn(msg, ...args) {
    if (this._shouldLog('warn')) {
      this._format('warn', msg, args);
    }
  }

  error(msg, ...args) {
    if (this._shouldLog('error')) {
      this._format('error', msg, args);
    }
  }

  child(bindings) {
    const childName = `${this.name}:${bindings.module || bindings.name || 'child'}`;
    return new ConsoleAdapter({ ...this.config, name: childName });
  }
}
