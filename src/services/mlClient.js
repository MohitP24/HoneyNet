const axios = require('axios');
const logger = require('../utils/logger');
const commandAnalyzer = require('./commandAnalyzer');

class MLClient {
  constructor() {
    this.baseUrl = process.env.ML_SERVICE_URL || 'http://localhost:8001';
    this.timeout = parseInt(process.env.ML_SERVICE_TIMEOUT) || 60000; // 60 seconds for TensorFlow warm-up
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
        `${this.baseUrl}/predict`,
        payload,
        {
          timeout: this.timeout,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      const result = response.data;

      // Analyze command patterns if command exists
      let commandAnalysis = null;
      if (event.command) {
        commandAnalysis = commandAnalyzer.analyzeCommand(event.command);
        
        // Boost severity if command analysis indicates high risk
        if (commandAnalysis.risk_score >= 70) {
          result.label = 'anomalous';
          result.score = Math.max(result.score || 0, 0.85);
        }
      }

      // Map new response format to backend expectations with MEDIUM threshold
      let severity;
      if (result.score >= 0.7) {
        severity = 'HIGH';
      } else if (result.score >= 0.5) {
        severity = 'MEDIUM';
      } else {
        severity = 'LOW';
      }

      logger.logML('Classification received', {
        severity: severity,
        score: result.score,
        command_risk: commandAnalysis?.risk_score || 0,
        explanation: result.explanation
      });

      return {
        severity: severity,
        anomaly_score: result.score,
        details: result.explanation,
        command_analysis: commandAnalysis
      };
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
    // Construct payload for new ML service
    // Expected: honeypotId, srcIp, event, payload, timestamp

    // Determine payload content based on event type
    let payloadContent = event.message || '';
    if (event.command) payloadContent += ` ${event.command}`;
    if (event.input) payloadContent += ` ${event.input}`;
    if (event.input_data) payloadContent += ` ${event.input_data}`;

    // Ensure payloadContent is a string before calling trim
    const payloadStr = String(payloadContent || '').trim();

    return {
      honeypotId: 'cowrie-1',
      srcIp: event.source_ip || '0.0.0.0',
      event: event.event_type || 'unknown',
      payload: payloadStr,
      timestamp: event.timestamp || new Date().toISOString()
    };
  }
}

module.exports = new MLClient();
