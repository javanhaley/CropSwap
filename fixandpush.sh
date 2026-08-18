#!/bin/bash
# CropSwap Fix and Push Script
# Run this in your cropswapreadytodeploy folder to fix the deployment

set -e

echo "🔧 Fixing CropSwap deployment..."

# Remove the git submodule reference
git rm --cached cropswap 2>/dev/null || true

# Stage all actual source files
git add -A

# Amend the commit to include all files
git commit --amend --no-edit

# Force push to GitHub (overwrites the incomplete commit)
git push -f origin main

echo "✅ Done! Your complete source code is now on GitHub."
echo "🔄 Vercel will auto-rebuild in a few seconds..."
echo "📍 Check your deployment at: https://vercel.com/dashboard/cropswap"
