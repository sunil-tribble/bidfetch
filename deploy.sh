#!/bin/bash

# BidFetch Production Deployment Script
# Deploys to: 152.42.154.129

SERVER_IP="152.42.154.129"
SERVER_USER="root"
APP_DIR="/opt/bidfetch"

echo "🚀 Deploying BidFetch to Production"
echo "===================================="
echo "Target: $SERVER_IP"
echo ""

# Create deployment package
echo "📦 Creating deployment package..."
tar -czf deploy.tar.gz \
  src/multi-source-server.js \
  src/production-server.js \
  data/ \
  package.json \
  package-lock.json \
  --exclude=node_modules

# Deploy to server
echo "📤 Uploading to server..."
scp -o StrictHostKeyChecking=no deploy.tar.gz $SERVER_USER@$SERVER_IP:/tmp/

echo "🔧 Installing on server..."
ssh -o StrictHostKeyChecking=no $SERVER_USER@$SERVER_IP << 'REMOTE_SCRIPT'
set -e

# Stop existing service
pm2 stop bidfetch 2>/dev/null || true

# Backup current version
if [ -d /opt/bidfetch ]; then
  cp -r /opt/bidfetch /opt/bidfetch.backup.$(date +%Y%m%d_%H%M%S)
fi

# Create app directory
mkdir -p /opt/bidfetch
cd /opt/bidfetch

# Extract new version
tar -xzf /tmp/deploy.tar.gz
rm /tmp/deploy.tar.gz

# Install dependencies
npm ci --only=production

# Start with PM2
PORT=80 pm2 start src/multi-source-server.js --name bidfetch --update-env
pm2 save

echo "✅ Deployment complete!"
REMOTE_SCRIPT

# Cleanup
rm deploy.tar.gz

echo ""
echo "✅ Production deployment successful!"
echo ""
echo "API Endpoints:"
echo "  http://$SERVER_IP/health"
echo "  http://$SERVER_IP/api/opportunities/search"
echo "  http://$SERVER_IP/api/opportunities/source/sam.gov"
echo ""
echo "View logs: ssh $SERVER_USER@$SERVER_IP 'pm2 logs bidfetch'"