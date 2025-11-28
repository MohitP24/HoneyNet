const Tail = require('tail').Tail;
const fs = require('fs');
const logger = require('../utils/logger');
const eventNormalizer = require('./eventNormalizer');
const eventProcessor = require('./eventProcessor');

class LogWatcher {
  constructor() {
    this.tail = null;
    this.isWatching = false;
    this.logPath = process.env.COWRIE_LOG_PATH;
    this.lineBuffer = '';
  }

  async start() {
    if (!this.logPath) {
      throw new Error('COWRIE_LOG_PATH not configured');
    }

    // Verify log file exists
    if (!fs.existsSync(this.logPath)) {
      logger.warn(`Log file does not exist: ${this.logPath}`);
      logger.info('Waiting for log file to be created...');
      
      // Watch for file creation
      return this.watchForFileCreation();
    }

    return this.startTailing();
  }

  watchForFileCreation() {
    const dir = require('path').dirname(this.logPath);
    const filename = require('path').basename(this.logPath);
    
    const watcher = require('chokidar').watch(dir, {
      persistent: true,
      ignoreInitial: false
    });

    watcher.on('add', (path) => {
      if (path === this.logPath) {
        logger.info(`Log file created: ${this.logPath}`);
        watcher.close();
        this.startTailing();
      }
    });
  }

  startTailing() {
    try {
      logger.info(`Starting log watcher on: ${this.logPath}`);

      this.tail = new Tail(this.logPath, {
        separator: '\n',
        fromBeginning: false,
        follow: true,
        useWatchFile: true
      });

      this.tail.on('line', async (line) => {
        await this.processLine(line);
      });

      this.tail.on('error', (error) => {
        logger.error('Tail error:', error);
      });

      this.isWatching = true;
      logger.info('Log watcher active');

      return this;
    } catch (error) {
      logger.error('Failed to start log watcher:', error);
      throw error;
    }
  }

  async processLine(line) {
    try {
      // Skip empty lines
      if (!line || line.trim() === '') {
        return;
      }

      // Parse JSON
      let rawEvent;
      try {
        rawEvent = JSON.parse(line);
      } catch (parseError) {
        logger.warn('Failed to parse JSON line:', { line, error: parseError.message });
        return;
      }

      // Normalize event
      const normalizedEvent = eventNormalizer.normalize(rawEvent);
      
      if (!normalizedEvent) {
        logger.debug('Event filtered out by normalizer');
        return;
      }

      // Log event receipt
      logger.logEvent('Received', {
        type: normalizedEvent.event_type,
        ip: normalizedEvent.source_ip,
        session: normalizedEvent.cowrie_session_id
      });

      // Process event (store, analyze, adapt)
      await eventProcessor.process(normalizedEvent);

    } catch (error) {
      logger.error('Error processing log line:', error);
    }
  }

  async stop() {
    if (this.tail) {
      this.tail.unwatch();
      this.isWatching = false;
      logger.info('Log watcher stopped');
    }
  }
}

// Export singleton instance
const logWatcher = new LogWatcher();
module.exports = logWatcher;
