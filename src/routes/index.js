const express = require('express');
const eventsRouter = require('./events');
const statsRouter = require('./stats');
const adaptationsRouter = require('./adaptations');
const attackersRouter = require('./attackers');

const router = express.Router();

// Mount sub-routers
router.use('/events', eventsRouter);
router.use('/stats', statsRouter);
router.use('/adaptations', adaptationsRouter);
router.use('/attackers', attackersRouter);

// API info endpoint
router.get('/', (req, res) => {
  res.json({
    name: 'Adaptive Honeynet API',
    version: '1.0.0',
    endpoints: {
      events: '/api/events',
      stats: '/api/stats',
      adaptations: '/api/adaptations',
      attackers: '/api/attackers'
    }
  });
});

module.exports = router;
