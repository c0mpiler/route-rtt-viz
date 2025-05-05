/**
 * JSON Loader - Utilities for loading and handling JSON data
 * 
 * This module provides robust functions for loading JSON data from
 * files with error handling and fallback mechanisms.
 */
import { Logger } from './logger';

const jsonLogger = new Logger({ component: 'JsonLoader' });

/**
 * Loads JSON data from a URL
 * 
 * @param url - The URL to load data from
 * @returns The parsed JSON data
 * @throws Error if the fetch fails or the response is not OK
 */
export async function loadJson<T>(url: string): Promise<T> {
  // Adjust url paths to ensure they're properly prefixed
  const adjustedUrl = url.startsWith('/') ? `${window.location.origin}/ibmcloud-rtt-calc${url}` : url;
  
  jsonLogger.debug(`Loading JSON from: ${adjustedUrl}`);
  const response = await fetch(adjustedUrl);
  
  if (!response.ok) {
    throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
  }
  
  return await response.json() as T;
}

/**
 * Loads JSON data with a fallback value if loading fails
 * 
 * @param url - The URL to load data from
 * @param defaultValue - The default value to use if loading fails
 * @param logError - Whether to log the error (default: true)
 * @returns The parsed JSON data or the default value
 */
export async function loadJsonSafe<T>(
  url: string,
  defaultValue: T,
  logError: boolean = true
): Promise<T> {
  try {
    return await loadJson<T>(url);
  } catch (error) {
    if (logError) {
      jsonLogger.error(`Failed to load JSON from ${url}: ${error}`);
    }
    return defaultValue;
  }
}

/**
 * Loads JSON data with a primary and fallback URL
 * 
 * @param primaryUrl - The primary URL to load data from
 * @param fallbackUrl - The fallback URL to try if the primary fails
 * @param defaultValue - The default value to use if both URLs fail
 * @returns The parsed JSON data or the default value
 */
export async function loadJsonWithFallback<T>(
  primaryUrl: string,
  fallbackUrl: string,
  defaultValue: T
): Promise<T> {
  try {
    // Try primary URL first
    jsonLogger.info(`Loading data from ${primaryUrl}`);
    return await loadJson<T>(primaryUrl);
  } catch (primaryError) {
    jsonLogger.warn(`Failed to load from primary URL: ${primaryUrl}, trying fallback`);
    
    try {
      // Try fallback URL
      return await loadJson<T>(fallbackUrl);
    } catch (fallbackError) {
      jsonLogger.error(
        `Failed to load from fallback URL: ${fallbackUrl}, using default value`
      );
      return defaultValue;
    }
  }
}

/**
 * Validates JSON data against a simple schema
 * 
 * @param data - The data to validate
 * @param requiredKeys - Array of keys that must exist in the data
 * @returns True if the data is valid, false otherwise
 */
export function validateJson(
  data: any,
  requiredKeys: string[]
): boolean {
  if (!data || typeof data !== 'object') {
    return false;
  }
  
  for (const key of requiredKeys) {
    if (!(key in data)) {
      return false;
    }
  }
  
  return true;
}
