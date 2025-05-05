/**
 * coordsHelper - Centralized coordinate data handling
 * 
 * This utility provides a single source of truth for working with region coordinates
 * and eliminates duplication across components.
 */
import { CoordinatesData, loadCoordinatesData, getRegionCoordinates } from './loadCoordinatesData';
import { loadAssetWithFallbacks } from './assetUtils';

// Helper function to validate coordinates
function isValidCoordinate(value1: unknown, value2: unknown): boolean {
  return typeof value1 === 'number' && 
         typeof value2 === 'number' && 
         !isNaN(value1) && 
         !isNaN(value2) && 
         isFinite(value1) && 
         isFinite(value2);
}

// Global coordinates data singleton
let globalCoordinatesData: CoordinatesData | null = null;

// Default coordinates for regions with unknown locations
// Hardcoded default to avoid window reference issues
const DEFAULT_COORDINATES: [number, number] = [-87.6298, 41.8781]; // Chicago coordinates

/**
 * Load default coordinates from configuration
 */
async function loadDefaultCoordinates(): Promise<[number, number]> {
  try {
    const response = await loadAssetWithFallbacks('default-coordinates.json');
    const data = await response.json();
    console.log('Loaded default coordinates:', data.coordinates);
    return data.coordinates || DEFAULT_COORDINATES;
  } catch (error) {
    console.warn('Failed to load default coordinates, using hardcoded defaults:', error);
  }
  
  // Return hardcoded defaults if all attempts fail
  return DEFAULT_COORDINATES;
}

/**
 * Initializes the global coordinates data
 * 
 * @returns Promise that resolves when coordinates are loaded
 */
export async function initializeCoordinates(): Promise<void> {
  try {
    // Load the full coordinates data - don't await default coordinates
    // to avoid unnecessary delays
    globalCoordinatesData = await loadCoordinatesData();
    console.log('Global coordinates data initialized');
  } catch (error) {
    console.error('Failed to initialize global coordinates data:', error);
    globalCoordinatesData = null;
    throw error;
  }
}

/**
 * Gets the default coordinates to use when a region is not found
 * 
 * @returns Default coordinates [longitude, latitude]
 */
export function getDefaultCoordinates(): [number, number] {
  return DEFAULT_COORDINATES;
}

/**
 * Gets coordinates for a region
 * 
 * @param region - Region name
 * @returns Tuple of [longitude, latitude] coordinates
 */
export function getCoordinatesFor(region: string): [number, number] {
  if (!globalCoordinatesData) {
    console.warn('[coordsHelper] Coordinates data not initialized for region:', region);
    return getDefaultCoordinates();
  }
  
  const coords = getRegionCoordinates(region, globalCoordinatesData);
  
  // Debug log for debugging problematic regions
  if (!isValidCoordinate(coords[0], coords[1])) {
    console.error(`[coordsHelper] Invalid coordinates received for ${region}:`, coords);
  }
  
  return coords;
}

/**
 * Checks if global coordinates data is initialized
 */
export function hasCoordinatesData(): boolean {
  return globalCoordinatesData !== null;
}

/**
 * Gets all region coordinates as a flat object
 * 
 * @returns Record mapping region names to coordinate pairs
 */
export function getAllCoordinates(): Record<string, [number, number]> {
  if (!globalCoordinatesData) {
    console.warn('Coordinates data not initialized; returning empty object');
    return {};
  }
  
  const result: Record<string, [number, number]> = {};
  
  // Flatten the nested structure
  for (const continent in globalCoordinatesData.regions) {
    for (const region in globalCoordinatesData.regions[continent]) {
      result[region] = globalCoordinatesData.regions[continent][region];
    }
  }
  
  return result;
}

// Export DEFAULT_COORDINATES for backward compatibility
export { DEFAULT_COORDINATES };
