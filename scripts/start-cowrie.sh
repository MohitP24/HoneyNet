#!/bin/bash
# Quick Cowrie Startup Script
# Save this and run: bash start-cowrie.sh

echo "=========================================="
echo "Starting Cowrie SSH Honeypot"
echo "=========================================="

cd /home/cowrie/cowrie

# Activate virtual environment
source /home/cowrie/cowrie/cowrie-env/bin/activate

# Stop any existing instances
echo "Stopping any existing Cowrie instances..."
cowrie stop 2>/dev/null || true
sleep 2

# Start Cowrie
echo "Starting Cowrie..."
cowrie start

# Check status
sleep 3
echo ""
echo "Checking status..."
cowrie status

echo ""
echo "Cowrie log location: /home/cowrie/cowrie/var/log/cowrie/cowrie.json"
echo "To stop: cowrie stop (from within virtual environment)"
echo "=========================================="
