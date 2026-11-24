#!/usr/bin/env python3
"""
Production-grade MySQL Honeypot
Listens on port 3306 (or configurable MYSQL_PORT), simulates MySQL handshake,
captures client login attempts (username, IP, port), and logs structured events.
"""
import os
import sys
import socket
import struct
import json
import logging
from datetime import datetime
from pathlib import Path

# Configuration
MYSQL_HOST = "0.0.0.0"
MYSQL_PORT = int(os.environ.get("MYSQL_PORT", 3306))
_default_log = Path(__file__).resolve().parent.parent / "mock-data" / "mysql_honeypot.json"
LOG_FILE = Path(os.environ.get("MYSQL_LOG_FILE", str(_default_log)))

logging.basicConfig(
    level=logging.INFO,
    format='[MySQL Honeypot] %(asctime)s - %(message)s'
)
logger = logging.getLogger(__name__)


def build_handshake_packet():
    """Build a MySQL Server Handshake Packet (Protocol 10)"""
    protocol_version = b'\x0a'
    server_version = b'5.7.36-log\x00'
    connection_id = struct.pack('<I', 1)
    auth_plugin_data_part_1 = b'12345678'  # 8 bytes salt
    filler_1 = b'\x00'
    capability_flags_1 = struct.pack('<H', 0xf7ff)  # Client capabilities (lower 2 bytes)
    character_set = b'\x21'  # utf8_general_ci
    status_flags = struct.pack('<H', 0x0002)  # SERVER_STATUS_AUTOCOMMIT
    capability_flags_2 = struct.pack('<H', 0x81bf)  # Upper 2 bytes
    auth_plugin_data_len = b'\x15'  # 21 bytes total salt
    reserved = b'\x00' * 10
    auth_plugin_data_part_2 = b'123456789012\x00'  # 13 bytes salt part 2
    auth_plugin_name = b'mysql_native_password\x00'

    payload = (
        protocol_version +
        server_version +
        connection_id +
        auth_plugin_data_part_1 +
        filler_1 +
        capability_flags_1 +
        character_set +
        status_flags +
        capability_flags_2 +
        auth_plugin_data_len +
        reserved +
        auth_plugin_data_part_2 +
        auth_plugin_name
    )

    packet_len = len(payload)
    header = struct.pack('<I', packet_len)[:3] + b'\x00'  # 3-byte len + sequence id 0
    return header + payload


def build_error_packet(username, client_ip):
    """Build MySQL Access Denied (Error 1045) packet"""
    err_code = struct.pack('<H', 1045)
    sql_state_marker = b'#'
    sql_state = b'28000'
    err_msg = f"Access denied for user '{username}'@'{client_ip}' (using password: YES)".encode('utf-8')
    payload = b'\xff' + err_code + sql_state_marker + sql_state + err_msg

    packet_len = len(payload)
    header = struct.pack('<I', packet_len)[:3] + b'\x02'  # sequence id 2
    return header + payload


def log_event(event_type, client_address, username="root", additional=None):
    """Log structured event to JSON file"""
    try:
        LOG_FILE.parent.mkdir(parents=True, exist_ok=True)
        event = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "eventType": event_type,
            "sourceIP": client_address[0],
            "sourcePort": client_address[1],
            "destination_port": MYSQL_PORT,
            "service": "MySQL",
            "protocol": "MYSQL",
            "username": username,
            "command": f"LOGIN user '{username}'",
            "message": f"MySQL login attempt from {client_address[0]}:{client_address[1]} (username: {username})",
            "sensor": "mysql_honeypot"
        }
        if additional:
            event.update(additional)

        with open(LOG_FILE, "a", encoding="utf-8") as f:
            f.write(json.dumps(event) + "\n")

        logger.info(f"Logged event from {client_address[0]} (user: {username})")
    except Exception as e:
        logger.error(f"Failed to log MySQL event: {e}")


def handle_client(client_sock, client_address):
    """Handle individual MySQL client connection"""
    try:
        # Step 1: Send server handshake
        handshake = build_handshake_packet()
        client_sock.sendall(handshake)

        # Step 2: Read client handshake response
        client_sock.settimeout(5.0)
        data = client_sock.recv(4096)
        if not data or len(data) < 4:
            log_event("mysql.probe", client_address, username="unknown", additional={"message": "Raw probe or port scan"})
            return

        # Parse username from Handshake Response 41
        username = "root"
        try:
            # Header is 4 bytes (3 length + 1 seq)
            # Capability flags: 4 bytes (offset 4..8)
            # Max packet size: 4 bytes (offset 8..12)
            # Charset: 1 byte (offset 12)
            # Reserved: 23 bytes (offset 13..36)
            # Username starts at offset 36 (null-terminated string)
            if len(data) > 36:
                user_slice = data[36:]
                null_pos = user_slice.find(b'\x00')
                if null_pos != -1:
                    parsed_user = user_slice[:null_pos].decode('utf-8', errors='ignore')
                    if parsed_user:
                        username = parsed_user
        except Exception:
            pass

        # Log authentication attempt
        log_event("mysql.login", client_address, username=username)

        # Step 3: Send Access Denied error packet
        err_packet = build_error_packet(username, client_address[0])
        client_sock.sendall(err_packet)

    except (socket.timeout, ConnectionResetError, BrokenPipeError):
        pass
    except Exception as e:
        logger.debug(f"Client handling error: {e}")
    finally:
        try:
            client_sock.close()
        except Exception:
            pass


def start_server():
    """Start MySQL Honeypot Server"""
    server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)

    try:
        server.bind((MYSQL_HOST, MYSQL_PORT))
        server.listen(10)
        logger.info(f"✅ MySQL Honeypot listening on {MYSQL_HOST}:{MYSQL_PORT}")
        logger.info(f"Logging events to: {LOG_FILE}")

        while True:
            client_sock, client_address = server.accept()
            logger.info(f"Incoming MySQL connection from {client_address[0]}:{client_address[1]}")
            import threading
            t = threading.Thread(target=handle_client, args=(client_sock, client_address), daemon=True)
            t.start()

    except KeyboardInterrupt:
        logger.info("MySQL Honeypot shutting down...")
    except Exception as e:
        logger.error(f"MySQL Honeypot failed: {e}")
        sys.exit(1)
    finally:
        server.close()


if __name__ == "__main__":
    start_server()
