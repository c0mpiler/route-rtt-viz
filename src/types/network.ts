/**
 * Network - Type definitions for network graph components
 * 
 * This file contains the central type definitions used throughout
 * the application for representing network elements, paths,
 * and related structures.
 */

/**
 * Represents a connection between regions
 */
export type Edge = {
  /** Target region name */
  target: string;
  
  /** Latency in milliseconds */
  weight: number;
};

/**
 * Represents a region (node) in the network
 */
export type Node = {
  /** Region name */
  name: string;
  
  /** Connections to other regions */
  edges: Edge[];
};

/**
 * Represents details about a specific hop in a path
 */
export type HopDetail = {
  /** Source region name */
  source: string;
  
  /** Target region name */
  target: string;
  
  /** Round-trip time in milliseconds */
  rtt: number;
  
  /** Minimum observed round-trip time in milliseconds */
  minRtt: number;
};

/**
 * Represents a path between regions
 */
export type Path = {
  /** Ordered array of region names in the path */
  route: string[];
  
  /** Total latency of the path in milliseconds */
  latency: number;
  
  /** Number of hops (regions - 1) in the path */
  hops: number;
  
  /** Array of detailed information for each hop in the path */
  hopDetails?: HopDetail[];
};

/**
 * Raw network data format used for loading from JSON
 * 
 * This is a nested record where:
 * - The outer key is the source region
 * - The inner key is the target region
 * - The value is the latency in milliseconds
 */
export type NetworkData = Record<string, Record<string, number>>;

/**
 * Structured error type for network operations
 */
export interface NetworkError {
  /** Error message */
  message: string;
  
  /** Error code for programmatic handling */
  code: string;
  
  /** Source component where the error occurred */
  source?: string;
};

/**
 * Represents a source-target region pair
 */
export type RegionPair = {
  /** Source region name */
  source: string;
  
  /** Target region name */
  target: string;
};

/**
 * Cache statistics for performance monitoring
 */
export interface CacheStats {
  /** Number of cache hits */
  hits: number;
  
  /** Number of cache misses */
  misses: number;
  
  /** Number of items in the cache */
  size: number;
  
  /** Hit rate percentage (0-100) */
  hitRate: number;
  
  /** Number of evictions (LRU removals) */
  evictions?: number;
}

/**
 * Worker message types for communication with pathFinder.worker.ts
 */
export enum WorkerMessageType {
  // Incoming worker messages
  WORKER_READY = 'WORKER_READY',
  INITIALIZED = 'INITIALIZED',
  ERROR = 'ERROR',
  SHORTEST_PATH_RESULT = 'SHORTEST_PATH_RESULT',
  K_PATHS_RESULT = 'K_PATHS_RESULT',
  LONGEST_PATH_RESULT = 'LONGEST_PATH_RESULT',
  OVERALL_LONGEST_PATH_RESULT = 'OVERALL_LONGEST_PATH_RESULT',
  CACHE_CLEARED = 'CACHE_CLEARED',
  CACHE_STATS = 'CACHE_STATS',
  REGIONS_RESULT = 'REGIONS_RESULT',
  
  // Outgoing worker messages
  INITIALIZE = 'INITIALIZE',
  FIND_SHORTEST_PATH = 'FIND_SHORTEST_PATH',
  FIND_K_SHORTEST_PATHS = 'FIND_K_SHORTEST_PATHS',
  FIND_LONGEST_PATH_BETWEEN = 'FIND_LONGEST_PATH_BETWEEN',
  FIND_LONGEST_PATH = 'FIND_LONGEST_PATH',
  CLEAR_CACHE = 'CLEAR_CACHE',
  GET_CACHE_STATS = 'GET_CACHE_STATS',
  GET_REGIONS = 'GET_REGIONS'
}

/**
 * Worker message payload type
 */
export interface WorkerMessage<T = any> {
  type: WorkerMessageType;
  payload?: T;
  error?: string;
  code?: string;
}

/**
 * Geographic coordinates [latitude, longitude]
 */
export type Coordinates = [number, number];

/**
 * Connection data format from JSON files
 */
export interface ConnectionData {
  /** Array of connection objects */
  connections: Array<{
    /** Source region name */
    source: string;
    
    /** Target region name */
    target: string;
    
    /** Round-trip time in milliseconds */
    rtt: number;
  }>;
}

/**
 * Loading state type for tracking different loading states
 */
export type LoadingState = {
  /** Initial data loading */
  initial: boolean;
  
  /** Path calculation */
  paths: boolean;
  
  /** Worker initialization */
  worker?: boolean;
};

/**
 * Performance measurement type
 */
export interface PerformanceMetric {
  /** Name of the operation */
  name: string;
  
  /** Start time (from performance.now()) */
  startTime: number;
  
  /** End time (from performance.now()) */
  endTime?: number;
  
  /** Duration in milliseconds */
  duration?: number;
}

/**
 * Performance statistics type
 */
export interface PerformanceStats {
  /** Number of measurements */
  count: number;
  
  /** Average duration */
  avg: number;
  
  /** Minimum duration */
  min: number;
  
  /** Maximum duration */
  max: number;
  
  /** Total duration */
  total: number;
}
