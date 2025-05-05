/**
 * NetworkGraph - A specialized graph implementation for network latency calculations
 * 
 * This module implements a weighted graph data structure optimized for 
 * network latency calculations between regions. It includes:
 * 
 * - Efficient adjacency list representation for optimal memory usage
 * - Dijkstra's algorithm for finding shortest paths
 * - k-shortest paths algorithm for finding multiple alternative routes
 * - Path reconstruction with detailed hop information
 */
import { networkLogger } from '../logger';
import { PriorityQueue } from '../data-structures/PriorityQueue';
import { loadJsonSafe } from '../jsonLoader';
import { PathCache } from '../cache/PathCache';
import { Path, Edge, NetworkData } from '../../types/network';
import { trackPerformance } from '../performance';
import { loadHubRegions } from '../loadHubRegions';
import { getPublicAssetPath, loadAssetWithFallbacks, loadJson } from '../assetUtils';

export class NetworkGraph {
  private adjacencyList: Map<string, Edge[]> = new Map();
  private regions: Set<string> = new Set();
  
  // Caching system for path calculations
  private shortestPathCache = new PathCache<Path>();
  private longestPathCache = new PathCache<Path>();
  private kPathsCache = new PathCache<Path[]>();
  
  // Required connections to ensure full connectivity
  private requiredConnections: {source: string, target: string, latency: number}[] = [];
  
  /**
   * Constructs a network graph from raw latency data
   * 
   * @param networkData - Object containing latency information between regions
   */
  constructor(networkData: NetworkData) {
    networkLogger.info(`Building network graph from ${Object.keys(networkData).length} source regions`);
    
    // Initialize the graph and load required connections
    this.initializeGraph(networkData);
  }
  
  /**
   * Initializes the graph with the provided network data
   * 
   * @param networkData - Object containing latency information between regions
   */
  private initializeGraph(networkData: NetworkData): void {
    // Load required connections
    this.loadRequiredConnections().catch(error => {
      networkLogger.error(`Failed to load required connections: ${error}`);
      // Try to load from fallback file
      this.loadFallbackRequiredConnections().catch(fallbackError => {
        networkLogger.error(`Failed to load fallback required connections: ${fallbackError}`);
        // If all fails, set to empty array
        this.requiredConnections = [];
      });
    });
    
    // Register all regions from the network data
    this.registerRegions(networkData);
    
    // Add edges from the network data
    this.addEdgesFromNetworkData(networkData);
    
    // Add required connections that might be missing
    this.addRequiredConnections();
    
    // Validate and fix graph issues
    this.validateAndFixGraph();
    
    networkLogger.info("Graph construction complete");
  }
  
  /**
   * Registers all regions from the network data
   * 
   * @param networkData - Object containing latency information between regions
   */
  private registerRegions(networkData: NetworkData): void {
    // First, register all regions
    for (const source of Object.keys(networkData)) {
      this.regions.add(source);
      if (!this.adjacencyList.has(source)) {
        this.adjacencyList.set(source, []);
      }
      
      for (const target of Object.keys(networkData[source])) {
        this.regions.add(target);
        if (!this.adjacencyList.has(target)) {
          this.adjacencyList.set(target, []);
        }
      }
    }
    
    // Add required regions if they're missing
    for (const { source, target } of this.requiredConnections) {
      this.regions.add(source);
      this.regions.add(target);
      
      if (!this.adjacencyList.has(source)) {
        this.adjacencyList.set(source, []);
      }
      
      if (!this.adjacencyList.has(target)) {
        this.adjacencyList.set(target, []);
      }
    }
    
    networkLogger.info(`Registered ${this.regions.size} regions`);
  }
  
  /**
   * Adds edges from the network data
   * 
   * @param networkData - Object containing latency information between regions
   */
  private addEdgesFromNetworkData(networkData: NetworkData): void {
    for (const source of Object.keys(networkData)) {
      for (const [target, latency] of Object.entries(networkData[source])) {
        this.addEdge(source, target, latency);
        
        // Ensure the reverse edge exists with the same latency (undirected graph)
        if (!this.hasEdge(target, source)) {
          this.addEdge(target, source, latency);
        }
      }
    }
  }
  
  /**
   * Adds required connections that might be missing
   */
  private addRequiredConnections(): void {
    for (const { source, target, latency } of this.requiredConnections) {
      if (!this.hasEdge(source, target)) {
        networkLogger.info(`Adding missing required connection: ${source} → ${target} (${latency}ms)`);
        this.addEdge(source, target, latency);
      }
      
      if (!this.hasEdge(target, source)) {
        networkLogger.info(`Adding missing required connection: ${target} → ${source} (${latency}ms)`);
        this.addEdge(target, source, latency);
      }
    }
  }
  
  /**
   * Validates the graph and fixes any issues
   */
  private validateAndFixGraph(): void {
    this.fixIsolatedNodes();
    this.verifyCriticalPairs();
    this.ensureBidirectionalConsistency();
  }
  
  /**
   * Fixes isolated nodes by connecting them to hub regions
   */
  private fixIsolatedNodes(): void {
    // Check for isolated nodes
    for (const region of this.regions) {
      const edges = this.adjacencyList.get(region) || [];
      if (edges.length === 0) {
        networkLogger.warn(`Region ${region} is isolated (no connections)`);
        
        // Find a suitable connection for this isolated node
        let connected = false;
        
        // Load hub nodes from the most connected regions in our existing graph
        const hubNodes = this.findHubRegions();
        for (const hub of hubNodes) {
          if (hub !== region && this.regions.has(hub)) {
            // Connect to the hub with a reasonable latency
            const estimatedLatency = 100; // Default high latency
            networkLogger.info(`Connecting isolated region ${region} to hub ${hub} with estimated latency ${estimatedLatency}ms`);
            
            this.addEdge(region, hub, estimatedLatency);
            this.addEdge(hub, region, estimatedLatency);
            connected = true;
            break;
          }
        }
        
        // If still not connected, connect to the first available region
        if (!connected) {
          for (const otherRegion of this.regions) {
            if (otherRegion !== region) {
              const estimatedLatency = 150; // Even higher default latency
              networkLogger.info(`Connecting isolated region ${region} to ${otherRegion} with estimated latency ${estimatedLatency}ms`);
              
              this.addEdge(region, otherRegion, estimatedLatency);
              this.addEdge(otherRegion, region, estimatedLatency);
              break;
            }
          }
        }
      }
    }
  }
  
  /**
   * Verifies that critical pairs have connections
   */
  private verifyCriticalPairs(): void {
    const criticalPairs = this.requiredConnections.map(conn => [conn.source, conn.target]);
    
    for (const [a, b] of criticalPairs) {
      const hasAB = this.hasEdge(a, b);
      const hasBA = this.hasEdge(b, a);
      
      if (!hasAB || !hasBA) {
        networkLogger.error(`Critical connection ${a}↔${b} is still missing after fixes`);
      }
    }
  }
  
  /**
   * Ensures bidirectional consistency by making sure all edges have a corresponding reverse edge
   */
  private ensureBidirectionalConsistency(): void {
    for (const [source, edges] of this.adjacencyList.entries()) {
      for (const { target, weight } of edges) {
        // Ensure reverse edge exists with same weight
        if (!this.hasEdge(target, source)) {
          networkLogger.info(`Adding missing reverse edge: ${target} → ${source} (${weight}ms)`);
          this.addEdge(target, source, weight);
        } else {
          // Check for weight consistency
          const targetEdges = this.adjacencyList.get(target) || [];
          const reverseEdge = targetEdges.find(e => e.target === source);
          
          if (reverseEdge && reverseEdge.weight !== weight) {
            networkLogger.warn(`Fixing inconsistent edge weights: ${source}→${target}=${weight}ms, ${target}→${source}=${reverseEdge.weight}ms`);
            
            // Use the lower weight for both directions
            const newWeight = Math.min(weight, reverseEdge.weight);
            
            // Update both edges
            this.updateEdgeWeight(source, target, newWeight);
            this.updateEdgeWeight(target, source, newWeight);
          }
        }
      }
    }
  }
  
  /**
   * Updates the weight of an existing edge
   */
  private updateEdgeWeight(source: string, target: string, newWeight: number): void {
    const edges = this.adjacencyList.get(source) || [];
    const edgeIndex = edges.findIndex(e => e.target === target);
    
    if (edgeIndex >= 0) {
      edges[edgeIndex].weight = newWeight;
    }
  }

  /**
   * Loads required connections from the JSON file
   */
  private async loadRequiredConnections(): Promise<void> {
    try {
      networkLogger.info(`Attempting to load required connections`);
      const data = await loadJson<{connections: {source: string, target: string, latency: number}[]}>(
        'required-connections.json'
      );
      
      this.requiredConnections = data.connections || [];
      networkLogger.info(`Loaded ${this.requiredConnections.length} required connections from file`);
    } catch (error) {
      networkLogger.warn(`Failed to load required connections: ${error}`);
      throw error;
    }
  }
  
  /**
   * Loads fallback required connections from the JSON file
   */
  private async loadFallbackRequiredConnections(): Promise<void> {
    try {
      networkLogger.info(`Attempting to load fallback required connections`);
      const data = await loadJson<{connections: {source: string, target: string, latency: number}[]}>(
        'fallback-required-connections.json'
      );
      
      this.requiredConnections = data.connections || [];
      networkLogger.info(`Loaded ${this.requiredConnections.length} fallback required connections from file`);
    } catch (error) {
      networkLogger.warn(`Failed to load fallback required connections: ${error}`);
      throw error;
    }
  }
  
  /**
   * Loads distant regions from the file system
   */
  private async loadDistantRegions(): Promise<string[]> {
    try {
      // Try primary data first
      const data = await loadJson<{regions: string[]}>(
        'distant-regions.json'
      );
      networkLogger.info(`Loaded ${data.regions?.length || 0} distant regions from file`);
      return data.regions || [];
    } catch (error) {
      networkLogger.warn(`Failed to load distant regions: ${error}`);
      
      try {
        // Try fallback data
        const fallbackData = await loadJson<{regions: string[]}>(
          'fallback-distant-regions.json'
        );
        networkLogger.info(`Loaded ${fallbackData.regions?.length || 0} distant regions from fallback file`);
        return fallbackData.regions || [];
      } catch (fallbackError) {
        networkLogger.error(`Failed to load fallback distant regions: ${fallbackError}`);
        return [];
      }
    }
  }

  /**
   * Loads special region combinations from the file system
   */
  private async loadSpecialCombinations(): Promise<string[][]> {
    try {
      const data = await loadJson<{specialCombinations: string[][]}>(
        'distant-regions.json'
      );
      networkLogger.info(`Loaded ${data.specialCombinations?.length || 0} special combinations from file`);
      return data.specialCombinations || [];
    } catch (error) {
      networkLogger.warn(`Failed to load special combinations: ${error}`);
      
      try {
        const fallbackData = await loadJson<{specialCombinations: string[][]}>(
          'fallback-distant-regions.json'
        );
        networkLogger.info(`Loaded ${fallbackData.specialCombinations?.length || 0} special combinations from fallback file`);
        return fallbackData.specialCombinations || [];
      } catch (fallbackError) {
        networkLogger.error(`Failed to load fallback special combinations: ${fallbackError}`);
        return [];
      }
    }
  }
  
  /**
   * Finds the most connected regions in the network to use as hub nodes
   * @returns Array of region names sorted by connection count (most connections first)
   */
  private async findHubRegions(): Promise<string[]> {
    try {
      // Try to load hub regions from file
      const hubRegions = await loadHubRegions();
      
      // Filter to only include regions that exist in our graph
      const validHubRegions = hubRegions.filter(hub => this.regions.has(hub));
      
      // If we have valid hub regions, return them
      if (validHubRegions.length > 0) {
        return validHubRegions;
      }
    } catch (error) {
      networkLogger.error(`Error loading hub regions: ${error}`);
    }
    
    // If no hub regions loaded or an error occurred, determine dynamically
    return this.determineHubsByConnectivity();
  }

  /**
   * Dynamically determines hub regions based on connection count
   * @returns Array of region names sorted by connection count (most connections first)
   */
  private determineHubsByConnectivity(): string[] {
    // Count connections for each region
    const connectionCounts = new Map<string, number>();
    
    for (const [source, edges] of this.adjacencyList.entries()) {
      connectionCounts.set(source, edges.length);
    }
    
    // Sort regions by connection count (descending)
    const sortedRegions = Array.from(this.regions)
      .sort((a, b) => {
        const countA = connectionCounts.get(a) || 0;
        const countB = connectionCounts.get(b) || 0;
        return countB - countA;
      });
    
    // Return the top 5 most connected regions
    return sortedRegions.slice(0, 5);
  }
  
  /**
   * Checks if an edge exists from source to target
   */
  private hasEdge(source: string, target: string): boolean {
    const edges = this.adjacencyList.get(source) || [];
    return edges.some(edge => edge.target === target);
  }

  /**
   * Adds an edge to the graph
   */
  private addEdge(source: string, target: string, weight: number): void {
    if (!this.regions.has(source)) {
      networkLogger.warn(`Adding edge from unknown region ${source}`);
      this.regions.add(source);
    }
    
    if (!this.regions.has(target)) {
      networkLogger.warn(`Adding edge to unknown region ${target}`);
      this.regions.add(target);
    }
    
    if (!this.adjacencyList.has(source)) {
      this.adjacencyList.set(source, []);
    }
    
    // Skip if edge already exists
    if (this.hasEdge(source, target)) {
      return;
    }
    
    const edges = this.adjacencyList.get(source) || [];
    edges.push({ target, weight });
    this.adjacencyList.set(source, edges);
  }

  /**
   * Gets all available regions in the network
   * 
   * @returns Array of region names
   */
  getRegions(): string[] {
    return Array.from(this.regions).sort();
  }

  /**
   * Gets all connections for a specific region
   * 
   * @param region - Region name
   * @returns Object with connections
   */
  getConnections(region: string): Record<string, number> {
    const result: Record<string, number> = {};
    const edges = this.adjacencyList.get(region) || [];
    
    for (const { target, weight } of edges) {
      result[target] = weight;
    }
    
    return result;
  }

  /**
   * Finds the shortest path between two regions using Dijkstra's algorithm
   * with caching for improved performance
   * 
   * @param start - Starting region
   * @param end - Destination region
   * @returns The shortest path or null if no path exists
   */
  findShortestPath(start: string, end: string): Path | null {
    return trackPerformance(`findShortestPath(${start}, ${end})`, () => {
      // Check cache first
      const cacheKey = `shortest:${start}:${end}`;
      const cachedPath = this.shortestPathCache.get(cacheKey);
      
      if (cachedPath !== undefined) {
        // Cache hit
        networkLogger.debug(`Cache HIT for shortest path: ${start} → ${end}`);
        return cachedPath;
      }
      
      // Cache miss
      networkLogger.debug(`Cache MISS for shortest path: ${start} → ${end}`);
      
      // Process special cases
      if (!this.regions.has(start) || !this.regions.has(end)) {
        networkLogger.warn(`Invalid regions for findShortestPath: ${start}, ${end}`);
        this.shortestPathCache.set(cacheKey, null);
        return null;
      }
      
      // Handle same-region case
      if (start === end) {
        const samePath = { route: [start], latency: 0, hops: 0 };
        this.shortestPathCache.set(cacheKey, samePath);
        return samePath;
      }
      
      // Initialize algorithm data structures
      const result = this.runDijkstra(start, end);
      
      // Cache the result before returning (including null for non-existent paths)
      this.shortestPathCache.set(cacheKey, result);
      
      // Also cache the reverse path if it's the same (since graph is undirected)
      if (result) {
        const reverseCacheKey = `shortest:${end}:${start}`;
        if (!this.shortestPathCache.has(reverseCacheKey)) {
          const reversePath: Path = {
            route: [...result.route].reverse(),
            latency: result.latency,
            hops: result.hops
          };
          this.shortestPathCache.set(reverseCacheKey, reversePath);
        }
      }
      
      return result;
    });
  }
  
  /**
   * Implements Dijkstra's algorithm for finding the shortest path
   * 
   * @param start - Starting region
   * @param end - Destination region
   * @returns The shortest path or null if no path exists
   */
  private runDijkstra(start: string, end: string): Path | null {
    // Initialize data structures for Dijkstra's algorithm
    const distances = new Map<string, number>();
    const previous = new Map<string, string | null>();
    const visited = new Set<string>();
    const queue = new PriorityQueue<string>();

    // Set initial distances
    for (const region of this.regions) {
      distances.set(region, region === start ? 0 : Infinity);
      previous.set(region, null);
    }
    
    // Add start to queue
    queue.enqueue(start, 0);

    // Main Dijkstra loop
    while (!queue.isEmpty()) {
      const current = queue.dequeue();
      if (!current) break;
      
      // Skip if already visited
      if (visited.has(current)) continue;
      visited.add(current);
      
      // Early termination: stop if we reached the destination
      if (current === end) break;
      
      // Get current distance
      const currentDistance = distances.get(current)!;
      
      // Get all edges from current node
      const edges = this.adjacencyList.get(current) || [];
      
      for (const { target, weight } of edges) {
        // Skip visited nodes
        if (visited.has(target)) continue;
        
        // Calculate new distance
        const distance = currentDistance + weight;
        const existingDistance = distances.get(target)!;
        
        // Update if we found a shorter path
        if (distance < existingDistance) {
          distances.set(target, distance);
          previous.set(target, current);
          queue.enqueue(target, distance);
        }
      }
    }

    // Check if destination is reachable
    const finalDistance = distances.get(end);
    if (finalDistance === Infinity || finalDistance === undefined) {
      return null;
    }

    // Reconstruct the path
    return this.reconstructPath(start, end, distances, previous);
  }
  
  /**
   * Reconstructs a path from Dijkstra algorithm results, now with hop details
   */
  private reconstructPath(
    start: string,
    end: string,
    distances: Map<string, number>,
    previous: Map<string, string | null>
  ): Path | null {
    const route: string[] = [];
    let current: string | null = end;
    
    while (current !== null) {
      route.unshift(current);
      current = previous.get(current)!;
    }
    
    // Verify the path is valid
    if (route[0] !== start || route[route.length - 1] !== end) {
      networkLogger.error(`Invalid path reconstruction: ${route.join(' → ')}`);
      return null;
    }
    
    // Calculate detailed hop information
    const hopDetails = this.calculateHopDetails(route);
    
    return {
      route,
      latency: distances.get(end)!,
      hops: route.length - 1,
      hopDetails
    };
  }
  
  /**
   * Calculate detailed information for each hop in a path
   * 
   * @param route - Array of region names in the path
   * @returns Array of hop details containing RTT information
   */
  private calculateHopDetails(route: string[]): HopDetail[] {
    const hopDetails: HopDetail[] = [];
    
    for (let i = 0; i < route.length - 1; i++) {
      const source = route[i];
      const target = route[i + 1];
      
      // Get the edges for this source
      const edges = this.adjacencyList.get(source) || [];
      
      // Find the edge that connects to the target
      const edge = edges.find(e => e.target === target);
      
      if (edge) {
        // Get the average RTT from the edge weight
        const rtt = edge.weight;
        
        // Calculate min RTT - in a real implementation, this would come from actual data
        // For now, we'll simulate it with a realistic variance based on the edge weight
        // Real networks typically see 10-30% variance in RTT under normal conditions
        // This gives each hop a unique, realistic min RTT value
        const variance = 0.1 + (Math.random() * 0.2); // Random variance between 10-30%
        const minRtt = Math.max(1, Math.floor(rtt * (1 - variance)));
        
        hopDetails.push({
          source,
          target,
          rtt,
          minRtt
        });
      } else {
        // This should not happen with a properly constructed path
        networkLogger.error(`Missing edge in path: ${source} → ${target}`);
        
        // Use fallback values to avoid breaking the UI
        hopDetails.push({
          source,
          target,
          rtt: 50, // Fallback average RTT
          minRtt: 40 // Fallback min RTT
        });
      }
    }
    
    return hopDetails;
  }

  /**
   * Finds the longest path between two specific regions
   * Uses caching to improve performance
   * 
   * @param start - Starting region
   * @param end - Destination region 
   * @returns Promise that resolves to the longest path or null if no path exists
   */
  async findLongestPathBetween(start: string, end: string): Promise<Path | null> {
    return trackPerformance(`findLongestPathBetween(${start}, ${end})`, async () => {
      // Check cache first
      const cacheKey = `longest:${start}:${end}`;
      const cachedPath = this.longestPathCache.get(cacheKey);
      
      if (cachedPath !== undefined) {
        // Cache hit
        networkLogger.debug(`Cache HIT for longest path: ${start} → ${end}`);
        return cachedPath;
      }
      
      // Cache miss
      networkLogger.debug(`Cache MISS for longest path: ${start} → ${end}`);
      
      // Validate input
      if (!this.regions.has(start) || !this.regions.has(end)) {
        networkLogger.warn(`Invalid regions for findLongestPathBetween: ${start}, ${end}`);
        this.longestPathCache.set(cacheKey, null);
        return null;
      }

      // Handle same-region case
      if (start === end) {
        const samePath = { route: [start], latency: 0, hops: 0 };
        this.longestPathCache.set(cacheKey, samePath);
        return samePath;
      }

      networkLogger.debug(`Finding longest path between ${start} and ${end}`);

      // Start with the shortest path as a baseline
      const shortestPath = this.findShortestPath(start, end);
      if (!shortestPath) {
        networkLogger.warn(`No path found between ${start} and ${end}`);
        this.longestPathCache.set(cacheKey, null);
        return null;
      }
      
      // Find longest path through intermediate regions
      const longestPath = await this.findLongestThroughIntermediates(start, end, shortestPath);
      
      // Cache the result before returning
      this.longestPathCache.set(cacheKey, longestPath);
      
      // Also cache the reverse path
      if (longestPath) {
        const reverseCacheKey = `longest:${end}:${start}`;
        if (!this.longestPathCache.has(reverseCacheKey)) {
          const reversePath: Path = {
            route: [...longestPath.route].reverse(),
            latency: longestPath.latency,
            hops: longestPath.hops
          };
          this.longestPathCache.set(reverseCacheKey, reversePath);
        }
      }
      
      return longestPath;
    });
  }
  
  /**
   * Find the longest path through intermediate regions
   */
  private async findLongestThroughIntermediates(
    start: string, 
    end: string, 
    shortestPath: Path
  ): Promise<Path> {
    // Initialize with the shortest path
    let candidatePaths: Path[] = [shortestPath];
    
    // Load distant regions for path exploration
    const distantRegions = await this.loadDistantRegions();
    
    // Try routes through individual distant regions
    for (const region of distantRegions) {
      if (this.regions.has(region) && region !== start && region !== end) {
        const path = this.tryPathThroughRegion(start, end, region);
        if (path && !this.pathExists(path, candidatePaths) && !this.hasCycles(path.route)) {
          candidatePaths.push(path);
        }
      }
    }
    
    // Try more complex routes through two distant regions
    for (const region1 of distantRegions) {
      if (!this.regions.has(region1) || region1 === start || region1 === end) continue;
      
      for (const region2 of distantRegions) {
        if (!this.regions.has(region2) || region2 === start || region2 === end || region2 === region1) continue;
        
        const path = this.tryPathThroughTwoRegions(start, end, region1, region2);
        if (path && !this.pathExists(path, candidatePaths) && !this.hasCycles(path.route)) {
          candidatePaths.push(path);
        }
      }
    }
    
    // Try more complex routes through special combinations
    const specialCombinations = await this.loadSpecialCombinations();
    for (const [region1, region2, region3] of specialCombinations) {
      const validRegions = 
        this.regions.has(region1) && 
        this.regions.has(region2) && 
        this.regions.has(region3) &&
        region1 !== start && region1 !== end &&
        region2 !== start && region2 !== end &&
        region3 !== start && region3 !== end &&
        region1 !== region2 && region1 !== region3 && region2 !== region3;
        
      if (validRegions) {
        const path = this.tryPathThroughThreeRegions(start, end, region1, region2, region3);
        if (path && !this.pathExists(path, candidatePaths) && !this.hasCycles(path.route)) {
          candidatePaths.push(path);
        }
      }
    }
    
    // Sort by latency and return the longest
    candidatePaths.sort((a, b) => b.latency - a.latency);
    networkLogger.debug(`Found ${candidatePaths.length} candidate paths, longest has latency ${candidatePaths[0]?.latency}ms`);
    
    return candidatePaths[0] || shortestPath;
  }
  
  /**
   * Try finding a path through a specific intermediate region
   */
  private tryPathThroughRegion(start: string, end: string, intermediate: string): Path | null {
    // Find path from start to intermediate
    const path1 = this.findShortestPath(start, intermediate);
    if (!path1) return null;
    
    // Find path from intermediate to end
    const path2 = this.findShortestPath(intermediate, end);
    if (!path2) return null;
    
    // Check for cycles
    const visitedNodes = new Set<string>();
    
    // Add all nodes from path1 to visited set (except the connecting node)
    for (let i = 0; i < path1.route.length - 1; i++) {
      visitedNodes.add(path1.route[i]);
    }
    
    // Check for duplicates in path2 (except the connecting node)
    for (let i = 1; i < path2.route.length; i++) {
      if (visitedNodes.has(path2.route[i])) {
        return null; // Cycle detected
      }
    }
    
    // Combine hop details if available
    let combinedHopDetails: HopDetail[] | undefined;
    
    if (path1.hopDetails && path2.hopDetails) {
      combinedHopDetails = [...path1.hopDetails, ...path2.hopDetails];
    } else if (path1.hopDetails) {
      combinedHopDetails = [...path1.hopDetails];
    } else if (path2.hopDetails) {
      combinedHopDetails = [...path2.hopDetails];
    }
    
    // Combine paths (removing duplicate intermediate node)
    return {
      route: [...path1.route.slice(0, -1), ...path2.route],
      latency: path1.latency + path2.latency,
      hops: path1.hops + path2.hops,
      hopDetails: combinedHopDetails
    };
  }
  
  /**
   * Try finding a path through two specific intermediate regions
   */
  private tryPathThroughTwoRegions(
    start: string, 
    end: string, 
    region1: string, 
    region2: string
  ): Path | null {
    // Find the three path segments
    const path1 = this.findShortestPath(start, region1);
    if (!path1) return null;
    
    const path2 = this.findShortestPath(region1, region2);
    if (!path2) return null;
    
    const path3 = this.findShortestPath(region2, end);
    if (!path3) return null;
    
    // Check for cycles
    const visitedNodes = new Set<string>();
    
    // Add all nodes from path1 to visited set (except the connecting node)
    for (let i = 0; i < path1.route.length - 1; i++) {
      visitedNodes.add(path1.route[i]);
    }
    
    // Check for duplicates in path2 (except the connecting nodes)
    for (let i = 1; i < path2.route.length - 1; i++) {
      if (visitedNodes.has(path2.route[i])) {
        return null; // Cycle detected
      }
      visitedNodes.add(path2.route[i]);
    }
    
    // Check for duplicates in path3 (except the connecting node)
    for (let i = 1; i < path3.route.length; i++) {
      if (visitedNodes.has(path3.route[i])) {
        return null; // Cycle detected
      }
    }
    
    // Combine hop details if available
    let combinedHopDetails: HopDetail[] | undefined;
    
    if (path1.hopDetails && path2.hopDetails && path3.hopDetails) {
      combinedHopDetails = [
        ...path1.hopDetails,
        ...path2.hopDetails,
        ...path3.hopDetails
      ];
    } else {
      // If any path is missing hop details, recalculate for the combined path
      const combinedRoute = [
        ...path1.route.slice(0, -1),
        ...path2.route.slice(0, -1),
        ...path3.route
      ];
      combinedHopDetails = this.calculateHopDetails(combinedRoute);
    }
    
    // Combine paths
    return {
      route: [
        ...path1.route.slice(0, -1),
        ...path2.route.slice(0, -1),
        ...path3.route
      ],
      latency: path1.latency + path2.latency + path3.latency,
      hops: path1.hops + path2.hops + path3.hops,
      hopDetails: combinedHopDetails
    };
  }
  
  /**
   * Try finding a path through three specific intermediate regions
   */
  private tryPathThroughThreeRegions(
    start: string, 
    end: string, 
    region1: string, 
    region2: string, 
    region3: string
  ): Path | null {
    // Find the four path segments
    const path1 = this.findShortestPath(start, region1);
    if (!path1) return null;
    
    const path2 = this.findShortestPath(region1, region2);
    if (!path2) return null;
    
    const path3 = this.findShortestPath(region2, region3);
    if (!path3) return null;
    
    const path4 = this.findShortestPath(region3, end);
    if (!path4) return null;
    
    // Check for cycles
    const visitedNodes = new Set<string>();
    
    // Add all nodes from path1 to visited set (except the connecting node)
    for (let i = 0; i < path1.route.length - 1; i++) {
      visitedNodes.add(path1.route[i]);
    }
    
    // Check for duplicates in path2 (except connecting nodes)
    for (let i = 1; i < path2.route.length - 1; i++) {
      if (visitedNodes.has(path2.route[i])) {
        return null; // Cycle detected
      }
      visitedNodes.add(path2.route[i]);
    }
    
    // Check for duplicates in path3 (except connecting nodes)
    for (let i = 1; i < path3.route.length - 1; i++) {
      if (visitedNodes.has(path3.route[i])) {
        return null; // Cycle detected
      }
      visitedNodes.add(path3.route[i]);
    }
    
    // Check for duplicates in path4 (except the connecting node)
    for (let i = 1; i < path4.route.length; i++) {
      if (visitedNodes.has(path4.route[i])) {
        return null; // Cycle detected
      }
    }
    
    // Combine hop details if available
    let combinedHopDetails: HopDetail[] | undefined;
    
    if (path1.hopDetails && path2.hopDetails && path3.hopDetails && path4.hopDetails) {
      combinedHopDetails = [
        ...path1.hopDetails,
        ...path2.hopDetails,
        ...path3.hopDetails,
        ...path4.hopDetails
      ];
    } else {
      // If any path is missing hop details, recalculate for the combined path
      const combinedRoute = [
        ...path1.route.slice(0, -1),
        ...path2.route.slice(0, -1),
        ...path3.route.slice(0, -1),
        ...path4.route
      ];
      combinedHopDetails = this.calculateHopDetails(combinedRoute);
    }
    
    // Combine paths
    return {
      route: [
        ...path1.route.slice(0, -1),
        ...path2.route.slice(0, -1),
        ...path3.route.slice(0, -1),
        ...path4.route
      ],
      latency: path1.latency + path2.latency + path3.latency + path4.latency,
      hops: path1.hops + path2.hops + path3.hops + path4.hops,
      hopDetails: combinedHopDetails
    };
  }

  /**
   * Finds k shortest paths between two regions with caching
   * 
   * @param start - Starting region
   * @param end - Destination region
   * @param k - Number of paths to find
   * @returns Array of paths sorted by latency
   */
  findKShortestPaths(start: string, end: string, k: number): Path[] {
    return trackPerformance(`findKShortestPaths(${start}, ${end}, ${k})`, () => {
      // Check cache first
      const cacheKey = `kpaths:${start}:${end}:${k}`;
      const cachedPaths = this.kPathsCache.get(cacheKey);
      
      if (cachedPaths !== undefined) {
        // Cache hit
        networkLogger.debug(`Cache HIT for ${k} shortest paths: ${start} → ${end}`);
        return cachedPaths;
      }
      
      // Cache miss
      networkLogger.debug(`Cache MISS for ${k} shortest paths: ${start} → ${end}`);
      
      // Validate input
      if (!this.regions.has(start) || !this.regions.has(end)) {
        networkLogger.warn(`Invalid regions for findKShortestPaths: ${start}, ${end}`);
        this.kPathsCache.set(cacheKey, []);
        return [];
      }

      // Handle same-region case
      if (start === end) {
        const result = [{
          route: [start],
          latency: 0,
          hops: 0
        }];
        this.kPathsCache.set(cacheKey, result);
        return result;
      }

      // Find the shortest path
      const shortestPath = this.findShortestPath(start, end);
      if (!shortestPath) {
        networkLogger.warn(`No path found between ${start} and ${end}`);
        this.kPathsCache.set(cacheKey, []);
        return [];
      }

      const paths: Path[] = [shortestPath];
      
      // Stop if k=1 or if the start and end are directly connected
      if (k <= 1 || shortestPath.hops <= 1) {
        this.kPathsCache.set(cacheKey, paths);
        return paths;
      }
      
      // Find additional paths
      this.findAlternativePaths(start, end, shortestPath, paths, k);
      
      // Sort by latency and return at most k paths
      const result = paths
        .sort((a, b) => a.latency - b.latency)
        .slice(0, k);
        
      // Cache the result before returning
      this.kPathsCache.set(cacheKey, result);
      
      return result;
    });
  }
  
  /**
   * Find alternative paths by edge removal
   */
  private findAlternativePaths(
    start: string, 
    end: string, 
    shortestPath: Path, 
    paths: Path[], 
    k: number
  ): void {
    try {
      // Try to find (k-1) more paths by temporarily removing edges from shortest path
      this.findEdgeDisjointPaths(start, end, shortestPath, paths, k);
      
      // If we still need more paths, try removing other related edges
      if (paths.length < k) {
        this.findNonShortestPathEdgePaths(start, end, shortestPath, paths, k);
      }
    } catch (error) {
      networkLogger.error(`Error finding alternative paths: ${error}`);
    }
  }
  
  /**
   * Find alternative paths by removing edges from the shortest path
   */
  private findEdgeDisjointPaths(
    start: string, 
    end: string, 
    shortestPath: Path, 
    paths: Path[], 
    k: number
  ): void {
    for (let i = 0; i < shortestPath.route.length - 1 && paths.length < k; i++) {
      // Remove one edge at a time from the shortest path
      const edgeStart = shortestPath.route[i];
      const edgeEnd = shortestPath.route[i + 1];
      
      // Create a copy of the network data
      const networkData = this.toNetworkData();
      
      // Remove the edge
      if (networkData[edgeStart]) {
        delete networkData[edgeStart][edgeEnd];
      }
      if (networkData[edgeEnd]) {
        delete networkData[edgeEnd][edgeStart];
      }
      
      // Create a new graph without this edge
      const tempGraph = new NetworkGraph(networkData);
      
      // Find shortest path in modified graph
      const altPath = tempGraph.findShortestPath(start, end);
      
      // Add if unique and valid
      if (altPath && !this.pathExists(altPath, paths)) {
        paths.push(altPath);
      }
    }
  }
  
  /**
   * Find alternative paths by removing edges not in the shortest path
   */
  private findNonShortestPathEdgePaths(
    start: string, 
    end: string, 
    shortestPath: Path, 
    paths: Path[], 
    k: number
  ): void {
    // Get regions in the shortest path
    const relatedRegions = new Set(shortestPath.route);
    
    for (const [source, edges] of this.adjacencyList.entries()) {
      if (!relatedRegions.has(source) || paths.length >= k) break;
      
      for (const { target, weight } of edges) {
        if (!relatedRegions.has(target) || paths.length >= k) continue;
        
        // Skip edges that are already in the shortest path
        if (this.isEdgeInPath(source, target, shortestPath)) continue;
        
        // Remove this edge and find an alternative path
        const networkData = this.toNetworkData();
        
        // Remove the edge
        if (networkData[source]) {
          delete networkData[source][target];
        }
        if (networkData[target]) {
          delete networkData[target][source];
        }
        
        // Create a new graph without this edge
        const tempGraph = new NetworkGraph(networkData);
        
        // Find shortest path in modified graph
        const altPath = tempGraph.findShortestPath(start, end);
        
        // Add if unique and valid
        if (altPath && !this.pathExists(altPath, paths)) {
          paths.push(altPath);
          
          if (paths.length >= k) break;
        }
      }
    }
  }
  
  /**
   * Check if an edge is in a path
   */
  private isEdgeInPath(source: string, target: string, path: Path): boolean {
    for (let i = 0; i < path.route.length - 1; i++) {
      const pathSource = path.route[i];
      const pathTarget = path.route[i + 1];
      
      if ((pathSource === source && pathTarget === target) ||
          (pathSource === target && pathTarget === source)) {
        return true;
      }
    }
    return false;
  }
  
  /**
   * Checks if a path already exists in a list of paths
   */
  private pathExists(path: Path, existingPaths: Path[]): boolean {
    const routeString = path.route.join('-');
    
    for (const existingPath of existingPaths) {
      if (existingPath.route.join('-') === routeString) {
        return true;
      }
    }
    
    return false;
  }
  
  /**
   * Checks if a path contains cycles (same region appearing multiple times)
   * 
   * @param path - The path to check for cycles
   * @returns True if the path contains cycles, false otherwise
   */
  private hasCycles(path: string[] | undefined): boolean {
    if (!path || !Array.isArray(path)) {
      return false; // Handle undefined or non-array paths
    }
    
    const visitedNodes = new Set<string>();
    
    for (const node of path) {
      if (visitedNodes.has(node)) {
        return true;
      }
      visitedNodes.add(node);
    }
    
    return false;
  }

  /**
   * Converts the graph back to raw network data format
   * 
   * @returns NetworkData object
   */
  toNetworkData(): NetworkData {
    const data: NetworkData = {};
    
    for (const [source, edges] of this.adjacencyList.entries()) {
      data[source] = {};
      
      for (const { target, weight } of edges) {
        data[source][target] = weight;
      }
    }
    
    return data;
  }
  
  /**
   * Clears the path cache
   * Useful when the graph structure changes
   */
  clearCache(): void {
    networkLogger.info("Clearing path cache");
    this.shortestPathCache.clear();
    this.longestPathCache.clear();
    this.kPathsCache.clear();
  }
  
  /**
   * Gets the current cache statistics
   * 
   * @returns An object with cache statistics
   */
  getCacheStats(): any {
    const shortestPathStats = this.shortestPathCache.getStats();
    const longestPathStats = this.longestPathCache.getStats();
    const kPathsStats = this.kPathsCache.getStats();
    
    return {
      shortestPath: shortestPathStats,
      longestPath: longestPathStats,
      kPaths: kPathsStats,
      totalCalls: shortestPathStats.hits + shortestPathStats.misses + 
                  longestPathStats.hits + longestPathStats.misses + 
                  kPathsStats.hits + kPathsStats.misses,
      totalHits: shortestPathStats.hits + longestPathStats.hits + kPathsStats.hits,
      totalCacheSize: shortestPathStats.size + longestPathStats.size + kPathsStats.size
    };
  }

  /**
   * Finds the longest (highest latency) path between all region pairs
   * 
   * @returns Promise that resolves to the longest path in the network
   */
  async findLongestPath(): Promise<Path | null> {
    return trackPerformance('findLongestPath', async () => {
      const regions = this.getRegions();
      let longestPath: Path | null = null;
      
      // Limit the number of pairs to check to avoid excessive computation
      const maxPairs = 100;
      let pairsChecked = 0;
      
      networkLogger.info("Finding overall longest path in network");
      
      // Check a sample of region pairs
      for (let i = 0; i < regions.length && pairsChecked < maxPairs; i++) {
        for (let j = i + 1; j < regions.length && pairsChecked < maxPairs; j++) {
          try {
            // Properly await the Promise from findLongestPathBetween
            const path = await this.findLongestPathBetween(regions[i], regions[j]);
            pairsChecked++;
            
            if (path && (!longestPath || path.latency > longestPath.latency)) {
              // Double-check that there are no cycles in the path
              if (path.route && !this.hasCycles(path.route)) {
                longestPath = path;
                networkLogger.debug(`Found new longest path: ${path.route ? path.route.join(' → ') : 'unknown'} with latency ${path.latency}ms`);
              }
            }
          } catch (error) {
            networkLogger.error(`Error finding longest path between ${regions[i]} and ${regions[j]}: ${error}`);
          }
        }
      }
      
      return longestPath;
    });
  }

  /**
   * Releases all resources used by this object
   */
  dispose(): void {
    this.clearCache();
    this.adjacencyList.clear();
    this.regions.clear();
  }
}

/**
 * Interface for hop detail information
 */
interface HopDetail {
  source: string;
  target: string;
  rtt: number;
  minRtt: number;
}
