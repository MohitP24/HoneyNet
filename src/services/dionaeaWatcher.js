const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');
const eventProcessor = require('./eventProcessor');

class MultiHoneypotWatcher {
  constructor() {
    this.watchers = {};
    this.isWatching = false;
    
    // Define honeypot log paths
    this.honeypots = {
      http: {
        path: '\\\\wsl$\\Ubuntu-22.04\\tmp\\http_honeypot.json',
        name: 'HTTP Honeypot'
      },
      ftp: {
        path: '\\\\wsl$\\Ubuntu-22.04\\tmp\\ftp_honeypot.json',
        name: 'FTP Honeypot'
      }
    };
  }

  async start() {
    try {
      const Tail = require('tail').Tail;
      let startedCount = 0;

      for (const [key, config] of Object.entries(this.honeypots)) {
        try {
          // Create file if doesn't exist
          if (!fs.existsSync(config.path)) {
            logger.warn(`${config.name} log not found, will watch for creation: ${config.path}`);
            continue;
          }

          const tail = new Tail(config.path, {
            fromBeginning: false,
            follow: true,
            useWatchFile: true,
            fsWatchOptions: { interval: 1000 }
          });

          tail.on('line', (line) => this.processLine(line, key));
          tail.on('error', (error) => {
            logger.error(`${config.name} watcher error:`, error);
          });

          this.watchers[key] = tail;
          logger.info(`${config.name} watcher started`);
          startedCount++;

        } catch (error) {
          logger.warn(`Failed to start ${config.name} watcher:`, error.message);
        }
      }

      this.isWatching = startedCount > 0;
      logger.info(`Multi-honeypot watcher started (${startedCount}/${Object.keys(this.honeypots).length} services)`);
      return this.isWatching;

    } catch (error) {
      logger.error('Failed to start multi-honeypot watcher:', error);
      return false;
    }
  }

  async processLine(line, honeypotType) {
    try {
      const event = JSON.parse(line);
      
      // Normalize honeypot event to common format (matches database schema)
      const normalizedEvent = {
        event_type: event.eventType || event.type || `${honeypotType}.request`,
        timestamp: event.timestamp || new Date().toISOString(), // Use event timestamp if available
        source_ip: event.sourceIP || event.src_ip || event.source_ip,
        source_port: event.sourcePort || event.src_port || event.source_port || 0,
        destination_port: event.destination_port || this.getDefaultPort(honeypotType),
        protocol: event.protocol || honeypotType.toUpperCase(),
        service: event.service || this.getServiceName(honeypotType),
        input_data: event.body || event.request || event.command || event.payload || '',
        command: event.command || event.path || event.method || '',
        username: event.username || '',
        password: event.password || '',
        sensor: event.sensor || `${honeypotType}_honeypot`,
        cowrie_session_id: event.session || `${honeypotType}-${Date.now()}`,
        message: event.message || this.generateMessage(event, honeypotType),
        raw_event: event
      };

      logger.info(`${this.getServiceName(honeypotType)} event detected`, {
        event_type: normalizedEvent.event_type,
        source_ip: normalizedEvent.source_ip,
        command: normalizedEvent.command
      });
      
      // Debug: Log full normalized event
      logger.debug(`Normalized event:`, JSON.stringify(normalizedEvent, null, 2));

      // Process through ML pipeline
      await eventProcessor.process(normalizedEvent);
      
      logger.info(`✅ ${this.getServiceName(honeypotType)} event stored successfully`);

    } catch (error) {
      logger.error(`Error processing ${honeypotType} event:`, error);
      logger.error(`Event data:`, JSON.stringify(event));
    }
  }

  generateMessage(event, type) {
    if (type === 'http') {
      return `${event.method || 'GET'} ${event.path || '/'}`;
    } else if (type === 'ftp') {
      return `FTP: ${event.command || event.action || 'command'}`;
    }
    return JSON.stringify(event).substring(0, 100);
  }

  getDefaultPort(type) {
    const ports = {
      http: 8080,
      ftp: 2121
    };
    return ports[type] || 0;
  }

  getServiceName(type) {
    const nameMap = {
      http: 'HTTP',
      ftp: 'FTP'
    };
    return nameMap[type] || type.toUpperCase();
  }

  stop() {
    for (const [key, tail] of Object.entries(this.watchers)) {
      if (tail) {
        tail.unwatch();
        logger.info(`${this.honeypots[key].name} watcher stopped`);
      }
    }
    this.watchers = {};
    this.isWatching = false;
    logger.info('Multi-honeypot watcher stopped');
  }
}

module.exports = new MultiHoneypotWatcher();
