import { vi } from 'vitest';
import fs from 'fs';
import path from 'path';

// Mock import.meta.env for tests
vi.stubGlobal('import.meta.env', {
  MODE: 'test',
  DEV: false,
  PROD: false,
  BASE_URL: '/',
  SSR: false
});

// Mock fetch to properly handle file reading in tests
globalThis.fetch = vi.fn(async (url: string) => {
  if (typeof url === 'string' && !url.startsWith('http')) {
    // Handle local file URLs
    const filePath = url.startsWith('/') 
      ? path.join(process.cwd(), 'public', url) 
      : url.includes('public/')
      ? path.join(process.cwd(), url)
      : path.join(process.cwd(), 'public', url);

    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      return {
        ok: true,
        text: async () => content,
        json: async () => JSON.parse(content),
      };
    } catch (error) {
      console.error(`Failed to read file: ${filePath}`, error);
      return {
        ok: false,
        status: 404,
        statusText: 'Not Found',
      };
    }
  }
  
  // For actual HTTP URLs, use the real fetch
  return (global as any).originalFetch(url);
}) as any;

// Preserve original fetch
(global as any).originalFetch = global.fetch;
