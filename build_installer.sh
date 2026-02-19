#!/bin/bash

# Build Installer Script for WhizPoint ID

echo "Installing dependencies..."
npm install

echo "Building frontend..."
npm run build

echo "Packaging application (Windows)..."
# Ensure electron-builder is available
if ! command -v electron-builder &> /dev/null; then
    npm install -g electron-builder
fi

npm run dist

echo "Build complete! Check the 'release' folder for the installer."
