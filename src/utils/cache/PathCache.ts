/**
 * PathCache - Enhanced LRU cache implementation for path calculations
 * 
 * This module provides a specialized caching system for storing 
 * and retrieving calculated paths with:
 * - LRU (Least Recently Used) eviction policy
 * - Time-based expiration
 * - Statistics tracking
 * - Configurable size limits
 */
import { CacheStats } from '../../types/network';

interface CacheEntry<T> {
  value: T | null;
  timestamp: number;
  lastAccessed: number;
  accessCount: number;
}

/**
 * Generic cache implementation with LRU eviction and statistics
 * 
 * @template T The type of items stored in the cache
 */
export class PathCache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private hits = 0;
  private misses = 0;
  private evictions = 0;
  
  private maxSize: number;
  private ttl: number; // Time to live in milliseconds
  
  /**
   * Create a new PathCache instance
   * 
   * @param maxSize Maximum number of items to store in the cache (default: 100)
   * @param ttl Time to live in milliseconds (default: 5 minutes)
   */
  constructor(maxSize: number = 100, ttl: number = 5 * 60 * 1000) {
    this.maxSize = maxSize;
    this.ttl = ttl;
  }

  /**
   * Get an item from the cache with LRU tracking
   * 
   * @param key - The cache key
   * @returns The cached item, null, or undefined if not found
   */
  get(key: string): T | null | undefined {
    const entry = this.cache.get(key);
    
    if (entry === undefined) {
      this.misses++;
      return undefined;
    }
    
    // Check if entry has expired
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      this.misses++;
      return undefined;
    }
    
    // Update access statistics for LRU
    entry.lastAccessed = Date.now();
    entry.accessCount++;
    this.hits++;
    
    return entry.value;
  }

  /**
   * Store an item in the cache with LRU management
   * 
   * @param key - The cache key
   * @param value - The value to store (can be null)
   */
  set(key: string, value: T | null): void {
    // If we're at capacity and this is a new key, evict the LRU item
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evictLRU();
    }
    
    // Add or update the entry
    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      lastAccessed: Date.now(),
      accessCount: 0
    });
  }

  /**
   * Check if a key exists in the cache and is not expired
   * 
   * @param key - The cache key
   * @returns True if the key exists and is not expired, false otherwise
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    
    if (entry === undefined) {
      return false;
    }
    
    // Check if entry has expired
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }

  /**
   * Remove an item from the cache
   * 
   * @param key - The cache key
   * @returns True if an item was removed, false otherwise
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all items from the cache and reset statistics
   */
  clear(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
    this.evictions = 0;
  }
  
  /**
   * Evict the least recently used item from the cache
   */
  private evictLRU(): void {
    if (this.cache.size === 0) return;
    
    let lruKey: string | null = null;
    let oldestAccess = Number.MAX_SAFE_INTEGER;
    
    // Find the least recently used item
    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < oldestAccess) {
        oldestAccess = entry.lastAccessed;
        lruKey = key;
      }
    }
    
    // Remove the LRU item
    if (lruKey) {
      this.cache.delete(lruKey);
      this.evictions++;
    }
  }
  
  /**
   * Clean expired entries from the cache
   * 
   * @returns Number of expired entries removed
   */
  cleanExpired(): number {
    const now = Date.now();
    let count = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.ttl) {
        this.cache.delete(key);
        count++;
      }
    }
    
    return count;
  }

  /**
   * Get cache statistics
   * 
   * @returns Object with cache statistics
   */
  getStats(): CacheStats {
    const total = this.hits + this.misses;
    
    return {
      hits: this.hits,
      misses: this.misses,
      size: this.cache.size,
      hitRate: total > 0 ? Math.round((this.hits / total) * 100) : 0,
      evictions: this.evictions
    };
  }
  
  /**
   * Get the current size of the cache
   * 
   * @returns Number of items in the cache
   */
  get size(): number {
    return this.cache.size;
  }
  
  /**
   * Set the maximum size of the cache
   * If the new size is smaller than the current size, LRU items will be evicted
   * 
   * @param newSize New maximum size
   */
  setMaxSize(newSize: number): void {
    if (newSize <= 0) return;
    
    this.maxSize = newSize;
    
    // Evict items if the cache is now too large
    while (this.cache.size > this.maxSize) {
      this.evictLRU();
    }
  }
  
  /**
   * Set the time to live for cache entries
   * 
   * @param newTtl New time to live in milliseconds
   * @param cleanNow Whether to clean expired entries immediately
   */
  setTtl(newTtl: number, cleanNow: boolean = true): void {
    if (newTtl <= 0) return;
    
    this.ttl = newTtl;
    
    // Clean expired entries if requested
    if (cleanNow) {
      this.cleanExpired();
    }
  }
}
