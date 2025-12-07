#!/usr/bin/env python3
"""
Simple Telnet Honeypot
Logs all telnet commands and credentials
"""
import socket
import json
import datetime
import threading
from pathlib import Path

LOG_FILE = Path('/tmp/telnet_honeypot.json')

def handle_client(client_socket, client_address):
    """Handle Telnet client connection"""
    try:
        # Send login prompt
        client_socket.send(b"Ubuntu 20.04 LTS\r\n")
        client_socket.send(b"login: ")
        
        username = client_socket.recv(1024).decode('utf-8', errors='ignore').strip()
        
        # Log username
        event = {
            'eventid': 'telnet.login',
            'timestamp': datetime.datetime.utcnow().isoformat() + 'Z',
            'src_ip': client_address[0],
            'src_port': client_address[1],
            'dst_port': 2323,
            'username': username,
            'service': 'Telnet',
            'protocol': 'telnet',
            'sensor': 'telnet_honeypot'
        }
        
        client_socket.send(b"Password: ")
        password = client_socket.recv(1024).decode('utf-8', errors='ignore').strip()
        
        event['password'] = password
        
        # Write to JSON log
        with open(LOG_FILE, 'a') as f:
            f.write(json.dumps(event) + '\n')
        
        print(f"[Telnet] {client_address[0]} - Login: {username}/{password}")
        
        # Send fake shell prompt
        client_socket.send(b"\r\nLogin incorrect\r\n")
        
    except Exception as e:
        print(f"[Telnet] Error: {e}")
    finally:
        client_socket.close()

def start_server(port=2323):
    """Start Telnet honeypot server"""
    server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    
    try:
        server.bind(('0.0.0.0', port))
        server.listen(5)
        print(f"[Telnet Honeypot] Listening on port {port}...")
        
        # Create log file
        LOG_FILE.touch(exist_ok=True)
        
        while True:
            client_sock, address = server.accept()
            client_thread = threading.Thread(
                target=handle_client,
                args=(client_sock, address)
            )
            client_thread.daemon = True
            client_thread.start()
            
    except KeyboardInterrupt:
        print("\n[Telnet Honeypot] Shutting down...")
    except Exception as e:
        print(f"[Telnet Honeypot] Error: {e}")
    finally:
        server.close()

if __name__ == '__main__':
    import sys
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 2323
    start_server(port)
