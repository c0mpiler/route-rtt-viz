/**
 * Monitoring - Central monitoring and metrics collection
 * 
 * This module provides a comprehensive performance monitoring system that:
 * 1. Tracks custom application metrics
 * 2. Collects Web Vitals metrics
 * 3. Provides error tracking
 * 4. Supports metric aggregation and reporting
 */

import { hookLogger } from '../logger';
import { PerformanceMetric, PerformanceStats } from '../../types/network';

interface WebVitalMetric {
  name: string;
  value: number;
  delta: number;
  id: string;
}

interface ErrorEvent {
  message: string;
  source: string;
  timestamp: number;
  stack?: string;
}

/**
 * Application Performance Monitoring class
 */
export class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetric[]> = new Map();
  private webVitals: Map<string, WebVitalMetric[]> = new Map();
  private errors: ErrorEvent[] = [];
  private enabled: boolean = true;
  
  constructor() {
    // Enable only in development mode by default
    this.enabled = process.env.NODE_ENV !== 'production';
    
    // Set up global error handler
    this.setupErrorHandler();
  }
  
  /**
   * Sets up global error handler
   */
  private setupErrorHandler(): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('error', (event) => {
        this.trackError({
          message: event.message,
          source: event.filename || 'unknown',
          timestamp: Date.now(),
          stack: event.error?.stack
        });
      });
      
      window.addEventListener('unhandledrejection', (event) => {
        this.trackError({
          message: `Unhandled Promise Rejection: ${event.reason}`,
          source: 'promise',
          timestamp: Date.now(),
          stack: event.reason?.stack
        });
      });
    }
  }
  
  /**
   * Enable or disable monitoring
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }
  
  /**
   * Start timing a named operation
   * 
   * @param name Name of the operation to time
   */
  start(name: string): void {
    if (!this.enabled) return;
    
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    
    const metricsArray = this.metrics.get(name)!;
    
    metricsArray.push({
      name,
      startTime: performance.now()
    });
  }
  
  /**
   * End timing a named operation
   * 
   * @param name Name of the operation to end
   * @returns Duration in milliseconds or undefined if operation not found
   */
  end(name: string): number | undefined {
    if (!this.enabled) return;
    
    const metricsArray = this.metrics.get(name);
    if (!metricsArray || metricsArray.length === 0) {
      hookLogger.warn(`No performance metric started for: ${name}`);
      return;
    }
    
    const metric = metricsArray[metricsArray.length - 1];
    if (metric.endTime !== undefined) {
      hookLogger.warn(`Performance metric already ended for: ${name}`);
      return metric.duration;
    }
    
    metric.endTime = performance.now();
    metric.duration = metric.endTime - metric.startTime;
    
    // Log performance data in development mode
    if (process.env.NODE_ENV === 'development') {
      hookLogger.debug(`Performance: ${name} took ${metric.duration.toFixed(2)}ms`);
    }
    
    return metric.duration;
  }
  
  /**
   * Track a Web Vital metric
   * 
   * @param metric Web Vital metric object
   */
  trackWebVital(metric: WebVitalMetric): void {
    if (!this.enabled) return;
    
    if (!this.webVitals.has(metric.name)) {
      this.webVitals.set(metric.name, []);
    }
    
    this.webVitals.get(metric.name)!.push(metric);
    
    // Log web vitals in development mode
    if (process.env.NODE_ENV === 'development') {
      hookLogger.debug(`Web Vital: ${metric.name} = ${metric.value}`);
    }
  }
  
  /**
   * Track an error
   * 
   * @param error Error event object
   */
  trackError(error: ErrorEvent): void {
    // Always track errors, regardless of enabled state
    this.errors.push(error);
    
    // Log error in development mode
    if (process.env.NODE_ENV === 'development') {
      hookLogger.error(`Error: ${error.message}`, error);
    }
  }
  
  /**
   * Measure execution time of a function
   * 
   * @param name Name of the operation to measure
   * @param fn Function to execute
   * @returns Result of the function
   */
  async measure<T>(name: string, fn: () => Promise<T> | T): Promise<T> {
    this.start(name);
    
    try {
      const result = await fn();
      return result;
    } catch (error) {
      // Track error if something goes wrong
      this.trackError({
        message: `Error in ${name}: ${error instanceof Error ? error.message : String(error)}`,
        source: name,
        timestamp: Date.now(),
        stack: error instanceof Error ? error.stack : undefined
      });
      
      throw error; // Re-throw to maintain normal error flow
    } finally {
      this.end(name);
    }
  }
  
  /**
   * Get statistics for a specific metric
   * 
   * @param name Name of the metric
   * @returns Statistics or undefined if no metrics found
   */
  getStats(name: string): PerformanceStats | undefined {
    if (!this.enabled) return;
    
    const metricsArray = this.metrics.get(name);
    if (!metricsArray || metricsArray.length === 0) {
      return undefined;
    }
    
    // Filter completed metrics
    const completedMetrics = metricsArray.filter(m => m.duration !== undefined);
    
    if (completedMetrics.length === 0) {
      return undefined;
    }
    
    // Calculate statistics
    const durations = completedMetrics.map(m => m.duration!);
    const total = durations.reduce((sum, d) => sum + d, 0);
    
    return {
      count: completedMetrics.length,
      avg: total / completedMetrics.length,
      min: Math.min(...durations),
      max: Math.max(...durations),
      total
    };
  }
  
  /**
   * Get Web Vital statistics
   * 
   * @param name Name of the Web Vital
   * @returns Statistics or undefined if no metrics found
   */
  getWebVitalStats(name: string): PerformanceStats | undefined {
    if (!this.enabled) return;
    
    const vitals = this.webVitals.get(name);
    if (!vitals || vitals.length === 0) {
      return undefined;
    }
    
    // Calculate statistics
    const values = vitals.map(v => v.value);
    const total = values.reduce((sum, v) => sum + v, 0);
    
    return {
      count: vitals.length,
      avg: total / vitals.length,
      min: Math.min(...values),
      max: Math.max(...values),
      total
    };
  }
  
  /**
   * Get all performance statistics
   * 
   * @returns Object with statistics for all metrics
   */
  getAllStats(): Record<string, any> {
    if (!this.enabled) return {};
    
    const result: Record<string, any> = {
      metrics: {},
      webVitals: {},
      errors: {
        count: this.errors.length,
        last5: this.errors.slice(-5) // Only include the last 5 errors
      }
    };
    
    // Add custom metrics
    for (const name of this.metrics.keys()) {
      const stats = this.getStats(name);
      if (stats) {
        result.metrics[name] = stats;
      }
    }
    
    // Add web vitals
    for (const name of this.webVitals.keys()) {
      const stats = this.getWebVitalStats(name);
      if (stats) {
        result.webVitals[name] = stats;
      }
    }
    
    return result;
  }
  
  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics.clear();
    this.webVitals.clear();
    this.errors = [];
  }
  
  /**
   * Log all metrics to console (for debugging)
   */
  logStats(): void {
    if (!this.enabled) return;
    
    const stats = this.getAllStats();
    console.group('Performance Metrics');
    console.log('Custom Metrics:', stats.metrics);
    console.log('Web Vitals:', stats.webVitals);
    console.log('Errors:', stats.errors);
    console.groupEnd();
  }
}

// Export singleton instance
export const perfMonitor = new PerformanceMonitor();

/**
 * Tracks the execution time of a function
 * 
 * @param name - Name of the operation to track
 * @param fn - Function to execute
 * @returns Result of the function
 */
export function trackPerformance<T>(name: string, fn: () => T): T {
  // Start monitoring
  perfMonitor.start(name);
  
  try {
    // Execute function
    return fn();
  } finally {
    // End monitoring
    perfMonitor.end(name);
  }
}

/**
 * Creates a performance tracking hook for React components
 * 
 * @param componentName - Name of the component to track
 * @returns A function to call at the start of the component
 */
export function createPerformanceTracker(componentName: string) {
  return () => {
    perfMonitor.start(`component:${componentName}`);
    
    return () => {
      perfMonitor.end(`component:${componentName}`);
    };
  };
}

/**
 * React hook for tracking component render time
 * 
 * @param componentName - Name of the component to track
 */
export function usePerformanceTracking(componentName: string) {
  // Create tracker function
  const tracker = createPerformanceTracker(componentName);
  
  // Start tracking
  return tracker();
}

/**
 * Enables monitoring of Web Vitals
 */
export function monitorWebVitals(): void {
  if (typeof window !== 'undefined') {
    // Import web-vitals only in browser environment
    import('web-vitals').then(({ getCLS, getFID, getLCP, getFCP, getTTFB }) => {
      getCLS(metric => perfMonitor.trackWebVital({ ...metric, name: 'CLS' }));
      getFID(metric => perfMonitor.trackWebVital({ ...metric, name: 'FID' }));
      getLCP(metric => perfMonitor.trackWebVital({ ...metric, name: 'LCP' }));
      getFCP(metric => perfMonitor.trackWebVital({ ...metric, name: 'FCP' }));
      getTTFB(metric => perfMonitor.trackWebVital({ ...metric, name: 'TTFB' }));
    }).catch(error => {
      console.error('Failed to import web-vitals:', error);
    });
  }
}

/**
 * Get all performance metrics for logging or debugging
 * 
 * @returns Object with all performance stats
 */
export function getPerformanceStats(): Record<string, any> {
  return perfMonitor.getAllStats();
}

/**
 * Log all performance statistics to console
 */
export function logPerformanceStats(): void {
  perfMonitor.logStats();
}

/**
 * Reset all performance metrics
 */
export function clearPerformanceMetrics(): void {
  perfMonitor.clear();
}
