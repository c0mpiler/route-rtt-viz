/**
 * loadHubRegions - Utility to load hub regions from external JSON files
 * 
 * Provides a standardized way to load hub regions from the JSON data files,
 * with proper error handling and fallback mechanisms.
 */
import { logger } from './logger';
import { loadJson } from './assetUtils';

/**
 * Loads hub regions from the external JSON file with fallback support
 * @returns Promise resolving to an array of hub region names
 */
export async function loadHubRegions(): Promise<string[]> {
  try {
    logger.info(`Loading hub regions...`);
    const data = await loadJson<{regions: string[]}>('hub-regions.json');
    logger.info(`Loaded ${data.regions?.length || 0} hub regions from file`);
    return data.regions || [];
  } catch (error) {
    logger.warn(`Failed to load hub regions, trying fallback:`, error);
  }
  
  try {
    logger.info(`Loading fallback hub regions...`);
    const data = await loadJson<{regions: string[]}>('fallback-hub-regions.json');
    logger.info(`Loaded ${data.regions?.length || 0} hub regions from fallback file`);
    return data.regions || [];
  } catch (error) {
    logger.warn(`Failed to load fallback hub regions:`, error);
  }
  
  // If all paths fail, return empty array
  logger.error('Failed to load hub regions from any path. Using empty array.');
  return [];
}
