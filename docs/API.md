# Route Radar API Documentation

## Data File Formats

### Latency Data

**File:** `public/latency-data.json`

```json
{
  "connections": [
    {
      "source": "us-east-1",
      "target": "eu-west-1",
      "rtt": 85.5
    }
  ]
}
```

### Region Coordinates

**File:** `public/coordinates-data.json`

```json
{
  "regions": {
    "North America": {
      "us-east-1": [-74.0060, 40.7128],
      "us-west-2": [-122.4194, 37.7749]
    },
    "Europe": {
      "eu-west-1": [-6.2603, 53.4129]
    }
  }
}
```

### Required Connections

**File:** `public/required-connections.json`

```json
{
  "connections": [
    {
      "source": "us-east-1",
      "target": "us-west-2",
      "latency": 65
    }
  ]
}
```

## Web Workers API

### Path Finder Worker

**File:** `src/workers/pathFinder.worker.ts`

**Message Types:**

```typescript
export enum WorkerMessageType {
  INITIALIZE = 'INITIALIZE',
  FIND_SHORTEST_PATH = 'FIND_SHORTEST_PATH',
  FIND_K_SHORTEST_PATHS = 'FIND_K_SHORTEST_PATHS',
  FIND_LONGEST_PATH = 'FIND_LONGEST_PATH'
}
```

**Example Usage:**

```typescript
const worker = new Worker('/pathFinder.worker.js');

worker.postMessage({
  type: WorkerMessageType.FIND_SHORTEST_PATH,
  source: 'us-east-1',
  target: 'eu-west-1'
});

worker.onmessage = (event) => {
  const { type, path } = event.data;
  // Handle path result
};
```

## React Hooks

### useNetworkGraph

```typescript
import { useNetworkGraph } from '@/hooks/useNetworkGraph';

const {
  graph,
  error,
  isLoading,
  selectedSource,
  selectedTarget,
  setSelectedSource,
  setSelectedTarget,
  paths,
  shortestPath,
  longestPath,
  handleCalculatePaths
} = useNetworkGraph();
```

### usePathCache

```typescript
import { usePathCache } from '@/hooks/useCache';

const {
  data,
  save,
  invalidate,
  clear
} = usePathCache(source, target);
```

## Visualization Components

### NetworkVisualizer

```typescript
import { NetworkVisualizer } from '@/components/NetworkVisualizer';

<NetworkVisualizer
  data={graph}
  selectedNode={selectedSource}
  selectedPath={shortestPath}
  containerRef={containerRef}
/>
```

### WorldMapVisualizer

```typescript
import { WorldMapVisualizer } from '@/components/WorldMapVisualizer';

<WorldMapVisualizer
  selectedSource={selectedSource}
  selectedTarget={selectedTarget}
  paths={paths}
  longestPath={longestPath}
/>
```

## Utility Functions

### loadLatencyData

```typescript
import { loadLatencyData } from '@/utils/loadLatencyData';

const latencyData = await loadLatencyData(loadFunction);
```

### loadCoordinatesData

```typescript
import { loadCoordinatesData } from '@/utils/loadCoordinatesData';

const coordinates = await loadCoordinatesData(loadFunction);
```

## Constants

### Path Types

```typescript
export enum PathType {
  SHORTEST = 'SHORTEST',
  ALTERNATIVE = 'ALTERNATIVE',
  LONGEST = 'LONGEST'
}
```

### Cache Sizes

```typescript
export const CACHE_SIZES = {
  PATH_CACHE: 1000,
  NETWORK_DATA_CACHE: 5,
  UI_STATE_CACHE: 100,
  CALCULATION_CACHE: 500
} as const;
```

## Error Handling

The application uses custom error types for better error handling:

```typescript
import { NetworkError, DataError, WorkerError } from '@/types/errors';

try {
  // Network operations
} catch (error) {
  if (error instanceof NetworkError) {
    // Handle network errors
  }
}
```
