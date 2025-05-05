/**
 * App - Main application component
 *
 * This is the root component that orchestrates the entire application.
 * It handles the overall layout and state management via custom hooks.
 */
import React, { useReducer, useCallback, useMemo, Suspense, lazy } from "react";
import { LoadingIndicator } from "@components/LoadingIndicator";
import { useNetworkGraph } from "@hooks/useNetworkGraph";
import { appReducer, initialState } from "@state/appReducer";
import { Header, Footer, TabNavigation, TabType, UnifiedHeader, HeaderWithRegions } from "@components/layout";
import { ErrorDisplay, SectionCard, ErrorBoundary, LazyComponent } from "@components/common";
import { DebugTools, EnhancedDebugTools, DebugPanel } from "@components/dev";
import { ResizablePanel } from "@components/ui";
import { networkLogger } from "@utils/logger";
import { usePerformanceTracking } from "@utils/performance";
import { FilterProvider } from "@context/FilterContext";
import { FilterableLegend } from "@components/common/FilterableLegend";

// Lazy-loaded components for code splitting
const RouteCard = lazy(() => import("@components/RouteCard").then(module => ({ default: module.RouteCard })));
const LatencyChart = lazy(() => import("@components/LatencyChart").then(module => ({ default: module.LatencyChart })));
const NetworkVisualizer = lazy(() => import("@components/NetworkVisualizer").then(module => ({ default: module.NetworkVisualizer })));
const WorldMapVisualizer = lazy(() => import("@components/WorldMapVisualizer").then(module => ({ default: module.WorldMapVisualizer })));
const Dashboard = lazy(() => import("@components/Dashboard").then(module => ({ default: module.Dashboard })));

const DashboardUnified = lazy(() => import("@components/DashboardUnified").then(module => ({ default: module.default })));

// Added: Import NetworkData type
import type { NetworkData } from '@types/network';

/**
 * Main application component
 */
export const App: React.FC = () => {
  // Track performance in development mode, wrapped in try/catch for safety
  try {
    usePerformanceTracking('App');
  } catch (error) {
    console.warn('Error in performance tracking:', error);
  }
  
  // Use reducer for state management
  const [state, dispatch] = useReducer(appReducer, initialState);
  
  // Get state from the reducer
  const { 
    activeTab, 
    initialLoadComplete, 
    showDebuggingTools, 
    showCacheStats 
  } = state;
  
  // Get network graph state and operations
  const {
    graph,
    regions,
    sourceRegion,
    targetRegion,
    setSourceRegion,
    setTargetRegion,
    shortestPaths,
    longestPathBetweenSelection,
    longestPath,
    isLoading,
    error,
    calculatePaths,
    swapRegions,
  } = useNetworkGraph();

  // Event handlers
  const handleTabChange = useCallback((tab: TabType) => {
    dispatch({ type: 'SET_ACTIVE_TAB', payload: tab });
  }, []);

  const handleToggleDebuggingTools = useCallback(() => {
    dispatch({ type: 'TOGGLE_DEBUGGING_TOOLS' });
  }, []);

  const handleShowCacheStats = useCallback(() => {
    dispatch({ type: 'TOGGLE_CACHE_STATS' });
  }, []);

  // Check if we have regions selected
  const hasRegionsSelected = Boolean(sourceRegion && targetRegion);

  // Handler for recalculate button
  const handleRecalculate = useCallback(() => {
    networkLogger.info("Manually triggering path calculation");
    calculatePaths();
  }, [calculatePaths]);

  // Testing handlers for debugging (development only)
  const handleTestRegionPath = useCallback(() => {
    if (graph && regions.length >= 2) {
      // Use the first two regions in the list for testing paths
      const testSource = regions[0];
      const testTarget = regions[1];
      const path = graph.findShortestPath(testSource, testTarget);
      networkLogger.info(`${testSource} → ${testTarget} path:`, path);
    }
  }, [graph, regions]);

  const handleDebugGraph = useCallback(() => {
    if (graph && regions.length >= 2) {
      const data = graph.toNetworkData();
      networkLogger.info("Graph data:", data);

      // Check connections between the first two regions in the list
      const region1 = regions[0];
      const region2 = regions[1];
      networkLogger.debug(`${region1} → ${region2} connection:`, data[region1]?.[region2]);
      
      // Check a random connection if we have more regions
      if (regions.length >= 4) {
        const region3 = regions[2];
        const region4 = regions[3];
        networkLogger.debug(`${region3} → ${region4} connection:`, data[region3]?.[region4]);
      }
    }
  }, [graph, regions]);

  // Cache management handlers
  const handleClearCache = useCallback(() => {
    if (graph) {
      graph.clearCache();
      networkLogger.info("Cache cleared");
      dispatch({ type: 'TOGGLE_CACHE_STATS' }); // Show the stats after clearing
    }
  }, [graph]);

  // Update initialLoadComplete when loading completes
  React.useEffect(() => {
    if (!isLoading && graph && !initialLoadComplete) {
      dispatch({ type: 'SET_INITIAL_LOAD_COMPLETE', payload: true });
    }
  }, [isLoading, graph, initialLoadComplete]);

  // Find the maximum latency for scaling
  const maxLatency = useMemo(() => {
    return Math.max(
      ...(shortestPaths.map((p) => p.latency) || [0]),
      longestPathBetweenSelection?.latency || 0,
      longestPath?.latency || 0,
    );
  }, [shortestPaths, longestPathBetweenSelection, longestPath]);

  // Only show debugging tools in development mode
  const showDebugTools = process.env.NODE_ENV === 'development' && showDebuggingTools;

  // Added: Function to handle network data updates from file upload
  const handleNetworkDataUpdate = useCallback(async (data: NetworkData) => {
    try {
      networkLogger.info("Network data updated from file upload");
      // For demonstration, we'll just trigger a recalculation
      // In a real implementation, you'd want to update the graph with the new data
      calculatePaths();
    } catch (error) {
      networkLogger.error("Failed to update network data", error);
      throw error; // Re-throw to be handled by the upload component
    }
  }, [calculatePaths]);

  return (
    <ErrorBoundary>
      <FilterProvider>
        <div className="min-h-screen bg-gradient-to-br from-secondary-50 to-secondary-100">
          <HeaderWithRegions
            regions={regions}
            sourceRegion={sourceRegion}
            targetRegion={targetRegion}
            onSourceChange={setSourceRegion}
            onTargetChange={setTargetRegion}
            onSwap={swapRegions}
            disabled={isLoading}
            isLoading={isLoading}
            onToggleDebuggingTools={handleToggleDebuggingTools}
            showDebugTools={showDebugTools}
            initialLoadComplete={initialLoadComplete}
            onNetworkDataUpload={handleNetworkDataUpdate}
          />

        <main className="container mx-auto px-4 py-8">
          {/* Error Display */}
          {error && (
            <ErrorDisplay 
              error={error} 
              onRetry={handleRecalculate} 
              className="mb-6"
            />
          )}

          {/* Show loading indicator for path calculation */}
          {initialLoadComplete && isLoading && (
            <div className="card bg-white rounded-lg shadow-md flex justify-center items-center py-12">
              <LoadingIndicator text="Calculating optimal paths..." />
            </div>
          )}

          {/* Tab navigation - only show when data is loaded */}
          {initialLoadComplete && !isLoading && (
            <TabNavigation
              activeTab={activeTab}
              onTabChange={handleTabChange}
            />
          )}

          {/* Content based on active tab */}
          {initialLoadComplete && !isLoading && (
            <div className="grid grid-cols-1 gap-6 w-full">
              {/* Dashboard tab - Use DashboardUnified with mode based on active tab */}
              {activeTab === "dashboard" && (
                <LazyComponent
                  component={
                    <Dashboard
                      graph={graph}
                      sourceRegion={sourceRegion}
                      targetRegion={targetRegion}
                      shortestPaths={shortestPaths}
                      longestPathBetweenSelection={longestPathBetweenSelection}
                      longestPath={longestPath}
                      maxLatency={maxLatency}
                      onRecalculate={handleRecalculate}
                    />
                  }
                  loadingMessage="Loading dashboard..."
                />
              )}

              {/* Paths tab */}
              {activeTab === "paths" && (
                <>
                  {shortestPaths.length > 0 ? (
                    <div className="space-y-8">
                      <div>
                        <div className="flex items-center mb-4">
                          <h2 className="text-xl font-semibold">
                            <span className="inline-block w-2 h-5 bg-green-500 rounded mr-2"></span>
                            Fastest Paths
                          </h2>
                          <span className="ml-2 text-sm bg-primary-100 text-primary-800 py-1 px-2 rounded">
                            {shortestPaths.length} path
                            {shortestPaths.length !== 1 ? "s" : ""} found
                          </span>
                        </div>
                        <div className="grid grid-cols-1 gap-6 w-full">
                          {shortestPaths.map((path, index) => (
                            <LazyComponent
                              key={`path-${index}`}
                              component={
                                <RouteCard
                                  path={path}
                                  index={index}
                                  isLongest={false}
                                  maxLatency={maxLatency}
                                />
                              }
                              loadingMessage="Loading path details..."
                            />
                          ))}
                        </div>
                      </div>

                      {/* Longest Path Between Selected Regions */}
                      {longestPathBetweenSelection && (
                        <div>
                          <div className="flex items-center mb-4">
                            <h2 className="text-xl font-semibold">
                              <span className="inline-block w-2 h-5 bg-orange-500 rounded mr-2"></span>
                              Longest Path Between {sourceRegion} and{" "}
                              {targetRegion}
                            </h2>
                            <span className="ml-2 text-sm bg-orange-100 text-orange-800 py-1 px-2 rounded">
                              {longestPathBetweenSelection.hops} hops
                            </span>
                          </div>
                          <div className="grid grid-cols-1 gap-6 w-full">
                            <LazyComponent
                              component={
                                <RouteCard
                                  key="longest-between"
                                  path={longestPathBetweenSelection}
                                  index={0}
                                  isLongest={true}
                                  maxLatency={maxLatency}
                                />
                              }
                              loadingMessage="Loading longest path details..."
                            />
                          </div>
                        </div>
                      )}

                      {/* Overall Longest Path in Network */}
                      {longestPath && (
                        <div>
                          <div className="flex items-center mb-4">
                            <h2 className="text-xl font-semibold">
                              <span className="inline-block w-2 h-5 bg-red-500 rounded mr-2"></span>
                              Overall Longest Path in Network
                            </h2>
                            <span className="ml-2 text-sm bg-red-100 text-red-800 py-1 px-2 rounded">
                              {longestPath.hops} hops,{" "}
                              {longestPath.latency.toFixed(1)} ms
                            </span>
                          </div>
                          <div className="grid grid-cols-1 gap-6 w-full">
                            <LazyComponent
                              component={
                                <RouteCard
                                  key="longest-overall"
                                  path={longestPath}
                                  index={1}
                                  isLongest={true}
                                  maxLatency={maxLatency}
                                />
                              }
                              loadingMessage="Loading longest path details..."
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="card bg-white p-8 text-center rounded-lg shadow-md">
                      {hasRegionsSelected ? (
                        <div>
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-16 w-16 text-red-500 mx-auto mb-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                          <p className="text-secondary-600 mb-4">
                            No paths found between {sourceRegion} and{" "}
                            {targetRegion}.
                          </p>
                          <button
                            onClick={handleRecalculate}
                            className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors duration-150"
                          >
                            Recalculate Paths
                          </button>
                        </div>
                      ) : (
                        <div>
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-16 w-16 text-primary-500 mx-auto mb-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                          <p className="text-secondary-600">
                            Select source and target regions to see optimal paths.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}

              {/* Chart tab */}
              {activeTab === "chart" && (
                <SectionCard
                  title="Latency Comparison"
                  icon={
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 mr-2 text-primary-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                      />
                    </svg>
                  }
                >
                  {shortestPaths.length > 0 ? (
                    <LazyComponent
                      component={
                        <LatencyChart
                          paths={shortestPaths}
                          longestPath={longestPath}
                          longestPathBetween={longestPathBetweenSelection}
                        />
                      }
                      loadingMessage="Loading chart data..."
                      minHeight="400px"
                    />
                  ) : (
                    <div className="p-8 text-center">
                      {hasRegionsSelected ? (
                        <div>
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-16 w-16 text-red-500 mx-auto mb-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                          <p className="text-secondary-600 mb-4">
                            No paths found between {sourceRegion} and{" "}
                            {targetRegion} for comparison.
                          </p>
                          <button
                            onClick={handleRecalculate}
                            className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors duration-150"
                          >
                            Recalculate Paths
                          </button>
                        </div>
                      ) : (
                        <div>
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-16 w-16 text-primary-500 mx-auto mb-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                            />
                          </svg>
                          <p className="text-secondary-600">
                            Select source and target regions to see latency
                            comparisons.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </SectionCard>
              )}

              {/* Network Visualization tab */}
              {activeTab === "visualize" && (
                <SectionCard
                  title="Network Map Visualization"
                  icon={
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 mr-2 text-primary-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"
                      />
                    </svg>
                  }
                >
                  <div className="h-[600px] border border-secondary-200 rounded bg-white mb-4">
                    <LazyComponent
                      component={
                        <NetworkVisualizer
                          graph={graph}
                          paths={shortestPaths}
                          longestPath={longestPath}
                          longestPathBetween={longestPathBetweenSelection}
                          sourceRegion={sourceRegion}
                          targetRegion={targetRegion}
                        />
                      }
                      loadingMessage="Loading network visualization..."
                    />
                  </div>
                  
                  {/* FilterableLegend below the network map */}
                  <div className="bg-white p-4 rounded-lg shadow-md mb-4">
                    {hasRegionsSelected ? (
                      <FilterableLegend 
                        showInteractionTips={true}
                        sourceRegion={sourceRegion}
                        targetRegion={targetRegion}
                      />
                    ) : (
                      <div className="bg-secondary-50 p-4 rounded text-sm">
                        <h3 className="font-semibold mb-2 text-secondary-800">
                          Network Legend
                        </h3>
                        <p className="text-secondary-600">
                          Select source and target regions to see path visualization options.
                        </p>
                      </div>
                    )}
                  </div>
                  
                  <div className="bg-secondary-50 p-4 rounded text-sm">
                    <h3 className="font-semibold mb-2 text-secondary-800">
                      Network Controls
                    </h3>
                    <div className="text-secondary-600 bg-white p-3 rounded border border-secondary-200">
                      <ul className="list-disc list-inside space-y-1">
                        <li>Drag nodes to reposition them</li>
                        <li>Zoom with mouse wheel</li>
                        <li>Pan by dragging the background</li>
                        <li>Hover over nodes to see connected regions</li>
                        <li>
                          The numbers on connection lines show latency in
                          milliseconds
                        </li>
                      </ul>
                    </div>
                  </div>
                </SectionCard>
              )}

              {/* D3 World Map Visualization tab */}
              {activeTab === "globe" && (
                <SectionCard
                  title="World Map Visualization"
                  icon={
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 mr-2 text-primary-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  }
                >
                  <div className="h-[700px] border border-secondary-200 rounded bg-white mb-4 w-full">
                    <LazyComponent
                      component={
                        <WorldMapVisualizer
                          graph={graph}
                          paths={shortestPaths}
                          longestPath={longestPath}
                          longestPathBetween={longestPathBetweenSelection}
                          sourceRegion={sourceRegion}
                          targetRegion={targetRegion}
                        />
                      }
                      loadingMessage="Loading world map visualization..."
                    />
                  </div>
                  
                  {/* FilterableLegend below the map */}
                  <div className="bg-white p-4 rounded-lg shadow-md mb-4">
                    {hasRegionsSelected ? (
                      <FilterableLegend 
                        showInteractionTips={true}
                        sourceRegion={sourceRegion}
                        targetRegion={targetRegion}
                      />
                    ) : (
                      <div className="bg-secondary-50 p-4 rounded text-sm">
                        <h3 className="font-semibold mb-2 text-secondary-800">
                          Map Legend
                        </h3>
                        <p className="text-secondary-600">
                          Select source and target regions to see path visualization options.
                        </p>
                      </div>
                    )}
                  </div>
                  
                  {/* Controls and tips */}
                  <div className="bg-secondary-50 p-4 rounded text-sm mb-4">
                    <h3 className="font-semibold mb-2 text-secondary-800">
                      Map Controls
                    </h3>
                    <div className="text-secondary-600 bg-white p-3 rounded border border-secondary-200">
                      <ul className="list-disc list-inside space-y-1">
                        <li>Drag to pan the map</li>
                        <li>Scroll to zoom in/out</li>
                        <li>Hover over regions for detailed information</li>
                        <li>Watch animated particles to see data flow along paths</li>
                      </ul>
                    </div>
                  </div>
                </SectionCard>
              )}
            </div>
          )}

        </main>

          <Footer />
          
          {/* Enhanced Debug Tools - Side Panel for development mode */}
          {initialLoadComplete && process.env.NODE_ENV === 'development' && (
            <ResizablePanel
              isOpen={showDebuggingTools}
              onClose={() => dispatch({ type: 'TOGGLE_DEBUGGING_TOOLS' })}
              title="Advanced Debug Tools"
              defaultWidth={450}
              minWidth={300}
              maxWidth={800}
              position="right"
            >
              <DebugPanel
                graph={graph}
                paths={shortestPaths}
                longestPath={longestPath}
                longestPathBetween={longestPathBetweenSelection}
                sourceRegion={sourceRegion}
                targetRegion={targetRegion}
                onRecalculate={handleRecalculate}
                onClose={() => dispatch({ type: 'TOGGLE_DEBUGGING_TOOLS' })}
              />
            </ResizablePanel>
          )}
        </div>
      </FilterProvider>
    </ErrorBoundary>
  );
};
