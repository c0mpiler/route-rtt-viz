/**
 * Enhanced Latency Data Updater - Configuration
 * 
 * Central configuration for the enhanced updater tools.
 * Consolidates paths, settings, and other configuration values.
 */

const path = require('path');

// Base paths
const PROJECT_ROOT = path.join(__dirname, '../..');
const PUBLIC_DIR = path.join(PROJECT_ROOT, 'public');
const DATA_TEMPLATE_DIR = path.join(PROJECT_ROOT, 'data-template');
const BACKUP_DIR = path.join(PROJECT_ROOT, 'data-backups');

// Primary data files
const LATENCY_DATA_PATH = path.join(PUBLIC_DIR, 'latency-data.json');
const INTRA_AZ_DATA_PATH = path.join(PUBLIC_DIR, 'intra-az-latency-data.json');
const COORDINATES_DATA_PATH = path.join(PUBLIC_DIR, 'coordinates-data.json');
const REQUIRED_CONNECTIONS_PATH = path.join(PUBLIC_DIR, 'required-connections.json');

// Backup data files
const BACKUP_LATENCY_DATA_PATH = path.join(PUBLIC_DIR, 'backup-latency-data.json');
const FALLBACK_CONNECTIONS_PATH = path.join(PUBLIC_DIR, 'fallback-connections.json');
const FALLBACK_REQUIRED_CONNECTIONS_PATH = path.join(PUBLIC_DIR, 'fallback-required-connections.json');

// Status and metrics files
const UPDATE_STATUS_PATH = path.join(PROJECT_ROOT, 'update-status.json');
const UPDATE_METRICS_PATH = path.join(PROJECT_ROOT, 'update-metrics.json');

// IBM Cloud region mappings
const REGION_MAPPINGS = {
  // Map IBM Cloud region codes to our application's region names
  'us-south': 'Dallas',
  'us-east': 'Washington DC',
  'ca-tor': 'Toronto',
  'br-sao': 'Sao Paulo',
  'eu-gb': 'London',
  'eu-de': 'Frankfurt',
  'eu-es': 'Madrid',
  'au-syd': 'Sydney',
  'jp-tok': 'Tokyo',
  'jp-osa': 'Osaka',
  'ca-mon': 'Montreal',
  'in-che': 'Chennai',
  // Add more mappings as needed
};

// Default update options
const DEFAULT_OPTIONS = {
  dryRun: false,
  force: false,
  updateInterRegion: true,
  updateIntraAz: true,
  backupBeforeUpdate: true,
  validateAfterUpdate: true,
  notifyOnComplete: true,
  notifyOnError: true,
  collectMetrics: true,
};

// IBM Cloud Console URLs
const IBM_CLOUD_URL = 'https://cloud.ibm.com/docs/vpc?topic=vpc-network-latency-dashboard';
const VPC_DASH_URL = 'https://cloud.ibm.com/vpc-ext/network/latency';

// Update thresholds for validation
const VALIDATION_THRESHOLDS = {
  // Maximum acceptable percentage of connections to lose in an update
  maxConnectionLossPercent: 5,
  // Maximum acceptable percentage of regions to lose in an update
  maxRegionLossPercent: 2,
  // Minimum number of connections required
  minConnectionCount: 100,
  // Minimum number of regions required
  minRegionCount: 10,
  // Maximum acceptable percentage of connections with significant latency changes
  maxLatencyChangePercent: 30,
  // Threshold (in ms) for what constitutes a "significant" latency change
  significantLatencyChangeThreshold: 20,
};

module.exports = {
  // Paths
  PROJECT_ROOT,
  PUBLIC_DIR,
  DATA_TEMPLATE_DIR,
  BACKUP_DIR,
  LATENCY_DATA_PATH,
  INTRA_AZ_DATA_PATH,
  COORDINATES_DATA_PATH,
  REQUIRED_CONNECTIONS_PATH,
  BACKUP_LATENCY_DATA_PATH,
  FALLBACK_CONNECTIONS_PATH,
  FALLBACK_REQUIRED_CONNECTIONS_PATH,
  UPDATE_STATUS_PATH,
  UPDATE_METRICS_PATH,
  
  // Mappings and URLs
  REGION_MAPPINGS,
  IBM_CLOUD_URL,
  VPC_DASH_URL,
  
  // Options and thresholds
  DEFAULT_OPTIONS,
  VALIDATION_THRESHOLDS,
};
