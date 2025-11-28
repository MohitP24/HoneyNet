const logger = require('../utils/logger');

/**
 * Normalizes raw Cowrie events into a consistent format
 */
class EventNormalizer {
  normalize(rawEvent) {
    if (!rawEvent || !rawEvent.eventid) {
      return null;
    }

    const eventType = rawEvent.eventid;

    // Base normalized event
    const normalized = {
      event_type: eventType,
      timestamp: this.parseTimestamp(rawEvent.timestamp),
      source_ip: rawEvent.src_ip || rawEvent.src_host || 'unknown',
      cowrie_session_id: rawEvent.session || null,
      sensor: rawEvent.sensor || 'cowrie',
      protocol: rawEvent.protocol || 'ssh',
      message: rawEvent.message || '',
      raw_event: rawEvent
    };

    // Extract type-specific fields
    switch (eventType) {
      case 'cowrie.login.success':
      case 'cowrie.login.failed':
        normalized.username = rawEvent.username;
        normalized.password = rawEvent.password;
        break;

      case 'cowrie.command.input':
        normalized.command = rawEvent.input;
        normalized.input_data = rawEvent.input;
        break;

      case 'cowrie.session.connect':
        normalized.client_version = rawEvent.version;
        break;

      case 'cowrie.session.closed':
        normalized.duration = rawEvent.duration;
        break;

      case 'cowrie.client.version':
        normalized.client_version = rawEvent.version;
        break;

      case 'cowrie.session.file_download':
        normalized.file_url = rawEvent.url;
        normalized.file_outfile = rawEvent.outfile;
        normalized.file_shasum = rawEvent.shasum;
        break;

      case 'cowrie.direct-tcpip.request':
        normalized.dst_ip = rawEvent.dst_ip;
        normalized.dst_port = rawEvent.dst_port;
        break;

      default:
        // Keep raw event for unknown types
        break;
    }

    return normalized;
  }

  parseTimestamp(timestamp) {
    if (!timestamp) {
      return new Date();
    }

    // Cowrie timestamps are ISO format
    const date = new Date(timestamp);
    return isNaN(date.getTime()) ? new Date() : date;
  }

  /**
   * Filter out events we don't care about
   */
  shouldProcess(eventType) {
    const ignoredEvents = [
      'cowrie.client.size',
      'cowrie.client.var',
      'cowrie.log.open'
    ];

    return !ignoredEvents.includes(eventType);
  }
}

module.exports = new EventNormalizer();
