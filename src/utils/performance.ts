/**
 * Performance - Enhanced utilities for performance monitoring
 * 
 * This module provides comprehensive utilities for monitoring and tracking 
 * performance of operations in the application with detailed metrics.
 */
import React from 'react';
import { hookLogger } from './logger';
import { PerformanceMetric, PerformanceStats } from '../types/network';

/**
 * Performance Monitor class for tracking metrics
 */
class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetric[]> = new Map();
  private enabled: boolean = process.env.NODE_ENV !== 'production';
  
  /**
   * Start timing a named operation
   * 
   * @param name Name of the operation to time
   * @throws Error if the operation is already being timed
   */
  start(name: string): void {
    if (!this.enabled) return;
    
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    
    const metricsArray = this.metrics.get(name)!;
    
    // Check if the last metric is still running
    const lastMetric = metricsArray.length > 0 ? metricsArray[metricsArray.length - 1] : null;
    if (lastMetric && lastMetric.endTime === undefined) {
      // Log a warning but don't throw an error to improve resilience
      hookLogger.warn(`Performance metric already started for: ${name}, starting a new one instead`);
    }
    
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
    
    // Find the last unended metric
    let metricIndex = metricsArray.length - 1;
    while (metricIndex >= 0 && metricsArray[metricIndex].endTime !== undefined) {
      metricIndex--;
    }
    
    // If we couldn't find an unended metric, warn and return
    if (metricIndex < 0) {
      hookLogger.warn(`No unended performance metric found for: ${name}`);
      return;
    }
    
    const metric = metricsArray[metricIndex];
    metric.endTime = performance.now();
    metric.duration = metric.endTime - metric.startTime;
    
    hookLogger.debug(`Performance: ${name} took ${metric.duration.toFixed(2)}ms`);
    
    return metric.duration;
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
   * Get all performance statistics
   * 
   * @returns Object with statistics for all metrics
   */
  getAllStats(): Record<string, PerformanceStats> {
    if (!this.enabled) return {};
    
    const result: Record<string, PerformanceStats> = {};
    
    for (const name of this.metrics.keys()) {
      const stats = this.getStats(name);
      if (stats) {
        result[name] = stats;
      }
    }
    
    return result;
  }
  
  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics.clear();
  }
}

// Export singleton instance
export const perfMonitor = new PerformanceMonitor();

/**
 * Tracks the execution time of a function (works with both async and sync functions)
 * 
 * This version is more resilient to errors in performance tracking
 * 
 * @param name - Name of the operation to track
 * @param fn - Function to execute (sync or async)
 * @returns Result of the function (may be a Promise if fn is async)
 */
export function trackPerformance<T>(name: string, fn: () => T | Promise<T>): T | Promise<T> {
  let uniqueTrackingId = `${name}:${Date.now().toString(36)}:${Math.random().toString(36).substring(2, 7)}`;
  let tracking = false;
  
  try {
    // Start monitoring
    perfMonitor.start(uniqueTrackingId);
    tracking = true;
    
    // Execute function
    const result = fn();
    
    // Check if the result is a Promise
    if (result instanceof Promise) {
      // Handle async function by adding finally handler to the Promise
      return result.finally(() => {
        // End monitoring when the Promise resolves or rejects
        if (tracking) {
          try {
            perfMonitor.end(uniqueTrackingId);
            tracking = false;
          } catch (err) {
            // Silently handle errors in performance tracking
            hookLogger.debug(`Error ending performance tracking for ${name}:`, err);
          }
        }
      });
    }
    
    // Handle synchronous function by ending monitoring and returning the result
    if (tracking) {
      try {
        perfMonitor.end(uniqueTrackingId);
        tracking = false;
      } catch (err) {
        // Silently handle errors in performance tracking
        hookLogger.debug(`Error ending performance tracking for ${name}:`, err);
      }
    }
    
    return result;
  } catch (error) {
    // End monitoring if an error occurs and re-throw
    if (tracking) {
      try {
        perfMonitor.end(uniqueTrackingId);
        tracking = false;
      } catch (err) {
        // Silently handle errors in performance tracking
        hookLogger.debug(`Error ending performance tracking for ${name} during error handling:`, err);
      }
    }
    throw error;
  }
}

/**
 * Creates a performance tracking hook for React components
 * @deprecated Use usePerformanceTracking directly instead
 * 
 * @param componentName - Name of the component to track
 * @returns A function to call at the start of the component
 */
export function createPerformanceTracker(componentName: string) {
  hookLogger.warn(`createPerformanceTracker is deprecated, use usePerformanceTracking directly`);
  
  return () => {
    // Generate a unique ID for this component instance
    const trackingId = `component:${componentName}:legacy:${Math.random().toString(36).substring(2, 9)}`;
    
    try {
      perfMonitor.start(trackingId);
    } catch (err) {
      hookLogger.debug(`Error starting performance tracking for ${componentName}:`, err);
    }
    
    return () => {
      try {
        perfMonitor.end(trackingId);
      } catch (err) {
        hookLogger.debug(`Error ending performance tracking for ${componentName}:`, err);
      }
    };
  };
}

/**
 * React hook for tracking component render time
 * 
 * This improved version accounts for React's StrictMode double renders
 * and prevents "already started" errors
 * 
 * @param componentName - Name of the component to track
 */
export function usePerformanceTracking(componentName: string) {
  // Use a memoized component ID to ensure we don't double-track during React StrictMode
  const componentTrackingId = React.useRef(`component:${componentName}:${Math.random().toString(36).substring(2, 9)}`);
  const isTracking = React.useRef(false);
  
  // Start tracking on mount
  React.useEffect(() => {
    // Only start tracking if not already tracking
    if (!isTracking.current) {
      try {
        // Start tracking
        perfMonitor.start(componentTrackingId.current);
        isTracking.current = true;
        
        // Clean up on unmount
        return () => {
          if (isTracking.current) {
            try {
              perfMonitor.end(componentTrackingId.current);
              isTracking.current = false;
            } catch (err) {
              // Ignore cleanup errors
              hookLogger.debug(`Error cleaning up performance tracking for ${componentName}:`, err);
            }
          }
        };
      } catch (err) {
        // Handle errors gracefully
        hookLogger.debug(`Error starting performance tracking for ${componentName}:`, err);
      }
    }
  }, [componentName]);
  
  // Also track render counts for debugging purposes
  React.useEffect(() => {
    hookLogger.debug(`Component ${componentName} rendered`);
  });
}

/**
 * Get all performance metrics for logging or debugging
 * 
 * @returns Object with all performance stats
 */
export function getPerformanceStats(): Record<string, PerformanceStats> {
  return perfMonitor.getAllStats();
}

/**
 * Reset all performance metrics
 */
export function clearPerformanceMetrics(): void {
  perfMonitor.clear();
}
