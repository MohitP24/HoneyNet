-- Add service and protocol columns to events table
ALTER TABLE events ADD COLUMN IF NOT EXISTS service VARCHAR(50) DEFAULT 'SSH';
ALTER TABLE events ADD COLUMN IF NOT EXISTS protocol VARCHAR(20) DEFAULT 'ssh';
ALTER TABLE events ADD COLUMN IF NOT EXISTS destination_port INTEGER DEFAULT 2222;

-- Create honeypot_services table to track which services are active
CREATE TABLE IF NOT EXISTS honeypot_services (
    id SERIAL PRIMARY KEY,
    service_name VARCHAR(50) NOT NULL UNIQUE,
    port INTEGER NOT NULL,
    protocol VARCHAR(20) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    first_started TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    total_events INTEGER DEFAULT 0,
    high_severity_events INTEGER DEFAULT 0
);

-- Insert initial services
INSERT INTO honeypot_services (service_name, port, protocol) VALUES
    ('Cowrie SSH', 2222, 'ssh'),
    ('HTTP', 80, 'http'),
    ('FTP', 21, 'ftp'),
    ('MySQL', 3306, 'mysql'),
    ('Telnet', 23, 'telnet')
ON CONFLICT (service_name) DO NOTHING;

-- Create index for faster service lookups
CREATE INDEX IF NOT EXISTS idx_events_service ON events(service);
CREATE INDEX IF NOT EXISTS idx_events_protocol ON events(protocol);
CREATE INDEX IF NOT EXISTS idx_events_dest_port ON events(destination_port);

-- Create view for service statistics
CREATE OR REPLACE VIEW service_stats AS
SELECT 
    service,
    COUNT(*) as total_events,
    COUNT(DISTINCT source_ip) as unique_attackers,
    SUM(CASE WHEN severity = 'HIGH' THEN 1 ELSE 0 END) as high_severity,
    SUM(CASE WHEN severity = 'MEDIUM' THEN 1 ELSE 0 END) as medium_severity,
    SUM(CASE WHEN severity = 'LOW' THEN 1 ELSE 0 END) as low_severity,
    MIN(timestamp) as first_attack,
    MAX(timestamp) as last_attack
FROM events
GROUP BY service;
