#!/bin/bash
# Install Dionaea honeypot for HTTP/FTP/SMB/MySQL
set -e

echo "Installing Dionaea dependencies..."
sudo apt-get update
sudo apt-get install -y \
    dionaea \
    python3-dionaea \
    build-essential \
    cmake \
    git

echo "Creating Dionaea user..."
sudo useradd -r -s /bin/false dionaea || true

echo "Configuring Dionaea..."
sudo mkdir -p /opt/dionaea
sudo mkdir -p /var/log/dionaea
sudo chown -R dionaea:dionaea /opt/dionaea /var/log/dionaea

# Configure Dionaea to listen on ports: 80 (HTTP), 21 (FTP), 3306 (MySQL), 23 (Telnet)
sudo tee /etc/dionaea/dionaea.cfg > /dev/null <<EOF
[dionaea]
download.dir=/var/lib/dionaea/binaries/
modules=curl,python,nfq,pcap
processors=filter_streamdumper,filter_emu

[logging]
default.filename=/var/log/dionaea/dionaea.log
default.levels=all
default.domains=*

[module.python.http]
enable=true
port=80

[module.python.ftp]
enable=true
port=21

[module.python.mysql]
enable=true
port=3306

[module.python.telnet]
enable=true
port=23
EOF

echo "✅ Dionaea installed successfully!"
echo "Start with: sudo systemctl start dionaea"
echo "Logs: /var/log/dionaea/"
