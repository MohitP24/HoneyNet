const express = require('express');
const db = require('../database/connection');
const logger = require('../utils/logger');

const router = express.Router();

// Get recent events with pagination and filters
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      severity,
      source_ip,
      event_type,
      from_date,
      to_date
    } = req.query;

    const offset = (page - 1) * limit;
    const conditions = [];
    const values = [];
    let paramCount = 0;

    // Build WHERE clause
    if (severity) {
      paramCount++;
      conditions.push(`severity = $${paramCount}`);
      values.push(severity);
    }

    if (source_ip) {
      paramCount++;
      conditions.push(`source_ip = $${paramCount}`);
      values.push(source_ip);
    }

    if (event_type) {
      paramCount++;
      conditions.push(`event_type = $${paramCount}`);
      values.push(event_type);
    }

    if (from_date) {
      paramCount++;
      conditions.push(`timestamp >= $${paramCount}`);
      values.push(from_date);
    }

    if (to_date) {
      paramCount++;
      conditions.push(`timestamp <= $${paramCount}`);
      values.push(to_date);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM events ${whereClause}`;
    const countResult = await db.query(countQuery, values);
    const total = parseInt(countResult.rows[0].total);

    // Get events
    paramCount++;
    const limitParam = paramCount;
    paramCount++;
    const offsetParam = paramCount;

    const query = `
      SELECT 
        id, event_type, 
        to_char(timestamp, 'YYYY-MM-DD"T"HH24:MI:SS.MS') as timestamp,
        source_ip, username,
        command, severity, anomaly_score, message,
        cowrie_session_id, sensor, service, protocol
      FROM events
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${limitParam} OFFSET $${offsetParam}
    `;

    const result = await db.query(query, [...values, limit, offset]);

    // DEBUG: Log what timestamps are being returned from database
    if (result.rows.length > 0) {
      console.log('[API DEBUG] First event timestamp from DB:', result.rows[0].timestamp);
      console.log('[API DEBUG] First event timestamp type:', typeof result.rows[0].timestamp);
    }

    res.json({
      events: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error('Error fetching events:', error);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

// Get single event by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT 
        e.*,
        s.session_id as session_identifier,
        s.start_time as session_start,
        a.threat_level as attacker_threat_level
      FROM events e
      LEFT JOIN sessions s ON e.session_id = s.id
      LEFT JOIN attackers a ON e.source_ip = a.ip_address
      WHERE e.id = $1
    `;

    const result = await db.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    logger.error('Error fetching event:', error);
    res.status(500).json({ error: 'Failed to fetch event' });
  }
});

// Get recent events for a specific session
router.get('/session/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;

    const query = `
      SELECT 
        id, event_type, timestamp, source_ip, username,
        command, severity, message
      FROM events
      WHERE cowrie_session_id = $1
      ORDER BY timestamp ASC
    `;

    const result = await db.query(query, [sessionId]);

    res.json({
      session_id: sessionId,
      events: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    logger.error('Error fetching session events:', error);
    res.status(500).json({ error: 'Failed to fetch session events' });
  }
});

module.exports = router;
