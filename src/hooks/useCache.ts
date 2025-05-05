/**
 * useCache Hook - React hook for using the persistent cache system
 */
import { useCallback, useEffect, useState } from 'react';
import { CacheKeys } from '@utils/cache';
import { NetworkData, Path } from '@types/network';

export function useCache<T = any>(cacheKey: string, options?: {
  ttl?: number;
  invalidatePattern?: string | RegExp;
}) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Load data from cache
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { getMainCache, getCacheStrategy, getCacheMonitor } = await import('@utils/cache');
      const cached = await getCacheStrategy().read(cacheKey);
      setData(cached as T);
      getCacheMonitor().trackAccess(cacheKey);
    } catch (err) {
      setError(err as Error);
      const { getCacheMonitor } = await import('@utils/cache');
      getCacheMonitor().trackError(cacheKey);
    } finally {
      setLoading(false);
    }
  }, [cacheKey]);

  // Save data to cache
  const save = useCallback(async (value: T) => {
    setLoading(true);
    setError(null);
    try {
      const { getCacheStrategy, getCacheMonitor } = await import('@utils/cache');
      await getCacheStrategy().write(cacheKey, value, options);
      setData(value);
    } catch (err) {
      setError(err as Error);
      const { getCacheMonitor } = await import('@utils/cache');
      getCacheMonitor().trackError(cacheKey);
    } finally {
      setLoading(false);
    }
  }, [cacheKey, options]);

  // Invalidate cache
  const invalidate = useCallback(async () => {
    const { getMainCache, getCacheInvalidator } = await import('@utils/cache');
    await getMainCache().delete(cacheKey);
    if (options?.invalidatePattern) {
      await getCacheInvalidator().invalidateByPattern(options.invalidatePattern);
    }
    setData(null);
  }, [cacheKey, options?.invalidatePattern]);

  // Load on mount
  useEffect(() => {
    load();
  }, [load]);

  return {
    data,
    loading,
    error,
    reload: load,
    save,
    invalidate
  };
}

// Specialized hooks for common cache patterns
export function usePathCache(source: string, target: string) {
  const cacheKey = CacheKeys.pathResult(source, target);
  return useCache<Path[]>(cacheKey, {
    ttl: 30 * 60 * 1000, // 30 minutes
    invalidatePattern: new RegExp(`path:${source}:${target}`)
  });
}

export function useNetworkDataCache(region?: string) {
  const cacheKey = region ? CacheKeys.networkData(region) : CacheKeys.networkData('*');
  return useCache<NetworkData>(cacheKey, {
    ttl: 60 * 60 * 1000, // 1 hour
    invalidatePattern: region ? `network:${region}` : 'network:*'
  });
}

export function useCoordinatesCache() {
  return useCache<Record<string, [number, number]>>(CacheKeys.coordinates(), {
    ttl: 24 * 60 * 60 * 1000 // 24 hours
  });
}

export function useRegionsCache() {
  return useCache<string[]>(CacheKeys.regions(), {
    ttl: 24 * 60 * 60 * 1000 // 24 hours
  });
}

export function useUIStateCache() {
  const selectedRegionsCache = useCache<{ source: string; target: string } | null>(
    CacheKeys.selectedRegions(),
    { ttl: 24 * 60 * 60 * 1000 }
  );
  
  const filtersCache = useCache<any>(
    CacheKeys.filters(),
    { ttl: 24 * 60 * 60 * 1000 }
  );
  
  const viewStateCache = useCache<any>(
    CacheKeys.viewState(),
    { ttl: 24 * 60 * 60 * 1000 }
  );

  return {
    selectedRegions: selectedRegionsCache,
    filters: filtersCache,
    viewState: viewStateCache
  };
}

// Hook for cache monitoring
export function useCacheMonitoring() {
  const [metrics, setMetrics] = useState<any>(null);
  const [recommendations, setRecommendations] = useState<string[]>([]);

  useEffect(() => {
    const interval = setInterval(async () => {
      const { getCacheMonitor } = await import('@utils/cache');
      setMetrics(getCacheMonitor().getMetrics());
      setRecommendations(getCacheMonitor().getRecommendations());
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  return {
    metrics,
    recommendations
  };
}

// Hook for cache invalidation strategies
export function useCacheInvalidation() {
  const invalidateByRegion = useCallback(async (region: string) => {
    const { getCacheInvalidator } = await import('@utils/cache');
    await getCacheInvalidator().invalidateCascade(region);
  }, []);

  const invalidateByDependency = useCallback(async (dependency: string) => {
    const { getCacheInvalidator } = await import('@utils/cache');
    await getCacheInvalidator().invalidateByDependency(dependency);
  }, []);

  const invalidateAll = useCallback(async () => {
    const { getMainCache } = await import('@utils/cache');
    await getMainCache().clear();
  }, []);

  return {
    invalidateByRegion,
    invalidateByDependency,
    invalidateAll
  };
}
