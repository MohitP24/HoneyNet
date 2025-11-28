const db = require('../database/connection');
const logger = require('../utils/logger');
const mlClient = require('./mlClient');
const adaptationService = require('./adaptationService');
const { v4: uuidv4 } = require('uuid');

class EventProcessor {
  async process(normalizedEvent) {
    try {
      // 1. Store event in database
      const eventId = await this.storeEvent(normalizedEvent);
      normalizedEvent.id = eventId;

      // 2. Update session tracking
      await this.updateSession(normalizedEvent);

      // 3. Update attacker profile
      await this.updateAttacker(normalizedEvent);

      // 4. Send to ML service for classification
      const mlResult = await mlClient.classify(normalizedEvent);

      if (mlResult) {
        // 5. Update event with ML results
        await this.updateEventWithML(eventId, mlResult);

        logger.logML('Classification complete', {
          event_id: eventId,
          severity: mlResult.severity,
          score: mlResult.anomaly_score
        });

        // 6. Trigger adaptation if HIGH severity
        if (mlResult.severity === 'HIGH' && process.env.ENABLE_AUTO_ADAPTATION === 'true') {
          await adaptationService.adapt(normalizedEvent, mlResult);
        }
      }

      return eventId;
    } catch (error) {
      logger.error('Error processing event:', error);
      throw error;
    }
  }

  async storeEvent(event) {
    const query = `
      INSERT INTO events (
        id, event_type, timestamp, source_ip, cowrie_session_id,
        username, password, command, input_data, message,
        sensor, protocol, raw_event, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING id
    `;

    const id = uuidv4();
    const values = [
      id,
      event.event_type,
      event.timestamp,
      event.source_ip,
      event.cowrie_session_id,
      event.username || null,
      event.password || null,
      event.command || null,
      event.input_data || null,
      event.message,
      event.sensor,
      event.protocol,
      JSON.stringify(event.raw_event),
      new Date()
    ];

    const result = await db.query(query, values);
    return result.rows[0].id;
  }

  async updateSession(event) {
    const sessionId = event.cowrie_session_id;
    if (!sessionId) return;

    try {
      // Check if session exists
      const checkQuery = 'SELECT id FROM sessions WHERE session_id = $1';
      const existing = await db.query(checkQuery, [sessionId]);

      if (existing.rows.length === 0) {
        // Create new session
        await this.createSession(event);
      } else {
        // Update existing session
        await this.incrementSessionStats(event);
      }
    } catch (error) {
      logger.error('Error updating session:', error);
    }
  }

  async createSession(event) {
    const query = `
      INSERT INTO sessions (
        id, session_id, source_ip, start_time, 
        event_count, client_version, is_active
      ) VALUES ($1, $2, $3, $4, 1, $5, true)
      ON CONFLICT (session_id) DO NOTHING
    `;

    const values = [
      uuidv4(),
      event.cowrie_session_id,
      event.source_ip,
      event.timestamp,
      event.client_version || null
    ];

    await db.query(query, values);
  }

  async incrementSessionStats(event) {
    const updates = ['event_count = event_count + 1'];
    const values = [event.cowrie_session_id];

    if (event.event_type === 'cowrie.command.input') {
      updates.push('command_count = command_count + 1');
    }

    if (event.event_type === 'cowrie.login.failed') {
      updates.push('failed_login_count = failed_login_count + 1');
    }

    if (event.event_type === 'cowrie.login.success') {
      updates.push('successful_login = true');
    }

    if (event.event_type === 'cowrie.session.closed') {
      updates.push('is_active = false');
      updates.push('end_time = $2');
      values.push(event.timestamp);
    }

    const query = `
      UPDATE sessions 
      SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE session_id = $1
    `;

    await db.query(query, values);
  }

  async updateAttacker(event) {
    const ip = event.source_ip;

    try {
      const checkQuery = 'SELECT id FROM attackers WHERE ip_address = $1';
      const existing = await db.query(checkQuery, [ip]);

      if (existing.rows.length === 0) {
        await this.createAttacker(event);
      } else {
        await this.incrementAttackerStats(event);
      }
    } catch (error) {
      logger.error('Error updating attacker:', error);
    }
  }

  async createAttacker(event) {
    const query = `
      INSERT INTO attackers (
        id, ip_address, first_seen, last_seen,
        total_events, total_sessions
      ) VALUES ($1, $2, $3, $3, 1, 0)
      ON CONFLICT (ip_address) DO NOTHING
    `;

    const values = [
      uuidv4(),
      event.source_ip,
      event.timestamp
    ];

    await db.query(query, values);
  }

  async incrementAttackerStats(event) {
    const updates = [
      'total_events = total_events + 1',
      'last_seen = $2'
    ];
    const values = [event.source_ip, event.timestamp];

    if (event.event_type === 'cowrie.login.success') {
      updates.push('successful_logins = successful_logins + 1');
    }

    if (event.event_type === 'cowrie.login.failed') {
      updates.push('failed_logins = failed_logins + 1');
    }

    if (event.event_type === 'cowrie.command.input') {
      updates.push('commands_executed = commands_executed + 1');
    }

    const query = `
      UPDATE attackers 
      SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE ip_address = $1
    `;

    await db.query(query, values);
  }

  async updateEventWithML(eventId, mlResult) {
    const query = `
      UPDATE events 
      SET 
        severity = $2,
        anomaly_score = $3,
        ml_labels = $4,
        ml_features = $5,
        is_analyzed = true,
        analyzed_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `;

    const values = [
      eventId,
      mlResult.severity,
      mlResult.anomaly_score || null,
      JSON.stringify(mlResult.labels || {}),
      JSON.stringify(mlResult.features || {})
    ];

    await db.query(query, values);

    // Update attacker severity counts
    if (mlResult.severity) {
      await this.updateAttackerSeverityCount(eventId, mlResult.severity);
    }
  }

  async updateAttackerSeverityCount(eventId, severity) {
    const column = `${severity.toLowerCase()}_severity_count`;
    
    const query = `
      UPDATE attackers 
      SET ${column} = ${column} + 1
      WHERE ip_address = (SELECT source_ip FROM events WHERE id = $1)
    `;

    await db.query(query, [eventId]);
  }
}

module.exports = new EventProcessor();
