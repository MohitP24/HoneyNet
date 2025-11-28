const axios = require('axios');
const logger = require('../utils/logger');

class MLClient {
  constructor() {
    this.baseUrl = process.env.ML_SERVICE_URL || 'http://localhost:8001';
    this.timeout = parseInt(process.env.ML_SERVICE_TIMEOUT) || 10000;
    this.isHealthy = false;
    
    // Start health check
    this.checkHealth();
    setInterval(() => this.checkHealth(), 60000); // Check every minute
  }

  async checkHealth() {
    try {
      const response = await axios.get(`${this.baseUrl}/health`, {
        timeout: 5000
      });
      this.isHealthy = response.status === 200;
      
      if (this.isHealthy) {
        logger.debug('ML service health check: OK');
      }
    } catch (error) {
      this.isHealthy = false;
      logger.warn('ML service health check failed:', error.message);
    }
  }

  async classify(event) {
    if (!this.isHealthy) {
      logger.warn('ML service is not healthy, skipping classification');
      return null;
    }

    try {
      const payload = this.preparePayload(event);
      
      logger.logML('Sending classification request', {
        event_id: event.id,
        event_type: event.event_type
      });

      const response = await axios.post(
        `${this.baseUrl}/classify`,
        payload,
        {
          timeout: this.timeout,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      const result = response.data;
      
      logger.logML('Classification received', {
        severity: result.severity,
        score: result.anomaly_score
      });

      return result;
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        logger.error('ML service connection refused');
        this.isHealthy = false;
      } else if (error.code === 'ETIMEDOUT') {
        logger.error('ML service timeout');
      } else {
        logger.error('ML classification failed:', error.message);
      }
      
      return null;
    }
  }

  preparePayload(event) {
    return {
      event_id: event.id,
      event_type: event.event_type,
      timestamp: event.timestamp,
      source_ip: event.source_ip,
      session_id: event.cowrie_session_id,
      username: event.username,
      password: event.password,
      command: event.command,
      message: event.message,
      protocol: event.protocol
    };
  }
}

module.exports = new MLClient();
