# Enhanced Latency Data Updater

A comprehensive utility for updating both inter-region and intra-AZ latency data for the Route Radar visualization tool, with enhanced error handling, validation, and data integrity checks.

## Features

- **Unified Updates**: Update both inter-region and intra-AZ latency data in a single operation
- **Data Validation**: Comprehensive validation of updated data to ensure integrity
- **Automatic Backup**: Create backups of existing data before updating
- **Detailed Metrics**: Collect and store metrics about the update process
- **Anomaly Detection**: Identify potential issues in the updated data
- **Graph Connectivity**: Ensure the network graph remains fully connected
- **Fallback Generation**: Maintain fallback data files for resilience

## Installation

```bash
npm install
```

## Usage

### Basic Usage

```bash
# Update both inter-region and intra-AZ data
node data-updater.js

# Dry run (don't actually update files)
node data-updater.js --dry-run

# Update only inter-region data
node data-updater.js --inter-region

# Update only intra-AZ data
node data-updater.js --intra-az
```

### NPM Scripts

From the project root:

```bash
# Update both inter-region and intra-AZ data
npm run update-enhanced

# Dry run (don't actually update files)
npm run update-enhanced:dry

# Update only inter-region data
npm run update-enhanced:inter-region

# Update only intra-AZ data
npm run update-enhanced:intra-az
```

## Options

| Option | Description |
|--------|-------------|
| `--inter-region` | Update inter-region latency data (default if no specific option) |
| `--intra-az` | Update intra-AZ latency data (default if no specific option) |
| `--dry-run` | Don't actually update files, just print what would be updated |
| `--force` | Force execution even if not in development mode (USE WITH CAUTION) |
| `--skip-backup` | Skip creating backup files before updating |
| `--skip-validation` | Skip validation of updated data |
| `--skip-metrics` | Don't collect metrics about the update |
| `--help` | Show help message |

## Files

The enhanced updater system consists of the following files:

- `data-updater.js`: Main entry point for the updater
- `config.js`: Configuration values and paths
- `utils.js`: Utility functions for file operations, validation, and data processing
- `data-generator.js`: Functions to generate simulated latency data

## Metrics and Status

The updater stores metrics and status information in two files:

- `update-status.json`: Current status of the update process
- `update-metrics.json`: Metrics about previous updates

These files are stored in the project root directory and can be used to monitor the update process.

## Data Validation

The updater performs the following validations on the updated data:

- **Structure Validation**: Ensures the data has the correct structure
- **Connectivity Validation**: Ensures the network graph is fully connected
- **Anomaly Detection**: Identifies potential issues in the data
- **Change Analysis**: Analyzes changes between old and new data

## Examples

### Update Both Data Types

```bash
node data-updater.js
```

### Perform a Dry Run

```bash
node data-updater.js --dry-run
```

### Update Only Inter-Region Data

```bash
node data-updater.js --inter-region
```

### Update Only Intra-AZ Data with No Backups

```bash
node data-updater.js --intra-az --skip-backup
```

## Troubleshooting

If you encounter any issues while running the updater, check the following:

1. Ensure you have the necessary permissions to read and write the data files
2. Check the update status in `update-status.json` for error messages
3. Try running with the `--dry-run` option to see what changes would be made
4. If validation fails, check the reported issues and fix them

If issues persist, you can restore the original data using the template data:

```bash
# From project root
npm run restore-data
```
