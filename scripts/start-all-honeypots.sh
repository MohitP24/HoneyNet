#!/bin/bash
# Auto-start all honeypots in screen sessions
# This script is called by Backend on startup

HONEYPOT_DIR="/mnt/d/boda/AI-Honeynet/HoneyNet/honeypots"

echo "=========================================="
echo "Starting All Honeypots"
echo "=========================================="

# Function to start a honeypot in screen
start_honeypot() {
    local name=$1
    local script=$2
    local port=$3
    
    # Check if already running
    if screen -list | grep -q "$name"; then
        echo "⚠️  $name already running, stopping first..."
        screen -S "$name" -X quit 2>/dev/null
        sleep 1
    fi
    
    # Start in screen session
    echo "Starting $name on port $port..."
    screen -dmS "$name" bash -c "cd $HONEYPOT_DIR && python3 $script"
    sleep 2
    
    # Verify it started
    if screen -list | grep -q "$name"; then
        echo "✅ $name started successfully"
        return 0
    else
        echo "❌ Failed to start $name"
        return 1
    fi
}

# Start HTTP honeypot
start_honeypot "http_honeypot" "http_honeypot.py" "8080"

# Start FTP honeypot  
start_honeypot "ftp_honeypot" "ftp_honeypot.py" "2121"

echo ""
echo "=========================================="
echo "Honeypot Startup Complete"
echo "=========================================="
echo ""
echo "Active screen sessions:"
screen -ls
echo ""
echo "To view logs:"
echo "  HTTP: tail -f /tmp/http_honeypot.json"
echo "  FTP:  tail -f /tmp/ftp_honeypot.json"
echo ""
echo "To attach to a honeypot:"
echo "  screen -r http_honeypot"
echo "  screen -r ftp_honeypot"
echo ""
echo "To stop all honeypots:"
echo "  screen -S http_honeypot -X quit"
echo "  screen -S ftp_honeypot -X quit"
echo "=========================================="
