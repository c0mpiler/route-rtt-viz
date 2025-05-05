/**
 * loadCoordinatesData - Utility for loading geographic coordinates for regions
 * 
 * This module is responsible for loading region coordinates from the JSON file
 * and providing helper functions to access coordinates for any region.
 */
import { loadJson } from './assetUtils';

// Type for the coordinates data structure
export interface RegionCoordinates {
  [region: string]: [number, number];
}

export interface RegionsByContinent {
  [continent: string]: {
    [region: string]: [number, number];
  };
}

export interface CoordinatesData {
  regions: RegionsByContinent;
}

// Default coordinates for regions with unknown locations
// Default to Chicago coordinates (0,0 is in the ocean)
const DEFAULT_COORDINATES: [number, number] = [-87.6298, 41.8781]; // Chicago

export async function loadCoordinatesData(): Promise<CoordinatesData> {
  console.log("Loading coordinates data...");
  
  try {
    console.log(`Loading primary coordinates data...`);
    const data = await loadJson<CoordinatesData>('coordinates-data.json');
    
    // Verify that we have some data
    let regionCount = 0;
    for (const continent in data.regions) {
      regionCount += Object.keys(data.regions[continent]).length;
    }
    
    if (regionCount > 0) {
      console.log(`Loaded coordinates for ${regionCount} regions`);
      return data;
    }
  } catch (error) {
    console.warn(`Failed to load primary coordinates data, trying fallback:`, error);
  }
  
  try {
    console.log(`Loading fallback coordinates data...`);
    const data = await loadJson<CoordinatesData>('fallback-coordinates.json');
    
    // Verify that we have some data
    let regionCount = 0;
    for (const continent in data.regions) {
      regionCount += Object.keys(data.regions[continent]).length;
    }
    
    if (regionCount > 0) {
      console.log(`Loaded fallback coordinates for ${regionCount} regions`);
      return data;
    }
  } catch (error) {
    console.warn(`Failed to load fallback coordinates data:`, error);
  }
  
  // If all loading attempts fail, return an empty structure
  console.error('All loading attempts failed, returning empty coordinates data');
  return { regions: {} };
}

/**
 * Get coordinates for a specific region
 * 
 * @param region - Region name to get coordinates for
 * @param data - The coordinates data
 * @returns Tuple of [longitude, latitude] coordinates
 */
export function getRegionCoordinates(region: string, data: CoordinatesData): [number, number] {
  // Search through all continents
  for (const continent in data.regions) {
    if (data.regions[continent][region]) {
      return data.regions[continent][region];
    }
  }
  
  // Special handling for renamed regions
  if (region === 'WDC' || region === 'Washington') {
    for (const continent in data.regions) {
      if (data.regions[continent]['Washington DC']) {
        return data.regions[continent]['Washington DC'];
      }
    }
  }
  
  console.warn(`[getRegionCoordinates] No coordinates found for region: ${region}`);
  console.log(`[getRegionCoordinates] Available regions in data:`, Object.keys(data.regions || {}));
  
  return DEFAULT_COORDINATES;
}

/**
 * Get a flat map of all region coordinates
 * 
 * @param data - The coordinates data
 * @returns Object mapping region names to coordinates
 */
export function getFlatRegionCoordinates(data: CoordinatesData): RegionCoordinates {
  const result: RegionCoordinates = {};
  
  // Flatten the nested structure
  for (const continent in data.regions) {
    for (const region in data.regions[continent]) {
      result[region] = data.regions[continent][region];
    }
  }
  
  return result;
}

/**
 * Get all unique region names from the coordinates data
 * 
 * @param data - The coordinates data
 * @returns Array of all region names
 */
export function getAllRegions(data: CoordinatesData): string[] {
  const regions: string[] = [];
  
  for (const continent in data.regions) {
    regions.push(...Object.keys(data.regions[continent]));
  }
  
  return regions.sort();
}
