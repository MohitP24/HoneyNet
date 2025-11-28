-- AI-Driven Adaptive Honeynet Database Schema

-- Drop existing tables
DROP TABLE IF EXISTS adaptations CASCADE;
DROP TABLE IF EXISTS events CASCADE;
DROP TABLE IF EXISTS attackers CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Sessions table
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id VARCHAR(255) UNIQUE NOT NULL,
    source_ip VARCHAR(45) NOT NULL,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP,
    duration INTEGER,
    event_count INTEGER DEFAULT 0,
    command_count INTEGER DEFAULT 0,
    failed_login_count INTEGER DEFAULT 0,
    successful_login BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    client_version VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Events table
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
    cowrie_session_id VARCHAR(255),
    event_type VARCHAR(100) NOT NULL,
    timestamp TIMESTAMP NOT NULL,
    source_ip VARCHAR(45) NOT NULL,
    username VARCHAR(255),
    password VARCHAR(255),
    command TEXT,
    input_data TEXT,
    message TEXT,
    raw_event JSONB,
    
    -- ML Analysis fields
    severity VARCHAR(20) DEFAULT 'UNKNOWN',
    anomaly_score FLOAT,
    ml_labels JSONB,
    ml_features JSONB,
    is_analyzed BOOLEAN DEFAULT FALSE,
    analyzed_at TIMESTAMP,
    
    -- Additional metadata
    sensor VARCHAR(255),
    protocol VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Indexes
    CONSTRAINT events_severity_check CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'UNKNOWN'))
);

-- Attackers table
CREATE TABLE attackers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ip_address VARCHAR(45) UNIQUE NOT NULL,
    first_seen TIMESTAMP NOT NULL,
    last_seen TIMESTAMP NOT NULL,
    total_events INTEGER DEFAULT 0,
    total_sessions INTEGER DEFAULT 0,
    successful_logins INTEGER DEFAULT 0,
    failed_logins INTEGER DEFAULT 0,
    commands_executed INTEGER DEFAULT 0,
    
    -- Severity counts
    high_severity_count INTEGER DEFAULT 0,
    medium_severity_count INTEGER DEFAULT 0,
    low_severity_count INTEGER DEFAULT 0,
    
    -- Behavioral profile
    profile_data JSONB,
    most_common_username VARCHAR(255),
    most_common_password VARCHAR(255),
    unique_usernames_count INTEGER DEFAULT 0,
    unique_passwords_count INTEGER DEFAULT 0,
    
    -- Threat level
    threat_level VARCHAR(20) DEFAULT 'LOW',
    is_blocked BOOLEAN DEFAULT FALSE,
    
    -- Geolocation (optional)
    country VARCHAR(100),
    city VARCHAR(100),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT attackers_threat_check CHECK (threat_level IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL'))
);

-- Adaptations table
CREATE TABLE adaptations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    trigger_event_id UUID REFERENCES events(id) ON DELETE SET NULL,
    trigger_session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
    trigger_ip VARCHAR(45),
    
    -- Adaptation details
    severity VARCHAR(20) NOT NULL,
    action_type VARCHAR(100) NOT NULL,
    action_details JSONB NOT NULL,
    
    -- Execution status
    success BOOLEAN DEFAULT FALSE,
    error_message TEXT,
    execution_time INTEGER,
    
    -- Configuration changes
    old_config JSONB,
    new_config JSONB,
    
    -- Metadata
    automated BOOLEAN DEFAULT TRUE,
    created_by VARCHAR(100) DEFAULT 'system',
    
    CONSTRAINT adaptations_severity_check CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH')),
    CONSTRAINT adaptations_action_check CHECK (action_type IN (
        'BANNER_CHANGE',
        'HONEYFILE_MODIFICATION',
        'HONEYFILE_ADDITION',
        'SERVICE_RESTART',
        'IP_BLOCK',
        'CONFIGURATION_CHANGE',
        'FILESYSTEM_MODIFICATION'
    ))
);

-- Indexes for performance
CREATE INDEX idx_events_timestamp ON events(timestamp DESC);
CREATE INDEX idx_events_source_ip ON events(source_ip);
CREATE INDEX idx_events_severity ON events(severity);
CREATE INDEX idx_events_session_id ON events(session_id);
CREATE INDEX idx_events_event_type ON events(event_type);
CREATE INDEX idx_events_is_analyzed ON events(is_analyzed);

CREATE INDEX idx_sessions_source_ip ON sessions(source_ip);
CREATE INDEX idx_sessions_session_id ON sessions(session_id);
CREATE INDEX idx_sessions_start_time ON sessions(start_time DESC);
CREATE INDEX idx_sessions_is_active ON sessions(is_active);

CREATE INDEX idx_attackers_ip ON attackers(ip_address);
CREATE INDEX idx_attackers_threat_level ON attackers(threat_level);
CREATE INDEX idx_attackers_last_seen ON attackers(last_seen DESC);

CREATE INDEX idx_adaptations_timestamp ON adaptations(timestamp DESC);
CREATE INDEX idx_adaptations_severity ON adaptations(severity);
CREATE INDEX idx_adaptations_action_type ON adaptations(action_type);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_sessions_updated_at BEFORE UPDATE ON sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_attackers_updated_at BEFORE UPDATE ON attackers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Views for common queries

-- Recent high-severity events
CREATE VIEW high_severity_events AS
SELECT 
    e.id,
    e.timestamp,
    e.source_ip,
    e.event_type,
    e.command,
    e.severity,
    e.anomaly_score,
    a.threat_level as attacker_threat_level
FROM events e
LEFT JOIN attackers a ON e.source_ip = a.ip_address
WHERE e.severity = 'HIGH'
ORDER BY e.timestamp DESC;

-- Active sessions with statistics
CREATE VIEW active_sessions_summary AS
SELECT 
    s.id,
    s.session_id,
    s.source_ip,
    s.start_time,
    s.event_count,
    s.command_count,
    a.threat_level,
    COUNT(e.id) FILTER (WHERE e.severity = 'HIGH') as high_severity_events
FROM sessions s
LEFT JOIN attackers a ON s.source_ip = a.ip_address
LEFT JOIN events e ON s.id = e.session_id
WHERE s.is_active = TRUE
GROUP BY s.id, s.session_id, s.source_ip, s.start_time, s.event_count, s.command_count, a.threat_level;

-- Attacker statistics
CREATE VIEW attacker_statistics AS
SELECT 
    a.ip_address,
    a.threat_level,
    a.total_events,
    a.total_sessions,
    a.high_severity_count,
    a.medium_severity_count,
    a.low_severity_count,
    a.first_seen,
    a.last_seen,
    a.most_common_username,
    COUNT(DISTINCT s.id) as active_sessions,
    MAX(e.timestamp) as last_event_time
FROM attackers a
LEFT JOIN sessions s ON a.ip_address = s.source_ip AND s.is_active = TRUE
LEFT JOIN events e ON a.ip_address = e.source_ip
GROUP BY a.id, a.ip_address, a.threat_level, a.total_events, a.total_sessions,
         a.high_severity_count, a.medium_severity_count, a.low_severity_count,
         a.first_seen, a.last_seen, a.most_common_username;

-- Adaptation history with trigger details
CREATE VIEW adaptation_history AS
SELECT 
    ad.id,
    ad.timestamp,
    ad.severity,
    ad.action_type,
    ad.success,
    ad.trigger_ip,
    e.event_type as trigger_event_type,
    e.command as trigger_command,
    ad.action_details
FROM adaptations ad
LEFT JOIN events e ON ad.trigger_event_id = e.id
ORDER BY ad.timestamp DESC;

-- Grant permissions (adjust user as needed)
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO honeynet;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO honeynet;
-- GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO honeynet;
