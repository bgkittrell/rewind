#!/bin/bash

# Script to generate iOS-specific icon sizes from the base icon
# Requires ImageMagick to be installed

echo "Generating iOS icon sizes..."

# Check if ImageMagick is installed
if ! command -v convert &> /dev/null; then
    echo "ImageMagick is required but not installed. Please install it first."
    echo "On macOS: brew install imagemagick"
    echo "On Ubuntu/Debian: sudo apt-get install imagemagick"
    exit 1
fi

# Source icon (using the largest available)
SOURCE_ICON="../public/icon-512.png"

# Check if source icon exists
if [ ! -f "$SOURCE_ICON" ]; then
    echo "Source icon not found at $SOURCE_ICON"
    echo "Please ensure icon-512.png exists in the public directory"
    exit 1
fi

# Generate iOS-specific sizes
convert "$SOURCE_ICON" -resize 120x120 ../public/icon-120x120.png
echo "Generated icon-120x120.png"

convert "$SOURCE_ICON" -resize 152x152 ../public/icon-152x152.png
echo "Generated icon-152x152.png"

convert "$SOURCE_ICON" -resize 167x167 ../public/icon-167x167.png
echo "Generated icon-167x167.png"

convert "$SOURCE_ICON" -resize 180x180 ../public/icon-180x180.png
echo "Generated icon-180x180.png"

# Also ensure we have the standard sizes
convert "$SOURCE_ICON" -resize 96x96 ../public/icon-96x96.png
echo "Generated icon-96x96.png"

convert "$SOURCE_ICON" -resize 128x128 ../public/icon-128x128.png
echo "Generated icon-128x128.png"

convert "$SOURCE_ICON" -resize 256x256 ../public/icon-256x256.png
echo "Generated icon-256x256.png"

convert "$SOURCE_ICON" -resize 384x384 ../public/icon-384x384.png
echo "Generated icon-384x384.png"

echo "All iOS icons generated successfully!"