/**
 * Asset utilities for handling resource paths across different deployment scenarios
 */

// Define the base paths for different deployment environments
const BASE_PATHS = {
  development: '',
  production: '/route-radar/'
} as const;

// Detect if we're in development mode
const isDevelopment = import.meta.env.MODE === 'development' || import.meta.env.DEV;

// Get the current base path based on environment
export function getBasePath(): string {
  if (isDevelopment) {
    return BASE_PATHS.development;
  }
  return BASE_PATHS.production;
}

// Get the full path to a public asset
export function getPublicAssetPath(fileName: string): string {
  const basePath = getBasePath();
  
  // Ensure fileName starts without a slash
  const cleanFileName = fileName.startsWith('/') ? fileName.slice(1) : fileName;
  
  // For development, use direct root path
  if (isDevelopment) {
    return `/${cleanFileName}`;
  }
  
  // For production, include the base path
  return `${basePath}${cleanFileName}`;
}

// Try multiple asset paths in order of preference
export async function loadAssetWithFallbacks(fileName: string): Promise<Response> {
  // Clean the filename
  const cleanFileName = fileName.startsWith('/') ? fileName.slice(1) : fileName;
  
  // In development, use direct paths
  if (isDevelopment) {
    const possiblePaths = [
      `/${cleanFileName}`,            // Root path
      cleanFileName,                  // Direct file path
      `./public/${cleanFileName}`,    // Public folder path (relative)
    ];

    for (const path of possiblePaths) {
      try {
        console.log(`[DEV] Attempting to load asset from: ${path}`);
        const response = await fetch(path);
        if (response.ok) {
          console.log(`[DEV] Successfully loaded asset from: ${path}`);
          return response;
        }
      } catch (error) {
        console.warn(`[DEV] Failed to load from ${path}:`, error);
      }
    }
  } else {
    // Production paths
    const possiblePaths = [
      `/route-radar/${cleanFileName}`, // Production path with base
      `/${cleanFileName}`,             // Root path fallback
      cleanFileName,                   // Direct file path fallback
    ];

    for (const path of possiblePaths) {
      try {
        console.log(`[PROD] Attempting to load asset from: ${path}`);
        const response = await fetch(path);
        if (response.ok) {
          console.log(`[PROD] Successfully loaded asset from: ${path}`);
          return response;
        }
      } catch (error) {
        console.warn(`[PROD] Failed to load from ${path}:`, error);
      }
    }
  }

  throw new Error(`Failed to load asset: ${fileName} from any path. Environment: ${isDevelopment ? 'development' : 'production'}`);
}

// Async function to load JSON file with fallbacks
export async function loadJson<T>(fileName: string): Promise<T> {
  const response = await loadAssetWithFallbacks(fileName);
  const data = await response.json();
  return data;
}

// Export environment detection for use in other modules
export function isDev(): boolean {
  return isDevelopment;
}
