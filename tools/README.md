# Route Radar Tools

This directory contains utility tools for Route Radar development and data management.

## Data Management Tools

### Update RTT

`update-rtt.js` - Update RTT time values between regions in the JSON files.

Usage:
```bash
node update-rtt.js <source> <target> <rtt>
```

### IBM Cloud Latency Scraper Tools

The `scraper` directory contains tools for scraping and updating latency data from IBM Cloud:

1. **Standard Scraper** - `ibm-cloud-latency-scraper.js`
   - Updates existing data with IBM Cloud latency values
   - Preserves existing connections not found in IBM Cloud

2. **IBM Cloud Only Scraper** - `ibm-cloud-only-scraper.js`
   - Replaces existing data with IBM Cloud regions only
   - Does not preserve connections to non-IBM Cloud regions (e.g., Seattle)

3. **Intra-AZ Scraper** - `ibm-cloud-intra-az-scraper.js`
   - Scrapes latency data between availability zones within IBM Cloud regions
   - Creates visualization-ready data with HPC recommendations

### Combined Update Utility

`update-ibm-latency.js` - Combined utility to update both inter-region and intra-AZ latency data.

Usage:
```bash
node update-ibm-latency.js [--inter-region] [--intra-az] [--dry-run]
```

### Data Template Restore Utility

`restore-template-data.js` - Restore original data from the template.

Usage:
```bash
node restore-template-data.js [--dry-run] [--force]
```

## NPM Scripts

For convenience, these tools are available as npm scripts:

```bash
# Update latency data (preserving non-IBM Cloud regions)
npm run update-ibm-latency
npm run update-ibm-latency:dry      # Dry run

# Update intra-AZ latency data
npm run update-intra-az
npm run update-intra-az:dry         # Dry run

# Update both inter-region and intra-AZ data
npm run update-ibm-all
npm run update-ibm-all:dry          # Dry run

# Replace data with IBM Cloud regions only
npm run update-ibm-only
npm run update-ibm-only:dry         # Dry run

# Restore original data from template
npm run restore-data
npm run restore-data:dry            # Dry run
```

## Data Template

The `data-template.zip` file at the project root contains a backup of the original data files. You can restore these files at any time using the `restore-template-data.js` utility.

## Development Mode

All of these tools are designed to run only in development mode for security reasons. To force execution in production, use the `--force` flag, but BE CAREFUL!
