#!/bin/bash

# Build and analyze bundle
echo "Building with bundle analysis..."
vite build --mode analyze

echo "Bundle analysis complete! Check bundle-analysis.html"
