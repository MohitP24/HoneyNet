#!/bin/bash
# Start HTTP and FTP Python honeypots in screen sessions (WSL)

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
HONEYPOT_DIR="$(cd "$SCRIPT_DIR/../honeypots" && pwd)"

echo "=========================================="
echo "Starting All Honeypots"
echo "=========================================="

start_honeypot() {
    local name=$1
    local script=$2

    if screen -list | grep -q "$name"; then
        echo "$name already running, stopping first..."
        screen -S "$name" -X quit 2>/dev/null
        sleep 1
    fi

    echo "Starting $name..."
    screen -dmS "$name" bash -c "cd \"$HONEYPOT_DIR\" && python3 $script"
    sleep 2

    if screen -list | grep -q "$name"; then
        echo "$name started successfully"
        return 0
    else
        echo "Failed to start $name"
        return 1
    fi
}

start_honeypot "http_honeypot" "http_honeypot.py"
start_honeypot "ftp_honeypot" "ftp_honeypot.py"

echo ""
echo "Honeypot startup complete"
echo "Logs: /tmp/http_honeypot.json  /tmp/ftp_honeypot.json"
echo "Attach: screen -r http_honeypot   or   screen -r ftp_honeypot"
echo "Stop:   screen -S http_honeypot -X quit; screen -S ftp_honeypot -X quit"
echo "=========================================="
