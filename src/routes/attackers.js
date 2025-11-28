const express = require('express');
const db = require('../database/connection');
const logger = require('../utils/logger');

const router = express.Router();

// Get all attackers with pagination
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 50, threat_level, sort = 'last_seen' } = req.query;
    const offset = (page - 1) * limit;

    const conditions = [];
    const values = [];
    let paramCount = 0;

    if (threat_level) {
      paramCount++;
      conditions.push(`threat_level = $${paramCount}`);
      values.push(threat_level);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Validate sort field
    const validSorts = ['last_seen', 'total_events', 'high_severity_count', 'threat_level'];
    const sortField = validSorts.includes(sort) ? sort : 'last_seen';

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM attackers ${whereClause}`;
    const countResult = await db.query(countQuery, values);
    const total = parseInt(countResult.rows[0].total);

    // Get attackers
    paramCount++;
    const limitParam = paramCount;
    paramCount++;
    const offsetParam = paramCount;

    const query = `
      SELECT 
        id, ip_address, threat_level, first_seen, last_seen,
        total_events, total_sessions, successful_logins, failed_logins,
        commands_executed, high_severity_count, medium_severity_count, 
        low_severity_count, most_common_username, is_blocked
      FROM attackers
      ${whereClause}
      ORDER BY ${sortField} DESC
      LIMIT $${limitParam} OFFSET $${offsetParam}
    `;

    const result = await db.query(query, [...values, limit, offset]);

    res.json({
      attackers: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error('Error fetching attackers:', error);
    res.status(500).json({ error: 'Failed to fetch attackers' });
  }
});

// Get single attacker by IP
router.get('/:ip', async (req, res) => {
  try {
    const { ip } = req.params;

    // Get attacker info
    const attackerQuery = `
      SELECT * FROM attackers WHERE ip_address = $1
    `;
    const attackerResult = await db.query(attackerQuery, [ip]);

    if (attackerResult.rows.length === 0) {
      return res.status(404).json({ error: 'Attacker not found' });
    }

    // Get recent events
    const eventsQuery = `
      SELECT 
        id, event_type, timestamp, severity, command, username
      FROM events
      WHERE source_ip = $1
      ORDER BY timestamp DESC
      LIMIT 50
    `;
    const eventsResult = await db.query(eventsQuery, [ip]);

    // Get sessions
    const sessionsQuery = `
      SELECT 
        id, session_id, start_time, end_time, event_count, 
        command_count, is_active
      FROM sessions
      WHERE source_ip = $1
      ORDER BY start_time DESC
      LIMIT 20
    `;
    const sessionsResult = await db.query(sessionsQuery, [ip]);

    // Get triggered adaptations
    const adaptationsQuery = `
      SELECT 
        id, timestamp, severity, action_type, success
      FROM adaptations
      WHERE trigger_ip = $1
      ORDER BY timestamp DESC
      LIMIT 20
    `;
    const adaptationsResult = await db.query(adaptationsQuery, [ip]);

    res.json({
      attacker: attackerResult.rows[0],
      recent_events: eventsResult.rows,
      sessions: sessionsResult.rows,
      triggered_adaptations: adaptationsResult.rows
    });
  } catch (error) {
    logger.error('Error fetching attacker:', error);
    res.status(500).json({ error: 'Failed to fetch attacker details' });
  }
});

// Get attacker statistics
router.get('/stats/summary', async (req, res) => {
  try {
    const query = `
      SELECT 
        COUNT(*) as total_attackers,
        COUNT(*) FILTER (WHERE threat_level = 'CRITICAL') as critical,
        COUNT(*) FILTER (WHERE threat_level = 'HIGH') as high_threat,
        COUNT(*) FILTER (WHERE threat_level = 'MEDIUM') as medium_threat,
        COUNT(*) FILTER (WHERE threat_level = 'LOW') as low_threat,
        COUNT(*) FILTER (WHERE is_blocked = true) as blocked,
        SUM(total_events) as total_events_all,
        AVG(high_severity_count) as avg_high_severity
      FROM attackers
    `;

    const result = await db.query(query);

    // Top usernames tried
    const usernamesQuery = `
      SELECT 
        username,
        COUNT(*) as attempts,
        COUNT(DISTINCT source_ip) as unique_ips
      FROM events
      WHERE username IS NOT NULL
      GROUP BY username
      ORDER BY attempts DESC
      LIMIT 20
    `;
    const usernamesResult = await db.query(usernamesQuery);

    // Geographic distribution (if available)
    const geoQuery = `
      SELECT 
        country,
        COUNT(*) as attacker_count
      FROM attackers
      WHERE country IS NOT NULL
      GROUP BY country
      ORDER BY attacker_count DESC
      LIMIT 10
    `;
    const geoResult = await db.query(geoQuery);

    res.json({
      summary: result.rows[0],
      top_usernames: usernamesResult.rows,
      geographic_distribution: geoResult.rows
    });
  } catch (error) {
    logger.error('Error fetching attacker stats:', error);
    res.status(500).json({ error: 'Failed to fetch attacker statistics' });
  }
});

module.exports = router;
