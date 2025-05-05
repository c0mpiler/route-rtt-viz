/**
 * Logger - A configurable logging utility for consistent logging
 * 
 * This utility provides a standardized way to log messages across the application,
 * with support for different log levels and component-specific prefixes.
 * It can be easily disabled in production environments.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LoggerOptions {
  enabled: boolean;
  minLevel: LogLevel;
  component?: string;
}

/**
 * Log level priority mapping (lower = less severe)
 */
const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
};

/**
 * A configurable logger utility for consistent logging across the application
 */
export class Logger {
  private options: LoggerOptions;
  
  /**
   * Creates a new logger instance
   * 
   * @param options - Logger configuration options
   */
  constructor(options: Partial<LoggerOptions> = {}) {
    this.options = {
      enabled: process.env.NODE_ENV === 'development',
      minLevel: 'info',
      component: undefined,
      ...options
    };
  }
  
  /**
   * Determines if a message with the given level should be logged
   * 
   * @param level - The log level to check
   * @returns Whether the message should be logged
   */
  private shouldLog(level: LogLevel): boolean {
    if (!this.options.enabled) return false;
    return LOG_LEVELS[level] >= LOG_LEVELS[this.options.minLevel];
  }
  
  /**
   * Formats a log message with appropriate prefixes
   * 
   * @param level - The log level
   * @param message - The message to format
   * @returns The formatted message
   */
  private formatMessage(level: LogLevel, message: string): string {
    const prefix = this.options.component ? `[${this.options.component}]` : '';
    return `${prefix} ${message}`;
  }
  
  /**
   * Logs a debug message
   * 
   * @param message - The message to log
   * @param args - Additional arguments to log
   */
  debug(message: string, ...args: any[]): void {
    if (this.shouldLog('debug')) {
      console.debug(this.formatMessage('debug', message), ...args);
    }
  }
  
  /**
   * Logs an info message
   * 
   * @param message - The message to log
   * @param args - Additional arguments to log
   */
  info(message: string, ...args: any[]): void {
    if (this.shouldLog('info')) {
      console.info(this.formatMessage('info', message), ...args);
    }
  }
  
  /**
   * Logs a warning message
   * 
   * @param message - The message to log
   * @param args - Additional arguments to log
   */
  warn(message: string, ...args: any[]): void {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage('warn', message), ...args);
    }
  }
  
  /**
   * Logs an error message
   * 
   * @param message - The message to log
   * @param args - Additional arguments to log
   */
  error(message: string, ...args: any[]): void {
    if (this.shouldLog('error')) {
      console.error(this.formatMessage('error', message), ...args);
    }
  }
  
  /**
   * Creates a child logger with a specific component prefix
   * 
   * @param component - The component name to use as prefix
   * @returns A new logger instance with the specified component
   */
  child(component: string): Logger {
    return new Logger({
      ...this.options,
      component
    });
  }
}

// Create preconfigured loggers for common components
export const networkLogger = new Logger({ component: 'NetworkGraph', minLevel: 'info' });
export const hookLogger = new Logger({ component: 'Hooks', minLevel: 'info' });
export const appLogger = new Logger({ component: 'App', minLevel: 'info' });
export const visualizerLogger = new Logger({ component: 'Visualizer', minLevel: 'info' });

// Create a default logger for general use
export const logger = new Logger({ component: 'General', minLevel: 'info' });

/**
 * Performance tracking utility for development
 * 
 * @param operation - The name of the operation to track
 * @param fn - The function to execute and track
 * @returns The result of the function
 */
export function trackPerformance<T>(operation: string, fn: () => T): T {
  // Only track performance in development mode
  if (process.env.NODE_ENV !== 'development') {
    return fn();
  }
  
  const logger = new Logger({ component: 'Performance' });
  const start = performance.now();
  const result = fn();
  const end = performance.now();
  
  logger.debug(`${operation} took ${(end - start).toFixed(2)}ms`);
  
  return result;
}
