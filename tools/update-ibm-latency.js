#!/usr/bin/env node

/**
 * Update IBM Cloud Latency Data
 * 
 * This script is a convenience wrapper for the IBM Cloud latency scrapers.
 * It allows updating both inter-region and intra-AZ latency data with a single command.
 * 
 * Usage:
 *   node update-ibm-latency.js [--inter-region] [--intra-az] [--dry-run] [--force]
 * 
 * Options:
 *   --inter-region   Update inter-region latency data (default if no options specified)
 *   --intra-az       Update intra-AZ latency data
 *   --dry-run        Don't actually update files, just print what would be updated
 *   --force          Force execution even if not in development mode (USE WITH CAUTION)
 */

const path = require('path');
const { spawn } = require('child_process');

// Parse command line arguments
const args = process.argv.slice(2);
const updateInterRegion = args.includes('--inter-region') || (!args.includes('--inter-region') && !args.includes('--intra-az'));
const updateIntraAz = args.includes('--intra-az');
const dryRun = args.includes('--dry-run');
const force = args.includes('--force');

// Paths to scraper scripts
const interRegionScraperPath = path.join(__dirname, 'scraper', 'ibm-cloud-latency-scraper.js');
const intraAzScraperPath = path.join(__dirname, 'scraper', 'ibm-cloud-intra-az-scraper.js');

// Build arguments for spawned processes
const buildScraperArgs = () => {
  const scraperArgs = [];
  if (dryRun) scraperArgs.push('--dry-run');
  if (force) scraperArgs.push('--force');
  return scraperArgs;
};

/**
 * Spawn a process to run a script
 */
function runScript(scriptPath, args) {
  return new Promise((resolve, reject) => {
    console.log(`Running ${path.basename(scriptPath)} with args:`, args.join(' '));
    
    const child = spawn('node', [scriptPath, ...args], { stdio: 'inherit' });
    
    child.on('close', code => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Script exited with code ${code}`));
      }
    });
  });
}

/**
 * Run the scrapers based on command line arguments
 */
async function main() {
  try {
    const scraperArgs = buildScraperArgs();
    
    if (updateInterRegion) {
      console.log('Updating inter-region latency data...');
      await runScript(interRegionScraperPath, scraperArgs);
    }
    
    if (updateIntraAz) {
      console.log('Updating intra-AZ latency data...');
      await runScript(intraAzScraperPath, scraperArgs);
    }
    
    console.log('All updates completed successfully.');
  } catch (error) {
    console.error('Error running scrapers:', error.message);
    process.exit(1);
  }
}

// Run the main function
main();
