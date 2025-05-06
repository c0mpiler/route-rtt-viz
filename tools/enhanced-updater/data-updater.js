#!/usr/bin/env node

/**
 * Enhanced Latency Data Updater - Main
 * 
 * A comprehensive utility for updating both inter-region and intra-AZ latency data
 * with enhanced error handling, validation, and data integrity checks.
 * 
 * Features:
 * - Unified updates for both inter-region and intra-AZ latency data
 * - Data validation and integrity checks
 * - Automatic backup and restore
 * - Detailed reporting and metrics
 * - Flexible configuration options
 * 
 * Usage:
 *   node data-updater.js [options]
 * 
 * Options:
 *   --inter-region        Update inter-region latency data (default: true)
 *   --intra-az            Update intra-AZ latency data (default: true)
 *   --dry-run             Don't actually update files, just print what would be updated
 *   --force               Force execution even if not in development mode (USE WITH CAUTION)
 *   --skip-backup         Skip creating backup files before updating
 *   --skip-validation     Skip validation of updated data
 *   --skip-metrics        Don't collect metrics about the update
 *   --help                Show this help message
 */

const puppeteer = require('puppeteer');
const config = require('./config');
const utils = require('./utils');
const { generateInterRegionData, generateIntraAzData } = require('./data-generator');

// Parse command line arguments
const args = process.argv.slice(2);

// Show usage help
if (args.includes('--help')) {
  console.log(`
Enhanced Latency Data Updater

A comprehensive utility for updating both inter-region and intra-AZ latency data
with enhanced error handling, validation, and data integrity checks.

Usage:
  node data-updater.js [options]

Options:
  --inter-region        Update inter-region latency data (default: true)
  --intra-az            Update intra-AZ latency data (default: true)
  --dry-run             Don't actually update files, just print what would be updated
  --force               Force execution even if not in development mode (USE WITH CAUTION)
  --skip-backup         Skip creating backup files before updating
  --skip-validation     Skip validation of updated data
  --skip-metrics        Don't collect metrics about the update
  --help                Show this help message
`);
  process.exit(0);
}

// Parse options
const options = {
  ...config.DEFAULT_OPTIONS,
  updateInterRegion: args.includes('--inter-region') || !args.includes('--intra-az'),
  updateIntraAz: args.includes('--intra-az') || !args.includes('--inter-region'),
  dryRun: args.includes('--dry-run'),
  force: args.includes('--force'),
  backupBeforeUpdate: !args.includes('--skip-backup'),
  validateAfterUpdate: !args.includes('--skip-validation'),
  collectMetrics: !args.includes('--skip-metrics'),
};

// Keep track of the update status
let updateStatus = {
  startTime: new Date().toISOString(),
  endTime: null,
  success: false,
  interRegionStatus: {
    updated: false,
    backupCreated: null,
    validationPassed: null,
    changes: null,
    anomalies: null,
  },
  intraAzStatus: {
    updated: false,
    backupCreated: null,
    validationPassed: null,
    changes: null,
    anomalies: null,
  },
  errors: [],
};

// Keep track of metrics
let updateMetrics = {
  timestamp: new Date().toISOString(),
  duration: 0,
  interRegionMetrics: {
    regionCount: 0,
    connectionCount: 0,
    addedConnections: 0,
    updatedConnections: 0,
    anomalyCount: 0,
  },
  intraAzMetrics: {
    regionCount: 0,
    zoneCount: 0,
    zoneConnectionCount: 0,
    updatedZoneConnections: 0,
    anomalyCount: 0,
  },
};

/**
 * Main function
 */
async function main() {
  const startTime = Date.now();
  utils.logger.info('Starting enhanced latency data updater...');
  utils.logger.info(`Options: ${JSON.stringify(options)}`);
  
  // Check if we're running in development mode
  if (!utils.isDevMode(options)) {
    utils.logger.error('ERROR: This utility can only be run in development mode for security reasons.');
    utils.logger.error('If you really want to run it in production, use the --force flag, but BE CAREFUL!');
    process.exit(1);
  }
  
  try {
    // Update the initial status
    await utils.updateStatus(updateStatus, options);
    
    // Check for and create the backup directory if needed
    if (options.backupBeforeUpdate && !options.dryRun) {
      utils.logger.info('Ensuring backup directory exists...');
      const fs = require('fs');
      if (!fs.existsSync(config.BACKUP_DIR)) {
        fs.mkdirSync(config.BACKUP_DIR, { recursive: true });
      }
    }
    
    // Update inter-region latency data if requested
    if (options.updateInterRegion) {
      await updateInterRegionLatencyData();
    }
    
    // Update intra-AZ latency data if requested
    if (options.updateIntraAz) {
      await updateIntraAzLatencyData();
    }
    
    // Calculate metrics
    updateMetrics.duration = (Date.now() - startTime) / 1000;
    
    // Update the final status
    updateStatus.endTime = new Date().toISOString();
    updateStatus.success = true;
    
    await utils.updateStatus(updateStatus, options);
    
    // Collect metrics
    if (options.collectMetrics) {
      await utils.collectMetrics(updateMetrics, options);
    }
    
    utils.logger.success('Update completed successfully');
    
  } catch (error) {
    updateMetrics.duration = (Date.now() - startTime) / 1000;
    
    // Update the final status with the error
    updateStatus.endTime = new Date().toISOString();
    updateStatus.success = false;
    updateStatus.errors.push({
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    });
    
    await utils.updateStatus(updateStatus, options);
    
    // Collect metrics even on error
    if (options.collectMetrics) {
      await utils.collectMetrics(updateMetrics, options);
    }
    
    utils.logger.error('Error during update:', error);
    process.exit(1);
  }
}

/**
 * Update inter-region latency data
 */
async function updateInterRegionLatencyData() {
  utils.logger.info('Updating inter-region latency data...');
  
  try {
    // Create a backup of the existing data if requested
    if (options.backupBeforeUpdate) {
      utils.logger.info('Creating backup of existing inter-region latency data...');
      const backupPath = await utils.createBackup(config.LATENCY_DATA_PATH, options);
      updateStatus.interRegionStatus.backupCreated = backupPath;
    }
    
    // Load the existing data
    utils.logger.info('Loading existing inter-region latency data...');
    const existingData = await utils.loadJsonFile(config.LATENCY_DATA_PATH, { connections: [] });
    
    // Fetch new data
    utils.logger.info('Fetching new inter-region latency data...');
    const newData = await fetchInterRegionLatencyData();
    
    // Merge the data
    utils.logger.info('Merging new data with existing data...');
    const mergeResults = utils.mergeLatencyData(existingData, newData, {
      skipLargeChanges: true,
      maxPercentChange: 75, // Skip changes larger than 75%
    });
    
    // Ensure the graph is fully connected
    utils.logger.info('Ensuring fully connected graph...');
    const enhancedData = utils.ensureConnectedGraph(mergeResults.data);
    
    // Validate the data
    if (options.validateAfterUpdate) {
      utils.logger.info('Validating updated data...');
      const validationResults = utils.validateLatencyData(enhancedData);
      
      if (!validationResults.isValid) {
        utils.logger.error('Validation failed:', validationResults.issues);
        updateStatus.interRegionStatus.validationPassed = false;
        throw new Error(`Validation failed: ${validationResults.issues.map(i => i.message).join(', ')}`);
      }
      
      updateStatus.interRegionStatus.validationPassed = true;
      utils.logger.info('Validation passed');
      
      // Compare old and new data to detect changes
      utils.logger.info('Analyzing changes...');
      const comparisonResults = utils.compareLatencyData(existingData, enhancedData);
      updateStatus.interRegionStatus.changes = comparisonResults;
      
      // Log changes
      utils.logger.info(`Added ${comparisonResults.changes.addedConnections.length} connections`);
      utils.logger.info(`Removed ${comparisonResults.changes.removedConnections.length} connections`);
      utils.logger.info(`Changed ${comparisonResults.changes.changedConnections.length} connections`);
      utils.logger.info(`Added ${comparisonResults.changes.addedRegions.length} regions`);
      utils.logger.info(`Removed ${comparisonResults.changes.removedRegions.length} regions`);
      
      // Detect anomalies
      utils.logger.info('Detecting anomalies...');
      const anomalies = utils.detectAnomalies(enhancedData, comparisonResults);
      updateStatus.interRegionStatus.anomalies = anomalies;
      
      if (anomalies.length > 0) {
        utils.logger.warn(`Detected ${anomalies.length} anomalies`);
        for (const anomaly of anomalies) {
          utils.logger.warn(`[${anomaly.type}] ${anomaly.message}`);
        }
      } else {
        utils.logger.info('No anomalies detected');
      }
      
      // Update metrics
      updateMetrics.interRegionMetrics = {
        regionCount: validationResults.stats.regionCount,
        connectionCount: validationResults.stats.connectionCount,
        addedConnections: comparisonResults.changes.addedConnections.length,
        updatedConnections: comparisonResults.changes.changedConnections.length,
        anomalyCount: anomalies.length,
        avgLatency: validationResults.stats.avgLatency,
        minLatency: validationResults.stats.minLatency,
        maxLatency: validationResults.stats.maxLatency,
      };
    }
    
    // Write the updated data
    utils.logger.info('Writing updated inter-region latency data...');
    await utils.writeJsonFile(config.LATENCY_DATA_PATH, enhancedData, options);
    
    // Update required connections
    await updateRequiredConnections(enhancedData);
    
    // Update fallback files
    await updateFallbackFiles(enhancedData);
    
    updateStatus.interRegionStatus.updated = true;
    utils.logger.success('Inter-region latency data updated successfully');
    
  } catch (error) {
    updateStatus.interRegionStatus.updated = false;
    utils.logger.error('Error updating inter-region latency data:', error);
    
    // Add the error to the status
    updateStatus.errors.push({
      message: `Inter-region update error: ${error.message}`,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    });
    
    throw error;
  }
}

/**
 * Update intra-AZ latency data
 */
async function updateIntraAzLatencyData() {
  utils.logger.info('Updating intra-AZ latency data...');
  
  try {
    // Create a backup of the existing data if requested
    if (options.backupBeforeUpdate) {
      utils.logger.info('Creating backup of existing intra-AZ latency data...');
      const backupPath = await utils.createBackup(config.INTRA_AZ_DATA_PATH, options);
      updateStatus.intraAzStatus.backupCreated = backupPath;
    }
    
    // Load the existing data
    utils.logger.info('Loading existing intra-AZ latency data...');
    let existingData;
    
    try {
      existingData = await utils.loadJsonFile(config.INTRA_AZ_DATA_PATH, null);
    } catch (error) {
      utils.logger.warn('No existing intra-AZ data found or error loading it:', error.message);
      existingData = null;
    }
    
    // Fetch new data
    utils.logger.info('Fetching new intra-AZ latency data...');
    const newData = await fetchIntraAzLatencyData();
    
    // Validate the data
    if (options.validateAfterUpdate) {
      utils.logger.info('Validating new intra-AZ data...');
      
      // Simple validation for intra-AZ data
      if (!newData || !newData.rawData || !newData.rawData.regions || !Array.isArray(newData.rawData.regions)) {
        throw new Error('Invalid intra-AZ data structure');
      }
      
      // Check regions
      if (newData.rawData.regions.length === 0) {
        throw new Error('No regions found in intra-AZ data');
      }
      
      // Check zones and latencies
      for (const region of newData.rawData.regions) {
        if (!region.regionName || !region.zones || !Array.isArray(region.zones) || region.zones.length === 0) {
          throw new Error(`Invalid region data for ${region.regionName || 'unknown region'}`);
        }
        
        if (!region.zoneLatencies || !Array.isArray(region.zoneLatencies) || region.zoneLatencies.length === 0) {
          throw new Error(`No zone latencies found for ${region.regionName}`);
        }
      }
      
      utils.logger.info('Intra-AZ data validation passed');
      updateStatus.intraAzStatus.validationPassed = true;
      
      // Compare with existing data if available
      if (existingData && existingData.rawData && existingData.rawData.regions) {
        utils.logger.info('Analyzing changes in intra-AZ data...');
        
        // Create a simple comparison
        const oldRegionCount = existingData.rawData.regions.length;
        const newRegionCount = newData.rawData.regions.length;
        
        let oldZoneCount = 0;
        let newZoneCount = 0;
        
        let oldLatencyCount = 0;
        let newLatencyCount = 0;
        
        let changedLatencies = 0;
        
        for (const region of existingData.rawData.regions) {
          oldZoneCount += region.zones.length;
          oldLatencyCount += region.zoneLatencies.length;
        }
        
        for (const region of newData.rawData.regions) {
          newZoneCount += region.zones.length;
          newLatencyCount += region.zoneLatencies.length;
        }
        
        // Check for changed latencies
        for (const newRegion of newData.rawData.regions) {
          const oldRegion = existingData.rawData.regions.find(r => r.regionName === newRegion.regionName);
          
          if (oldRegion) {
            for (const newLatency of newRegion.zoneLatencies) {
              const oldLatency = oldRegion.zoneLatencies.find(
                l => l.sourceZone === newLatency.sourceZone && l.targetZone === newLatency.targetZone
              );
              
              if (oldLatency && oldLatency.latency !== newLatency.latency) {
                changedLatencies++;
              }
            }
          }
        }
        
        const changes = {
          regionDiff: newRegionCount - oldRegionCount,
          zoneDiff: newZoneCount - oldZoneCount,
          latencyDiff: newLatencyCount - oldLatencyCount,
          changedLatencies,
        };
        
        updateStatus.intraAzStatus.changes = changes;
        
        utils.logger.info(`Region count change: ${changes.regionDiff > 0 ? '+' : ''}${changes.regionDiff}`);
        utils.logger.info(`Zone count change: ${changes.zoneDiff > 0 ? '+' : ''}${changes.zoneDiff}`);
        utils.logger.info(`Latency entry count change: ${changes.latencyDiff > 0 ? '+' : ''}${changes.latencyDiff}`);
        utils.logger.info(`Changed latency values: ${changedLatencies}`);
        
        // Update metrics
        updateMetrics.intraAzMetrics = {
          regionCount: newRegionCount,
          zoneCount: newZoneCount,
          zoneConnectionCount: newLatencyCount,
          updatedZoneConnections: changedLatencies,
          anomalyCount: 0, // We don't detect anomalies for intra-AZ data yet
        };
      } else {
        // Update metrics for new data
        updateMetrics.intraAzMetrics = {
          regionCount: newData.rawData.regions.length,
          zoneCount: newData.rawData.regions.reduce((sum, region) => sum + region.zones.length, 0),
          zoneConnectionCount: newData.rawData.regions.reduce((sum, region) => sum + region.zoneLatencies.length, 0),
          updatedZoneConnections: 0,
          anomalyCount: 0,
        };
      }
    }
    
    // Write the updated data
    utils.logger.info('Writing updated intra-AZ latency data...');
    await utils.writeJsonFile(config.INTRA_AZ_DATA_PATH, newData, options);
    
    updateStatus.intraAzStatus.updated = true;
    utils.logger.success('Intra-AZ latency data updated successfully');
    
  } catch (error) {
    updateStatus.intraAzStatus.updated = false;
    utils.logger.error('Error updating intra-AZ latency data:', error);
    
    // Add the error to the status
    updateStatus.errors.push({
      message: `Intra-AZ update error: ${error.message}`,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    });
    
    throw error;
  }
}

/**
 * Update required connections file based on the updated latency data
 */
async function updateRequiredConnections(latencyData) {
  utils.logger.info('Updating required connections...');
  
  try {
    // Load the existing required connections
    const requiredData = await utils.loadJsonFile(config.REQUIRED_CONNECTIONS_PATH, { connections: [] });
    
    let requiredUpdated = false;
    
    // Check each latency connection against required connections
    for (const conn of latencyData.connections) {
      // Look for matching required connections
      const matchingConns = requiredData.connections.filter(
        reqConn => 
          (reqConn.source === conn.source && reqConn.target === conn.target) ||
          (reqConn.source === conn.target && reqConn.target === conn.source)
      );
      
      // Update matching connections
      for (const reqConn of matchingConns) {
        if (reqConn.latency !== conn.rtt) {
          reqConn.latency = conn.rtt;
          requiredUpdated = true;
          
          utils.logger.debug(`Updated required connection: ${reqConn.source} → ${reqConn.target} = ${conn.rtt}ms`);
        }
      }
    }
    
    // Write updated required connections if changed
    if (requiredUpdated) {
      utils.logger.info('Writing updated required connections...');
      await utils.writeJsonFile(config.REQUIRED_CONNECTIONS_PATH, requiredData, options);
    } else {
      utils.logger.info('No changes to required connections');
    }
    
    return requiredUpdated;
    
  } catch (error) {
    utils.logger.error('Error updating required connections:', error);
    throw error;
  }
}

/**
 * Update fallback files based on the updated latency data
 */
async function updateFallbackFiles(latencyData) {
  utils.logger.info('Updating fallback files...');
  
  try {
    // First update the backup latency data
    utils.logger.info('Updating backup latency data...');
    await utils.writeJsonFile(config.BACKUP_LATENCY_DATA_PATH, latencyData, options);
    
    // Update fallback connections
    utils.logger.info('Updating fallback connections...');
    
    // Choose a subset of the most important connections for the fallback
    const regions = new Set();
    
    // Collect all regions
    for (const conn of latencyData.connections) {
      regions.add(conn.source);
      regions.add(conn.target);
    }
    
    // Convert to array
    const regionsList = Array.from(regions);
    
    // Create a graph to calculate connectivity
    const connections = new Map();
    
    for (const conn of latencyData.connections) {
      if (!connections.has(conn.source)) {
        connections.set(conn.source, []);
      }
      
      if (!connections.has(conn.target)) {
        connections.set(conn.target, []);
      }
      
      connections.get(conn.source).push({ target: conn.target, rtt: conn.rtt });
      connections.get(conn.target).push({ target: conn.source, rtt: conn.rtt });
    }
    
    // Find the most connected regions
    const regionConnectivity = [];
    
    for (const region of regionsList) {
      regionConnectivity.push({
        region,
        connections: connections.get(region).length,
      });
    }
    
    // Sort by number of connections (descending)
    regionConnectivity.sort((a, b) => b.connections - a.connections);
    
    // Take the top 50% most connected regions
    const topRegionsCount = Math.ceil(regionsList.length / 2);
    const topRegions = regionConnectivity.slice(0, topRegionsCount).map(r => r.region);
    
    // Create a fallback connections list with only the top regions
    const fallbackConnections = {
      connections: [],
    };
    
    // Add connections between top regions
    for (const conn of latencyData.connections) {
      if (topRegions.includes(conn.source) && topRegions.includes(conn.target)) {
        fallbackConnections.connections.push(conn);
      }
    }
    
    // Write fallback connections
    await utils.writeJsonFile(config.FALLBACK_CONNECTIONS_PATH, fallbackConnections, options);
    
    // Update fallback required connections
    utils.logger.info('Updating fallback required connections...');
    
    // Load required connections
    const requiredConnections = await utils.loadJsonFile(config.REQUIRED_CONNECTIONS_PATH, { connections: [] });
    
    // Choose a subset of required connections involving top regions
    const fallbackRequiredConnections = {
      connections: requiredConnections.connections.filter(
        conn => topRegions.includes(conn.source) && topRegions.includes(conn.target)
      ),
    };
    
    // Write fallback required connections
    await utils.writeJsonFile(config.FALLBACK_REQUIRED_CONNECTIONS_PATH, fallbackRequiredConnections, options);
    
    utils.logger.success('Fallback files updated successfully');
    
  } catch (error) {
    utils.logger.error('Error updating fallback files:', error);
    throw error;
  }
}

/**
 * Fetch inter-region latency data from IBM Cloud
 */
async function fetchInterRegionLatencyData() {
  utils.logger.info('Fetching inter-region latency data...');
  
  try {
    // In a real implementation, this would use puppeteer to scrape IBM Cloud
    // For now, use the data generator to generate realistic data
    utils.logger.info('Using simulated data for inter-region latency');
    
    const scrapedData = await generateInterRegionData();
    
    // Convert the scraped data to our application's format
    const formattedData = utils.convertScrapedDataToApplicationFormat(scrapedData);
    
    utils.logger.info(`Generated ${formattedData.connections.length} inter-region connections`);
    
    return formattedData;
    
  } catch (error) {
    utils.logger.error('Error fetching inter-region latency data:', error);
    throw error;
  }
}

/**
 * Fetch intra-AZ latency data from IBM Cloud
 */
async function fetchIntraAzLatencyData() {
  utils.logger.info('Fetching intra-AZ latency data...');
  
  try {
    // In a real implementation, this would use puppeteer to scrape IBM Cloud
    // For now, use the data generator to generate realistic data
    utils.logger.info('Using simulated data for intra-AZ latency');
    
    const intraAzData = await generateIntraAzData();
    
    utils.logger.info(`Generated intra-AZ data with ${intraAzData.rawData.regions.length} regions`);
    
    return intraAzData;
    
  } catch (error) {
    utils.logger.error('Error fetching intra-AZ latency data:', error);
    throw error;
  }
}

// Run the main function
main();
