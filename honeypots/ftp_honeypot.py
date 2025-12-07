#!/usr/bin/env python3
"""
Production-grade FTP Honeypot using pyftpdlib
Logs all FTP commands, credentials, and file operations to JSON
"""

import os
import json
import logging
from datetime import datetime
from pathlib import Path
from pyftpdlib.authorizers import DummyAuthorizer
from pyftpdlib.handlers import FTPHandler
from pyftpdlib.servers import FTPServer

# Configuration
FTP_HOST = "0.0.0.0"
FTP_PORT = 2121
LOG_FILE = "/tmp/ftp_honeypot.json"
FAKE_FTP_DIR = "/tmp/ftp_honeypot_files"

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='[FTP Honeypot] %(asctime)s - %(message)s'
)
logger = logging.getLogger(__name__)


class HoneypotFTPHandler(FTPHandler):
    """Custom FTP handler that logs all activity"""
    
    def on_connect(self):
        """Called when client connects"""
        self.log_event("connection", {
            "action": "connect",
            "command": "CONNECT",
            "message": "Client connected"
        })
    
    def on_disconnect(self):
        """Called when client disconnects"""
        self.log_event("connection", {
            "action": "disconnect",
            "command": "DISCONNECT",
            "message": "Client disconnected"
        })
    
    def on_login(self, username):
        """Called when client successfully authenticates"""
        self.log_event("login", {
            "action": "login_success",
            "command": f"LOGIN {username}",
            "username": username,
            "message": f"User '{username}' logged in successfully"
        })
    
    def on_login_failed(self, username, password):
        """Called when authentication fails"""
        self.log_event("login_failed", {
            "action": "login_attempt",
            "command": f"USER {username}",
            "username": username,
            "password": password,
            "message": f"Failed login attempt: {username}:{password}"
        })
    
    def on_file_sent(self, file):
        """Called when file is downloaded"""
        self.log_event("file_operation", {
            "action": "download",
            "command": f"RETR {file}",
            "file": file,
            "message": f"File downloaded: {file}"
        })
    
    def on_file_received(self, file):
        """Called when file is uploaded"""
        self.log_event("file_operation", {
            "action": "upload",
            "command": f"STOR {file}",
            "file": file,
            "message": f"File uploaded: {file}"
        })
    
    def on_incomplete_file_sent(self, file):
        """Called when file download is incomplete"""
        self.log_event("file_operation", {
            "action": "incomplete_download",
            "command": f"RETR {file} (INCOMPLETE)",
            "file": file,
            "message": f"Incomplete download: {file}"
        })
    
    def on_incomplete_file_received(self, file):
        """Called when file upload is incomplete"""
        self.log_event("file_operation", {
            "action": "incomplete_upload",
            "command": f"STOR {file} (INCOMPLETE)",
            "file": file,
            "message": f"Incomplete upload: {file}"
        })
    
    def ftp_LIST(self, path):
        """Override LIST command"""
        self.log_event("command", {
            "action": "LIST",
            "command": f"LIST {path}",
            "path": path,
            "message": f"Directory listing: LIST {path}"
        })
        return super().ftp_LIST(path)
    
    def ftp_CWD(self, path):
        """Override CWD (change directory) command"""
        self.log_event("command", {
            "action": "CWD",
            "command": f"CWD {path}",
            "path": path,
            "message": f"Change directory: CWD {path}"
        })
        return super().ftp_CWD(path)
    
    def ftp_PWD(self, line):
        """Override PWD (print working directory) command"""
        self.log_event("command", {
            "action": "PWD",
            "command": "PWD",
            "message": "Print working directory"
        })
        return super().ftp_PWD(line)
    
    def ftp_DELE(self, path):
        """Override DELE (delete file) command"""
        self.log_event("command", {
            "action": "DELE",
            "command": f"DELE {path}",
            "path": path,
            "message": f"Delete file: DELE {path}"
        })
        return super().ftp_DELE(path)
    
    def ftp_MKD(self, path):
        """Override MKD (make directory) command"""
        self.log_event("command", {
            "action": "MKD",
            "command": f"MKD {path}",
            "path": path,
            "message": f"Create directory: MKD {path}"
        })
        return super().ftp_MKD(path)
    
    def ftp_RMD(self, path):
        """Override RMD (remove directory) command"""
        self.log_event("command", {
            "action": "RMD",
            "command": f"RMD {path}",
            "path": path,
            "message": f"Remove directory: RMD {path}"
        })
        return super().ftp_RMD(path)
    
    def log_event(self, event_type, data):
        """Log event to JSON file"""
        try:
            event = {
                "timestamp": datetime.now().isoformat(),
                "eventType": event_type,
                "sourceIP": self.remote_ip,
                "sourcePort": self.remote_port,
                "service": "FTP",
                "protocol": "FTP",
                "destination_port": FTP_PORT,
                **data
            }
            
            # Append to log file
            with open(LOG_FILE, "a") as f:
                f.write(json.dumps(event) + "\n")
            
            logger.info(f"{event_type.upper()}: {data.get('message', 'Event logged')}")
        
        except Exception as e:
            logger.error(f"Failed to log event: {e}")


def main():
    """Start FTP honeypot server"""
    
    # Create fake FTP directory
    os.makedirs(FAKE_FTP_DIR, exist_ok=True)
    
    # Create some fake files to make it look real
    fake_files = ["readme.txt", "config.conf", "backup.tar.gz", "data.csv"]
    for filename in fake_files:
        filepath = os.path.join(FAKE_FTP_DIR, filename)
        if not os.path.exists(filepath):
            with open(filepath, "w") as f:
                f.write(f"Fake file: {filename}\n")
    
    # Setup authorizer - accept any username/password
    authorizer = DummyAuthorizer()
    
    # Add anonymous user
    authorizer.add_anonymous(FAKE_FTP_DIR, perm="elradfmw")
    
    # Add some common usernames that accept any password
    common_users = ["admin", "root", "user", "ftp", "test", "guest"]
    for username in common_users:
        try:
            authorizer.add_user(username, "any_password", FAKE_FTP_DIR, perm="elradfmw")
        except Exception:
            pass  # User might already exist
    
    # Override validate_authentication to accept any username/password
    original_validate = authorizer.validate_authentication
    
    def flexible_validate(username, password, handler):
        """Accept any username/password combination"""
        # Add user dynamically if not exists
        if not authorizer.has_user(username):
            try:
                authorizer.add_user(username, password, FAKE_FTP_DIR, perm="elradfmw")
            except Exception:
                pass
        
        # Try original validation
        try:
            return original_validate(username, password, handler)
        except Exception:
            return True  # Accept anyway
    
    authorizer.validate_authentication = flexible_validate
    
    # Setup handler
    handler = HoneypotFTPHandler
    handler.authorizer = authorizer
    
    # Customize banner
    handler.banner = "FTP Server Ready"
    
    # Setup server
    server = FTPServer((FTP_HOST, FTP_PORT), handler)
    
    # Set limits
    server.max_cons = 256
    server.max_cons_per_ip = 5
    
    logger.info(f"FTP Honeypot starting on {FTP_HOST}:{FTP_PORT}")
    logger.info(f"Logging to: {LOG_FILE}")
    logger.info(f"Fake FTP directory: {FAKE_FTP_DIR}")
    logger.info("Accepting all username/password combinations")
    
    try:
        # Start serving
        server.serve_forever()
    except KeyboardInterrupt:
        logger.info("FTP Honeypot shutting down...")
    except Exception as e:
        logger.error(f"FTP Honeypot error: {e}")
        raise


if __name__ == "__main__":
    main()
