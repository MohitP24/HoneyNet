-- Migration: Add enhanced features to existing database
-- Run this if you already have a database from the old schema

-- Add new columns to attackers table
ALTER TABLE attackers 
ADD COLUMN IF NOT EXISTS country_code VARCHAR(10),
ADD COLUMN IF NOT EXISTS region VARCHAR(100),
ADD COLUMN IF NOT EXISTS latitude FLOAT,
ADD COLUMN IF NOT EXISTS longitude FLOAT,
ADD COLUMN IF NOT EXISTS timezone VARCHAR(50),
ADD COLUMN IF NOT EXISTS isp VARCHAR(255),
ADD COLUMN IF NOT EXISTS organization VARCHAR(255),
ADD COLUMN IF NOT EXISTS asn VARCHAR(100),
ADD COLUMN IF NOT EXISTS reputation_score INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_known_threat BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS threat_categories TEXT[],
ADD COLUMN IF NOT EXISTS last_reputation_check TIMESTAMP;

-- Create index on new geo fields for faster queries
CREATE INDEX IF NOT EXISTS idx_attackers_country ON attackers(country);
CREATE INDEX IF NOT EXISTS idx_attackers_country_code ON attackers(country_code);
CREATE INDEX IF NOT EXISTS idx_attackers_isp ON attackers(isp);
CREATE INDEX IF NOT EXISTS idx_attackers_organization ON attackers(organization);

-- Create index on command analysis fields
CREATE INDEX IF NOT EXISTS idx_events_ml_labels ON events USING GIN(ml_labels);

COMMENT ON COLUMN attackers.country_code IS 'ISO country code';
COMMENT ON COLUMN attackers.latitude IS 'Latitude for geo mapping';
COMMENT ON COLUMN attackers.longitude IS 'Longitude for geo mapping';
COMMENT ON COLUMN attackers.isp IS 'Internet Service Provider';
COMMENT ON COLUMN attackers.asn IS 'Autonomous System Number';
COMMENT ON COLUMN attackers.reputation_score IS 'IP reputation score (0-100)';
COMMENT ON COLUMN attackers.is_known_threat IS 'Flag if IP is in threat database';

-- Update view to include new fields
DROP VIEW IF EXISTS attacker_statistics;
CREATE VIEW attacker_statistics AS
SELECT 
    a.ip_address,
    a.country,
    a.country_code,
    a.city,
    a.isp,
    a.organization,
    a.threat_level,
    a.total_events,
    a.total_sessions,
    a.high_severity_count,
    a.medium_severity_count,
    a.low_severity_count,
    a.first_seen,
    a.last_seen,
    a.most_common_username,
    a.latitude,
    a.longitude,
    a.reputation_score,
    a.is_known_threat,
    COUNT(DISTINCT s.id) as active_sessions,
    MAX(e.timestamp) as last_event_time
FROM attackers a
LEFT JOIN sessions s ON a.ip_address = s.source_ip AND s.is_active = TRUE
LEFT JOIN events e ON a.ip_address = e.source_ip
GROUP BY a.id, a.ip_address, a.country, a.country_code, a.city, a.isp, 
         a.organization, a.threat_level, a.total_events, a.total_sessions,
         a.high_severity_count, a.medium_severity_count, a.low_severity_count,
         a.first_seen, a.last_seen, a.most_common_username, a.latitude, 
         a.longitude, a.reputation_score, a.is_known_threat;

-- ===================================
-- STEP 7: MALWARE ANALYSIS TABLE
-- ===================================

-- Create malware analysis table
CREATE TABLE IF NOT EXISTS malware_analysis (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    file_name VARCHAR(500) NOT NULL,
    file_path TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    sha256 VARCHAR(64) NOT NULL UNIQUE,
    md5 VARCHAR(32) NOT NULL,
    sha1 VARCHAR(40) NOT NULL,
    file_type VARCHAR(100),
    is_malicious BOOLEAN DEFAULT FALSE,
    detection_ratio VARCHAR(20),
    static_analysis JSONB,
    virustotal_data JSONB,
    analyzed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes for malware analysis
CREATE INDEX IF NOT EXISTS idx_malware_sha256 ON malware_analysis(sha256);
CREATE INDEX IF NOT EXISTS idx_malware_malicious ON malware_analysis(is_malicious);
CREATE INDEX IF NOT EXISTS idx_malware_analyzed_at ON malware_analysis(analyzed_at DESC);
CREATE INDEX IF NOT EXISTS idx_malware_file_type ON malware_analysis(file_type);

-- Commit changes
COMMIT;
