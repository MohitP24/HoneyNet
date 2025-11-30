const db = require('../database/connection');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

/**
 * Campaign Detector
 * Detects coordinated attacks from multiple IPs
 * Identifies botnets, distributed attacks, and attack campaigns
 */

class CampaignDetector {
  constructor() {
    this.enabled = process.env.ENABLE_CAMPAIGN_DETECTION !== 'false';
    this.timeWindow = parseInt(process.env.CAMPAIGN_TIME_WINDOW) || 3600; // 1 hour default
    this.minIPs = parseInt(process.env.CAMPAIGN_MIN_IPS) || 3; // Minimum IPs to be considered a campaign
    this.similarityThreshold = 0.7; // 70% similarity threshold
    this.activeCampaigns = new Map();
  }

  async detectCampaigns() {
    if (!this.enabled) return;

    try {
      // Find potential campaigns based on various indicators
      const campaigns = [];

      // 1. Same command patterns from multiple IPs
      const commandCampaigns = await this.detectCommandPatternCampaigns();
      campaigns.push(...commandCampaigns);

      // 2. Same credentials tried from multiple IPs
      const credentialCampaigns = await this.detectCredentialCampaigns();
      campaigns.push(...credentialCampaigns);

      // 3. Similar timing and behavior
      const timingCampaigns = await this.detectTimingCampaigns();
      campaigns.push(...timingCampaigns);

      // 4. Same ASN/ISP attacking
      const networkCampaigns = await this.detectNetworkCampaigns();
      campaigns.push(...networkCampaigns);

      // Store detected campaigns
      for (const campaign of campaigns) {
        await this.recordCampaign(campaign);
      }

      if (campaigns.length > 0) {
        logger.info(`Detected ${campaigns.length} potential attack campaigns`);
      }

      return campaigns;
    } catch (error) {
      logger.error('Campaign detection failed:', error);
      return [];
    }
  }

  async detectCommandPatternCampaigns() {
    const query = `
      WITH command_groups AS (
        SELECT 
          command,
          COUNT(DISTINCT source_ip) as unique_ips,
          ARRAY_AGG(DISTINCT source_ip) as ip_list,
          MIN(timestamp) as first_seen,
          MAX(timestamp) as last_seen,
          COUNT(*) as total_attempts
        FROM events
        WHERE 
          command IS NOT NULL
          AND timestamp >= NOW() - INTERVAL '${this.timeWindow} seconds'
        GROUP BY command
        HAVING COUNT(DISTINCT source_ip) >= $1
      )
      SELECT * FROM command_groups
      WHERE total_attempts >= 5
      ORDER BY unique_ips DESC, total_attempts DESC
      LIMIT 10
    `;

    const result = await db.query(query, [this.minIPs]);
    
    return result.rows.map(row => ({
      type: 'COMMAND_PATTERN',
      indicator: row.command,
      ip_count: row.unique_ips,
      ip_list: row.ip_list,
      first_seen: row.first_seen,
      last_seen: row.last_seen,
      event_count: row.total_attempts,
      confidence: this.calculateConfidence(row.unique_ips, row.total_attempts)
    }));
  }

  async detectCredentialCampaigns() {
    const query = `
      WITH credential_groups AS (
        SELECT 
          username,
          password,
          COUNT(DISTINCT source_ip) as unique_ips,
          ARRAY_AGG(DISTINCT source_ip) as ip_list,
          MIN(timestamp) as first_seen,
          MAX(timestamp) as last_seen,
          COUNT(*) as total_attempts
        FROM events
        WHERE 
          (username IS NOT NULL OR password IS NOT NULL)
          AND timestamp >= NOW() - INTERVAL '${this.timeWindow} seconds'
        GROUP BY username, password
        HAVING COUNT(DISTINCT source_ip) >= $1
      )
      SELECT * FROM credential_groups
      ORDER BY unique_ips DESC, total_attempts DESC
      LIMIT 10
    `;

    const result = await db.query(query, [this.minIPs]);
    
    return result.rows.map(row => ({
      type: 'CREDENTIAL_STUFFING',
      indicator: `${row.username}:${row.password}`,
      ip_count: row.unique_ips,
      ip_list: row.ip_list,
      first_seen: row.first_seen,
      last_seen: row.last_seen,
      event_count: row.total_attempts,
      confidence: this.calculateConfidence(row.unique_ips, row.total_attempts)
    }));
  }

  async detectTimingCampaigns() {
    // Detect IPs attacking within a short time window (coordinated)
    const query = `
      WITH time_buckets AS (
        SELECT 
          date_trunc('minute', timestamp) as time_bucket,
          COUNT(DISTINCT source_ip) as unique_ips,
          ARRAY_AGG(DISTINCT source_ip) as ip_list,
          COUNT(*) as event_count,
          AVG(anomaly_score) as avg_score
        FROM events
        WHERE timestamp >= NOW() - INTERVAL '${this.timeWindow} seconds'
        GROUP BY time_bucket
        HAVING COUNT(DISTINCT source_ip) >= $1
      )
      SELECT * FROM time_buckets
      WHERE event_count >= 10
      ORDER BY unique_ips DESC
      LIMIT 5
    `;

    const result = await db.query(query, [this.minIPs]);
    
    return result.rows.map(row => ({
      type: 'COORDINATED_TIMING',
      indicator: row.time_bucket,
      ip_count: row.unique_ips,
      ip_list: row.ip_list,
      first_seen: row.time_bucket,
      last_seen: row.time_bucket,
      event_count: row.event_count,
      confidence: this.calculateConfidence(row.unique_ips, row.event_count)
    }));
  }

  async detectNetworkCampaigns() {
    // Detect attacks from same ASN/network
    const query = `
      SELECT 
        a.asn,
        a.isp,
        COUNT(DISTINCT a.ip_address) as unique_ips,
        ARRAY_AGG(DISTINCT a.ip_address) as ip_list,
        SUM(a.total_events) as total_events,
        SUM(a.high_severity_count) as high_severity_events,
        MIN(a.first_seen) as first_seen,
        MAX(a.last_seen) as last_seen
      FROM attackers a
      WHERE 
        a.asn IS NOT NULL
        AND a.last_seen >= NOW() - INTERVAL '${this.timeWindow} seconds'
      GROUP BY a.asn, a.isp
      HAVING 
        COUNT(DISTINCT a.ip_address) >= $1
        AND SUM(a.total_events) >= 20
      ORDER BY unique_ips DESC, total_events DESC
      LIMIT 5
    `;

    const result = await db.query(query, [this.minIPs]);
    
    return result.rows.map(row => ({
      type: 'NETWORK_CAMPAIGN',
      indicator: `${row.asn} (${row.isp})`,
      ip_count: row.unique_ips,
      ip_list: row.ip_list,
      first_seen: row.first_seen,
      last_seen: row.last_seen,
      event_count: row.total_events,
      confidence: this.calculateConfidence(row.unique_ips, row.total_events)
    }));
  }

  calculateConfidence(ipCount, eventCount) {
    // Calculate confidence score (0-1) based on IP count and event count
    const ipScore = Math.min(ipCount / 10, 1); // More IPs = higher confidence
    const eventScore = Math.min(eventCount / 100, 1); // More events = higher confidence
    
    return (ipScore * 0.6 + eventScore * 0.4);
  }

  async recordCampaign(campaign) {
    try {
      const campaignId = uuidv4();
      
      const query = `
        INSERT INTO attack_campaigns (
          id, campaign_type, indicator, ip_count, ip_list,
          first_seen, last_seen, event_count, confidence,
          is_active, detected_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT (campaign_type, indicator) 
        DO UPDATE SET
          ip_count = EXCLUDED.ip_count,
          ip_list = EXCLUDED.ip_list,
          last_seen = EXCLUDED.last_seen,
          event_count = EXCLUDED.event_count,
          confidence = EXCLUDED.confidence,
          is_active = true,
          updated_at = CURRENT_TIMESTAMP
        RETURNING id
      `;

      const values = [
        campaignId,
        campaign.type,
        campaign.indicator,
        campaign.ip_count,
        campaign.ip_list,
        campaign.first_seen,
        campaign.last_seen,
        campaign.event_count,
        campaign.confidence,
        true,
        new Date()
      ];

      await db.query(query, values);
      
      logger.info('Campaign recorded', {
        type: campaign.type,
        ip_count: campaign.ip_count,
        confidence: campaign.confidence
      });

      // Store in active campaigns map
      this.activeCampaigns.set(campaignId, campaign);

    } catch (error) {
      logger.error('Failed to record campaign:', error);
    }
  }

  async deactivateOldCampaigns() {
    try {
      const query = `
        UPDATE attack_campaigns
        SET is_active = false, updated_at = CURRENT_TIMESTAMP
        WHERE 
          is_active = true
          AND last_seen < NOW() - INTERVAL '${this.timeWindow * 2} seconds'
      `;

      const result = await db.query(query);
      
      if (result.rowCount > 0) {
        logger.info(`Deactivated ${result.rowCount} old campaigns`);
      }
    } catch (error) {
      logger.error('Failed to deactivate old campaigns:', error);
    }
  }

  async getActiveCampaigns() {
    try {
      const query = `
        SELECT * FROM attack_campaigns
        WHERE is_active = true
        ORDER BY confidence DESC, ip_count DESC
      `;

      const result = await db.query(query);
      return result.rows;
    } catch (error) {
      logger.error('Failed to get active campaigns:', error);
      return [];
    }
  }

  async startPeriodicDetection() {
    if (!this.enabled) {
      logger.info('Campaign detection is disabled');
      return;
    }

    logger.info('Starting periodic campaign detection');
    
    // Run detection every 5 minutes
    const detectionInterval = 5 * 60 * 1000;
    
    setInterval(async () => {
      await this.detectCampaigns();
      await this.deactivateOldCampaigns();
    }, detectionInterval);

    // Run immediately
    await this.detectCampaigns();
  }
}

module.exports = new CampaignDetector();
