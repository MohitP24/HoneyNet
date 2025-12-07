const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const logger = require('./utils/logger');
const apiSafetyChecker = require('./utils/apiSafetyChecker');
const db = require('./database/connection');
const logWatcher = require('./services/logWatcher');
const multiHoneypotWatcher = require('./services/dionaeaWatcher');
const campaignDetector = require('./services/campaignDetector');
const malwareAnalyzer = require('./services/malwareAnalysisService');
const routes = require('./routes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || ['http://localhost:3001', 'http://localhost:5173']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting - relaxed for development/dashboard usage
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: parseInt(process.env.API_RATE_LIMIT) || 100, // 100 requests per minute
  message: 'Too many requests from this IP',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Routes
app.use('/api', routes);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: db.isConnected ? 'connected' : 'disconnected',
    logWatcher: logWatcher.isWatching ? 'active' : 'inactive'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Graceful shutdown
const gracefulShutdown = async () => {
  logger.info('Shutting down gracefully...');
  
  try {
    // Stop log watcher
    await logWatcher.stop();
    
    // Close database connection
    await db.close();
    
    logger.info('Shutdown complete');
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown:', error);
    process.exit(1);
  }
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Start server
const startServer = async () => {
  try {
    // Run API safety check first
    apiSafetyChecker.checkAll();
    
    // Initialize database
    await db.connect();
    logger.info('Database connected successfully');
    
    // Start log watcher
    await logWatcher.start();
    logger.info('Log watcher started successfully');
    
    // Start campaign detector
    await campaignDetector.startPeriodicDetection();
    logger.info('Campaign detector started successfully');
    
    // Start malware analysis watcher
    const malwareAnalyzer = require('./services/malwareAnalysisService');
    await malwareAnalyzer.watchDownloadsDirectory();
    logger.info('Malware analyzer started successfully');
    
    // Start multi-honeypot watcher (HTTP, FTP, Telnet)
    multiHoneypotWatcher.start().catch(err => {
      logger.warn('Multi-honeypot watcher not started:', err.message);
    });
    
    // Start Express server
    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV}`);
      logger.info(`ML Service: ${process.env.ML_SERVICE_URL}`);
      logger.info(`Cowrie log: ${process.env.COWRIE_LOG_PATH}`);
      logger.info(`Honeynet services: HTTP, FTP, Telnet watchers active`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

module.exports = app;
