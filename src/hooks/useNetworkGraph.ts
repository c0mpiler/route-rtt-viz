/**
 * useNetworkGraph - Enhanced React hook for managing network graph state and operations
 * 
 * This hook encapsulates all state and operations related to the network graph,
 * providing a clean interface for components to interact with the network data.
 * It now uses a web worker for CPU-intensive calculations.
 */
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { NetworkGraph } from '@utils/network';
import { Path, NetworkError, LoadingState, WorkerMessageType } from '@types/network';
import { loadRttData, convertToNetworkData } from '@utils/loadLatencyData';
import { loadBackupLatencyData } from '@utils/parseLatencyData';
import { hookLogger } from '@utils/logger';
import { usePerformanceTracking, perfMonitor } from '@utils/performance';
import { initializeCoordinates } from '@utils/coordsHelper';
import { loadAssetWithFallbacks } from '@utils/assetUtils';

export interface UseNetworkGraphResult {
  /** The network graph instance (only for visualization, actual calculations happen in worker) */
  graph: NetworkGraph | null;
  
  /** All available regions */
  regions: string[];
  
  /** Currently selected source region */
  sourceRegion: string | null;
  
  /** Currently selected target region */
  targetRegion: string | null;
  
  /** Handler for changing source region */
  setSourceRegion: (region: string) => void;
  
  /** Handler for changing target region */
  setTargetRegion: (region: string) => void;
  
  /** Shortest paths between source and target */
  shortestPaths: Path[];
  
  /** Longest path between source and target */
  longestPathBetweenSelection: Path | null;
  
  /** Overall longest path in the network */
  longestPath: Path | null;
  
  /** Whether data is currently loading */
  isLoading: boolean;
  
  /** Current error, if any */
  error: NetworkError | null;
  
  /** Handler for manually triggering path calculation */
  calculatePaths: () => void;
  
  /** Handler for swapping source and target regions */
  swapRegions: () => void;
  
  /** Cache statistics */
  cacheStats: any;
  
  /** Clear cache */
  clearCache: () => void;
}

/**
 * Custom hook for managing network graph state and operations with Web Worker optimization
 * 
 * @returns Object containing graph state and operations
 */
export function useNetworkGraph(): UseNetworkGraphResult {
  // Add performance tracking
  usePerformanceTracking('useNetworkGraph');
  
  // Web Worker reference
  const workerRef = useRef<Worker | null>(null);
  
  // State for the network graph (for visualization only)
  const [graph, setGraph] = useState<NetworkGraph | null>(null);
  
  // Graph data
  const [regions, setRegions] = useState<string[]>([]);
  const [sourceRegion, setSourceRegion] = useState<string | null>(null);
  const [targetRegion, setTargetRegion] = useState<string | null>(null);
  const [shortestPaths, setShortestPaths] = useState<Path[]>([]);
  const [longestPathBetweenSelection, setLongestPathBetweenSelection] = useState<Path | null>(null);
  const [longestPath, setLongestPath] = useState<Path | null>(null);
  const [networkData, setNetworkData] = useState<any>(null);
  const [cacheStats, setCacheStats] = useState<any>(null);
  
  // More granular loading states
  const [loadingState, setLoadingState] = useState<LoadingState>({
    initial: true,
    paths: false,
    worker: true
  });
  
  // Derived loading state for backward compatibility
  const isLoading = useMemo(() => 
    loadingState.initial || loadingState.paths || loadingState.worker,
  [loadingState]);
  
  // Better error state with code and source
  const [error, setError] = useState<NetworkError | null>(null);
  
  // Use a ref to track path calculation trigger
  const pathCalculationTrigger = useRef<number>(0);
  
  // Keep track of last calculated source/target pair to avoid redundant calculations
  const lastCalculated = useRef<{ source: string | null; target: string | null }>({
    source: null,
    target: null
  });

  // Initialize coordinates data for visualizations
  useEffect(() => {
    const initCoordinates = async () => {
      try {
        hookLogger.info('Starting coordinates initialization...');
        await initializeCoordinates();
        hookLogger.info('Coordinates data initialized successfully');
        // Force a re-render of components that might depend on coordinates
        // by slightly changing a state value
        setLoadingState(prev => ({ ...prev }));
      } catch (err) {
        hookLogger.error('Failed to initialize coordinates data:', err);
      }
    };
    
    initCoordinates();
  }, []);

  // Initialize web worker
  useEffect(() => {
    try {
      perfMonitor.start('workerInit');
      hookLogger.info('Creating web worker for path calculations');
      
      // Create worker
      workerRef.current = new Worker(
        new URL('../workers/pathFinder.worker.ts', import.meta.url),
        { type: 'module' }
      );
      
      // Set up message handler
      workerRef.current.onmessage = (event: MessageEvent<any>) => {
        const { type, ...data } = event.data;
        
        hookLogger.debug(`Worker message received: ${type}`);
        
        switch (type) {
          case WorkerMessageType.WORKER_READY:
            hookLogger.info('Worker is ready');
            break;
            
          case WorkerMessageType.INITIALIZED:
            hookLogger.info('Worker initialized successfully');
            setLoadingState(prev => ({ ...prev, worker: false }));
            
            // Now that the worker is initialized, get the regions
            workerRef.current?.postMessage({
              action: WorkerMessageType.GET_REGIONS
            });
            break;
            
          case WorkerMessageType.ERROR:
            hookLogger.error('Worker error:', data.error);
            setError({
              message: data.error || 'Unknown worker error',
              code: data.code || 'WORKER_ERROR',
              source: 'pathFinder.worker'
            });
            // Don't set worker to not loading yet
            setLoadingState(prev => ({ ...prev, paths: false }));
            break;
            
          case WorkerMessageType.REGIONS_RESULT:
            hookLogger.info(`Received ${data.regions.length} regions from worker`);
            setRegions(data.regions);
            
            // Choose default regions
            const { source, target } = getDefaultRegions(data.regions);
            setSourceRegion(source);
            setTargetRegion(target);
            
            // Find longest path
            workerRef.current?.postMessage({
              action: WorkerMessageType.FIND_LONGEST_PATH
            });
            
            setLoadingState(prev => ({ ...prev, initial: false }));
            break;
            
          case WorkerMessageType.SHORTEST_PATH_RESULT:
            // This is used for single path calculation, we're using K_PATHS_RESULT instead
            break;
            
          case WorkerMessageType.K_PATHS_RESULT:
            hookLogger.info(`Received ${data.paths?.length || 0} shortest paths from worker`);
            setShortestPaths(data.paths || []);
            break;
            
          case WorkerMessageType.LONGEST_PATH_RESULT:
            hookLogger.info('Received longest path between selection from worker');
            setLongestPathBetweenSelection(data.path);
            setLoadingState(prev => ({ ...prev, paths: false }));
            
            // Update last calculated reference
            lastCalculated.current = {
              source: data.source,
              target: data.target
            };
            break;
            
          case WorkerMessageType.OVERALL_LONGEST_PATH_RESULT:
            hookLogger.info('Received overall longest path from worker');
            setLongestPath(data.path);
            break;
            
          case WorkerMessageType.CACHE_CLEARED:
            hookLogger.info('Cache cleared');
            // Get updated stats
            workerRef.current?.postMessage({
              action: WorkerMessageType.GET_CACHE_STATS
            });
            break;
            
          case WorkerMessageType.CACHE_STATS:
            hookLogger.debug('Received cache stats from worker');
            setCacheStats(data.stats);
            break;
        }
      };
      
      // Handle worker errors
      workerRef.current.onerror = (error) => {
        hookLogger.error('Worker error:', error);
        setError({
          message: 'Web Worker crashed. Please refresh the page.',
          code: 'WORKER_CRASHED',
          source: 'useNetworkGraph'
        });
        setLoadingState(prev => ({ ...prev, worker: false, paths: false }));
      };
      
      // Clean up worker on unmount
      return () => {
        if (workerRef.current) {
          workerRef.current.terminate();
          workerRef.current = null;
        }
        
        perfMonitor.end('workerInit');
      };
    } catch (err) {
      // Handle worker creation errors
      hookLogger.error('Failed to create worker:', err);
      setError({
        message: 'Failed to initialize Web Worker. The application will use less efficient calculation methods.',
        code: 'WORKER_INIT_ERROR',
        source: 'useNetworkGraph'
      });
      setLoadingState(prev => ({ ...prev, worker: false }));
    }
  }, []);

  // Load data and initialize worker
  useEffect(() => {
    const loadNetworkData = async () => {
      if (!workerRef.current) {
        setError({
          message: 'Web Worker not initialized. Please refresh the page.',
          code: 'WORKER_NOT_INITIALIZED',
          source: 'useNetworkGraph'
        });
        setLoadingState(prev => ({ ...prev, initial: false }));
        return;
      }
      
      try {
        setLoadingState(prev => ({ ...prev, initial: true }));
        setError(null);
        
        hookLogger.info("Loading RTT data...");
        
        // Only start the performance monitor if it's not already started
        let perfStarted = false;
        try {
          perfMonitor.start('dataLoading');
          perfStarted = true;
        } catch (perfError) {
          hookLogger.debug('Performance monitoring already started for dataLoading');
        }
        
        let networkData;
        try {
          // Try to load RTT data from primary JSON file
          const data = await loadRttData();
          hookLogger.info(`Loaded ${data.connections.length} connections`);
          
          // Convert to NetworkData format for our graph implementation
          networkData = convertToNetworkData(data);
          hookLogger.debug("Converted to network data format");
        } catch (primaryError) {
          hookLogger.error('Error loading primary data, falling back to backup:', primaryError);
          
          // Fall back to backup data if primary loading fails
          networkData = await loadBackupLatencyData();
          hookLogger.info("Loaded backup network data");
          
          if (!networkData || Object.keys(networkData).length === 0) {
            throw new Error('Failed to load both primary and backup latency data');
          }
        }
        
        // Only end the performance monitor if we started it
        if (perfStarted) {
          try {
            perfMonitor.end('dataLoading');
          } catch (perfError) {
            hookLogger.debug('Error ending performance monitor:', perfError);
          }
        }
        
        // Store network data for local visualization
        setNetworkData(networkData);
        
        // Create a local graph instance for visualization only
        const localGraph = new NetworkGraph(networkData);
        setGraph(localGraph);
        
        // Load supporting data for the worker
        const supportingData: any = {};
        
        try {
          // Load required connections
          const requiredConnectionsResponse = await loadAssetWithFallbacks('required-connections.json');
          const data = await requiredConnectionsResponse.json();
          supportingData.requiredConnections = data.connections || [];
          hookLogger.info(`Loaded ${supportingData.requiredConnections.length} required connections for worker`);
        } catch (error) {
          hookLogger.warn('Failed to load required connections for worker:', error);
          // Worker will handle the fallback
        }
        
        try {
          // Load distant regions
          const distantRegionsResponse = await loadAssetWithFallbacks('distant-regions.json');
          const data = await distantRegionsResponse.json();
          supportingData.distantRegions = data.regions || [];
          supportingData.specialCombinations = data.specialCombinations || [];
          hookLogger.info(`Loaded ${supportingData.distantRegions.length} distant regions for worker`);
        } catch (error) {
          hookLogger.warn('Failed to load distant regions for worker:', error);
          // Worker will handle the fallback
        }
        
        try {
          // Load hub regions
          const hubRegionsResponse = await loadAssetWithFallbacks('hub-regions.json');
          const data = await hubRegionsResponse.json();
          supportingData.hubRegions = data.regions || [];
          hookLogger.info(`Loaded ${supportingData.hubRegions.length} hub regions for worker`);
        } catch (error) {
          hookLogger.warn('Failed to load hub regions for worker:', error);
          // Worker will handle the fallback
        }

        // Send data to worker for initialization
        workerRef.current.postMessage({
          action: WorkerMessageType.INITIALIZE,
          payload: { 
            networkData,
            supportingData
          }
        });
        
      } catch (err) {
        // Only end the performance monitor if it's started
        try {
          perfMonitor.end('dataLoading');
        } catch (perfError) {
          // Ignore errors about ending a metric that's already ended
        }
        
        const message = err instanceof Error ? err.message : String(err);
        hookLogger.error('Error loading network data:', err);
        
        setError({
          message: 'Failed to load network data. Please refresh and try again.',
          code: 'DATA_LOAD_ERROR',
          source: 'useNetworkGraph'
        });
        
        setLoadingState(prev => ({ ...prev, initial: false }));
      }
    };

    loadNetworkData();
  }, []);

  // Choose default regions memoized
  const getDefaultRegions = useCallback((availableRegions: string[]) => {
    if (availableRegions.length < 2) {
      return { source: null, target: null };
    }
    
    // Choose regions from our IBM Cloud dataset
    let source = 'Dallas';
    let target = 'London';
    
    // Fall back if our preferred regions don't exist
    if (!availableRegions.includes(source)) {
      source = availableRegions[0];
    }
    
    if (!availableRegions.includes(target) || target === source) {
      // Find a different region
      for (const region of availableRegions) {
        if (region !== source) {
          target = region;
          break;
        }
      }
    }
    
    hookLogger.debug(`Selected default regions: ${source} → ${target}`);
    return { source, target };
  }, []);

  // Safe region setter functions with validation
  const handleSetSourceRegion = useCallback((region: string) => {
    // Make sure we don't set the same region as target
    if (region === targetRegion) {
      hookLogger.warn('Source and target regions cannot be the same.');
      return;
    }
    setSourceRegion(region);
    // Mark that we need to recalculate paths
    pathCalculationTrigger.current += 1;
  }, [targetRegion]);

  const handleSetTargetRegion = useCallback((region: string) => {
    // Make sure we don't set the same region as source
    if (region === sourceRegion) {
      hookLogger.warn('Source and target regions cannot be the same.');
      return;
    }
    setTargetRegion(region);
    // Mark that we need to recalculate paths
    pathCalculationTrigger.current += 1;
  }, [sourceRegion]);

  // Calculate paths using the worker
  const calculatePaths = useCallback(() => {
    perfMonitor.start('calculatePaths');
    
    if (!workerRef.current || !sourceRegion || !targetRegion) {
      hookLogger.warn('Cannot calculate paths: missing worker or regions');
      setShortestPaths([]);
      setLongestPathBetweenSelection(null);
      perfMonitor.end('calculatePaths');
      return;
    }
    
    // Skip if we've already calculated for this pair
    if (
      lastCalculated.current.source === sourceRegion && 
      lastCalculated.current.target === targetRegion &&
      shortestPaths.length > 0 &&
      longestPathBetweenSelection !== null
    ) {
      hookLogger.debug('Skipping calculation - already calculated for this pair');
      perfMonitor.end('calculatePaths');
      return;
    }
    
    hookLogger.info(`Calculating paths from ${sourceRegion} to ${targetRegion}`);
    
    setLoadingState(prev => ({ ...prev, paths: true }));
    setError(null);
    
    try {
      // Find k shortest paths
      workerRef.current.postMessage({
        action: WorkerMessageType.FIND_K_SHORTEST_PATHS,
        payload: {
          source: sourceRegion,
          target: targetRegion,
          k: 3
        }
      });
      
      // Find longest path between selection
      workerRef.current.postMessage({
        action: WorkerMessageType.FIND_LONGEST_PATH_BETWEEN,
        payload: {
          source: sourceRegion,
          target: targetRegion
        }
      });
      
    } catch (error) {
      hookLogger.error('Error in calculatePaths:', error);
      setShortestPaths([]);
      setLongestPathBetweenSelection(null);
      
      setError({
        message: 'An unexpected error occurred while calculating paths.',
        code: 'UNEXPECTED_ERROR',
        source: 'useNetworkGraph'
      });
      
      setLoadingState(prev => ({ ...prev, paths: false }));
    }
    
    perfMonitor.end('calculatePaths');
  }, [sourceRegion, targetRegion, shortestPaths.length, longestPathBetweenSelection]);

  // Trigger path calculation when source or target region changes or when manually triggered
  useEffect(() => {
    if (graph && sourceRegion && targetRegion) {
      hookLogger.debug(`Path calculation triggered (${pathCalculationTrigger.current})`);
      calculatePaths();
    }
  }, [graph, sourceRegion, targetRegion, calculatePaths, pathCalculationTrigger.current]);

  // Function to swap source and target regions
  const swapRegions = useCallback(() => {
    if (sourceRegion && targetRegion) {
      hookLogger.info(`Swapping regions: ${sourceRegion} ↔ ${targetRegion}`);
      
      // Use temporary variables to ensure clean swap
      const tempSource = sourceRegion;
      const tempTarget = targetRegion;
      
      setSourceRegion(tempTarget);
      setTargetRegion(tempSource);
      
      // Mark that we need to recalculate paths
      pathCalculationTrigger.current += 1;
    }
  }, [sourceRegion, targetRegion]);
  
  // Function to clear cache
  const clearCache = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.postMessage({
        action: WorkerMessageType.CLEAR_CACHE
      });
    }
    
    if (graph) {
      graph.clearCache();
    }
  }, [graph]);
  
  // Periodically get cache stats
  useEffect(() => {
    if (!workerRef.current) return;
    
    const interval = setInterval(() => {
      workerRef.current?.postMessage({
        action: WorkerMessageType.GET_CACHE_STATS
      });
    }, 10000); // Every 10 seconds
    
    // Get stats immediately
    workerRef.current.postMessage({
      action: WorkerMessageType.GET_CACHE_STATS
    });
    
    return () => {
      clearInterval(interval);
    };
  }, []);
  
  // Return memoized result to prevent unnecessary re-renders
  return useMemo(() => ({
    graph,
    regions,
    sourceRegion,
    targetRegion,
    setSourceRegion: handleSetSourceRegion,
    setTargetRegion: handleSetTargetRegion,
    shortestPaths,
    longestPathBetweenSelection,
    longestPath,
    isLoading,
    error,
    calculatePaths,
    swapRegions,
    cacheStats,
    clearCache,
  }), [
    graph,
    regions,
    sourceRegion,
    targetRegion,
    handleSetSourceRegion,
    handleSetTargetRegion,
    shortestPaths,
    longestPathBetweenSelection,
    longestPath,
    isLoading,
    error,
    calculatePaths,
    swapRegions,
    cacheStats,
    clearCache
  ]);
}
