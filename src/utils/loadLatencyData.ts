/**
 * loadLatencyData - Utility for loading and processing RTT data from JSON
 *
 * This module is responsible for loading the network RTT data from the JSON file,
 * converting it to the proper format required by the NetworkGraph class.
 */
import { NetworkData } from '@types/network';
import { loadJson } from './assetUtils';

// Type for the raw connection data from JSON
export interface Connection {
  source: string;
  target: string;
  rtt: number;
}

// Type for the JSON data structure
export interface RttData {
  connections: Connection[];
}

// We'll try to load essential connections from file, then try the fallback file
async function loadEssentialConnections(): Promise<Connection[]> {
  try {
    console.log(`Loading essential connections...`);
    const data = await loadJson<{connections: Connection[]}>('essential-connections.json');
    const connections = data.connections || [];
    
    if (connections.length > 0) {
      return connections;
    }
  } catch (error) {
    console.warn(`Failed to load essential connections, trying fallback:`, error);
  }
  
  // If primary paths fail, try fallback file
  try {
    console.log(`Loading fallback essential connections...`);
    const data = await loadJson<{connections: Connection[]}>('fallback-connections.json');
    const connections = data.connections || [];
    
    if (connections.length > 0) {
      console.log('Using fallback essential connections file');
      return connections;
    }
  } catch (error) {
    console.warn(`Failed to load fallback essential connections:`, error);
  }
  
  // If all else fails, return an empty array and log an error
  console.error('Failed to load essential connections from any source');
  return [];
}

/**
 * Loads the RTT data from the JSON file
 *
 * @returns Promise that resolves to the RTT data
 */
export async function loadRttData(): Promise<RttData> {
  console.log("Loading RTT data...");

  try {
    console.log(`Loading latency data from asset path...`);
    const data = await loadJson<RttData>('latency-data.json');
    
    // Load and add essential connections if not already present
    const essentialConnections = await loadEssentialConnections();
    const enhancedData = addEssentialConnections(data, essentialConnections);
    return enhancedData;
  } catch (error) {
    console.warn("Failed to load RTT data, using minimal dataset:", error);
    // If all paths fail, create a minimal dataset with essential connections
    const essentialConnections = await loadEssentialConnections();
    return {
      connections: essentialConnections
    };
  }
}

/**
 * Adds essential connections to the data if they don't already exist
 * @param data - The RTT data to enhance
 * @param essentialConnections - Array of essential connections to add if missing
 * @returns Enhanced RTT data with essential connections
 */
function addEssentialConnections(data: RttData, essentialConnections: Connection[]): RttData {
  // Create a map of existing connections for quick lookup
  const existingConnections = new Map<string, boolean>();

  for (const conn of data.connections) {
    // Track both directions
    existingConnections.set(`${conn.source}:${conn.target}`, true);
    existingConnections.set(`${conn.target}:${conn.source}`, true);
  }

  // Clone the data
  const result: RttData = {
    connections: [...data.connections],
  };

  // Add missing essential connections
  for (const conn of essentialConnections) {
    const key = `${conn.source}:${conn.target}`;
    const reverseKey = `${conn.target}:${conn.source}`;

    // Add if not already present
    if (!existingConnections.get(key)) {
      console.log(
        `Adding essential connection: ${conn.source} → ${conn.target} (${conn.rtt}ms)`,
      );
      result.connections.push(conn);
      existingConnections.set(key, true);
    }

    // Add reverse direction if not present
    if (!existingConnections.get(reverseKey)) {
      console.log(
        `Adding essential connection: ${conn.target} → ${conn.source} (${conn.rtt}ms)`,
      );
      result.connections.push({
        source: conn.target,
        target: conn.source,
        rtt: conn.rtt,
      });
      existingConnections.set(reverseKey, true);
    }
  }

  return result;
}

/**
 * Converts the RTT data from JSON format to NetworkData format
 *
 * @param data - The RTT data from JSON
 * @returns NetworkData object for use with NetworkGraph
 */
export function convertToNetworkData(data: RttData): NetworkData {
  const networkData: NetworkData = {};

  // Process each connection and build the network data
  for (const connection of data.connections) {
    const { source, target, rtt } = connection;

    // Special handling for invalid RTT values
    if (typeof rtt !== "number" || isNaN(rtt) || rtt <= 0) {
      console.warn(
        `Invalid RTT for ${source} → ${target}: ${rtt}. Using default value.`,
      );
      continue;
    }

    // Initialize source and target objects if they don't exist
    if (!networkData[source]) networkData[source] = {};
    if (!networkData[target]) networkData[target] = {};

    // Add bidirectional edges
    networkData[source][target] = rtt;

    // Only add reverse direction if it doesn't already exist
    if (networkData[target][source] === undefined) {
      networkData[target][source] = rtt;
    }
  }

  // Print statistics about the network data
  const regionCount = Object.keys(networkData).length;
  let connectionCount = 0;

  for (const source in networkData) {
    connectionCount += Object.keys(networkData[source]).length;
  }

  console.log(
    `Converted to NetworkData with ${regionCount} regions and ${connectionCount} connections`,
  );

  return networkData;
}

/**
 * Helper function to normalize region names
 *
 * @param region - Region name to normalize
 * @returns Normalized region name
 */
export function normalizeRegionName(region: string): string {
  // Keep region names exactly as they are for everything else
  return region;
}

/**
 * Get all unique region names from the RTT data
 *
 * @param data - The RTT data from JSON
 * @returns Array of all unique region names
 */
export function getAllRegions(data: RttData): string[] {
  const regions = new Set<string>();

  for (const connection of data.connections) {
    regions.add(connection.source);
    regions.add(connection.target);
  }

  return Array.from(regions).sort();
}
