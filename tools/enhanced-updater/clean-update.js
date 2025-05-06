#!/usr/bin/env node

/**
 * Clean Latency Data Updater
 * 
 * A tool for completely replacing the latency data with a new dataset,
 * rather than merging with existing data. This respects user-uploaded
 * datasets by not polluting them with old values.
 * 
 * Usage:
 *   node clean-update.js [options]
 * 
 * Options:
 *   --inter-region     Update inter-region latency data (default if no options)
 *   --intra-az         Update intra-AZ latency data (default if no options)
 *   --dry-run          Don't actually update files, just print what would be updated
 *   --force            Force execution even if not in development mode (USE WITH CAUTION)
 *   --skip-backup      Skip creating backup files before updating
 *   --help             Show help message
 */

const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const config = require('./config');
const utils = require('./utils');
const { generateInterRegionData, generateIntraAzData } = require('./data-generator');

// Parse command line arguments
const args = process.argv.slice(2);

// Show usage help
if (args.includes('--help')) {
  console.log(`
Clean Latency Data Updater

A tool for completely replacing the latency data with a new dataset,
rather than merging with existing data. This respects user-uploaded
datasets by not polluting them with old values.

Usage:
  node clean-update.js [options]

Options:
  --inter-region     Update inter-region latency data (default if no options)
  --intra-az         Update intra-AZ latency data (default if no options)
  --dry-run          Don't actually update files, just print what would be updated
  --force            Force execution even if not in development mode (USE WITH CAUTION)
  --skip-backup      Skip creating backup files before updating
  --help             Show help message
`);
  process.exit(0);
}

// Parse options
const options = {
  updateInterRegion: args.includes('--inter-region') || (!args.includes('--inter-region') && !args.includes('--intra-az')),
  updateIntraAz: args.includes('--intra-az') || (!args.includes('--inter-region') && !args.includes('--intra-az')),
  dryRun: args.includes('--dry-run'),
  force: args.includes('--force'),
  backupBeforeUpdate: !args.includes('--skip-backup'),
};

// Keep track of the update status
let updateStatus = {
  startTime: new Date().toISOString(),
  endTime: null,
  success: false,
  interRegionStatus: {
    updated: false,
    backupCreated: null,
  },
  intraAzStatus: {
    updated: false,
    backupCreated: null,
  },
  errors: [],
};

/**
 * Main function
 */
async function main() {
  const startTime = Date.now();
  utils.logger.info('Starting clean latency data updater...');
  utils.logger.info(`Options: ${JSON.stringify(options)}`);
  
  // Check if we're running in development mode
  if (!utils.isDevMode(options)) {
    utils.logger.error('ERROR: This utility can only be run in development mode for security reasons.');
    utils.logger.error('If you really want to run it in production, use the --force flag, but BE CAREFUL!');
    process.exit(1);
  }
  
  try {
    // Check for and create the backup directory if needed
    if (options.backupBeforeUpdate && !options.dryRun) {
      utils.logger.info('Ensuring backup directory exists...');
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
    
    // Update the final status
    updateStatus.endTime = new Date().toISOString();
    updateStatus.success = true;
    
    const duration = (Date.now() - startTime) / 1000;
    utils.logger.success(`Update completed successfully in ${duration.toFixed(2)} seconds`);
    
  } catch (error) {
    // Update the final status with the error
    updateStatus.endTime = new Date().toISOString();
    updateStatus.success = false;
    updateStatus.errors.push({
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    });
    
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
    
    // Fetch new data
    utils.logger.info('Fetching new inter-region latency data...');
    const newData = await fetchInterRegionLatencyData();
    
    // Validate the data
    utils.logger.info('Validating new data...');
    const validationResults = utils.validateLatencyData(newData);
    
    if (!validationResults.isValid) {
      utils.logger.error('Validation failed:', validationResults.issues);
      throw new Error(`Validation failed: ${validationResults.issues.map(i => i.message).join(', ')}`);
    }
    
    utils.logger.info('Data validation passed');
    
    // Write the updated data
    utils.logger.info('Writing new inter-region latency data...');
    await utils.writeJsonFile(config.LATENCY_DATA_PATH, newData, options);
    
    // Update required connections and create a new required-connections.json file
    // based only on the new data
    await createRequiredConnections(newData);
    
    // Update fallback files
    await updateFallbackFiles(newData);
    
    updateStatus.interRegionStatus.updated = true;
    utils.logger.success('Inter-region latency data updated successfully');
    
  } catch (error) {
    updateStatus.interRegionStatus.updated = false;
    utils.logger.error('Error updating inter-region latency data:', error);
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
    
    // Fetch new data
    utils.logger.info('Fetching new intra-AZ latency data...');
    const newData = await fetchIntraAzLatencyData();
    
    // Simple validation for intra-AZ data
    if (!newData || !newData.rawData || !newData.rawData.regions || !Array.isArray(newData.rawData.regions)) {
      throw new Error('Invalid intra-AZ data structure');
    }
    
    // Check regions
    if (newData.rawData.regions.length === 0) {
      throw new Error('No regions found in intra-AZ data');
    }
    
    utils.logger.info('Intra-AZ data validation passed');
    
    // Write the updated data
    utils.logger.info('Writing new intra-AZ latency data...');
    await utils.writeJsonFile(config.INTRA_AZ_DATA_PATH, newData, options);
    
    updateStatus.intraAzStatus.updated = true;
    utils.logger.success('Intra-AZ latency data updated successfully');
    
  } catch (error) {
    updateStatus.intraAzStatus.updated = false;
    utils.logger.error('Error updating intra-AZ latency data:', error);
    throw error;
  }
}

/**
 * Create required connections file from the new data
 */
async function createRequiredConnections(latencyData) {
  utils.logger.info('Creating new required connections file...');
  
  try {
    // Create a subset of the latency data for required connections
    const requiredData = {
      connections: [],
    };
    
    // Get unique regions
    const regions = new Set();
    for (const conn of latencyData.connections) {
      regions.add(conn.source);
      regions.add(conn.target);
    }
    
    const regionsList = Array.from(regions);
    
    // Create a graph to calculate connectivity
    const graph = new Map();
    for (const conn of latencyData.connections) {
      if (!graph.has(conn.source)) {
        graph.set(conn.source, []);
      }
      
      if (!graph.has(conn.target)) {
        graph.set(conn.target, []);
      }
      
      graph.get(conn.source).push({ target: conn.target, rtt: conn.rtt });
      graph.get(conn.target).push({ target: conn.source, rtt: conn.rtt });
    }
    
    // Calculate the minimum spanning tree to find essential connections
    const mst = findMinimumSpanningTree(regionsList, graph);
    
    // Add all MST edges to required connections
    for (const edge of mst) {
      const conn = latencyData.connections.find(
        c => (c.source === edge.source && c.target === edge.target) ||
             (c.source === edge.target && c.target === edge.source)
      );
      
      if (conn) {
        requiredData.connections.push({
          source: conn.source,
          target: conn.target,
          latency: conn.rtt,
        });
      }
    }
    
    // Add some additional important connections beyond the MST
    // (for redundancy and to improve network resilience)
    const importantConnections = findImportantConnections(regionsList, graph, mst);
    
    for (const edge of importantConnections) {
      const conn = latencyData.connections.find(
        c => (c.source === edge.source && c.target === edge.target) ||
             (c.source === edge.target && c.target === edge.source)
      );
      
      if (conn) {
        // Check if this connection is already in the required list
        const alreadyExists = requiredData.connections.some(
          rc => (rc.source === conn.source && rc.target === conn.target) ||
               (rc.source === conn.target && rc.target === conn.source)
        );
        
        if (!alreadyExists) {
          requiredData.connections.push({
            source: conn.source,
            target: conn.target,
            latency: conn.rtt,
          });
        }
      }
    }
    
    utils.logger.info(`Created required connections file with ${requiredData.connections.length} connections`);
    
    // Write the required connections file
    await utils.writeJsonFile(config.REQUIRED_CONNECTIONS_PATH, requiredData, options);
    
    return requiredData;
    
  } catch (error) {
    utils.logger.error('Error creating required connections:', error);
    throw error;
  }
}

/**
 * Find the minimum spanning tree of the graph using Prim's algorithm
 */
function findMinimumSpanningTree(nodes, graph) {
  if (nodes.length === 0) return [];
  
  const mst = [];
  const visited = new Set([nodes[0]]);
  const unvisited = new Set(nodes.slice(1));
  
  while (unvisited.size > 0) {
    let minEdge = null;
    let minWeight = Infinity;
    
    // Find the lowest weight edge from a visited node to an unvisited node
    for (const visitedNode of visited) {
      const neighbors = graph.get(visitedNode) || [];
      
      for (const neighbor of neighbors) {
        if (unvisited.has(neighbor.target) && neighbor.rtt < minWeight) {
          minEdge = { source: visitedNode, target: neighbor.target, weight: neighbor.rtt };
          minWeight = neighbor.rtt;
        }
      }
    }
    
    if (minEdge) {
      mst.push(minEdge);
      visited.add(minEdge.target);
      unvisited.delete(minEdge.target);
    } else {
      // If no edge is found, the graph is disconnected
      // Add an arbitrary edge to connect the components
      const visitedNode = Array.from(visited)[0];
      const unvisitedNode = Array.from(unvisited)[0];
      
      mst.push({ source: visitedNode, target: unvisitedNode, weight: Infinity });
      visited.add(unvisitedNode);
      unvisited.delete(unvisitedNode);
    }
  }
  
  return mst;
}

/**
 * Find important connections beyond the minimum spanning tree
 */
function findImportantConnections(nodes, graph, mst) {
  const importantConnections = [];
  
  // Create a set of MST edges for quick lookup
  const mstEdges = new Set();
  for (const edge of mst) {
    mstEdges.add(`${edge.source}:${edge.target}`);
    mstEdges.add(`${edge.target}:${edge.source}`);
  }
  
  // Find the top 20% of non-MST edges by weight (lower is better)
  const nonMstEdges = [];
  
  for (const source of nodes) {
    const neighbors = graph.get(source) || [];
    
    for (const neighbor of neighbors) {
      const target = neighbor.target;
      
      // Skip if this edge is already in the MST
      if (mstEdges.has(`${source}:${target}`)) continue;
      
      // Skip if we've already processed this edge in the reverse direction
      if (nonMstEdges.some(e => 
        (e.source === target && e.target === source)
      )) continue;
      
      nonMstEdges.push({
        source,
        target,
        weight: neighbor.rtt,
      });
    }
  }
  
  // Sort by weight (ascending)
  nonMstEdges.sort((a, b) => a.weight - b.weight);
  
  // Take the top 20% of edges
  const numToTake = Math.ceil(nonMstEdges.length * 0.2);
  const topEdges = nonMstEdges.slice(0, numToTake);
  
  importantConnections.push(...topEdges);
  
  return importantConnections;
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
    utils.logger.info('Creating fallback connections...');
    
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
    
    // Create fallback required connections
    utils.logger.info('Creating fallback required connections...');
    
    // Use MST algorithm to identify critical connections for the fallback
    const mst = findMinimumSpanningTree(topRegions, connections);
    
    const fallbackRequiredConnections = {
      connections: [],
    };
    
    // Add all MST edges to required connections
    for (const edge of mst) {
      const conn = fallbackConnections.connections.find(
        c => (c.source === edge.source && c.target === edge.target) ||
             (c.source === edge.target && c.target === edge.source)
      );
      
      if (conn) {
        fallbackRequiredConnections.connections.push({
          source: conn.source,
          target: conn.target,
          latency: conn.rtt,
        });
      }
    }
    
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
