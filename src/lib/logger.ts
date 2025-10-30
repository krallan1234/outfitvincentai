type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  meta?: Record<string, any>;
}

class Logger {
  private isDevelopment = import.meta.env.DEV;

  private formatMessage(level: LogLevel, message: string, meta?: Record<string, any>): LogEntry {
    return {
      level,
      message,
      timestamp: new Date().toISOString(),
      ...(meta && { meta })
    };
  }

  private log(entry: LogEntry): void {
    if (!this.isDevelopment) return;

    const { level, message, timestamp, meta } = entry;
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;

    switch (level) {
      case 'error':
        // eslint-disable-next-line no-console
        console.error(prefix, message, meta || '');
        break;
      case 'warn':
        // eslint-disable-next-line no-console
        console.warn(prefix, message, meta || '');
        break;
      case 'debug':
        // eslint-disable-next-line no-console
        console.debug(prefix, message, meta || '');
        break;
      default:
        // eslint-disable-next-line no-console
        console.log(prefix, message, meta || '');
    }
  }

  info(message: string, meta?: Record<string, any>): void {
    this.log(this.formatMessage('info', message, meta));
  }

  warn(message: string, meta?: Record<string, any>): void {
    this.log(this.formatMessage('warn', message, meta));
  }

  error(message: string, error?: Error | unknown, meta?: Record<string, any>): void {
    const errorMeta = error instanceof Error 
      ? { ...meta, error: error.message, stack: error.stack }
      : meta;
    this.log(this.formatMessage('error', message, errorMeta));
  }

  debug(message: string, meta?: Record<string, any>): void {
    this.log(this.formatMessage('debug', message, meta));
  }
}

export const logger = new Logger();
