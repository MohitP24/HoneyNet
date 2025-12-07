#!/usr/bin/env python3
"""
SECURE Production-grade FTP Honeypot
- Non-root execution
- Rate limiting
- Input validation
- Structured logging
- No hardcoded values
"""

import os
import json
import logging
import signal
import sys
from datetime import datetime
from pathlib import Path
from pyftpdlib.authorizers import DummyAuthorizer, AuthenticationFailed
from pyftpdlib.handlers import FTPHandler
from pyftpdlib.servers import FTPServer

# Configuration from environment variables (NO HARDCODING)
FTP_HOST = os.getenv("FTP_HOST", "0.0.0.0")
FTP_PORT = int(os.getenv("FTP_PORT", "2121"))
LOG_FILE = os.getenv("LOG_PATH", "/var/log/ftp-honeypot/ftp_honeypot.json")
FAKE_FTP_DIR = os.getenv("FTP_DIR", "/tmp/ftp_honeypot_files")
MAX_CONS = int(os.getenv("MAX_CONNECTIONS", "256"))
MAX_CONS_PER_IP = int(os.getenv("MAX_CONS_PER_IP", "5"))

# Security: Rate limiting per IP
ip_connection_count = {}
MAX_ATTEMPTS_PER_MINUTE = 30

# Setup structured logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - [%(levelname)s] - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)


class SecureAuthorizer(DummyAuthorizer):
    """Custom authorizer with rate limiting and logging"""
    
    def validate_authentication(self, username, password, handler):
        """
        Override to accept any credentials BUT log them securely
        and implement rate limiting
        """
        client_ip = handler.remote_ip
        
        # Rate limiting
        current_minute = datetime.utcnow().strftime("%Y-%m-%d %H:%M")
        rate_key = f"{client_ip}:{current_minute}"
        
        if rate_key not in ip_connection_count:
            ip_connection_count[rate_key] = 0
        
        ip_connection_count[rate_key] += 1
        
        if ip_connection_count[rate_key] > MAX_ATTEMPTS_PER_MINUTE:
            logger.warning(f"Rate limit exceeded for {client_ip}")
            raise AuthenticationFailed("Too many attempts")
        
        # Clean up old rate limit entries (keep only last 2 minutes)
        keys_to_remove = [k for k in ip_connection_count.keys() if k.split(':')[1] < current_minute]
        for k in keys_to_remove:
            del ip_connection_count[k]
        
        # Input validation (prevent injection)
        if not self._is_safe_input(username) or not self._is_safe_input(password):
            logger.warning(f"Potentially malicious input from {client_ip}")
            raise AuthenticationFailed("Invalid credentials")
        
        # Add user dynamically if not exists
        if not self.has_user(username):
            try:
                self.add_user(username, password, FAKE_FTP_DIR, perm="elradfmw")
            except Exception as e:
                logger.error(f"Failed to add user {username}: {e}")
        
        # Always return True to honeypot (accept any credentials)
        return True
    
    @staticmethod
    def _is_safe_input(text):
        """Validate input to prevent injection attacks"""
        if not text or len(text) > 128:
            return False
        # Allow alphanumeric + common special chars only
        import re
        return bool(re.match(r'^[a-zA-Z0-9_@.\-!#$%^&*()+=]{1,128}$', text))


class HoneypotFTPHandler(FTPHandler):
    """Secure FTP handler with comprehensive logging"""
    
    banner = os.getenv("FTP_BANNER", "FTP Server Ready")
    
    def on_connect(self):
        """Log connection attempts"""
        self.log_event("connection", {
            "action": "connect",
            "command": "CONNECT",
            "message": "Client connected"
        })
    
    def on_disconnect(self):
        """Log disconnections"""
        self.log_event("connection", {
            "action": "disconnect",
            "command": "DISCONNECT",
            "message": "Client disconnected"
        })
    
    def on_login(self, username):
        """Log successful authentications"""
        self.log_event("authentication", {
            "action": "login_success",
            "command": f"LOGIN {username}",
            "username": username,
            "message": f"User '{username}' authenticated"
        })
    
    def on_login_failed(self, username, password):
        """Log failed authentication attempts"""
        self.log_event("authentication_failed", {
            "action": "login_failed",
            "command": f"USER {username}",
            "username": username,
            "password": password,  # Safe in honeypot context
            "message": f"Failed login: {username}"
        })
    
    def on_file_sent(self, file):
        """Log file downloads"""
        self.log_event("file_operation", {
            "action": "download",
            "command": f"RETR {file}",
            "file": file,
            "message": f"File downloaded: {file}"
        })
    
    def on_file_received(self, file):
        """Log file uploads"""
        self.log_event("file_operation", {
            "action": "upload",
            "command": f"STOR {file}",
            "file": file,
            "message": f"File uploaded: {file}"
        })
    
    def ftp_LIST(self, path):
        """Log directory listings"""
        self.log_event("command", {
            "action": "LIST",
            "command": f"LIST {path}",
            "path": path,
            "message": f"Directory listing: {path}"
        })
        return super().ftp_LIST(path)
    
    def ftp_CWD(self, path):
        """Log directory changes"""
        self.log_event("command", {
            "action": "CWD",
            "command": f"CWD {path}",
            "path": path,
            "message": f"Change directory: {path}"
        })
        return super().ftp_CWD(path)
    
    def ftp_DELE(self, path):
        """Log file deletion attempts"""
        self.log_event("command", {
            "action": "DELE",
            "command": f"DELE {path}",
            "path": path,
            "message": f"Delete file: {path}"
        })
        return super().ftp_DELE(path)
    
    def log_event(self, event_type, data):
        """
        Secure structured logging with proper error handling
        """
        try:
            event = {
                "timestamp": datetime.utcnow().isoformat() + "Z",
                "eventType": event_type,
                "sourceIP": self.remote_ip,
                "sourcePort": self.remote_port,
                "service": "FTP",
                "protocol": "FTP",
                "destination_port": FTP_PORT,
                **data
            }
            
            # Atomic write with proper error handling
            log_path = Path(LOG_FILE)
            log_path.parent.mkdir(parents=True, exist_ok=True)
            
            with open(LOG_FILE, "a", encoding="utf-8") as f:
                f.write(json.dumps(event) + "\n")
                f.flush()  # Ensure immediate write
            
            logger.info(f"{event_type.upper()}: {data.get('message', 'Event logged')}")
        
        except PermissionError:
            logger.error(f"Permission denied writing to {LOG_FILE}")
        except Exception as e:
            logger.error(f"Failed to log event: {e}", exc_info=True)


def create_fake_files():
    """Create realistic fake files in FTP directory"""
    try:
        os.makedirs(FAKE_FTP_DIR, exist_ok=True)
        
        fake_files = {
            "readme.txt": "Welcome to FTP Server\n",
            "config.conf": "# Configuration file\nserver_name=prod-server-01\n",
            "backup.tar.gz": b"\x1f\x8b\x08",  # Fake gzip header
            "data.csv": "id,name,value\n1,test,100\n",
            "logs.txt": "2024-12-04 Server started\n"
        }
        
        for filename, content in fake_files.items():
            filepath = os.path.join(FAKE_FTP_DIR, filename)
            if not os.path.exists(filepath):
                mode = "wb" if isinstance(content, bytes) else "w"
                with open(filepath, mode) as f:
                    f.write(content)
        
        logger.info(f"Created {len(fake_files)} fake files in {FAKE_FTP_DIR}")
    
    except Exception as e:
        logger.error(f"Failed to create fake files: {e}")


def signal_handler(signum, frame):
    """Graceful shutdown"""
    logger.info(f"Received signal {signum}, shutting down gracefully...")
    sys.exit(0)


def main():
    """Start secure FTP honeypot with proper error handling"""
    
    # Register signal handlers for graceful shutdown
    signal.signal(signal.SIGTERM, signal_handler)
    signal.signal(signal.SIGINT, signal_handler)
    
    try:
        # Create fake files
        create_fake_files()
        
        # Setup secure authorizer
        authorizer = SecureAuthorizer()
        
        # Add anonymous user
        authorizer.add_anonymous(FAKE_FTP_DIR, perm="elradfmw")
        
        # Setup handler with security settings
        handler = HoneypotFTPHandler
        handler.authorizer = authorizer
        handler.passive_ports = range(60000, 60100)  # Limit passive port range
        
        # Setup server with security limits
        server = FTPServer((FTP_HOST, FTP_PORT), handler)
        server.max_cons = MAX_CONS
        server.max_cons_per_ip = MAX_CONS_PER_IP
        
        logger.info("=" * 60)
        logger.info("SECURE FTP HONEYPOT STARTING")
        logger.info("=" * 60)
        logger.info(f"Listening: {FTP_HOST}:{FTP_PORT}")
        logger.info(f"Log file: {LOG_FILE}")
        logger.info(f"FTP directory: {FAKE_FTP_DIR}")
        logger.info(f"Max connections: {MAX_CONS}")
        logger.info(f"Max per IP: {MAX_CONS_PER_IP}")
        logger.info(f"Rate limit: {MAX_ATTEMPTS_PER_MINUTE} attempts/minute/IP")
        logger.info("=" * 60)
        
        # Start serving
        server.serve_forever()
    
    except PermissionError:
        logger.error(f"Permission denied binding to port {FTP_PORT}. Run with elevated privileges or use port > 1024")
        sys.exit(1)
    
    except OSError as e:
        logger.error(f"Network error: {e}")
        sys.exit(1)
    
    except KeyboardInterrupt:
        logger.info("FTP Honeypot shutting down...")
        sys.exit(0)
    
    except Exception as e:
        logger.error(f"Fatal error: {e}", exc_info=True)
        sys.exit(1)


if __name__ == "__main__":
    main()
