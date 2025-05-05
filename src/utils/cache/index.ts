/**
 * Cache Module - Exports for persistent caching system
 */
export { 
  PersistentCache, 
  CacheManager, 
  CacheKeys, 
  createTypedCache 
} from './persistentCache';

export type { 
  CacheOptions, 
  CacheItem 
} from './persistentCache';

export {
  CacheStrategyManager,
  CacheInvalidator,
  CachePreloader,
  CachePerformanceMonitor,
  CacheWarmer
} from './strategies';

export type { 
  CacheStrategy, 
  CacheStrategyOptions 
} from './strategies';

// Re-export cache stats from network types
export type { CacheStats } from '@types/network';

// These will be initialized in getCacheInstances() when first used
let _mainCache: ReturnType<typeof CacheManager.getCache> | null = null;
let _pathCache: ReturnType<typeof createTypedCache> | null = null;
let _networkDataCache: ReturnType<typeof createTypedCache> | null = null;
let _cacheStrategy: CacheStrategyManager | null = null;
let _cacheInvalidator: CacheInvalidator | null = null;
let _cachePreloader: CachePreloader | null = null;
let _cacheMonitor: CachePerformanceMonitor | null = null;
let _cacheWarmer: CacheWarmer | null = null;

// Initialize cache instances lazily
function getCacheInstances() {
  if (!_mainCache) {
    const { CacheManager, createTypedCache } = require('./persistentCache');
    const { 
      CacheStrategyManager, 
      CacheInvalidator, 
      CachePreloader, 
      CachePerformanceMonitor, 
      CacheWarmer 
    } = require('./strategies');
    
    _mainCache = CacheManager.getCache('main', {
      maxItems: 1000,
      ttl: 24 * 60 * 60 * 1000 // 24 hours
    });
    
    _pathCache = createTypedCache<any[]>('paths', {
      maxItems: 500,
      ttl: 30 * 60 * 1000 // 30 minutes
    });
    
    _networkDataCache = createTypedCache<any>('networkData', {
      maxItems: 100,
      ttl: 60 * 60 * 1000 // 1 hour
    });
    
    // Initialize cache strategy managers
    _cacheStrategy = new CacheStrategyManager(_mainCache, {
      strategy: 'cache-aside'
    });
    
    _cacheInvalidator = new CacheInvalidator(_mainCache);
    _cachePreloader = new CachePreloader(_mainCache);
    _cacheMonitor = new CachePerformanceMonitor(_mainCache);
    _cacheWarmer = new CacheWarmer(_mainCache);
  }
  
  return {
    mainCache: _mainCache!,
    pathCache: _pathCache!,
    networkDataCache: _networkDataCache!,
    cacheStrategy: _cacheStrategy!,
    cacheInvalidator: _cacheInvalidator!,
    cachePreloader: _cachePreloader!,
    cacheMonitor: _cacheMonitor!,
    cacheWarmer: _cacheWarmer!
  };
}

// Export getters instead of direct instances
export const getMainCache = () => getCacheInstances().mainCache;
export const getPathCache = () => getCacheInstances().pathCache;
export const getNetworkDataCache = () => getCacheInstances().networkDataCache;
export const getCacheStrategy = () => getCacheInstances().cacheStrategy;
export const getCacheInvalidator = () => getCacheInstances().cacheInvalidator;
export const getCachePreloader = () => getCacheInstances().cachePreloader;
export const getCacheMonitor = () => getCacheInstances().cacheMonitor;
export const getCacheWarmer = () => getCacheInstances().cacheWarmer;
