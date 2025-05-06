#!/usr/bin/env node

/**
 * Restore Template Data Utility
 * 
 * This script restores the original data files from the data template.
 * It can be used to reset the data to its original state.
 * 
 * Usage:
 *   node restore-template-data.js [--dry-run] [--force]
 * 
 * Options:
 *   --dry-run    Don't actually restore files, just print what would be restored
 *   --force      Force restoration even if not in development mode (USE WITH CAUTION)
 */

const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const copyFile = promisify(fs.copyFile);
const readdir = promisify(fs.readdir);

// Path constants
const PROJECT_ROOT = path.join(__dirname, '..');
const PUBLIC_DIR = path.join(PROJECT_ROOT, 'public');
const TEMPLATE_DIR = path.join(PROJECT_ROOT, 'data-template');

// Files to restore
const FILES_TO_RESTORE = [
  'latency-data.json',
  'backup-latency-data.json',
  'required-connections.json',
  'fallback-connections.json',
  'fallback-required-connections.json',
  'intra-az-latency-data.json'
];

// Command line arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const isForced = args.includes('--force');

/**
 * Check if we're running in development mode
 */
function isDevMode() {
  return process.env.NODE_ENV === 'development' || 
         process.env.NODE_ENV === undefined || 
         isForced;
}

/**
 * Display usage information
 */
function showUsage() {
  console.log(`
Restore Template Data Utility

This script restores the original data files from the data template.
It can be used to reset the data to its original state.

Usage:
  node restore-template-data.js [--dry-run] [--force]

Options:
  --dry-run    Don't actually restore files, just print what would be restored
  --force      Force restoration even if not in development mode (USE WITH CAUTION)
`);
}

/**
 * Restore a file from the template
 */
async function restoreFile(filename) {
  const sourceFile = path.join(TEMPLATE_DIR, filename);
  const destFile = path.join(PUBLIC_DIR, filename);
  
  try {
    if (isDryRun) {
      console.log(`[DRY RUN] Would restore ${filename} from template`);
      return true;
    }
    
    await copyFile(sourceFile, destFile);
    console.log(`Successfully restored ${filename} from template`);
    return true;
  } catch (error) {
    console.error(`Error restoring ${filename}:`, error.message);
    return false;
  }
}

/**
 * Verify that all template files exist
 */
async function verifyTemplateFiles() {
  try {
    const templateFiles = await readdir(TEMPLATE_DIR);
    
    for (const file of FILES_TO_RESTORE) {
      if (!templateFiles.includes(file)) {
        console.error(`Missing template file: ${file}`);
        return false;
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error verifying template files:', error.message);
    return false;
  }
}

/**
 * Main function
 */
async function main() {
  // Check if we're in development mode
  if (!isDevMode()) {
    console.error('ERROR: This utility can only be run in development mode for security reasons.');
    console.error('If you really want to run it in production, use the --force flag, but BE CAREFUL!');
    process.exit(1);
  }
  
  // Show usage if --help flag is provided
  if (args.includes('--help') || args.includes('-h')) {
    showUsage();
    process.exit(0);
  }
  
  console.log(`Running in ${isDryRun ? 'DRY RUN' : 'LIVE'} mode`);
  
  // Verify that all template files exist
  const filesExist = await verifyTemplateFiles();
  if (!filesExist) {
    console.error('One or more template files are missing. Restoration aborted.');
    process.exit(1);
  }
  
  // Restore each file
  let successful = true;
  for (const file of FILES_TO_RESTORE) {
    const result = await restoreFile(file);
    if (!result) {
      successful = false;
    }
  }
  
  if (successful) {
    console.log('Successfully restored all template data files');
  } else {
    console.error('Error restoring one or more template files');
    process.exit(1);
  }
}

// Run the main function
main().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});
