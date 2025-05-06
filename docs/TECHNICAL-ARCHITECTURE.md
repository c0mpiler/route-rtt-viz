# Route Radar - Technical Architecture

This document provides a comprehensive overview of the Route Radar application's technical architecture, data flow, algorithms, implementation details, and maintenance procedures.

## Table of Contents

1. [Data Architecture](#data-architecture)
2. [Core Components](#core-components)
3. [Algorithms and Implementation](#algorithms-and-implementation)
4. [Visualization Components](#visualization-components)
5. [Error Handling and Resilience](#error-handling-and-resilience)
6. [Performance Optimizations](#performance-optimizations)
7. [RTT Data Maintenance](#rtt-data-maintenance)
8. [Development and Deployment](#development-and-deployment)
9. [Future Enhancement Considerations](#future-enhancement-considerations)

## Data Architecture

### Data Externalization

All data in the application is externalized to JSON files, with no hard-coded values in the source code. This provides several benefits:

- **Maintainability**: Updates to region data, latency values, or network topology can be made without code changes
- **Consistency**: All data follows the same loading patterns and error handling
- **Extensibility**: New regions or connections can be added by simply updating JSON files
- **Resilience**: Multiple fallback mechanisms ensure the application works even if primary data loading fails

### Data Files

All data is stored in JSON files in the `/public` directory:

| File | Description |
|------|-------------|
| `latency-data.json` | Primary network latency data between regions |
| `backup-latency-data.json` | Backup data used when primary data fails to load |
| `coordinates-data.json` | Geographic coordinates for all regions |
| `continent-regions.json` | Maps regions to their respective continents |
| `default-coordinates.json` | Default coordinates when a region can't be found |
| `distant-regions.json` | Configuration for path calculation algorithms |
| `hub-regions.json` | Default hub regions for network connectivity |
| `fallback-hub-regions.json` | Fallback hub regions if primary file fails to load |
| `essential-connections.json` | Essential connections to ensure full connectivity |
| `required-connections.json` | Required connections for the network graph |
| `fallback-connections.json` | Fallback connections used if loading fails |
| `fallback-required-connections.json` | Fallback required connections |
| `fallback-coordinates.json` | Fallback geographic coordinates |
| `fallback-distant-regions.json` | Fallback distant regions configuration |

### Data Flow

1. Application initializes and attempts to load data from primary JSON files
2. If primary files fail to load, fallback data sources are used
3. Data is processed and converted to a graph structure
4. When users select source/target regions, the application calculates optimal paths
5. Different visualizations display the same data in various formats
6. The caching system stores calculated paths for performance optimization

### Data Formats

#### Latency Data Format

```json
{
  "connections": [
    {
      "source": "RegionA",
      "target": "RegionB",
      "rtt": 25
    },
    ...
  ]
}
```

#### Coordinates Data Format

```json
{
  "regions": {
    "North America": {
      "New York": [-74.0060, 40.7128],
      "Chicago": [-87.6298, 41.8781],
      ...
    },
    "Europe": {
      "London": [-0.1278, 51.5074],
      ...
    },
    ...
  }
}
```

#### Required Connections Format

```json
{
  "connections": [
    { 
      "source": "RegionA", 
      "target": "RegionB", 
      "latency": 25 
    },
    ...
  ]
}
```

#### Distant Regions Format

```json
{
  "regions": [
    "London", "Paris", "Mumbai", "Singapore", ...
  ],
  "specialCombinations": [
    ["London", "Mumbai", "Singapore"],
    ["Paris", "Mumbai", "Hong Kong"],
    ...
  ]
}
```

## Core Components

### NetworkGraph

The `NetworkGraph` class (`src/utils/network/NetworkGraph.ts`) is the central component that:

1. Constructs a weighted graph from the latency data
2. Implements algorithms for path finding (shortest, longest, alternative paths)
3. Provides path reconstruction with detailed hop information
4. Implements a caching system for efficient path calculations
5. Dynamically loads all configuration from JSON files without hard-coded values

Key features:
- Efficient adjacency list representation
- Priority queue implementation using a binary heap
- Hub node determination based on connection density rather than hard-coding
- Validation and automatic fixing of graph issues (isolated nodes, bidirectional consistency)
- Multi-tier caching system with statistics

### useNetworkGraph Hook

The `useNetworkGraph` hook (`src/hooks/useNetworkGraph.ts`) manages:

1. Network graph state and initialization
2. Data loading with comprehensive fallback mechanisms
3. Region selection and path calculation
4. Web Worker communication for CPU-intensive calculations
5. Error handling and loading states

### Data Loading Utilities

Several utilities handle the loading of data from JSON files:

1. **loadLatencyData.ts**: Loads RTT values between regions
   - Attempts to load from primary JSON file
   - Falls back to backup data if primary fails
   - Adds essential connections to ensure connectivity

2. **loadCoordinatesData.ts**: Loads geographic coordinates
   - Supports hierarchical continent-region structure
   - Provides fallback mechanisms for missing coordinates
   - Handles special cases like region name variations

3. **jsonLoader.ts**: Generic utility for safe JSON loading
   - Handles various error conditions
   - Provides typed loading with schema validation
   - Supports both synchronous and asynchronous loading

## Algorithms and Implementation

### Path Finding Algorithms

1. **Shortest Path**: Dijkstra's algorithm with priority queue (O(E log V))
   ```typescript
   findShortestPath(start: string, end: string): Path | null
   ```
   - Optimized with early termination when destination is reached
   - Enhanced with hop detail information for visualization
   - Caching for repeated calculations

2. **k-Shortest Paths**: Edge deletion based approach
   ```typescript
   findKShortestPaths(start: string, end: string, k: number): Path[]
   ```
   - Finds alternative paths by temporarily removing edges
   - Ensures path diversity for redundancy planning
   - Caches results for performance

3. **Longest Path**: Multi-strategy approach using distant regions
   ```typescript
   findLongestPathBetween(start: string, end: string): Path | null
   ```
   - Uses special combinations of distant regions
   - Dynamically loads distant region configuration from JSON
   - Combines multiple paths while checking for cycles

### Caching System

The `PathCache` class implements a sophisticated caching system:

1. Three separate caches optimize performance:
   - `shortestPathCache`: For shortest path calculations
   - `longestPathCache`: For longest path calculations
   - `kPathsCache`: For k-shortest paths calculations

2. Optimizations:
   - Bidirectional caching for undirected graph 
   - Cache statistics tracking for monitoring
   - Size-limited cache with LRU eviction policy

3. Implementation:
   ```typescript
   class PathCache<T> {
     get(key: string): T | undefined
     set(key: string, value: T): void
     has(key: string): boolean
     clear(): void
     getStats(): CacheStats
   }
   ```

### Web Worker Implementation

CPU-intensive path calculations are offloaded to a Web Worker:

1. **pathFinder.worker.ts**: Handles path calculations in a separate thread
   - Prevents UI freezing during complex computations
   - Uses structured message passing for communication
   - Maintains its own cache for performance

2. Message Types:
   ```typescript
   enum WorkerMessageType {
     INITIALIZE,
     FIND_SHORTEST_PATH,
     FIND_K_SHORTEST_PATHS,
     FIND_LONGEST_PATH_BETWEEN,
     FIND_LONGEST_PATH,
     // ... response types ...
   }
   ```

## Visualization Components

### Network Visualizer

The `NetworkVisualizer` component (`src/components/NetworkVisualizer.tsx`) implements:

1. Interactive force-directed graph using D3.js
   - Dynamic node positioning based on geographic coordinates
   - Force simulation for natural graph layout
   - Draggable nodes with pinning capability

2. Path visualization features:
   - Path highlighting with different colors for path types
   - Animated particles for data flow visualization
   - Hover effects for exploration
   - Labels for region names and RTT values

3. Technical optimizations:
   - SVG rendering for smooth interactions
   - Throttled updates to prevent rendering thrashing
   - Optimized D3 force configuration

### World Map Visualizer

The `WorldMapVisualizer` component (`src/components/WorldMapVisualizer.tsx`) provides:

1. Geographic visualization using D3.js projections
   - Mercator projection optimized for region distribution
   - Region markers positioned by actual coordinates
   - Continent labeling for context

2. Path visualization:
   - Great-circle arcs between regions
   - Directional arrows showing flow direction
   - Color-coded paths for different path types
   - Animated particles along paths

3. Interaction features:
   - Pan and zoom for exploration
   - Tooltips with detailed information
   - Highlighting on hover

### Latency Chart

The `LatencyChart` component (`src/components/LatencyChart.tsx`) provides:

1. Comparative visualizations using Chart.js
   - Bar charts for direct latency comparison
   - Doughnut charts for proportion visualization
   - RTT breakdown by hop

2. Interactive features:
   - Tooltips with detailed metrics
   - Highlighting on hover
   - Responsive resizing

3. Enhanced display:
   - Color-coding matching other visualizations
   - Animated transitions
   - Clear labeling and legends

### Route Card

The `RouteCard` component (`src/components/RouteCard.tsx`) shows:

1. Detailed path information
   - Complete route with all hops
   - RTT values for each hop
   - Both average and minimum RTT metrics

2. Interactive features:
   - Expandable/collapsible sections
   - Copy functionality for sharing
   - Tooltips with additional information

3. Visual enhancements:
   - Progress bars for latency comparison
   - Color-coding matching other visualizations
   - Responsive layout for different screen sizes

## Error Handling and Resilience

The application implements several layers of error handling:

1. **Data Loading**: Multi-tier fallback mechanisms
   - Primary data files with backup JSON files
   - Fallbacks for essential configuration
   - Graceful degradation with meaningful error messages

2. **Path Calculation**: Robust validation
   - Check for invalid or non-existent regions
   - Validation to ensure paths are valid and cycle-free
   - Fallback for disconnected regions

3. **Visualization**: Graceful degradation
   - Placeholder visualization when data is incomplete
   - Reasonable defaults for missing properties
   - Clear user feedback during loading and errors

4. **Network Graph Construction**: Auto-repair mechanisms
   - Detection and fixing of isolated nodes
   - Ensures bidirectional consistency
   - Verifies critical connections exist

5. **Error Boundaries and Recovery**:
   - React error boundaries to prevent complete app crashes
   - Recovery mechanisms like "Retry" functionality
   - Clear error reporting with actionable information

## Performance Optimizations

1. **Efficient Data Structures**:
   - Adjacency list representation for the graph (O(V+E) space)
   - Binary heap for the priority queue (O(log n) operations)
   - Map-based lookups for constant-time checking (O(1))

2. **Caching Strategy**:
   - In-memory caching of calculated paths
   - Bidirectional caching for undirected graphs
   - Size-limited cache with LRU eviction

3. **Rendering Optimizations**:
   - Lazy-loaded components with Suspense
   - Code-splitting for reduced initial load time
   - Throttled updates to prevent rendering thrashing
   - Conditional rendering of complex elements

4. **Computational Distribution**:
   - Web Workers for CPU-intensive tasks
   - Properly scoped calculations to minimize recalculation
   - Abortable requests for cancellation when needed

5. **Resource Management**:
   - Proper cleanup of D3 visualizations
   - Memory leak prevention with useEffect cleanup
   - Disposal of heavyweight resources when not needed

## RTT Data Maintenance

### RTT Update Utility

A Node.js utility in the `/tools` directory provides easy maintenance of RTT data:

```bash
# Update a single RTT value
node update-rtt.js "Source Region" "Target Region" RTT_VALUE

# Import RTT values from CSV
node update-rtt.js --import path/to/your-file.csv

# Verify data consistency
node update-rtt.js --verify
```

### Update Process Features

1. **Individual Updates**: Update RTT between specific regions
   - Updates both directions automatically
   - Creates backup files for safety
   - Updates related files for consistency

2. **Bulk Updates via CSV**: Import multiple RTT values at once
   - CSV format with source, target, and RTT columns
   - Batch processing with validation
   - Consistent updates across all related files

3. **Verification**: Check data consistency
   - Validates primary data against backup
   - Verifies required connections match latency data
   - Ensures bidirectional consistency
   - Checks fallback files are in sync

### Adding New Regions

Process for adding new regions to the application:

1. Add the region's coordinates to `coordinates-data.json` under the appropriate continent
2. Add necessary connections to the region in `latency-data.json`
3. If it's a major hub, add connections to `required-connections.json`
4. Update fallback files for consistency
5. Run the verification tool to ensure everything is consistent

## Development and Deployment

### Development Environment

The application uses modern front-end tooling:

1. **Vite**: Fast build tool and development server
   - Hot Module Replacement for rapid development
   - Optimized production builds
   - Support for TypeScript and JSX

2. **TypeScript**: Type-safe JavaScript
   - Strict mode for maximum type safety
   - Path aliases for cleaner imports
   - Interface-driven development

3. **React**: UI library with functional components
   - Hooks-based state management
   - Error boundaries for resilience
   - Lazy loading and Suspense for performance

### Project Structure

```
/route-rtt-viz/
├── public/                     # Static files and data
│   ├── latency-data.json       # Primary network latency data
│   └── ...                     # Other data files
├── src/
│   ├── components/             # UI components
│   │   ├── common/             # Common UI components
│   │   ├── layout/             # Layout components
│   │   └── ...                 # Visualization components
│   ├── hooks/                  # Custom React hooks
│   │   └── useNetworkGraph.ts  # Network data management hook
│   ├── utils/                  # Utility functions
│   │   ├── network/            # Network graph implementation
│   │   ├── data-structures/    # Custom data structures
│   │   └── ...                 # Other utilities
│   ├── workers/                # Web Workers
│   │   └── pathFinder.worker.ts # Path calculation worker
│   ├── types/                  # TypeScript type definitions
│   ├── App.tsx                 # Main application component
│   └── main.tsx                # Application entry point
├── tools/                      # Maintenance utilities
│   ├── update-rtt.js           # RTT update utility
│   └── package.json            # Tool dependencies
├── docs/                       # Documentation
├── README.md                   # Project overview
└── ...                         # Configuration files
```

### Build and Deployment

1. **Development**:
   ```bash
   npm install
   npm run dev
   ```

2. **Production Build**:
   ```bash
   npm run build
   ```

3. **Deployment Considerations**:
   - Static file hosting (the app has no server-side requirements)
   - CDN for faster loading of data files and assets
   - Cache control for optimal performance

## Future Enhancement Considerations

1. **Remote Data Loading**: 
   - Support for loading data from remote APIs
   - Real-time updates via WebSockets
   - Integration with monitoring systems

2. **Advanced Caching Strategies**: 
   - IndexedDB for persistent caching
   - Time-based expiration
   - Enhanced LRU with priority weighting

3. **Performance Monitoring**: 
   - Real-time latency measurements
   - User-driven reporting of actual network performance
   - Anomaly detection in latency patterns

4. **User Configuration**: 
   - Allow users to upload custom data files
   - User-defined visualization preferences
   - Custom weighting for path calculations

5. **Enhanced Visualizations**:
   - 3D globe visualization with Three.js
   - Time-series analysis of latency patterns
   - Heatmap overlays for regional performance

6. **Advanced Algorithms**:
   - Machine learning for predicting network congestion
   - Time-aware routing based on historical patterns
   - Multi-criteria optimization for path selection