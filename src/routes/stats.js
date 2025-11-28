const express = require('express');
const db = require('../database/connection');
const logger = require('../utils/logger');

const router = express.Router();

// Get overall statistics
router.get('/', async (req, res) => {
  try {
    // Severity distribution
    const severityQuery = `
      SELECT severity, COUNT(*) as count
      FROM events
      WHERE is_analyzed = true
      GROUP BY severity
    `;
    const severityResult = await db.query(severityQuery);

    // Event type distribution
    const eventTypeQuery = `
      SELECT event_type, COUNT(*) as count
      FROM events
      GROUP BY event_type
      ORDER BY count DESC
      LIMIT 10
    `;
    const eventTypeResult = await db.query(eventTypeQuery);

    // Total counts
    const countsQuery = `
      SELECT 
        (SELECT COUNT(*) FROM events) as total_events,
        (SELECT COUNT(*) FROM sessions) as total_sessions,
        (SELECT COUNT(*) FROM attackers) as total_attackers,
        (SELECT COUNT(*) FROM adaptations) as total_adaptations,
        (SELECT COUNT(*) FROM sessions WHERE is_active = true) as active_sessions,
        (SELECT COUNT(*) FROM attackers WHERE threat_level = 'HIGH') as high_threat_attackers
    `;
    const countsResult = await db.query(countsQuery);

    // Events over time (last 24 hours)
    const timelineQuery = `
      SELECT 
        DATE_TRUNC('hour', timestamp) as hour,
        COUNT(*) as count,
        severity
      FROM events
      WHERE timestamp >= NOW() - INTERVAL '24 hours'
      GROUP BY hour, severity
      ORDER BY hour DESC
    `;
    const timelineResult = await db.query(timelineQuery);

    // Top attackers
    const topAttackersQuery = `
      SELECT 
        ip_address,
        threat_level,
        total_events,
        high_severity_count,
        last_seen
      FROM attackers
      ORDER BY high_severity_count DESC, total_events DESC
      LIMIT 10
    `;
    const topAttackersResult = await db.query(topAttackersQuery);

    // Recent adaptations
    const recentAdaptationsQuery = `
      SELECT 
        action_type,
        COUNT(*) as count,
        MAX(timestamp) as last_adaptation
      FROM adaptations
      WHERE timestamp >= NOW() - INTERVAL '24 hours'
      GROUP BY action_type
    `;
    const recentAdaptationsResult = await db.query(recentAdaptationsQuery);

    res.json({
      severity_distribution: severityResult.rows,
      event_type_distribution: eventTypeResult.rows,
      counts: countsResult.rows[0],
      timeline: timelineResult.rows,
      top_attackers: topAttackersResult.rows,
      recent_adaptations: recentAdaptationsResult.rows
    });
  } catch (error) {
    logger.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// Get severity trends
router.get('/severity-trends', async (req, res) => {
  try {
    const { period = '7d' } = req.query;

    let interval;
    switch (period) {
      case '1h':
        interval = '1 hour';
        break;
      case '24h':
        interval = '24 hours';
        break;
      case '7d':
        interval = '7 days';
        break;
      case '30d':
        interval = '30 days';
        break;
      default:
        interval = '7 days';
    }

    const query = `
      SELECT 
        DATE_TRUNC('hour', timestamp) as time_bucket,
        severity,
        COUNT(*) as count
      FROM events
      WHERE timestamp >= NOW() - INTERVAL '${interval}'
      AND is_analyzed = true
      GROUP BY time_bucket, severity
      ORDER BY time_bucket DESC
    `;

    const result = await db.query(query);

    res.json({
      period,
      trends: result.rows
    });
  } catch (error) {
    logger.error('Error fetching severity trends:', error);
    res.status(500).json({ error: 'Failed to fetch severity trends' });
  }
});

// Get command statistics
router.get('/commands', async (req, res) => {
  try {
    const query = `
      SELECT 
        command,
        COUNT(*) as execution_count,
        COUNT(DISTINCT source_ip) as unique_ips,
        AVG(CASE WHEN severity = 'HIGH' THEN 1 WHEN severity = 'MEDIUM' THEN 0.5 ELSE 0 END) as avg_threat_score
      FROM events
      WHERE command IS NOT NULL
      AND command != ''
      GROUP BY command
      ORDER BY execution_count DESC
      LIMIT 50
    `;

    const result = await db.query(query);

    res.json({
      commands: result.rows
    });
  } catch (error) {
    logger.error('Error fetching command stats:', error);
    res.status(500).json({ error: 'Failed to fetch command statistics' });
  }
});

module.exports = router;
