const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');
const eventProcessor = require('./eventProcessor');
const db = require('../database/connection');

class MultiHoneypotWatcher {
  constructor() {
    this.watchers = {};
    this.isWatching = false;

    const defaultHttpPath = path.join(__dirname, '../../mock-data/http_honeypot.json');
    const defaultFtpPath = path.join(__dirname, '../../mock-data/ftp_honeypot.json');
    const defaultTelnetPath = path.join(__dirname, '../../mock-data/telnet_honeypot.json');
    const defaultMysqlPath = path.join(__dirname, '../../mock-data/mysql_honeypot.json');

    // Define honeypot log paths (configurable via environment variables)
    this.honeypots = {
      http: {
        path: process.env.HTTP_HONEYPOT_LOG_PATH || defaultHttpPath,
        name: 'HTTP Honeypot',
        serviceName: 'HTTP'
      },
      ftp: {
        path: process.env.FTP_HONEYPOT_LOG_PATH || defaultFtpPath,
        name: 'FTP Honeypot',
        serviceName: 'FTP'
      },
      telnet: {
        path: process.env.TELNET_HONEYPOT_LOG_PATH || defaultTelnetPath,
        name: 'Telnet Honeypot',
        serviceName: 'Telnet'
      },
      mysql: {
        path: process.env.MYSQL_HONEYPOT_LOG_PATH || defaultMysqlPath,
        name: 'MySQL Honeypot',
        serviceName: 'MySQL'
      }
    };
  }

  async start() {
    try {
      const Tail = require('tail').Tail;
      let startedCount = 0;

      for (const [key, config] of Object.entries(this.honeypots)) {
        try {
          // Ensure log file exists
          const logDir = path.dirname(config.path);
          if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
          }
          if (!fs.existsSync(config.path)) {
            fs.writeFileSync(config.path, '', 'utf8');
          }

          // Initial ingest: if database has 0 events for this service, ingest any existing log entries
          try {
            const res = await db.query(
              'SELECT COUNT(*) as cnt FROM events WHERE LOWER(service) = LOWER($1)',
              [config.serviceName]
            );
            const count = parseInt(res.rows[0]?.cnt || '0', 10);
            if (count === 0) {
              const content = fs.readFileSync(config.path, 'utf8');
              const lines = content.split(/\r?\n/).filter(l => l.trim().length > 0);
              if (lines.length > 0) {
                logger.info(`Ingesting ${lines.length} existing ${config.name} event(s)...`);
                for (const line of lines) {
                  await this.processLine(line, key);
                }
              }
            }
          } catch (seedErr) {
            logger.warn(`Could not seed initial events for ${config.name}: ${seedErr.message}`);
          }

          // Attach live tail watcher
          const tail = new Tail(config.path, {
            follow: true,
            useWatchFile: true,
            fsWatchOptions: { interval: 500 }
          });

          tail.on('line', (line) => {
            if (line && line.trim()) {
              this.processLine(line, key);
            }
          });

          tail.on('error', (error) => {
            logger.error(`${config.name} watcher error:`, error);
          });

          this.watchers[key] = tail;
          logger.info(`✅ ${config.name} watcher active on ${config.path}`);
          startedCount++;

        } catch (error) {
          logger.warn(`Failed to start ${config.name} watcher:`, error.message);
        }
      }

      this.isWatching = startedCount > 0;
      logger.info(`Multi-honeypot watcher active (${startedCount}/${Object.keys(this.honeypots).length} services)`);
      return this.isWatching;

    } catch (error) {
      logger.error('Failed to start multi-honeypot watcher:', error);
      return false;
    }
  }

  async processLine(line, honeypotType) {
    let event;
    try {
      if (!line || !line.trim()) return;
      event = JSON.parse(line.trim());

      // Normalize honeypot event to common format
      const normalizedEvent = {
        event_type: event.eventType || event.eventid || event.type || `${honeypotType}.request`,
        timestamp: event.timestamp || new Date().toISOString(),
        source_ip: event.sourceIP || event.src_ip || event.source_ip || '127.0.0.1',
        source_port: event.sourcePort || event.src_port || event.source_port || 0,
        destination_port: event.destination_port || event.dst_port || this.getDefaultPort(honeypotType),
        protocol: event.protocol || honeypotType.toUpperCase(),
        service: event.service || this.getServiceName(honeypotType),
        input_data: event.body || event.request || event.command || event.payload || '',
        command: event.command || event.path || event.method || '',
        username: event.username || '',
        password: event.password || '',
        sensor: event.sensor || `${honeypotType}_honeypot`,
        cowrie_session_id: event.session || `${honeypotType}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        message: event.message || this.generateMessage(event, honeypotType),
        raw_event: event
      };

      logger.info(`${this.getServiceName(honeypotType)} event detected`, {
        event_type: normalizedEvent.event_type,
        source_ip: normalizedEvent.source_ip,
        command: normalizedEvent.command
      });

      // Process through ML pipeline & store in DB
      await eventProcessor.process(normalizedEvent);

      logger.info(`✅ ${this.getServiceName(honeypotType)} event stored successfully`);

    } catch (error) {
      logger.error(`Error processing ${honeypotType} event:`, error.message);
    }
  }

  generateMessage(event, type) {
    if (type === 'http') {
      return `${event.method || 'GET'} ${event.path || '/'}`;
    } else if (type === 'ftp') {
      return `FTP: ${event.command || event.action || 'command'}`;
    } else if (type === 'telnet') {
      return `Telnet: ${event.command || event.username || 'login attempt'}`;
    } else if (type === 'mysql') {
      return `MySQL: ${event.command || event.username || 'connect attempt'}`;
    }
    return JSON.stringify(event).substring(0, 100);
  }

  getDefaultPort(type) {
    const ports = {
      http: 8080,
      ftp: 2121,
      telnet: 2323,
      mysql: 3306
    };
    return ports[type] || 0;
  }

  getServiceName(type) {
    const nameMap = {
      http: 'HTTP',
      ftp: 'FTP',
      telnet: 'Telnet',
      mysql: 'MySQL'
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
