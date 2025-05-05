/**
 * Cache Strategies - Advanced cache invalidation and management strategies
 * 
 * This module provides sophisticated cache invalidation strategies and
 * management patterns for Route Radar's caching system.
 */
import { PersistentCache, CacheKeys } from './persistentCache';
import { NetworkData, Path } from '@types/network';

export type CacheStrategy = 
  | 'write-through'
  | 'write-back'
  | 'write-around'
  | 'cache-aside';

export interface CacheStrategyOptions {
  strategy?: CacheStrategy;
  timeout?: number;
  maxRetries?: number;
  onError?: (error: Error) => void;
}

/**
 * Cache Strategy Manager
 * Implements various caching patterns for optimal performance
 */
export class CacheStrategyManager {
  private cache: PersistentCache<any>;
  private strategy: CacheStrategy;
  private writeBuffer: Map<string, { value: any; timestamp: number }>;
  private writeBufferTimeout: number;

  constructor(
    cache: PersistentCache<any>,
    options: CacheStrategyOptions = {}
  ) {
    this.cache = cache;
    this.strategy = options.strategy || 'cache-aside';
    this.writeBuffer = new Map();
    this.writeBufferTimeout = options.timeout || 5000;
  }

  /**
   * Write data with the configured strategy
   */
  async write(key: string, value: any, options?: { ttl?: number }): Promise<void> {
    switch (this.strategy) {
      case 'write-through':
        await this.writeThrough(key, value, options);
        break;
      case 'write-back':
        await this.writeBack(key, value, options);
        break;
      case 'write-around':
        // Skip cache, write directly to source if needed
        break;
      case 'cache-aside':
        await this.cache.set(key, value, options);
        break;
    }
  }

  /**
   * Read data with the configured strategy
   */
  async read(key: string): Promise<any | null> {
    switch (this.strategy) {
      case 'write-through':
      case 'write-back':
      case 'cache-aside':
        const value = await this.cache.get(key);
        if (value === null && this.writeBuffer.has(key)) {
          return this.writeBuffer.get(key)?.value || null;
        }
        return value;
      case 'write-around':
        // Try to read from cache, but data might be stale
        return await this.cache.get(key);
    }
  }

  /**
   * Write-through: Write to cache and data source simultaneously
   */
  private async writeThrough(key: string, value: any, options?: { ttl?: number }): Promise<void> {
    // Simulate writing to data source (in real app, this would be an API call)
    await this.cache.set(key, value, options);
    // In practice: await this.dataSource.write(key, value);
  }

  /**
   * Write-back: Write to cache immediately, sync with data source later
   */
  private async writeBack(key: string, value: any, options?: { ttl?: number }): Promise<void> {
    await this.cache.set(key, value, options);
    this.writeBuffer.set(key, { value, timestamp: Date.now() });
    this.scheduleSync();
  }

  /**
   * Schedule sync for write-back strategy
   */
  private scheduleSync(): void {
    if (this.writeBuffer.size === 0) return;

    // Debounced sync to avoid too frequent updates
    setTimeout(() => {
      this.syncWriteBuffer();
    }, this.writeBufferTimeout);
  }

  /**
   * Sync write buffer with data source
   */
  private async syncWriteBuffer(): Promise<void> {
    const bufferCopy = new Map(this.writeBuffer);
    this.writeBuffer.clear();

    for (const [key, { value }] of bufferCopy) {
      try {
        // In practice: await this.dataSource.write(key, value);
        console.log(`Synced ${key} to data source`);
      } catch (error) {
        console.error(`Failed to sync ${key}:`, error);
        // Optionally, add back to buffer for retry
      }
    }
  }

  /**
   * Get current strategy
   */
  getStrategy(): CacheStrategy {
    return this.strategy;
  }

  /**
   * Change strategy dynamically
   */
  setStrategy(strategy: CacheStrategy): void {
    this.strategy = strategy;
  }
}

/**
 * Cache Invalidation Strategies
 */
export class CacheInvalidator {
  private cache: PersistentCache<any>;

  constructor(cache: PersistentCache<any>) {
    this.cache = cache;
  }

  /**
   * Time-based invalidation
   */
  async invalidateByTime(maxAge: number): Promise<void> {
    // This would require storing timestamps with cache entries
    // For simplicity, we'll clear the entire cache
    if (Date.now() - maxAge > 0) {
      await this.cache.clear();
    }
  }

  /**
   * Pattern-based invalidation
   */
  async invalidateByPattern(pattern: string | RegExp): Promise<void> {
    await this.cache.invalidate(pattern);
  }

  /**
   * Cascade invalidation for related data
   */
  async invalidateCascade(region: string): Promise<void> {
    // Invalidate all paths containing this region
    await this.cache.invalidate(new RegExp(`path:.*${region}.*:.*`));
    await this.cache.invalidate(new RegExp(`path:.*:.*${region}.*`));
    
    // Invalidate any network data involving this region
    await this.cache.invalidate(new RegExp(`network:.*${region}.*`));
  }

  /**
   * Dependency-aware invalidation
   */
  async invalidateByDependency(dependency: string): Promise<void> {
    const dependentKeys = await this.findDependentKeys(dependency);
    
    for (const key of dependentKeys) {
      await this.cache.delete(key);
    }
  }

  /**
   * Find keys that depend on a specific dependency
   */
  private async findDependentKeys(dependency: string): Promise<string[]> {
    // In practice, this would maintain a dependency graph
    // For now, we'll use simple pattern matching
    const keys: string[] = [];
    
    // Example: Find all paths that depend on network data
    if (dependency.startsWith('network:')) {
      keys.push(`path:*:*`);
      keys.push(`kpaths:*:*:*`);
    }
    
    return keys;
  }
}

/**
 * Cache Preloader
 * Preloads frequently accessed data
 */
export class CachePreloader {
  private cache: PersistentCache<any>;
  private loadFunctions: Map<string, () => Promise<any>>;

  constructor(cache: PersistentCache<any>) {
    this.cache = cache;
    this.loadFunctions = new Map();
  }

  /**
   * Register a preload function for a specific cache key pattern
   */
  register(pattern: string, loadFn: () => Promise<any>): void {
    this.loadFunctions.set(pattern, loadFn);
  }

  /**
   * Preload data for specific keys
   */
  async preload(keys: string[]): Promise<void> {
    const promises = keys.map(async (key) => {
      const loadFn = this.findLoadFunction(key);
      if (loadFn) {
        try {
          const data = await loadFn();
          await this.cache.set(key, data);
        } catch (error) {
          console.error(`Failed to preload ${key}:`, error);
        }
      }
    });

    await Promise.all(promises);
  }

  /**
   * Find the appropriate load function for a key
   */
  private findLoadFunction(key: string): (() => Promise<any>) | undefined {
    for (const [pattern, loadFn] of this.loadFunctions.entries()) {
      if (new RegExp(pattern).test(key)) {
        return loadFn;
      }
    }
    return undefined;
  }
}

/**
 * Cache Performance Monitor
 * Tracks cache performance metrics and provides recommendations
 */
export class CachePerformanceMonitor {
  private cache: PersistentCache<any>;
  private metrics: {
    accessPatterns: Map<string, number>;
    latencies: Map<string, number[]>;
    errorRates: Map<string, number>;
  };

  constructor(cache: PersistentCache<any>) {
    this.cache = cache;
    this.metrics = {
      accessPatterns: new Map(),
      latencies: new Map(),
      errorRates: new Map()
    };
  }

  /**
   * Track cache access
   */
  async trackAccess(key: string): Promise<void> {
    const count = this.metrics.accessPatterns.get(key) || 0;
    this.metrics.accessPatterns.set(key, count + 1);
  }

  /**
   * Track cache latency
   */
  async trackLatency(key: string, latency: number): Promise<void> {
    const latencies = this.metrics.latencies.get(key) || [];
    latencies.push(latency);
    this.metrics.latencies.set(key, latencies);
  }

  /**
   * Track cache errors
   */
  trackError(key: string): void {
    const errors = this.metrics.errorRates.get(key) || 0;
    this.metrics.errorRates.set(key, errors + 1);
  }

  /**
   * Get performance recommendations
   */
  getRecommendations(): string[] {
    const recommendations: string[] = [];
    
    // Analyze access patterns
    const mostAccessed = Array.from(this.metrics.accessPatterns.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([key]) => key);

    recommendations.push(`Most accessed keys: ${mostAccessed.join(', ')}`);
    
    // Analyze latencies
    this.metrics.latencies.forEach((latencies, key) => {
      const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
      if (avgLatency > 100) { // ms
        recommendations.push(`Consider preloading or optimizing ${key} (avg latency: ${avgLatency.toFixed(2)}ms)`);
      }
    });

    // Analyze error rates
    this.metrics.errorRates.forEach((errors, key) => {
      const total = this.metrics.accessPatterns.get(key) || 1;
      const errorRate = (errors / total) * 100;
      if (errorRate > 5) { // 5% error rate threshold
        recommendations.push(`High error rate for ${key}: ${errorRate.toFixed(1)}%`);
      }
    });

    return recommendations;
  }

  /**
   * Get current metrics
   */
  getMetrics() {
    return {
      accessPatterns: Object.fromEntries(this.metrics.accessPatterns),
      latencies: Object.fromEntries(
        Array.from(this.metrics.latencies.entries()).map(([key, values]) => [
          key,
          {
            avg: values.reduce((a, b) => a + b, 0) / values.length,
            min: Math.min(...values),
            max: Math.max(...values),
            count: values.length
          }
        ])
      ),
      errorRates: Object.fromEntries(this.metrics.errorRates)
    };
  }
}

/**
 * Cache Warmer
 * Proactively warms up the cache with anticipated data
 */
export class CacheWarmer {
  private cache: PersistentCache<any>;
  private preloader: CachePreloader;

  constructor(cache: PersistentCache<any>) {
    this.cache = cache;
    this.preloader = new CachePreloader(cache);
  }

  /**
   * Warm up cache for a specific route analysis
   */
  async warmForRoute(source: string, target: string): Promise<void> {
    const keys = [
      CacheKeys.networkData('*'),
      CacheKeys.pathResult(source, target),
      CacheKeys.kPaths(source, target, 5),
      CacheKeys.coordinates(),
      CacheKeys.regions()
    ];

    await this.preloader.preload(keys);
  }

  /**
   * Warm up cache for network visualization
   */
  async warmForVisualization(): Promise<void> {
    const keys = [
      CacheKeys.coordinates(),
      CacheKeys.regions(),
      'continent-regions',
      'hub-regions'
    ];

    await this.preloader.preload(keys);
  }

  /**
   * Warm up cache based on user history
   */
  async warmByHistory(recentPairs: Array<{ source: string; target: string }>): Promise<void> {
    const keys = recentPairs.map(pair => CacheKeys.pathResult(pair.source, pair.target));
    await this.preloader.preload(keys);
  }
}

// Usage example:
// const cache = CacheManager.getCache('main');
// const strategyManager = new CacheStrategyManager(cache, { strategy: 'write-back' });
// const invalidator = new CacheInvalidator(cache);
// const preloader = new CachePreloader(cache);
// const monitor = new CachePerformanceMonitor(cache);
// const warmer = new CacheWarmer(cache);
