#!/bin/bash
# Script to run the development server

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "Node.js is required but not installed. Please install Node.js first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "npm is required but not installed. Please install npm first."
    exit 1
fi

# Install dependencies if node_modules doesn't exist or if package.json has changed
if [ ! -d "node_modules" ] || [ package.json -nt node_modules ]; then
    echo "Installing dependencies..."
    npm install
fi

# Check if D3-geo-projection is installed correctly
if [ ! -d "node_modules/d3-geo-projection" ]; then
    echo "D3-geo-projection not found, installing..."
    npm install d3-geo-projection
fi

# Start the development server
echo "Starting development server..."
npm run dev
