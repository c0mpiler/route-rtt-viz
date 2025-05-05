# Changelog

All notable changes to Route Radar will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2025-05-04

### Initial Beta Release

This is the first public release of Route Radar, a network latency visualization tool.

#### Added
- 🌐 **Core Visualizations**
  - Interactive network graph with geographic positioning
  - World map visualization with animated path traversal
  - Comprehensive latency charts and metrics
  - Detailed path explorer with hop-by-hop analysis

- 📊 **Path Analysis**
  - Shortest path calculation using Dijkstra's algorithm
  - Longest path discovery for worst-case analysis
  - Alternative path finding for redundancy planning
  - Path animation with particle systems

- 💾 **Data Management**
  - JSON/CSV file upload support
  - Data export (CSV, JSON, PNG, PDF)
  - RTT data update utility
  - Data validation and error handling

- ⚡ **Performance Optimizations**
  - Virtual scrolling for large datasets
  - Web Workers for path calculations
  - Multi-tier caching system
  - IndexedDB persistence

- 🎨 **User Interface**
  - Responsive design for all devices
  - Integrated header with region selection
  - Tabbed navigation for different views
  - Loading states and error boundaries

- 🛠️ **Developer Features**
  - TypeScript implementation
  - Component-based architecture
  - Custom React hooks
  - Comprehensive error handling

#### Technical Highlights
- Complete data externalization to JSON files
- Robust fallback mechanisms for data loading
- Efficient graph algorithms with cycle prevention
- Advanced visualization pipeline with D3.js
- Real-time performance monitoring

#### Known Issues
- None reported for this initial release

## Notes

This is the first stable release of Route Radar. Previous development versions were internal iterations leading to this public beta.

For future development and bug reports, please open an issue on the GitHub repository.
