const express = require('express');
const eventsRouter = require('./events');
const statsRouter = require('./stats');
const adaptationsRouter = require('./adaptations');
const attackersRouter = require('./attackers');
const analyticsRouter = require('./analytics');
const malwareRouter = require('./malware');
const exportRouter = require('./export');
const servicesRouter = require('./services');

const router = express.Router();

// Mount sub-routers
router.use('/events', eventsRouter);
router.use('/stats', statsRouter);
router.use('/adaptations', adaptationsRouter);
router.use('/attackers', attackersRouter);
router.use('/analytics', analyticsRouter);
router.use('/malware', malwareRouter);
router.use('/export', exportRouter);
router.use('/services', servicesRouter);

// API info endpoint
router.get('/', (req, res) => {
  res.json({
    name: 'Adaptive Honeynet API',
    version: '1.0.0',
    endpoints: {
      events: '/api/events',
      stats: '/api/stats',
      adaptations: '/api/adaptations',
      attackers: '/api/attackers',
      analytics: '/api/analytics',
      malware: '/api/malware',
      export: '/api/export'
    }
  });
});

module.exports = router;
