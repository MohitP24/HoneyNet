#!/usr/bin/env python3
"""
LOG FORWARDER SERVICE
Bridges isolated honeynet network to backend network
Watches honeypot log files and forwards events to backend API

SECURITY:
- Read-only access to log volumes
- No internet access (only backend-network)
- Minimal capabilities
- Non-root execution
"""

import os
import sys
import json
import time
import signal
import logging
from pathlib import Path
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
import requests

# =============================================================================
# CONFIGURATION (NO HARDCODING - ALL ENV VARS)
# =============================================================================

BACKEND_URL = os.getenv("BACKEND_URL", "http://host.docker.internal:3000")
LOG_DIR = os.getenv("LOG_DIR", "/logs")
CHECK_INTERVAL = int(os.getenv("CHECK_INTERVAL", "5"))  # seconds
MAX_RETRIES = int(os.getenv("MAX_RETRIES", "3"))
RETRY_DELAY = int(os.getenv("RETRY_DELAY", "10"))  # seconds

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger(__name__)

# =============================================================================
# GLOBAL STATE
# =============================================================================

shutdown_flag = False
file_positions = {}  # Track read positions for each log file

# =============================================================================
# SIGNAL HANDLERS (GRACEFUL SHUTDOWN)
# =============================================================================

def signal_handler(signum, frame):
    """Handle shutdown signals gracefully"""
    global shutdown_flag
    logger.info(f"Received signal {signum}, shutting down gracefully...")
    shutdown_flag = True
    sys.exit(0)

signal.signal(signal.SIGTERM, signal_handler)
signal.signal(signal.SIGINT, signal_handler)

# =============================================================================
# LOG FILE HANDLER
# =============================================================================

class LogFileHandler(FileSystemEventHandler):
    """Watch log files and forward new events to backend"""
    
    def __init__(self, backend_url):
        self.backend_url = backend_url
        self.session = requests.Session()
        self.session.headers.update({'Content-Type': 'application/json'})
    
    def on_modified(self, event):
        """Handle log file modification"""
        if event.is_directory:
            return
        
        if event.src_path.endswith('.json'):
            logger.debug(f"Log file modified: {event.src_path}")
            self.process_log_file(event.src_path)
    
    def process_log_file(self, file_path):
        """Read new lines from log file and forward to backend"""
        global file_positions
        
        try:
            # Get current file size
            file_size = os.path.getsize(file_path)
            
            # Initialize position if first time seeing this file
            if file_path not in file_positions:
                file_positions[file_path] = 0
            
            # Check if file was truncated (rotated)
            if file_size < file_positions[file_path]:
                logger.warning(f"Log file truncated: {file_path}")
                file_positions[file_path] = 0
            
            # Read from last position
            with open(file_path, 'r', encoding='utf-8') as f:
                f.seek(file_positions[file_path])
                
                for line in f:
                    line = line.strip()
                    if not line:
                        continue
                    
                    try:
                        # Parse JSON log entry
                        log_entry = json.loads(line)
                        
                        # Forward to backend
                        self.forward_event(log_entry)
                        
                    except json.JSONDecodeError as e:
                        logger.error(f"Invalid JSON in {file_path}: {e}")
                        continue
                
                # Update file position
                file_positions[file_path] = f.tell()
        
        except PermissionError:
            logger.error(f"Permission denied reading {file_path}")
        except Exception as e:
            logger.error(f"Error processing {file_path}: {e}")
    
    def forward_event(self, event):
        """Forward event to backend API with retries"""
        endpoint = f"{self.backend_url}/api/events/honeypot"
        
        for attempt in range(MAX_RETRIES):
            try:
                response = self.session.post(
                    endpoint,
                    json=event,
                    timeout=5
                )
                
                if response.status_code == 200:
                    logger.debug(f"Event forwarded: {event.get('eventType', 'unknown')}")
                    return
                else:
                    logger.warning(f"Backend returned {response.status_code}: {response.text}")
            
            except requests.exceptions.RequestException as e:
                logger.error(f"Failed to forward event (attempt {attempt+1}/{MAX_RETRIES}): {e}")
                
                if attempt < MAX_RETRIES - 1:
                    time.sleep(RETRY_DELAY)
        
        logger.error(f"Giving up on event after {MAX_RETRIES} attempts")

# =============================================================================
# INITIAL SCAN (PROCESS EXISTING LOGS)
# =============================================================================

def scan_existing_logs(handler):
    """Process existing log files on startup"""
    log_dir = Path(LOG_DIR)
    
    if not log_dir.exists():
        logger.error(f"Log directory does not exist: {LOG_DIR}")
        return
    
    logger.info(f"Scanning existing logs in {LOG_DIR}...")
    
    for log_file in log_dir.rglob('*.json'):
        logger.info(f"Processing existing log: {log_file}")
        handler.process_log_file(str(log_file))
    
    logger.info("Initial scan complete")

# =============================================================================
# MAIN FUNCTION
# =============================================================================

def main():
    """Main forwarder loop"""
    global shutdown_flag
    
    logger.info("============================================================")
    logger.info("   LOG FORWARDER SERVICE STARTING")
    logger.info("============================================================")
    logger.info(f"Backend URL: {BACKEND_URL}")
    logger.info(f"Log directory: {LOG_DIR}")
    logger.info(f"Check interval: {CHECK_INTERVAL}s")
    logger.info(f"Max retries: {MAX_RETRIES}")
    logger.info("============================================================")
    
    # Verify log directory exists
    log_dir = Path(LOG_DIR)
    if not log_dir.exists():
        logger.error(f"FATAL: Log directory does not exist: {LOG_DIR}")
        sys.exit(1)
    
    # Test backend connectivity
    logger.info("Testing backend connectivity...")
    try:
        response = requests.get(f"{BACKEND_URL}/health", timeout=5)
        logger.info(f"Backend health check: {response.status_code}")
    except requests.exceptions.RequestException as e:
        logger.warning(f"Backend unreachable (will retry): {e}")
    
    # Create handler
    handler = LogFileHandler(BACKEND_URL)
    
    # Scan existing logs
    scan_existing_logs(handler)
    
    # Start file watcher
    observer = Observer()
    observer.schedule(handler, LOG_DIR, recursive=True)
    observer.start()
    
    logger.info("File watcher started, monitoring for changes...")
    
    try:
        while not shutdown_flag:
            time.sleep(CHECK_INTERVAL)
    
    except KeyboardInterrupt:
        logger.info("Received keyboard interrupt")
    
    finally:
        observer.stop()
        observer.join()
        logger.info("Log forwarder stopped")

# =============================================================================
# ENTRY POINT
# =============================================================================

if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        logger.error(f"FATAL ERROR: {e}", exc_info=True)
        sys.exit(1)
