const express = require('express');
const router = express.Router();
const db = require('../database/connection');
const logger = require('../utils/logger');
const campaignDetector = require('../services/campaignDetector');

/**
 * GET /api/analytics/geo-distribution
 * Get geographic distribution of attackers
 */
router.get('/geo-distribution', async (req, res) => {
  try {
    const query = `
      SELECT 
        country,
        country_code,
        COUNT(*) as attacker_count,
        SUM(total_events) as total_events,
        SUM(high_severity_count) as high_severity_events,
        AVG(latitude) as avg_latitude,
        AVG(longitude) as avg_longitude
      FROM attackers
      WHERE country IS NOT NULL
      GROUP BY country, country_code
      ORDER BY total_events DESC
    `;

    const result = await db.query(query);
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    logger.error('Error fetching geo distribution:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch geographic distribution'
    });
  }
});

/**
 * GET /api/analytics/attack-phases
 * Get distribution of attack phases from command analysis
 */
router.get('/attack-phases', async (req, res) => {
  try {
    const query = `
      SELECT 
        jsonb_array_elements_text(ml_labels->'command_analysis'->'attack_phases') as phase,
        COUNT(*) as count
      FROM events
      WHERE 
        is_analyzed = true 
        AND ml_labels->'command_analysis'->'attack_phases' IS NOT NULL
        AND jsonb_array_length(ml_labels->'command_analysis'->'attack_phases') > 0
      GROUP BY phase
      ORDER BY count DESC
    `;

    const result = await db.query(query);
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    logger.error('Error fetching attack phases:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch attack phase distribution'
    });
  }
});

/**
 * GET /api/analytics/top-commands
 * Get most common commands by severity
 */
router.get('/top-commands', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const severity = req.query.severity || 'HIGH';

    const query = `
      SELECT 
        command,
        COUNT(*) as frequency,
        AVG(anomaly_score) as avg_score,
        AVG((ml_labels->'command_analysis'->>'risk_score')::float) as avg_risk_score,
        COUNT(DISTINCT source_ip) as unique_ips,
        MAX(timestamp) as last_seen
      FROM events
      WHERE 
        command IS NOT NULL 
        AND severity = $1
      GROUP BY command
      ORDER BY frequency DESC
      LIMIT $2
    `;

    const result = await db.query(query, [severity, limit]);
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    logger.error('Error fetching top commands:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch command statistics'
    });
  }
});

/**
 * GET /api/analytics/attack-timeline
 * Get attack events over time with severity breakdown
 */
router.get('/attack-timeline', async (req, res) => {
  try {
    const hours = parseInt(req.query.hours) || 24;
    const interval = req.query.interval || '1 hour';

    const query = `
      SELECT 
        date_trunc($1, timestamp) as time_bucket,
        severity,
        COUNT(*) as event_count,
        COUNT(DISTINCT source_ip) as unique_ips,
        AVG(anomaly_score) as avg_anomaly_score
      FROM events
      WHERE timestamp >= NOW() - INTERVAL '${hours} hours'
      GROUP BY time_bucket, severity
      ORDER BY time_bucket DESC, severity
    `;

    const result = await db.query(query, [interval]);
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    logger.error('Error fetching attack timeline:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch attack timeline'
    });
  }
});

/**
 * GET /api/analytics/threat-actors
 * Get detailed threat actor profiles with behavioral analysis
 */
router.get('/threat-actors', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;

    const query = `
      SELECT 
        a.ip_address,
        a.country,
        a.city,
        a.isp,
        a.organization,
        a.threat_level,
        a.total_events,
        a.high_severity_count,
        a.first_seen,
        a.last_seen,
        a.most_common_username,
        (
          SELECT jsonb_agg(DISTINCT phase)
          FROM (
            SELECT jsonb_array_elements_text(ml_labels->'command_analysis'->'attack_phases') as phase
            FROM events
            WHERE source_ip = a.ip_address
            AND ml_labels->'command_analysis'->'attack_phases' IS NOT NULL
          ) phases
        ) as attack_phases,
        (
          SELECT AVG((ml_labels->'command_analysis'->>'risk_score')::float)
          FROM events
          WHERE source_ip = a.ip_address
          AND ml_labels->'command_analysis' IS NOT NULL
        ) as avg_command_risk
      FROM attackers a
      WHERE a.high_severity_count > 0
      ORDER BY a.high_severity_count DESC, a.total_events DESC
      LIMIT $1
    `;

    const result = await db.query(query, [limit]);
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    logger.error('Error fetching threat actors:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch threat actor profiles'
    });
  }
});

/**
 * GET /api/analytics/isp-distribution
 * Get attacks grouped by ISP/Organization
 */
router.get('/isp-distribution', async (req, res) => {
  try {
    const query = `
      SELECT 
        isp,
        organization,
        COUNT(*) as attacker_count,
        SUM(total_events) as total_events,
        SUM(high_severity_count) as high_severity_events,
        ARRAY_AGG(DISTINCT country) as countries
      FROM attackers
      WHERE isp IS NOT NULL
      GROUP BY isp, organization
      HAVING SUM(total_events) > 5
      ORDER BY total_events DESC
      LIMIT 20
    `;

    const result = await db.query(query);
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    logger.error('Error fetching ISP distribution:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch ISP distribution'
    });
  }
});

/**
 * GET /api/analytics/campaigns
 * Get active attack campaigns
 */
router.get('/campaigns', async (req, res) => {
  try {
    const campaigns = await campaignDetector.getActiveCampaigns();
    
    res.json({
      success: true,
      count: campaigns.length,
      data: campaigns
    });
  } catch (error) {
    logger.error('Error fetching campaigns:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch attack campaigns'
    });
  }
});

/**
 * POST /api/analytics/campaigns/detect
 * Manually trigger campaign detection
 */
router.post('/campaigns/detect', async (req, res) => {
  try {
    const campaigns = await campaignDetector.detectCampaigns();
    
    res.json({
      success: true,
      detected: campaigns.length,
      data: campaigns
    });
  } catch (error) {
    logger.error('Error detecting campaigns:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to detect campaigns'
    });
  }
});

module.exports = router;
