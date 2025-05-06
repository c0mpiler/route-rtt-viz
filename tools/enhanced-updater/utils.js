/**
 * Enhanced Latency Data Updater - Utilities
 * 
 * Utility functions for the enhanced data updater:
 * - File operations
 * - Data validation
 * - Data processing
 * - Metrics collection
 */

const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const mkdir = promisify(fs.mkdir);
const config = require('./config');

/**
 * Logger with timestamp and level
 */
const logger = {
  debug: (...args) => console.debug(`[${new Date().toISOString()}] [DEBUG]`, ...args),
  info: (...args) => console.info(`[${new Date().toISOString()}] [INFO]`, ...args),
  warn: (...args) => console.warn(`[${new Date().toISOString()}] [WARN]`, ...args),
  error: (...args) => console.error(`[${new Date().toISOString()}] [ERROR]`, ...args),
  success: (...args) => console.info(`[${new Date().toISOString()}] [SUCCESS]`, ...args),
};

/**
 * Check if we're running in development mode
 */
function isDevMode(options = {}) {
  return process.env.NODE_ENV === 'development' || 
         process.env.NODE_ENV === undefined || 
         options.force === true;
}

/**
 * Load JSON data from a file
 */
async function loadJsonFile(filePath, defaultValue = null) {
  try {
    const data = await readFile(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT') {
      logger.warn(`File not found: ${filePath}. Using default value.`);
      return defaultValue;
    }
    logger.error(`Error loading ${filePath}:`, error.message);
    throw error;
  }
}

/**
 * Write JSON data to a file
 */
async function writeJsonFile(filePath, data, options = { dryRun: false }) {
  if (options.dryRun) {
    logger.info(`[DRY RUN] Would write to ${path.basename(filePath)}:`);
    logger.info(JSON.stringify(data, null, 2).slice(0, 300) + '...');
    return true;
  }

  try {
    await writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
    logger.success(`Successfully updated ${path.basename(filePath)}`);
    return true;
  } catch (error) {
    logger.error(`Error writing to ${filePath}:`, error.message);
    throw error;
  }
}

/**
 * Create a timestamped backup of a file
 */
async function createBackup(filePath, options = { dryRun: false }) {
  try {
    // Ensure backup directory exists
    if (!fs.existsSync(config.BACKUP_DIR)) {
      if (options.dryRun) {
        logger.info(`[DRY RUN] Would create backup directory: ${config.BACKUP_DIR}`);
      } else {
        await mkdir(config.BACKUP_DIR, { recursive: true });
        logger.info(`Created backup directory: ${config.BACKUP_DIR}`);
      }
    }
    
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    const fileName = path.basename(filePath);
    const backupPath = path.join(config.BACKUP_DIR, `${fileName}.${timestamp}.bak`);
    
    if (options.dryRun) {
      logger.info(`[DRY RUN] Would create backup of ${fileName} at ${backupPath}`);
      return backupPath;
    }
    
    if (!fs.existsSync(filePath)) {
      logger.warn(`File ${filePath} does not exist. Skipping backup.`);
      return null;
    }
    
    const data = await readFile(filePath, 'utf8');
    await writeFile(backupPath, data, 'utf8');
    logger.info(`Backup created at ${backupPath}`);
    return backupPath;
  } catch (error) {
    logger.error(`Error creating backup of ${filePath}:`, error.message);
    throw error;
  }
}

/**
 * Restore file from backup
 */
async function restoreFromBackup(backupPath, targetPath, options = { dryRun: false }) {
  try {
    if (options.dryRun) {
      logger.info(`[DRY RUN] Would restore ${path.basename(targetPath)} from ${path.basename(backupPath)}`);
      return true;
    }
    
    if (!fs.existsSync(backupPath)) {
      logger.error(`Backup file ${backupPath} does not exist.`);
      return false;
    }
    
    const data = await readFile(backupPath, 'utf8');
    await writeFile(targetPath, data, 'utf8');
    logger.success(`Successfully restored ${path.basename(targetPath)} from backup`);
    return true;
  } catch (error) {
    logger.error(`Error restoring from backup:`, error.message);
    throw error;
  }
}

/**
 * Update status file with current update status
 */
async function updateStatus(status, options = { dryRun: false }) {
  try {
    const timestamp = new Date().toISOString();
    const statusData = {
      ...status,
      timestamp,
      lastUpdate: timestamp,
    };
    
    if (options.dryRun) {
      logger.info(`[DRY RUN] Would update status file with:`, statusData);
      return true;
    }
    
    await writeJsonFile(config.UPDATE_STATUS_PATH, statusData, { dryRun: false });
    return true;
  } catch (error) {
    logger.error(`Error updating status file:`, error.message);
    return false;
  }
}

/**
 * Collect and store metrics about the update process
 */
async function collectMetrics(metrics, options = { dryRun: false }) {
  try {
    if (!options.collectMetrics) {
      return true;
    }
    
    const timestamp = new Date().toISOString();
    
    // Load existing metrics if available
    let existingMetrics = [];
    try {
      existingMetrics = await loadJsonFile(config.UPDATE_METRICS_PATH, []);
    } catch (error) {
      logger.warn(`Could not load existing metrics, starting fresh:`, error.message);
    }
    
    // Add new metrics entry
    const metricsData = {
      ...metrics,
      timestamp,
    };
    
    existingMetrics.push(metricsData);
    
    // Limit to last 50 entries
    if (existingMetrics.length > 50) {
      existingMetrics = existingMetrics.slice(-50);
    }
    
    if (options.dryRun) {
      logger.info(`[DRY RUN] Would update metrics file with new entry:`, metricsData);
      return true;
    }
    
    await writeJsonFile(config.UPDATE_METRICS_PATH, existingMetrics, { dryRun: false });
    return true;
  } catch (error) {
    logger.error(`Error collecting metrics:`, error.message);
    return false;
  }
}

/**
 * Validate latency data against rules
 */
function validateLatencyData(latencyData, rules = config.VALIDATION_THRESHOLDS) {
  const results = {
    isValid: true,
    issues: [],
    stats: {
      connectionCount: 0,
      regionCount: 0,
      avgLatency: 0,
      minLatency: Infinity,
      maxLatency: 0,
    },
  };
  
  try {
    // Check data structure
    if (!latencyData || !latencyData.connections || !Array.isArray(latencyData.connections)) {
      results.isValid = false;
      results.issues.push({
        severity: 'critical',
        message: 'Invalid data structure: missing connections array',
      });
      return results;
    }
    
    // Get connection count
    const connectionCount = latencyData.connections.length;
    results.stats.connectionCount = connectionCount;
    
    // Check minimum connection count
    if (connectionCount < rules.minConnectionCount) {
      results.isValid = false;
      results.issues.push({
        severity: 'critical',
        message: `Insufficient connections: ${connectionCount} (minimum ${rules.minConnectionCount})`,
      });
    }
    
    // Get unique regions
    const regions = new Set();
    let totalLatency = 0;
    
    // Analyze connections
    for (const conn of latencyData.connections) {
      // Check connection structure
      if (!conn.source || !conn.target || typeof conn.rtt !== 'number') {
        results.issues.push({
          severity: 'warning',
          message: `Invalid connection: ${JSON.stringify(conn)}`,
        });
        continue;
      }
      
      // Add regions to set
      regions.add(conn.source);
      regions.add(conn.target);
      
      // Collect latency statistics
      const rtt = conn.rtt;
      totalLatency += rtt;
      
      if (rtt < results.stats.minLatency) {
        results.stats.minLatency = rtt;
      }
      
      if (rtt > results.stats.maxLatency) {
        results.stats.maxLatency = rtt;
      }
      
      // Check for invalid latency values
      if (rtt <= 0) {
        results.issues.push({
          severity: 'warning',
          message: `Non-positive latency for ${conn.source} → ${conn.target}: ${rtt}ms`,
        });
      }
      
      if (rtt > 1000) {
        results.issues.push({
          severity: 'warning',
          message: `Unusually high latency for ${conn.source} → ${conn.target}: ${rtt}ms`,
        });
      }
    }
    
    // Calculate average latency
    results.stats.avgLatency = totalLatency / connectionCount;
    
    // Get region count
    const regionCount = regions.size;
    results.stats.regionCount = regionCount;
    
    // Check minimum region count
    if (regionCount < rules.minRegionCount) {
      results.isValid = false;
      results.issues.push({
        severity: 'critical',
        message: `Insufficient regions: ${regionCount} (minimum ${rules.minRegionCount})`,
      });
    }
    
    // Check for isolated regions
    const connectedRegions = new Map();
    
    for (const conn of latencyData.connections) {
      if (!connectedRegions.has(conn.source)) {
        connectedRegions.set(conn.source, new Set());
      }
      
      if (!connectedRegions.has(conn.target)) {
        connectedRegions.set(conn.target, new Set());
      }
      
      connectedRegions.get(conn.source).add(conn.target);
      connectedRegions.get(conn.target).add(conn.source);
    }
    
    for (const [region, connections] of connectedRegions.entries()) {
      if (connections.size < 2) {
        results.issues.push({
          severity: 'warning',
          message: `Region ${region} has only ${connections.size} connection(s)`,
        });
      }
    }
    
    // Set overall validity based on issues
    if (results.issues.some(issue => issue.severity === 'critical')) {
      results.isValid = false;
    }
    
    return results;
    
  } catch (error) {
    results.isValid = false;
    results.issues.push({
      severity: 'critical',
      message: `Validation error: ${error.message}`,
    });
    return results;
  }
}

/**
 * Compare old and new latency data and detect changes
 */
function compareLatencyData(oldData, newData) {
  const results = {
    changes: {
      addedConnections: [],
      removedConnections: [],
      changedConnections: [],
      addedRegions: [],
      removedRegions: [],
    },
    stats: {
      totalConnectionChanges: 0,
      totalRegionChanges: 0,
      connectionChangePercent: 0,
      regionChangePercent: 0,
      avgLatencyChange: 0,
      significantChangesCount: 0,
      significantChangesPercent: 0,
    },
  };
  
  try {
    // Check data structure
    if (!oldData || !oldData.connections || !Array.isArray(oldData.connections) ||
        !newData || !newData.connections || !Array.isArray(newData.connections)) {
      throw new Error('Invalid data structure: missing connections array');
    }
    
    // Create region sets
    const oldRegions = new Set();
    const newRegions = new Set();
    
    // Create connection maps for quick lookup
    const oldConnections = new Map();
    const newConnections = new Map();
    
    // Process old connections
    for (const conn of oldData.connections) {
      oldRegions.add(conn.source);
      oldRegions.add(conn.target);
      
      // Use a composite key for the connection
      const key = `${conn.source}:${conn.target}`;
      oldConnections.set(key, conn);
    }
    
    // Process new connections
    for (const conn of newData.connections) {
      newRegions.add(conn.source);
      newRegions.add(conn.target);
      
      // Use a composite key for the connection
      const key = `${conn.source}:${conn.target}`;
      newConnections.set(key, conn);
    }
    
    // Find added and removed regions
    for (const region of oldRegions) {
      if (!newRegions.has(region)) {
        results.changes.removedRegions.push(region);
      }
    }
    
    for (const region of newRegions) {
      if (!oldRegions.has(region)) {
        results.changes.addedRegions.push(region);
      }
    }
    
    // Find added, removed, and changed connections
    for (const [key, oldConn] of oldConnections.entries()) {
      if (!newConnections.has(key)) {
        results.changes.removedConnections.push(oldConn);
      } else {
        const newConn = newConnections.get(key);
        
        // Check for latency change
        if (oldConn.rtt !== newConn.rtt) {
          const change = {
            source: oldConn.source,
            target: oldConn.target,
            oldRtt: oldConn.rtt,
            newRtt: newConn.rtt,
            diff: newConn.rtt - oldConn.rtt,
            percentChange: ((newConn.rtt - oldConn.rtt) / oldConn.rtt) * 100,
          };
          
          results.changes.changedConnections.push(change);
          
          // Check if this is a significant change
          if (Math.abs(change.diff) >= config.VALIDATION_THRESHOLDS.significantLatencyChangeThreshold) {
            results.stats.significantChangesCount++;
          }
        }
      }
    }
    
    for (const [key, newConn] of newConnections.entries()) {
      if (!oldConnections.has(key)) {
        results.changes.addedConnections.push(newConn);
      }
    }
    
    // Calculate statistics
    results.stats.totalConnectionChanges = 
      results.changes.addedConnections.length + 
      results.changes.removedConnections.length;
    
    results.stats.totalRegionChanges = 
      results.changes.addedRegions.length + 
      results.changes.removedRegions.length;
    
    results.stats.connectionChangePercent = 
      (results.stats.totalConnectionChanges / oldData.connections.length) * 100;
    
    results.stats.regionChangePercent = 
      (results.stats.totalRegionChanges / oldRegions.size) * 100;
    
    // Calculate average latency change
    if (results.changes.changedConnections.length > 0) {
      const totalLatencyChange = results.changes.changedConnections.reduce(
        (sum, change) => sum + Math.abs(change.diff), 0
      );
      
      results.stats.avgLatencyChange = 
        totalLatencyChange / results.changes.changedConnections.length;
      
      results.stats.significantChangesPercent = 
        (results.stats.significantChangesCount / oldData.connections.length) * 100;
    }
    
    return results;
    
  } catch (error) {
    throw new Error(`Comparison error: ${error.message}`);
  }
}

/**
 * Detect anomalies in latency data
 */
function detectAnomalies(latencyData, comparisonResults = null) {
  const anomalies = [];
  
  try {
    // Check for disconnected regions
    const connections = new Map();
    
    for (const conn of latencyData.connections) {
      if (!connections.has(conn.source)) {
        connections.set(conn.source, []);
      }
      
      if (!connections.has(conn.target)) {
        connections.set(conn.target, []);
      }
      
      connections.get(conn.source).push(conn.target);
      connections.get(conn.target).push(conn.source);
    }
    
    // Check for isolated regions
    for (const [region, connectedTo] of connections.entries()) {
      if (connectedTo.length < 2) {
        anomalies.push({
          type: 'isolated_region',
          severity: 'warning',
          message: `Region ${region} is isolated with only ${connectedTo.length} connection(s)`,
          details: {
            region,
            connectionCount: connectedTo.length,
            connectedTo,
          },
        });
      }
    }
    
    // Check for abnormal latency values
    for (const conn of latencyData.connections) {
      // Check for unrealistically low latency
      if (conn.rtt < 1) {
        anomalies.push({
          type: 'unrealistic_latency',
          severity: 'warning',
          message: `Unrealistically low latency for ${conn.source} → ${conn.target}: ${conn.rtt}ms`,
          details: conn,
        });
      }
      
      // Check for extremely high latency
      if (conn.rtt > 500) {
        anomalies.push({
          type: 'high_latency',
          severity: 'warning',
          message: `Extremely high latency for ${conn.source} → ${conn.target}: ${conn.rtt}ms`,
          details: conn,
        });
      }
    }
    
    // Check for significant changes if comparison data is provided
    if (comparisonResults) {
      // Check for significant changes in latency
      for (const change of comparisonResults.changes.changedConnections) {
        if (Math.abs(change.percentChange) > 50) {
          anomalies.push({
            type: 'significant_latency_change',
            severity: 'warning',
            message: `Significant latency change (${change.percentChange.toFixed(1)}%) for ${change.source} → ${change.target}: ${change.oldRtt}ms → ${change.newRtt}ms`,
            details: change,
          });
        }
      }
      
      // Check for a high percentage of changed connections
      if (comparisonResults.stats.connectionChangePercent > 40) {
        anomalies.push({
          type: 'high_change_rate',
          severity: 'warning',
          message: `High percentage of connections changed: ${comparisonResults.stats.connectionChangePercent.toFixed(1)}%`,
          details: {
            addedCount: comparisonResults.changes.addedConnections.length,
            removedCount: comparisonResults.changes.removedConnections.length,
            changedCount: comparisonResults.changes.changedConnections.length,
            totalChangePercent: comparisonResults.stats.connectionChangePercent,
          },
        });
      }
    }
    
    return anomalies;
    
  } catch (error) {
    anomalies.push({
      type: 'analysis_error',
      severity: 'error',
      message: `Error analyzing latency data: ${error.message}`,
    });
    
    return anomalies;
  }
}

/**
 * Merge latency datasets, preferring new data where available
 */
function mergeLatencyData(baseData, newData, options = {}) {
  // Clone the base data to avoid modifying it
  const result = {
    connections: [...baseData.connections],
  };
  
  // Create a map of existing connections for quick lookup
  const existingConnections = new Map();
  
  for (const conn of result.connections) {
    const key = `${conn.source}:${conn.target}`;
    existingConnections.set(key, conn);
  }
  
  // Track changes for logging and metrics
  const changes = {
    added: 0,
    updated: 0,
    unchanged: 0,
  };
  
  // Process each connection in the new data
  for (const conn of newData.connections) {
    const key = `${conn.source}:${conn.target}`;
    
    if (existingConnections.has(key)) {
      // Update existing connection if RTT has changed
      const existingConn = existingConnections.get(key);
      
      if (existingConn.rtt !== conn.rtt) {
        // Calculate the percentage change
        const percentChange = ((conn.rtt - existingConn.rtt) / existingConn.rtt) * 100;
        const absPercentChange = Math.abs(percentChange);
        
        // Skip updates with extremely large changes if configured
        if (options.skipLargeChanges && absPercentChange > options.maxPercentChange) {
          logger.warn(
            `Skipping update with ${percentChange.toFixed(1)}% change: ${conn.source} → ${conn.target}: ${existingConn.rtt}ms → ${conn.rtt}ms`
          );
          changes.unchanged++;
          continue;
        }
        
        existingConn.rtt = conn.rtt;
        changes.updated++;
        
        logger.debug(
          `Updated: ${conn.source} → ${conn.target}: ${existingConn.rtt}ms → ${conn.rtt}ms (${percentChange.toFixed(1)}%)`
        );
      } else {
        changes.unchanged++;
      }
    } else {
      // Add new connection
      result.connections.push(conn);
      changes.added++;
      
      logger.debug(`Added: ${conn.source} → ${conn.target} = ${conn.rtt}ms`);
    }
  }
  
  logger.info(`Merge summary: ${changes.added} added, ${changes.updated} updated, ${changes.unchanged} unchanged`);
  
  // Return the merged data and change statistics
  return {
    data: result,
    changes,
  };
}

/**
 * Ensure that the graph is fully connected by fixing missing connections
 */
function ensureConnectedGraph(latencyData) {
  // Clone the data to avoid modifying the original
  const result = {
    connections: [...latencyData.connections],
  };
  
  // Create a map of all regions and their connections
  const regions = new Set();
  const connections = new Map();
  
  for (const conn of result.connections) {
    regions.add(conn.source);
    regions.add(conn.target);
    
    if (!connections.has(conn.source)) {
      connections.set(conn.source, new Set());
    }
    
    if (!connections.has(conn.target)) {
      connections.set(conn.target, new Set());
    }
    
    connections.get(conn.source).add(conn.target);
    connections.get(conn.target).add(conn.source);
  }
  
  // Convert regions set to array for easier traversal
  const regionsList = Array.from(regions);
  
  // Check if each region can reach every other region
  const unreachableRegions = new Map();
  
  for (const sourceRegion of regionsList) {
    // Use BFS to find all reachable regions
    const visited = new Set();
    const queue = [sourceRegion];
    
    while (queue.length > 0) {
      const currentRegion = queue.shift();
      
      if (visited.has(currentRegion)) {
        continue;
      }
      
      visited.add(currentRegion);
      
      // Add all connected regions to the queue
      const connectedRegions = connections.get(currentRegion) || new Set();
      
      for (const connectedRegion of connectedRegions) {
        if (!visited.has(connectedRegion)) {
          queue.push(connectedRegion);
        }
      }
    }
    
    // Find all unreachable regions
    const unreachable = [];
    
    for (const targetRegion of regionsList) {
      if (targetRegion !== sourceRegion && !visited.has(targetRegion)) {
        unreachable.push(targetRegion);
      }
    }
    
    if (unreachable.length > 0) {
      unreachableRegions.set(sourceRegion, unreachable);
    }
  }
  
  // Fix unreachable regions
  if (unreachableRegions.size > 0) {
    logger.warn(`Found ${unreachableRegions.size} regions with unreachable destinations`);
    
    // Find regions with the most connections to use as hubs
    const regionConnectionCounts = new Map();
    
    for (const [region, connectedRegions] of connections.entries()) {
      regionConnectionCounts.set(region, connectedRegions.size);
    }
    
    // Sort regions by connection count (descending)
    const sortedRegions = Array.from(regionConnectionCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(entry => entry[0]);
    
    const hubRegions = sortedRegions.slice(0, 3);
    logger.info(`Using hub regions: ${hubRegions.join(', ')}`);
    
    // Fix unreachable regions by connecting through hub regions
    for (const [sourceRegion, unreachable] of unreachableRegions.entries()) {
      for (const targetRegion of unreachable) {
        // Find a hub that can reach both the source and target
        let connectedHub = null;
        
        for (const hub of hubRegions) {
          const sourceConnections = connections.get(sourceRegion) || new Set();
          const targetConnections = connections.get(targetRegion) || new Set();
          
          if (sourceConnections.has(hub) && targetConnections.has(hub)) {
            connectedHub = hub;
            break;
          }
        }
        
        if (connectedHub) {
          // Calculate RTT based on connections through the hub
          const sourceToHub = result.connections.find(
            conn => 
              (conn.source === sourceRegion && conn.target === connectedHub) ||
              (conn.source === connectedHub && conn.target === sourceRegion)
          );
          
          const hubToTarget = result.connections.find(
            conn => 
              (conn.source === connectedHub && conn.target === targetRegion) ||
              (conn.source === targetRegion && conn.target === connectedHub)
          );
          
          if (sourceToHub && hubToTarget) {
            const rtt = Math.ceil(sourceToHub.rtt + hubToTarget.rtt);
            
            // Add the connection
            result.connections.push({
              source: sourceRegion,
              target: targetRegion,
              rtt,
            });
            
            // Add the reverse connection
            result.connections.push({
              source: targetRegion,
              target: sourceRegion,
              rtt,
            });
            
            logger.info(
              `Added connection through hub ${connectedHub}: ${sourceRegion} → ${targetRegion} = ${rtt}ms`
            );
          }
        } else {
          // If no hub is found, use the first hub and add connections
          const hub = hubRegions[0];
          
          // Calculate an estimated RTT based on global averages
          // This is a fallback when we can't find a good route
          const averageRtt = Math.round(
            result.connections.reduce((sum, conn) => sum + conn.rtt, 0) / result.connections.length
          );
          
          // Add connections to/from the hub
          if (!connections.get(sourceRegion)?.has(hub)) {
            const rtt = Math.ceil(averageRtt * 0.8); // 80% of average as an estimate
            
            result.connections.push({
              source: sourceRegion,
              target: hub,
              rtt,
            });
            
            result.connections.push({
              source: hub,
              target: sourceRegion,
              rtt,
            });
            
            logger.info(`Added missing hub connection: ${sourceRegion} → ${hub} = ${rtt}ms`);
          }
          
          if (!connections.get(targetRegion)?.has(hub)) {
            const rtt = Math.ceil(averageRtt * 0.8); // 80% of average as an estimate
            
            result.connections.push({
              source: targetRegion,
              target: hub,
              rtt,
            });
            
            result.connections.push({
              source: hub,
              target: targetRegion,
              rtt,
            });
            
            logger.info(`Added missing hub connection: ${targetRegion} → ${hub} = ${rtt}ms`);
          }
          
          // Now add the direct connection through the hub
          const estimatedRtt = Math.ceil(averageRtt * 1.2); // 120% of average as an estimate
          
          result.connections.push({
            source: sourceRegion,
            target: targetRegion,
            rtt: estimatedRtt,
          });
          
          result.connections.push({
            source: targetRegion,
            target: sourceRegion,
            rtt: estimatedRtt,
          });
          
          logger.info(
            `Added estimated connection: ${sourceRegion} → ${targetRegion} = ${estimatedRtt}ms`
          );
        }
      }
    }
  }
  
  return result;
}

/**
 * Convert IBM Cloud region code to display name
 */
function convertRegionName(ibmRegion) {
  return config.REGION_MAPPINGS[ibmRegion] || ibmRegion;
}

/**
 * Convert IBM Cloud scraped data to application format
 */
function convertScrapedDataToApplicationFormat(scrapedData) {
  const connections = [];
  
  // Extract connections from the scraped data
  for (const sourceRegion in scrapedData.regions) {
    const destinations = scrapedData.regions[sourceRegion];
    
    for (const targetRegion in destinations) {
      const rtt = destinations[targetRegion];
      
      // Convert IBM Cloud region names to our application's format
      const source = convertRegionName(sourceRegion);
      const target = convertRegionName(targetRegion);
      
      // Skip if we don't have a mapping for this region
      if (!source || !target) continue;
      
      // Add the connection
      connections.push({
        source,
        target,
        rtt
      });
    }
  }
  
  return { connections };
}

module.exports = {
  logger,
  isDevMode,
  loadJsonFile,
  writeJsonFile,
  createBackup,
  restoreFromBackup,
  updateStatus,
  collectMetrics,
  validateLatencyData,
  compareLatencyData,
  detectAnomalies,
  mergeLatencyData,
  ensureConnectedGraph,
  convertRegionName,
  convertScrapedDataToApplicationFormat,
};
