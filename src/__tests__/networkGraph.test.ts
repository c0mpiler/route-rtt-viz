/**
 * Tests for the NetworkGraph class and related utilities
 */
import { describe, it, expect } from 'vitest';
import { NetworkGraph } from '../utils/network/NetworkGraph';
import { parseLatencyData } from '../utils/parseLatencyData';

describe('NetworkGraph', () => {
  // Sample test data
  const testData = {
    'A': { 'B': 10, 'C': 20 },
    'B': { 'A': 10, 'C': 5 },
    'C': { 'A': 20, 'B': 5 }
  };

  it('should build a graph from network data', () => {
    const graph = new NetworkGraph(testData);
    expect(graph.getRegions()).toHaveLength(3);
    expect(graph.getRegions()).toContain('A');
    expect(graph.getRegions()).toContain('B');
    expect(graph.getRegions()).toContain('C');
  });

  it('should find the shortest path between two nodes', () => {
    const graph = new NetworkGraph(testData);
    const path = graph.findShortestPath('A', 'C');

    expect(path).not.toBeNull();
    if (path) {
      expect(path.route).toEqual(['A', 'B', 'C']);
      expect(path.latency).toBe(15); // A->B (10) + B->C (5)
      expect(path.hops).toBe(2);
    }
  });

  it('should return a direct path for adjacent nodes', () => {
    const graph = new NetworkGraph(testData);
    const path = graph.findShortestPath('A', 'B');

    expect(path).not.toBeNull();
    if (path) {
      expect(path.route).toEqual(['A', 'B']);
      expect(path.latency).toBe(10);
      expect(path.hops).toBe(1);
    }
  });

  it('should return a path with 0 latency for same source and target', () => {
    const graph = new NetworkGraph(testData);
    const path = graph.findShortestPath('A', 'A');

    expect(path).not.toBeNull();
    if (path) {
      expect(path.route).toEqual(['A']);
      expect(path.latency).toBe(0);
      expect(path.hops).toBe(0);
    }
  });

  it('should find k shortest paths between nodes', () => {
    // Create a more complex graph with multiple paths
    const complexData = {
      'A': { 'B': 10, 'C': 20, 'D': 30 },
      'B': { 'A': 10, 'C': 5, 'E': 15 },
      'C': { 'A': 20, 'B': 5, 'D': 10, 'E': 10 },
      'D': { 'A': 30, 'C': 10, 'E': 5 },
      'E': { 'B': 15, 'C': 10, 'D': 5 }
    };

    const graph = new NetworkGraph(complexData);
    const paths = graph.findKShortestPaths('A', 'E', 3);

    expect(paths).toHaveLength(3);
    
    // Paths should be sorted by latency
    expect(paths[0].latency).toBeLessThanOrEqual(paths[1].latency);
    expect(paths[1].latency).toBeLessThanOrEqual(paths[2].latency);
    
    // The shortest path should be A->B->E with latency 25
    expect(paths[0].route).toEqual(['A', 'B', 'E']);
    expect(paths[0].latency).toBe(25);
    
    // The second path should be A->C->E with latency 30
    expect(paths[1].route).toEqual(['A', 'C', 'E']);
    expect(paths[1].latency).toBe(30);
  });

  it('should find the longest path in the network', () => {
    const complexData = {
      'A': { 'B': 10, 'C': 20 },
      'B': { 'A': 10, 'C': 5, 'D': 100 },
      'C': { 'A': 20, 'B': 5, 'D': 50 },
      'D': { 'B': 100, 'C': 50 }
    };

    const graph = new NetworkGraph(complexData);
    const longestPath = graph.findLongestPath();

    expect(longestPath).not.toBeNull();
    if (longestPath) {
      // The longest path should be A->B->D with latency 110
      expect(longestPath.route).toEqual(['A', 'B', 'D']);
      expect(longestPath.latency).toBe(110);
    }
  });
});

describe('parseLatencyData', () => {
  it('should parse raw latency data string into structured format', () => {
    const rawData = `
      Region1 – Region2:  10ms
      Region1 – Region3:  20ms
      Region2 – Region3:  5ms
    `;

    const parsedData = parseLatencyData(rawData);
    
    expect(parsedData).toHaveProperty('Region1');
    expect(parsedData).toHaveProperty('Region2');
    expect(parsedData).toHaveProperty('Region3');
    
    expect(parsedData['Region1']).toHaveProperty('Region2', 10);
    expect(parsedData['Region1']).toHaveProperty('Region3', 20);
    expect(parsedData['Region2']).toHaveProperty('Region3', 5);
    
    // Ensure bidirectional edges
    expect(parsedData['Region2']).toHaveProperty('Region1', 10);
    expect(parsedData['Region3']).toHaveProperty('Region1', 20);
    expect(parsedData['Region3']).toHaveProperty('Region2', 5);
  });
});
