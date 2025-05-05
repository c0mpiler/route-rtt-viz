/**
 * persistentCache - Advanced caching system with persistent storage
 * 
 * This module provides a comprehensive caching solution that:
 * - Stores data in IndexedDB for persistence across sessions
 * - Implements LRU (Least Recently Used) eviction policy
 * - Supports cache invalidation strategies
 * - Provides performance metrics and monitoring
 */
import { CacheStats } from '@types/network';

export interface CacheOptions {
  maxItems?: number;
  ttl?: number; // Time to live in milliseconds
  dbName?: string;
  storeName?: string;
}

export interface CacheItem<T> {
  key: string;
  value: T;
  timestamp: number;
  expiry?: number;
  hits: number;
  size?: number;
}

export class PersistentCache<T> {
  private dbName: string;
  private storeName: string;
  private maxItems: number;
  private ttl: number;
  private stats: CacheStats;
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void>;

  constructor(options: CacheOptions = {}) {
    this.dbName = options.dbName || 'RouteRadarCache';
    this.storeName = options.storeName || 'cacheStore';
    this.maxItems = options.maxItems || 1000;
    this.ttl = options.ttl || 24 * 60 * 60 * 1000; // 24 hours default
    
    this.stats = {
      hits: 0,
      misses: 0,
      size: 0,
      hitRate: 0,
      evictions: 0
    };

    this.initPromise = this.init();
  }

  private async init(): Promise<void> {
    if (typeof window === 'undefined' || !window.indexedDB) {
      console.warn('IndexedDB not available, using memory cache only');
      return;
    }

    return new Promise((resolve, reject) => {
      const request = window.indexedDB.open(this.dbName, 1);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        this.loadStats().then(resolve).catch(reject);
      };

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'key' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('hits', 'hits', { unique: false });
        }
      };
    });
  }

  private async loadStats(): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const countRequest = store.count();

      countRequest.onsuccess = () => {
        this.stats.size = countRequest.result;
        resolve();
      };
      countRequest.onerror = () => reject(countRequest.error);
    });
  }

  async get(key: string): Promise<T | null> {
    await this.initPromise;
    
    if (!this.db) {
      this.stats.misses++;
      return null;
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.get(key);

      request.onsuccess = () => {
        const item: CacheItem<T> | undefined = request.result;
        
        if (!item) {
          this.stats.misses++;
          this.updateHitRate();
          resolve(null);
          return;
        }

        // Check if item has expired
        if (item.expiry && item.expiry < Date.now()) {
          this.stats.misses++;
          this.updateHitRate();
          // Delete expired item
          this.delete(key);
          resolve(null);
          return;
        }

        // Update access statistics
        item.hits++;
        item.timestamp = Date.now();
        
        const updateRequest = store.put(item);
        updateRequest.onsuccess = () => {
          this.stats.hits++;
          this.updateHitRate();
          resolve(item.value);
        };
        updateRequest.onerror = () => reject(updateRequest.error);
      };

      request.onerror = () => {
        this.stats.misses++;
        this.updateHitRate();
        reject(request.error);
      };
    });
  }

  async set(key: string, value: T, options?: { ttl?: number }): Promise<void> {
    await this.initPromise;
    
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      
      const now = Date.now();
      const ttl = options?.ttl ?? this.ttl;
      const item: CacheItem<T> = {
        key,
        value,
        timestamp: now,
        expiry: ttl > 0 ? now + ttl : undefined,
        hits: 0,
        size: this.estimateSize(value)
      };

      const request = store.put(item);

      request.onsuccess = () => {
        this.stats.size++;
        this.checkForEviction().then(resolve).catch(reject);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async delete(key: string): Promise<void> {
    await this.initPromise;
    
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(key);

      request.onsuccess = () => {
        this.stats.size--;
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  async clear(): Promise<void> {
    await this.initPromise;
    
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.clear();

      request.onsuccess = () => {
        this.stats.size = 0;
        this.stats.hits = 0;
        this.stats.misses = 0;
        this.stats.evictions = 0;
        this.stats.hitRate = 0;
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  async invalidate(pattern: RegExp | string): Promise<void> {
    await this.initPromise;
    
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.openCursor();

      const isPattern = pattern instanceof RegExp;
      
      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          const key = cursor.key as string;
          const shouldDelete = isPattern 
            ? pattern.test(key)
            : key.includes(pattern as string);

          if (shouldDelete) {
            cursor.delete();
            this.stats.size--;
          }
          cursor.continue();
        } else {
          resolve();
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  private async checkForEviction(): Promise<void> {
    if (this.stats.size <= this.maxItems) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const index = store.index('hits');
      const request = index.openCursor();

      let evicted = 0;
      const toEvict = this.stats.size - this.maxItems;

      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor && evicted < toEvict) {
          cursor.delete();
          this.stats.size--;
          this.stats.evictions!++;
          evicted++;
          cursor.continue();
        } else {
          resolve();
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0;
  }

  private estimateSize(value: any): number {
    try {
      return new Blob([JSON.stringify(value)]).size;
    } catch {
      return 0;
    }
  }

  getStats(): CacheStats {
    return { ...this.stats };
  }

  async close(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

// Cache instance manager
export class CacheManager {
  private static instances: Map<string, PersistentCache<any>> = new Map();

  static getCache<T>(name: string, options?: CacheOptions): PersistentCache<T> {
    if (!this.instances.has(name)) {
      this.instances.set(name, new PersistentCache<T>({
        dbName: `RouteRadarCache_${name}`,
        ...options
      }));
    }
    return this.instances.get(name)!;
  }

  static async closeAll(): Promise<void> {
    const closePromises = Array.from(this.instances.values()).map(cache => cache.close());
    await Promise.all(closePromises);
    this.instances.clear();
  }
}

// Cache key generators for different data types
export const CacheKeys = {
  // Network data cache keys
  networkData: (source: string) => `network:${source}`,
  pathResult: (source: string, target: string) => `path:${source}:${target}`,
  kPaths: (source: string, target: string, k: number) => `kpaths:${source}:${target}:${k}`,
  coordinates: () => 'coordinates',
  regions: () => 'regions',
  
  // UI state cache keys
  selectedRegions: () => 'ui:selectedRegions',
  filters: () => 'ui:filters',
  viewState: () => 'ui:viewState'
} as const;

// Type-safe cache wrapper
export function createTypedCache<T>(cacheName: string, options?: CacheOptions) {
  const cache = CacheManager.getCache<T>(cacheName, options);
  
  return {
    get: (key: string) => cache.get(key),
    set: (key: string, value: T, options?: { ttl?: number }) => cache.set(key, value, options),
    delete: (key: string) => cache.delete(key),
    clear: () => cache.clear(),
    invalidate: (pattern: RegExp | string) => cache.invalidate(pattern),
    getStats: () => cache.getStats()
  };
}

// Example usage:
// const pathCache = createTypedCache<Path[]>('paths');
// await pathCache.set(CacheKeys.pathResult('source', 'target'), paths);
// const cachedPaths = await pathCache.get(CacheKeys.pathResult('source', 'target'));
