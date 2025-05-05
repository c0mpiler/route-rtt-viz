/**
 * formatters - Utility functions for formatting and categorizing data
 * 
 * This module provides helper functions for formatting round-trip time (RTT) values,
 * categorizing paths, and generating user-friendly strings.
 */

/**
 * Formats an RTT value in milliseconds with proper units
 * 
 * @param latency - RTT value in milliseconds
 * @returns Formatted string (e.g., "120 ms")
 */
export function formatLatency(latency: number | undefined): string {
  if (latency === undefined || latency === null) {
    return 'N/A'; // Handle undefined or null values
  }
  if (latency < 1) {
    return '< 1 ms';
  }
  return `${latency.toFixed(0)} ms`;
}

/**
 * Format RTT value for compact display (e.g., in graph edges)
 * 
 * @param latency - RTT value in milliseconds
 * @returns Compact formatted string
 */
export function formatCompactLatency(latency: number): string {
  return `${latency}ms`;
}

/**
 * Categories for RTT values
 */
export enum LatencyCategory {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
}

/**
 * Categories for route boxes
 */
export enum RouteBoxCategory {
  FASTEST = 'fastest',
  FAST = 'fast',
  MEDIUM = 'medium',
  SLOW = 'slow',
  SLOWEST = 'slowest',
}

/**
 * Categorizes an RTT value based on thresholds
 * 
 * @param latency - RTT value in milliseconds
 * @returns RTT category
 */
export function categorizeLatency(latency: number): LatencyCategory {
  if (latency < 50) return LatencyCategory.LOW;
  if (latency < 100) return LatencyCategory.MEDIUM;
  return LatencyCategory.HIGH;
}

/**
 * Gets color for RTT based on its value
 * 
 * @param latency - RTT value in milliseconds
 * @returns Color string (CSS value)
 */
export function getLatencyColor(latency: number): string {
  if (latency < 30) return '#047857'; // Dark green for very low RTT
  if (latency < 50) return '#10b981'; // Green for low RTT
  if (latency < 80) return '#f59e0b'; // Yellow/orange for medium RTT
  if (latency < 100) return '#ea580c'; // Orange for medium-high RTT
  return '#b91c1c'; // Red for high RTT
}

/**
 * Categorizes a path based on its position in the results
 * 
 * @param index - Index of the path in the results
 * @param isLongest - Whether this is the longest path
 * @returns Route box category
 */
export function categorizeRouteBox(index: number, isLongest: boolean): RouteBoxCategory {
  if (isLongest) return RouteBoxCategory.SLOWEST;
  
  switch (index) {
    case 0: return RouteBoxCategory.FASTEST;
    case 1: return RouteBoxCategory.FAST;
    case 2: return RouteBoxCategory.MEDIUM;
    default: return RouteBoxCategory.SLOW;
  }
}

/**
 * Formats a path route as a readable string
 * 
 * @param route - Array of region names in the path
 * @returns Formatted string (e.g., "Seattle → Chicago → New York")
 */
export function formatRoute(route: string[] | undefined): string {
  if (!route || !Array.isArray(route)) {
    return 'No route available';
  }
  return route.join(' → ');
}

/**
 * Formats a route step with RTT
 * 
 * @param source - Source region
 * @param target - Target region
 * @param latency - RTT between regions
 * @returns Formatted string (e.g., "Seattle → Chicago (41 ms)")
 */
export function formatRouteStep(source: string, target: string, latency: number): string {
  return `${source} → ${target} (${formatLatency(latency)})`;
}

/**
 * Generates a description for a path
 * 
 * @param hops - Number of hops in the path
 * @param latency - Total RTT of the path
 * @returns Formatted description
 */
export function formatPathDescription(hops: number, latency: number): string {
  const hopText = hops === 1 ? 'hop' : 'hops';
  return `${hops} ${hopText}, ${formatLatency(latency)} round-trip time`;
}

/**
 * Generates a CSS class for route box based on category
 * 
 * @param category - Route box category
 * @returns CSS class name
 */
export function getRouteBoxClass(category: RouteBoxCategory): string {
  return `route-box route-box-${category}`;
}

/**
 * Generates a CSS class for RTT indicator based on category
 * 
 * @param category - RTT category
 * @returns CSS class name
 */
export function getLatencyClass(category: LatencyCategory): string {
  return `latency-indicator latency-${category}`;
}

/**
 * Generates an emoji for RTT category
 * 
 * @param category - RTT category
 * @returns Emoji representing the category
 */
export function getLatencyEmoji(category: LatencyCategory): string {
  switch (category) {
    case LatencyCategory.LOW: return '⚡'; // Fast
    case LatencyCategory.MEDIUM: return '🔄'; // Medium
    case LatencyCategory.HIGH: return '🐢'; // Slow
    default: return '';
  }
}

/**
 * Generates a percentage value representing quality (higher is better)
 * 
 * @param latency - RTT value
 * @param maxLatency - Maximum RTT for reference
 * @returns Percentage from 0-100
 */
export function calculateQualityPercentage(latency: number, maxLatency: number): number {
  // Invert the scale so higher is better
  const invertedPercentage = (latency / maxLatency) * 100;
  return Math.max(0, Math.min(100, 100 - invertedPercentage));
}

/**
 * Gets a human-readable quality description based on percentage
 * 
 * @param percentage - Quality percentage (0-100)
 * @returns Quality description
 */
export function getQualityDescription(percentage: number): string {
  if (percentage >= 90) return 'Excellent';
  if (percentage >= 70) return 'Very Good';
  if (percentage >= 50) return 'Good';
  if (percentage >= 30) return 'Fair';
  if (percentage >= 10) return 'Poor';
  return 'Very Poor';
}

/**
 * Calculate link distance for the D3 force layout based on RTT
 * 
 * @param latency - RTT value in milliseconds
 * @returns Distance value for D3 force layout
 */
export function calculateLinkDistance(latency: number): number {
  // Scale the RTT to a reasonable distance range for the graph
  // Min distance: 50px, Max distance: 300px
  const minDistance = 50;
  const maxDistance = 300;
  const maxLatency = 200; // RTT value that should correspond to max distance
  
  const distance = minDistance + (latency / maxLatency) * (maxDistance - minDistance);
  return Math.min(maxDistance, Math.max(minDistance, distance));
}

/**
 * Get a suitable node size based on its importance
 * 
 * @param isSource - Whether the node is the source
 * @param isTarget - Whether the node is the target
 * @param isHighlighted - Whether the node is highlighted (part of a path)
 * @returns Node radius in pixels
 */
export function getNodeSize(isSource: boolean, isTarget: boolean, isHighlighted: boolean): number {
  if (isSource || isTarget) return 10;
  if (isHighlighted) return 8;
  return 5;
}

/**
 * Get a suitable link stroke width based on RTT
 * 
 * @param latency - RTT value in milliseconds
 * @param isHighlighted - Whether the link is highlighted
 * @returns Stroke width in pixels
 */
export function getLinkStrokeWidth(latency: number, isHighlighted: boolean): number {
  // Thicker lines for highlighted paths, thinner for higher RTT
  const baseWidth = isHighlighted ? 2.5 : 1.5;
  const latencyFactor = Math.max(0.5, 1 - latency / 200); // Scale down width for higher RTT
  
  return baseWidth * latencyFactor;
}
