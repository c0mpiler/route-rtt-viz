/**
 * pathFinder.worker.ts - Web Worker for handling CPU-intensive path calculations
 * 
 * This worker offloads path calculations from the main thread to prevent UI jank
 * and improve responsiveness. It handles initialization with network data and
 * performs various path-finding operations.
 */

import { NetworkGraph } from '../utils/network/NetworkGraph';
import { PathCache } from '../utils/cache/PathCache';
import { Path } from '../types/network';

// Worker context doesn't have access to the window object
// We need to create a custom context
const ctx: Worker = self as any;

// Initialize variables to store state
let graph: NetworkGraph | null = null;
let initialized = false;
let lastNetworkData: any = null;

// Cache for path calculations to improve performance across calls
const shortestPathCache = new PathCache<Path>();
const longestPathCache = new PathCache<Path>();
const kPathsCache = new PathCache<Path>();

/**
 * Helper function to create a specialized version of NetworkGraph for Web Workers
 * that uses cached data instead of window-based fetch operations
 */
class WorkerNetworkGraph extends NetworkGraph {
  private workerData: any;
  
  constructor(networkData: any, workerData: any) {
    super(networkData);
    this.workerData = workerData || {};
  }
  
  // Override to use cached data instead of fetching
  protected async loadRequiredConnections(): Promise<any> {
    // Use provided data if available
    if (this.workerData?.requiredConnections?.length > 0) {
      return this.workerData.requiredConnections;
    }
    
    // If no cached data, return empty array
    return [];
  }
  
  // Override to use cached data instead of fetching
  protected async loadDistantRegions(): Promise<string[]> {
    // Use provided data if available
    if (this.workerData?.distantRegions?.length > 0) {
      return this.workerData.distantRegions;
    }
    
    // If no cached data, return empty array
    return [];
  }
  
  // Override to use cached data instead of fetching
  protected async loadSpecialCombinations(): Promise<string[][]> {
    // Use provided data if available
    if (this.workerData?.specialCombinations?.length > 0) {
      return this.workerData.specialCombinations;
    }
    
    // If no cached data, return empty array
    return [];
  }
  
  // Override to use cached data instead of fetching
  protected async loadHubRegions(): Promise<string[]> {
    // Use provided data if available
    if (this.workerData?.hubRegions?.length > 0) {
      return this.workerData.hubRegions;
    }
    
    // If no cached data, return dynamically determined hubs
    return this.determineHubsByConnectivity();
  }
  
  // Ensure we properly implement these methods as async to match the parent class
  async findLongestPathBetween(start: string, end: string): Promise<Path | null> {
    return super.findLongestPathBetween(start, end);
  }
  
  async findLongestPath(): Promise<Path | null> {
    return super.findLongestPath();
  }
}

/**
 * Initialize the worker with network data and supporting data
 * 
 * @param data Object containing networkData and supporting data (requiredConnections, distantRegions, etc.)
 */
function initialize(data: any): void {
  try {
    const { networkData, supportingData } = data;
    
    // Store the network data for potential reuse
    lastNetworkData = networkData;
    
    // Create a new graph instance with the provided data
    // Use our worker-safe version with the supporting data
    graph = new WorkerNetworkGraph(networkData, supportingData);
    initialized = true;
    
    // Send success message back to main thread
    ctx.postMessage({
      type: 'INITIALIZED',
      success: true
    });
  } catch (error) {
    console.error('Worker initialization error:', error);
    
    // Send error message back to main thread
    ctx.postMessage({
      type: 'ERROR',
      error: error instanceof Error ? error.message : String(error),
      code: 'INITIALIZATION_ERROR'
    });
  }
}

/**
 * Find the shortest path between two regions
 * 
 * @param source Source region
 * @param target Target region
 */
function findShortestPath(source: string, target: string): void {
  if (!graph || !initialized) {
    ctx.postMessage({
      type: 'ERROR',
      error: 'Graph not initialized',
      code: 'NOT_INITIALIZED'
    });
    return;
  }
  
  try {
    // Check cache first
    const cacheKey = `shortest:${source}:${target}`;
    const cachedPath = shortestPathCache.get(cacheKey);
    
    if (cachedPath !== undefined) {
      // Cache hit
      ctx.postMessage({
        type: 'SHORTEST_PATH_RESULT',
        path: cachedPath,
        source,
        target,
        fromCache: true
      });
      return;
    }
    
    // Calculate path
    const path = graph.findShortestPath(source, target);
    
    // Cache the result
    shortestPathCache.set(cacheKey, path);
    
    // Send result back to main thread
    ctx.postMessage({
      type: 'SHORTEST_PATH_RESULT',
      path,
      source,
      target,
      fromCache: false
    });
  } catch (error) {
    console.error('Worker shortest path error:', error);
    
    ctx.postMessage({
      type: 'ERROR',
      error: error instanceof Error ? error.message : String(error),
      code: 'SHORTEST_PATH_ERROR'
    });
  }
}

/**
 * Find K shortest paths between two regions
 * 
 * @param source Source region
 * @param target Target region
 * @param k Number of paths to find
 */
function findKShortestPaths(source: string, target: string, k: number): void {
  if (!graph || !initialized) {
    ctx.postMessage({
      type: 'ERROR',
      error: 'Graph not initialized',
      code: 'NOT_INITIALIZED'
    });
    return;
  }
  
  try {
    // Check cache first
    const cacheKey = `kpaths:${source}:${target}:${k}`;
    const cachedPaths = kPathsCache.get(cacheKey);
    
    if (cachedPaths !== undefined) {
      // Cache hit
      ctx.postMessage({
        type: 'K_PATHS_RESULT',
        paths: cachedPaths,
        source,
        target,
        k,
        fromCache: true
      });
      return;
    }
    
    // Calculate paths
    const paths = graph.findKShortestPaths(source, target, k);
    
    // Cache the result
    kPathsCache.set(cacheKey, paths);
    
    // Send result back to main thread
    ctx.postMessage({
      type: 'K_PATHS_RESULT',
        paths,
        source,
        target,
        k,
        fromCache: false
    });
  } catch (error) {
    console.error('Worker k-paths error:', error);
    
    ctx.postMessage({
      type: 'ERROR',
      error: error instanceof Error ? error.message : String(error),
      code: 'K_PATHS_ERROR'
    });
  }
}

/**
 * Find longest path between two regions
 * 
 * @param source Source region
 * @param target Target region
 */
async function findLongestPathBetween(source: string, target: string): Promise<void> {
  if (!graph || !initialized) {
    ctx.postMessage({
      type: 'ERROR',
      error: 'Graph not initialized',
      code: 'NOT_INITIALIZED'
    });
    return;
  }
  
  try {
    // Check cache first
    const cacheKey = `longest:${source}:${target}`;
    const cachedPath = longestPathCache.get(cacheKey);
    
    if (cachedPath !== undefined) {
      // Cache hit
      ctx.postMessage({
        type: 'LONGEST_PATH_RESULT',
        path: cachedPath,
        source,
        target,
        fromCache: true
      });
      return;
    }
    
    // Calculate path - we need to properly handle the Promise returned by findLongestPathBetween
    // by awaiting it to get the resolved value before passing to postMessage
    const path = await graph.findLongestPathBetween(source, target);
    
    // Cache the result
    longestPathCache.set(cacheKey, path);
    
    // Send result back to main thread
    ctx.postMessage({
      type: 'LONGEST_PATH_RESULT',
      path,
      source,
      target,
      fromCache: false
    });
  } catch (error) {
    console.error('Worker longest path error:', error);
    
    ctx.postMessage({
      type: 'ERROR',
      error: error instanceof Error ? error.message : String(error),
      code: 'LONGEST_PATH_ERROR'
    });
  }
}

/**
 * Find overall longest path in the network
 */
async function findLongestPath(): Promise<void> {
  if (!graph || !initialized) {
    ctx.postMessage({
      type: 'ERROR',
      error: 'Graph not initialized',
      code: 'NOT_INITIALIZED'
    });
    return;
  }
  
  try {
    // This operation is expensive, but we only do it once
    // Properly await the Promise to get the resolved value before passing to postMessage
    const path = await graph.findLongestPath();
    
    // Send result back to main thread
    ctx.postMessage({
      type: 'OVERALL_LONGEST_PATH_RESULT',
      path
    });
  } catch (error) {
    console.error('Worker overall longest path error:', error);
    
    ctx.postMessage({
      type: 'ERROR',
      error: error instanceof Error ? error.message : String(error),
      code: 'LONGEST_PATH_ERROR'
    });
  }
}

/**
 * Clear cache
 */
function clearCache(): void {
  if (graph) {
    graph.clearCache();
  }
  
  shortestPathCache.clear();
  longestPathCache.clear();
  kPathsCache.clear();
  
  ctx.postMessage({
    type: 'CACHE_CLEARED'
  });
}

/**
 * Get cache statistics
 */
function getCacheStats(): void {
  const graphStats = graph ? graph.getCacheStats() : {};
  
  const stats = {
    shortestPath: shortestPathCache.getStats(),
    longestPath: longestPathCache.getStats(),
    kPaths: kPathsCache.getStats(),
    graph: graphStats
  };
  
  ctx.postMessage({
    type: 'CACHE_STATS',
    stats
  });
}

/**
 * Get all regions
 */
function getRegions(): void {
  if (!graph || !initialized) {
    ctx.postMessage({
      type: 'ERROR',
      error: 'Graph not initialized',
      code: 'NOT_INITIALIZED'
    });
    return;
  }
  
  try {
    const regions = graph.getRegions();
    
    ctx.postMessage({
      type: 'REGIONS_RESULT',
      regions
    });
  } catch (error) {
    console.error('Worker get regions error:', error);
    
    ctx.postMessage({
      type: 'ERROR',
      error: error instanceof Error ? error.message : String(error),
      code: 'REGIONS_ERROR'
    });
  }
}

/**
 * Message handler for the worker
 */
ctx.addEventListener('message', async (event) => {
  const { action, payload } = event.data;
  
  try {
    switch (action) {
      case 'INITIALIZE':
        initialize({
          networkData: payload.networkData,
          supportingData: payload.supportingData
        });
        break;
        
      case 'FIND_SHORTEST_PATH':
        findShortestPath(payload.source, payload.target);
        break;
        
      case 'FIND_K_SHORTEST_PATHS':
        findKShortestPaths(payload.source, payload.target, payload.k);
        break;
        
      case 'FIND_LONGEST_PATH_BETWEEN':
        // Call the async function with await to properly handle errors
        await findLongestPathBetween(payload.source, payload.target);
        break;
        
      case 'FIND_LONGEST_PATH':
        // Call the async function with await to properly handle errors
        await findLongestPath();
        break;
        
      case 'CLEAR_CACHE':
        clearCache();
        break;
        
      case 'GET_CACHE_STATS':
        getCacheStats();
        break;
        
      case 'GET_REGIONS':
        getRegions();
        break;
        
      default:
        console.error(`Unknown action: ${action}`);
        ctx.postMessage({
          type: 'ERROR',
          error: `Unknown action: ${action}`,
          code: 'UNKNOWN_ACTION'
        });
    }
  } catch (error) {
    console.error(`Worker error handling action ${action}:`, error);
    ctx.postMessage({
      type: 'ERROR',
      error: error instanceof Error ? error.message : String(error),
      code: 'WORKER_EXECUTION_ERROR'
    });
  }
});

// Notify that worker is ready
ctx.postMessage({
  type: 'WORKER_READY'
});
