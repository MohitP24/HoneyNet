#!/bin/bash
# Cowrie Installation Script for WSL Ubuntu
# Run this inside WSL Ubuntu

set -e

echo "=================================="
echo "Cowrie Honeypot Installation"
echo "=================================="
echo ""

# Update system
echo "[1/8] Updating system packages..."
sudo apt update
sudo apt upgrade -y

# Install dependencies
echo "[2/8] Installing dependencies..."
sudo apt install -y git python3-virtualenv libssl-dev libffi-dev build-essential libpython3-dev python3-minimal authbind virtualenv

# Create cowrie user
echo "[3/8] Creating cowrie user..."
if id "cowrie" &>/dev/null; then
    echo "User 'cowrie' already exists, skipping..."
else
    sudo adduser --disabled-password --gecos "" cowrie
fi

# Switch to cowrie user and install
echo "[4/8] Cloning Cowrie repository..."
sudo su - cowrie << 'EOF'
if [ -d "cowrie" ]; then
    echo "Cowrie directory exists, pulling latest changes..."
    cd cowrie
    git pull
else
    git clone https://github.com/cowrie/cowrie.git
    cd cowrie
fi

# Setup virtual environment
echo "[5/8] Setting up Python virtual environment..."
python3 -m virtualenv cowrie-env
source cowrie-env/bin/activate

# Install Python requirements
echo "[6/8] Installing Python packages..."
pip install --upgrade pip
pip install --upgrade -r requirements.txt

# Configure Cowrie
echo "[7/8] Configuring Cowrie..."
cp etc/cowrie.cfg.dist etc/cowrie.cfg

# Enable JSON logging
sed -i 's/#enabled = true/enabled = true/' etc/cowrie.cfg

# Configure output
cat >> etc/cowrie.cfg << 'COWRIE_CONFIG'

# JSON output for AI-Honeynet
[output_jsonlog]
logfile = var/log/cowrie/cowrie.json
COWRIE_CONFIG

echo "[8/8] Starting Cowrie..."
bin/cowrie start

echo ""
echo "=================================="
echo "Cowrie Installation Complete!"
echo "=================================="
echo ""
echo "Cowrie is now running on:"
echo "  SSH:    localhost:2222"
echo "  Telnet: localhost:2223"
echo ""
echo "Log file: /home/cowrie/cowrie/var/log/cowrie/cowrie.json"
echo ""
echo "Test with: ssh -p 2222 root@localhost"
echo ""
EOF

echo ""
echo "Installation finished!"
echo "Cowrie is running in WSL Ubuntu"
