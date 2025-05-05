/**
 * loadContinentRegions - Utility to load continent-to-regions mappings
 * 
 * Provides a standardized way to load continent-to-regions mappings from JSON data files,
 * with proper error handling and fallback mechanisms.
 */
import { logger } from './logger';
import { loadJson } from './assetUtils';

/**
 * Interface for continent data from JSON
 */
export interface ContinentData {
  continents: Record<string, string[]>;
}

/**
 * Loads continent-to-regions mappings from the external JSON file
 * @returns Promise resolving to a mapping of continents to regions
 */
export async function loadContinentRegions(): Promise<Record<string, string[]>> {
  try {
    logger.info(`Loading continent regions...`);
    const data = await loadJson<ContinentData>('continent-regions.json');
    logger.info(`Loaded continent regions data with ${Object.keys(data.continents || {}).length} continents`);
    return data.continents || {};
  } catch (error) {
    logger.warn(`Failed to load continent regions, trying fallback:`, error);
  }
  
  try {
    logger.info(`Loading fallback continent regions...`);
    const data = await loadJson<ContinentData>('fallback-continent-regions.json');
    logger.info(`Loaded fallback continent regions data with ${Object.keys(data.continents || {}).length} continents`);
    return data.continents || {};
  } catch (error) {
    logger.warn(`Failed to load fallback continent regions:`, error);
  }
  
  // If all paths fail, return empty object
  logger.error('Failed to load continent regions from any path. Using empty mapping.');
  return {};
}
