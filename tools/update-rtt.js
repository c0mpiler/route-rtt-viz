#!/usr/bin/env node

/**
 * RTT Data Update Utility
 * 
 * This script allows you to update RTT time values between regions in the JSON files.
 * It will update the primary latency data file and ensure that all related files
 * stay in sync.
 * 
 * Usage: 
 *   node update-rtt.js <source> <target> <rtt>
 *   node update-rtt.js --import <csv-file>
 *   node update-rtt.js --verify
 *   node update-rtt.js --help
 */

const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const csvParse = require('csv-parse/sync');

// Path constants
const PUBLIC_DIR = path.join(__dirname, '../public');
const LATENCY_DATA_PATH = path.join(PUBLIC_DIR, 'latency-data.json');
const BACKUP_LATENCY_DATA_PATH = path.join(PUBLIC_DIR, 'backup-latency-data.json');
const REQUIRED_CONNECTIONS_PATH = path.join(PUBLIC_DIR, 'required-connections.json');
const FALLBACK_CONNECTIONS_PATH = path.join(PUBLIC_DIR, 'fallback-connections.json');
const FALLBACK_REQUIRED_CONNECTIONS_PATH = path.join(PUBLIC_DIR, 'fallback-required-connections.json');

/**
 * Display help information
 */
function showHelp() {
  console.log(`
RTT Data Update Utility

This script allows you to update RTT time values between regions in the JSON files.
It will update the primary latency data file and ensure that all related files
stay in sync.

Usage: 
  node update-rtt.js <source> <target> <rtt>      Update RTT for a specific connection
  node update-rtt.js --import <csv-file>          Import RTTs from a CSV file
  node update-rtt.js --verify                     Verify that all RTT files are in sync
  node update-rtt.js --help                       Show this help message

Examples:
  node update-rtt.js "New York" "London" 75       Set "New York" to "London" RTT to 75ms
  node update-rtt.js --import new-rtts.csv        Import RTTs from a CSV file
  
CSV Format:
  The CSV file should have columns: source,target,rtt
  Example:
    source,target,rtt
    "New York","London",75
    "Tokyo","Singapore",68

The script will automatically update both directions (source→target and target→source)
and ensure fallback files are updated as well.
  `);
}

/**
 * Load JSON data from a file
 */
async function loadJsonFile(filePath) {
  try {
    const data = await readFile(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error loading ${filePath}:`, error.message);
    return null;
  }
}

/**
 * Write JSON data to a file
 */
async function writeJsonFile(filePath, data) {
  try {
    await writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
    console.log(`Successfully updated ${path.basename(filePath)}`);
    return true;
  } catch (error) {
    console.error(`Error writing to ${filePath}:`, error.message);
    return false;
  }
}

/**
 * Update a connection's RTT value in latency data
 */
function updateConnectionRTT(data, source, target, rtt) {
  const numericRtt = Number(rtt);
  
  if (isNaN(numericRtt) || numericRtt <= 0) {
    console.error(`Invalid RTT value: ${rtt}. Must be a positive number.`);
    return false;
  }
  
  // Find the connection in the data
  let sourceTargetConnection = data.connections.find(
    conn => conn.source === source && conn.target === target
  );
  
  let targetSourceConnection = data.connections.find(
    conn => conn.source === target && conn.target === source
  );
  
  // Update or create the source→target connection
  if (sourceTargetConnection) {
    sourceTargetConnection.rtt = numericRtt;
    console.log(`Updated: ${source} → ${target} = ${numericRtt}ms`);
  } else {
    data.connections.push({ source, target, rtt: numericRtt });
    console.log(`Added new connection: ${source} → ${target} = ${numericRtt}ms`);
  }
  
  // Update or create the target→source connection (for bidirectional consistency)
  if (targetSourceConnection) {
    targetSourceConnection.rtt = numericRtt;
    console.log(`Updated: ${target} → ${source} = ${numericRtt}ms`);
  } else {
    data.connections.push({ source: target, target: source, rtt: numericRtt });
    console.log(`Added new connection: ${target} → ${source} = ${numericRtt}ms`);
  }
  
  return true;
}

/**
 * Update the required connections file (if the connection is required)
 */
async function updateRequiredConnectionsIfNeeded(source, target, rtt) {
  // Load the required connections file
  const requiredData = await loadJsonFile(REQUIRED_CONNECTIONS_PATH);
  if (!requiredData) return false;
  
  let updated = false;
  
  // Check if this connection is a required connection
  const sourceTargetConnection = requiredData.connections.find(
    conn => conn.source === source && conn.target === target
  );
  
  const targetSourceConnection = requiredData.connections.find(
    conn => conn.source === target && conn.target === source
  );
  
  // Update if found
  if (sourceTargetConnection) {
    sourceTargetConnection.latency = Number(rtt);
    updated = true;
  }
  
  if (targetSourceConnection) {
    targetSourceConnection.latency = Number(rtt);
    updated = true;
  }
  
  // If the connection was found and updated, write the changes
  if (updated) {
    await writeJsonFile(REQUIRED_CONNECTIONS_PATH, requiredData);
    console.log(`Updated required connections for ${source} ↔ ${target}`);
    
    // Also update the fallback file
    const fallbackRequiredData = await loadJsonFile(FALLBACK_REQUIRED_CONNECTIONS_PATH);
    if (fallbackRequiredData) {
      // Update fallback required connections
      const fallbackSourceTarget = fallbackRequiredData.connections.find(
        conn => conn.source === source && conn.target === target
      );
      
      const fallbackTargetSource = fallbackRequiredData.connections.find(
        conn => conn.source === target && conn.target === source
      );
      
      // Update if found
      if (fallbackSourceTarget) {
        fallbackSourceTarget.latency = Number(rtt);
      }
      
      if (fallbackTargetSource) {
        fallbackTargetSource.latency = Number(rtt);
      }
      
      await writeJsonFile(FALLBACK_REQUIRED_CONNECTIONS_PATH, fallbackRequiredData);
      console.log(`Updated fallback required connections for ${source} ↔ ${target}`);
    }
  }
  
  return updated;
}

/**
 * Update the fallback connections file
 */
async function updateFallbackConnections(source, target, rtt) {
  // Load the fallback connections file
  const fallbackData = await loadJsonFile(FALLBACK_CONNECTIONS_PATH);
  if (!fallbackData) return false;
  
  let updated = false;
  
  // Check if this connection exists in the fallback data
  const sourceTargetConnection = fallbackData.connections.find(
    conn => conn.source === source && conn.target === target
  );
  
  const targetSourceConnection = fallbackData.connections.find(
    conn => conn.source === target && conn.target === source
  );
  
  // Update if found
  if (sourceTargetConnection) {
    sourceTargetConnection.rtt = Number(rtt);
    updated = true;
  }
  
  if (targetSourceConnection) {
    targetSourceConnection.rtt = Number(rtt);
    updated = true;
  }
  
  // If the connection was found and updated, write the changes
  if (updated) {
    await writeJsonFile(FALLBACK_CONNECTIONS_PATH, fallbackData);
    console.log(`Updated fallback connections for ${source} ↔ ${target}`);
  }
  
  return updated;
}

/**
 * Update a single RTT connection
 */
async function updateRTT(source, target, rtt) {
  if (!source || !target || !rtt) {
    console.error('Missing required parameters: source, target, rtt');
    showHelp();
    return false;
  }
  
  // Load the main latency data
  const latencyData = await loadJsonFile(LATENCY_DATA_PATH);
  if (!latencyData) return false;
  
  // Update the connection RTT
  if (!updateConnectionRTT(latencyData, source, target, rtt)) {
    return false;
  }
  
  // Write the updated data
  if (!await writeJsonFile(LATENCY_DATA_PATH, latencyData)) {
    return false;
  }
  
  // Create a backup
  await writeJsonFile(BACKUP_LATENCY_DATA_PATH, latencyData);
  
  // Update required connections if this is a required connection
  await updateRequiredConnectionsIfNeeded(source, target, rtt);
  
  // Update fallback connections if this connection exists there
  await updateFallbackConnections(source, target, rtt);
  
  console.log(`Successfully updated RTT for ${source} ↔ ${target} to ${rtt}ms`);
  return true;
}

/**
 * Import RTT values from a CSV file
 */
async function importRTTFromCSV(csvFilePath) {
  try {
    const csvData = await readFile(csvFilePath, 'utf8');
    const records = csvParse.parse(csvData, {
      columns: true,
      skip_empty_lines: true
    });
    
    console.log(`Found ${records.length} RTT records in CSV file`);
    
    // Load the main latency data
    const latencyData = await loadJsonFile(LATENCY_DATA_PATH);
    if (!latencyData) return false;
    
    // Process each record
    for (const record of records) {
      const { source, target, rtt } = record;
      
      if (!source || !target || !rtt) {
        console.warn('Skipping invalid record:', record);
        continue;
      }
      
      updateConnectionRTT(latencyData, source, target, rtt);
    }
    
    // Write the updated data
    if (!await writeJsonFile(LATENCY_DATA_PATH, latencyData)) {
      return false;
    }
    
    // Create a backup
    await writeJsonFile(BACKUP_LATENCY_DATA_PATH, latencyData);
    
    // Update required and fallback connections for each record
    for (const record of records) {
      const { source, target, rtt } = record;
      if (source && target && rtt) {
        await updateRequiredConnectionsIfNeeded(source, target, rtt);
        await updateFallbackConnections(source, target, rtt);
      }
    }
    
    console.log(`Successfully imported ${records.length} RTT records from ${csvFilePath}`);
    return true;
  } catch (error) {
    console.error(`Error importing from CSV:`, error.message);
    return false;
  }
}

/**
 * Verify that all RTT files are in sync
 */
async function verifyRTTFiles() {
  // Load all relevant files
  const latencyData = await loadJsonFile(LATENCY_DATA_PATH);
  const backupData = await loadJsonFile(BACKUP_LATENCY_DATA_PATH);
  const requiredData = await loadJsonFile(REQUIRED_CONNECTIONS_PATH);
  const fallbackConnectionsData = await loadJsonFile(FALLBACK_CONNECTIONS_PATH);
  const fallbackRequiredData = await loadJsonFile(FALLBACK_REQUIRED_CONNECTIONS_PATH);
  
  if (!latencyData || !backupData || !requiredData || !fallbackConnectionsData || !fallbackRequiredData) {
    console.error('One or more required files could not be loaded');
    return false;
  }
  
  // Verify main data and backup match
  if (JSON.stringify(latencyData) !== JSON.stringify(backupData)) {
    console.error('❌ latency-data.json and backup-latency-data.json do not match');
  } else {
    console.log('✅ latency-data.json and backup-latency-data.json match');
  }
  
  // Create connection maps for verification
  const latencyMap = {};
  latencyData.connections.forEach(conn => {
    latencyMap[`${conn.source}:${conn.target}`] = conn.rtt;
  });
  
  // Verify required connections
  let requiredConnectionsValid = true;
  for (const conn of requiredData.connections) {
    const key = `${conn.source}:${conn.target}`;
    if (latencyMap[key] !== undefined) {
      if (latencyMap[key] !== conn.latency) {
        console.error(`❌ Mismatch for ${conn.source} → ${conn.target}: latency-data.json=${latencyMap[key]}, required-connections.json=${conn.latency}`);
        requiredConnectionsValid = false;
      }
    } else {
      console.error(`❌ Connection ${conn.source} → ${conn.target} exists in required-connections.json but not in latency-data.json`);
      requiredConnectionsValid = false;
    }
  }
  
  if (requiredConnectionsValid) {
    console.log('✅ required-connections.json values match latency-data.json');
  }
  
  // Verify fallback connections
  let fallbackConnectionsValid = true;
  for (const conn of fallbackConnectionsData.connections) {
    const key = `${conn.source}:${conn.target}`;
    if (latencyMap[key] !== undefined) {
      if (latencyMap[key] !== conn.rtt) {
        console.error(`❌ Mismatch for ${conn.source} → ${conn.target}: latency-data.json=${latencyMap[key]}, fallback-connections.json=${conn.rtt}`);
        fallbackConnectionsValid = false;
      }
    }
  }
  
  if (fallbackConnectionsValid) {
    console.log('✅ fallback-connections.json values are consistent');
  }
  
  // Verify fallback required connections
  let fallbackRequiredValid = true;
  for (const conn of fallbackRequiredData.connections) {
    const requiredConn = requiredData.connections.find(
      reqConn => reqConn.source === conn.source && reqConn.target === conn.target
    );
    
    if (requiredConn) {
      if (requiredConn.latency !== conn.latency) {
        console.error(`❌ Mismatch for ${conn.source} → ${conn.target}: required-connections.json=${requiredConn.latency}, fallback-required-connections.json=${conn.latency}`);
        fallbackRequiredValid = false;
      }
    }
  }
  
  if (fallbackRequiredValid) {
    console.log('✅ fallback-required-connections.json values are consistent');
  }
  
  // Verify bidirectional consistency in latency data
  let bidirectionalConsistent = true;
  for (const conn of latencyData.connections) {
    const reverseKey = `${conn.target}:${conn.source}`;
    if (latencyMap[reverseKey] === undefined) {
      console.error(`❌ Missing reverse connection for ${conn.source} → ${conn.target}`);
      bidirectionalConsistent = false;
    } else if (latencyMap[reverseKey] !== conn.rtt) {
      console.error(`❌ Inconsistent RTT values: ${conn.source} → ${conn.target} = ${conn.rtt}, but ${conn.target} → ${conn.source} = ${latencyMap[reverseKey]}`);
      bidirectionalConsistent = false;
    }
  }
  
  if (bidirectionalConsistent) {
    console.log('✅ All connections have consistent bidirectional RTT values');
  }
  
  // Overall result
  if (requiredConnectionsValid && fallbackConnectionsValid && fallbackRequiredValid && bidirectionalConsistent) {
    console.log('\n🎉 All RTT files are in sync and consistent!');
    return true;
  } else {
    console.log('\n❌ Some inconsistencies were found. Please fix them.');
    return false;
  }
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    showHelp();
    return;
  }
  
  if (args[0] === '--verify') {
    await verifyRTTFiles();
    return;
  }
  
  if (args[0] === '--import') {
    if (args.length < 2) {
      console.error('Missing CSV file path');
      showHelp();
      return;
    }
    
    await importRTTFromCSV(args[1]);
    return;
  }
  
  if (args.length < 3) {
    console.error('Missing required parameters');
    showHelp();
    return;
  }
  
  await updateRTT(args[0], args[1], args[2]);
}

main().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});
