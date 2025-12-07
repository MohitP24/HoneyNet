const express = require('express');
const db = require('../database/connection');
const logger = require('../utils/logger');

const router = express.Router();

// Get all honeypot services status
router.get('/', async (req, res) => {
  try {
    // Get service definitions and real-time event counts
    const result = await db.query(`
      SELECT 
        hs.id,
        hs.service_name,
        hs.port,
        hs.protocol,
        hs.is_active,
        COUNT(e.id) as total_events,
        COUNT(CASE WHEN e.severity = 'HIGH' THEN 1 END) as high_severity_events,
        hs.first_started,
        MAX(e.timestamp) as last_active
      FROM honeypot_services hs
      LEFT JOIN events e ON (
        e.service = hs.service_name 
        OR (hs.service_name = 'Cowrie SSH' AND e.service = 'SSH')
      )
      GROUP BY hs.id, hs.service_name, hs.port, hs.protocol, hs.is_active, hs.first_started
      ORDER BY hs.port ASC
    `);
    
    res.json({ 
      services: result.rows,
      total: result.rows.length
    });
  } catch (error) {
    logger.error('Error fetching honeypot services:', error);
    res.status(500).json({ error: 'Failed to fetch honeypot services' });
  }
});

// Get statistics per service
router.get('/stats', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT * FROM service_stats
      ORDER BY total_events DESC
    `);
    
    res.json({ stats: result.rows });
  } catch (error) {
    logger.error('Error fetching service stats:', error);
    res.status(500).json({ error: 'Failed to fetch service stats' });
  }
});

module.exports = router;
