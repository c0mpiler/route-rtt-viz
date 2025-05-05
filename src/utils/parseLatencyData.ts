/**
 * parseLatencyData - Converts raw network latency data into graph format
 * 
 * This utility transforms the raw latency data string into a structured
 * format that can be used to build the NetworkGraph.
 */
import { NetworkData } from '../types/network';

/**
 * Parses raw latency data string into a structured format
 * 
 * @param rawData - Raw string data with latency measurements
 * @returns Structured network data object
 */
export function parseLatencyData(rawData: string): NetworkData {
  const networkData: NetworkData = {};
  
  // Split the raw data into lines and process each line
  const lines = rawData.trim().split('\n');
  
  for (const line of lines) {
    // Skip empty lines
    if (line.trim() === '') continue;
    
    // Parse the line to extract regions and latency
    // Format examples: 
    // "Seattle – San Jose:  18ms"
    // "Paris – Frankfurt:  10ms:"   (notice the extra colon which is a typo)
    // "Miami - Sao Paulo:  110ms"   (notice the dash instead of en-dash)
    
    // First try with en-dash
    let match = line.match(/([^–]+)–\s*([^:]+):\s*(\d+)ms/);
    
    // If that doesn't work, try with regular dash
    if (!match) {
      match = line.match(/([^-]+)-\s*([^:]+):\s*(\d+)ms/);
    }
    
    if (match) {
      const source = match[1].trim();
      const target = match[2].trim();
      const latency = parseInt(match[3], 10);
      
      // Skip invalid data
      if (isNaN(latency) || latency <= 0) {
        console.warn(`Skipping invalid latency value in line: ${line}`);
        continue;
      }
      
      // Handle special cases for region names
      const sourceRegion = normalizeRegionName(source);
      const targetRegion = normalizeRegionName(target);
      
      // Initialize source and target objects if they don't exist
      if (!networkData[sourceRegion]) networkData[sourceRegion] = {};
      if (!networkData[targetRegion]) networkData[targetRegion] = {};
      
      // Add bidirectional edges
      networkData[sourceRegion][targetRegion] = latency;
      networkData[targetRegion][sourceRegion] = latency;
    } else {
      // Try a more permissive regex as fallback
      const fallbackMatch = line.match(/([a-zA-Z\s]+)[–\-]\s*([a-zA-Z\s]+):\s*(\d+)ms/);
      
      if (fallbackMatch) {
        const source = fallbackMatch[1].trim();
        const target = fallbackMatch[2].trim();
        let latencyStr = fallbackMatch[3];
        
        // Remove any trailing colons or other characters from latency
        latencyStr = latencyStr.replace(/[^\d]/g, '');
        const latency = parseInt(latencyStr, 10);
        
        if (isNaN(latency) || latency <= 0) {
          console.warn(`Skipping invalid latency value in line: ${line}`);
          continue;
        }
        
        const sourceRegion = normalizeRegionName(source);
        const targetRegion = normalizeRegionName(target);
        
        if (!networkData[sourceRegion]) networkData[sourceRegion] = {};
        if (!networkData[targetRegion]) networkData[targetRegion] = {};
        
        networkData[sourceRegion][targetRegion] = latency;
        networkData[targetRegion][sourceRegion] = latency;
      } else {
        console.warn(`Could not parse line: ${line}`);
      }
    }
  }
  
  return networkData;
}

/**
 * Normalizes region names to handle special cases
 * 
 * @param region - Raw region name from the data
 * @returns Normalized region name
 */
function normalizeRegionName(region: string): string {
  // Handle special cases
  if (region === 'WDC' || region === 'Washington') {
    return 'Washington DC';
  }
  if (region === 'Frankfort') {
    return 'Frankfurt'; // Fix spelling
  }
  
  return region;
}

// No longer using hardcoded data - loading from JSON files instead

/**
 * Loads the backup latency data from the file system in case primary loading fails
 * 
 * @returns Promise resolving to structured network data
 */
export async function loadBackupLatencyData(): Promise<NetworkData> {
  try {
    // Try to load from backup file
    const response = await fetch('/backup-latency-data.json');
    if (response.ok) {
      const data = await response.json();
      console.log('Successfully loaded backup latency data');
      
      // Convert the backup data format to NetworkData format
      const networkData: NetworkData = {};
      
      for (const connection of data.connections) {
        const { source, target, rtt } = connection;
        
        // Initialize source and target objects if they don't exist
        if (!networkData[source]) networkData[source] = {};
        if (!networkData[target]) networkData[target] = {};
        
        // Add bidirectional edges
        networkData[source][target] = rtt;
        networkData[target][source] = rtt;
      }
      
      return networkData;
    }
  } catch (error) {
    console.error('Failed to load backup latency data:', error);
  }
  
  // If all else fails, return empty object
  console.warn('No backup data available');
  return {};
}
