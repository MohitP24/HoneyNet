const express = require('express');
const db = require('../database/connection');
const logger = require('../utils/logger');

const router = express.Router();

// Get all adaptations with pagination
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 50, severity, action_type } = req.query;
    const offset = (page - 1) * limit;

    const conditions = [];
    const values = [];
    let paramCount = 0;

    if (severity) {
      paramCount++;
      conditions.push(`severity = $${paramCount}`);
      values.push(severity);
    }

    if (action_type) {
      paramCount++;
      conditions.push(`action_type = $${paramCount}`);
      values.push(action_type);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM adaptations ${whereClause}`;
    const countResult = await db.query(countQuery, values);
    const total = parseInt(countResult.rows[0].total);

    // Get adaptations
    paramCount++;
    const limitParam = paramCount;
    paramCount++;
    const offsetParam = paramCount;

    const query = `
      SELECT 
        a.id,
        a.timestamp,
        a.severity,
        a.action_type,
        a.action_details,
        a.success,
        a.error_message,
        a.trigger_ip,
        e.event_type as trigger_event_type,
        e.command as trigger_command
      FROM adaptations a
      LEFT JOIN events e ON a.trigger_event_id = e.id
      ${whereClause}
      ORDER BY a.timestamp DESC
      LIMIT $${limitParam} OFFSET $${offsetParam}
    `;

    const result = await db.query(query, [...values, limit, offset]);

    res.json({
      adaptations: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error('Error fetching adaptations:', error);
    res.status(500).json({ error: 'Failed to fetch adaptations' });
  }
});

// Get adaptation by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT 
        a.*,
        e.event_type as trigger_event_type,
        e.command as trigger_command,
        e.source_ip as trigger_source_ip,
        e.timestamp as trigger_timestamp
      FROM adaptations a
      LEFT JOIN events e ON a.trigger_event_id = e.id
      WHERE a.id = $1
    `;

    const result = await db.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Adaptation not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    logger.error('Error fetching adaptation:', error);
    res.status(500).json({ error: 'Failed to fetch adaptation' });
  }
});

// Get adaptation statistics
router.get('/stats/summary', async (req, res) => {
  try {
    const query = `
      SELECT 
        COUNT(*) as total_adaptations,
        COUNT(*) FILTER (WHERE success = true) as successful,
        COUNT(*) FILTER (WHERE success = false) as failed,
        COUNT(*) FILTER (WHERE severity = 'HIGH') as high_severity,
        COUNT(*) FILTER (WHERE severity = 'MEDIUM') as medium_severity,
        COUNT(*) FILTER (WHERE severity = 'LOW') as low_severity,
        COUNT(DISTINCT action_type) as unique_action_types,
        MAX(timestamp) as last_adaptation
      FROM adaptations
    `;

    const result = await db.query(query);

    // Action type distribution
    const actionTypeQuery = `
      SELECT 
        action_type,
        COUNT(*) as count,
        COUNT(*) FILTER (WHERE success = true) as successful
      FROM adaptations
      GROUP BY action_type
      ORDER BY count DESC
    `;

    const actionTypeResult = await db.query(actionTypeQuery);

    res.json({
      summary: result.rows[0],
      action_types: actionTypeResult.rows
    });
  } catch (error) {
    logger.error('Error fetching adaptation stats:', error);
    res.status(500).json({ error: 'Failed to fetch adaptation statistics' });
  }
});

module.exports = router;
