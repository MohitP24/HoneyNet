const axios = require('axios');
const logger = require('../utils/logger');

/**
 * Alert Service
 * Sends real-time notifications for high-severity events
 * Supports: Slack, Discord, Webhook, Email (via webhook)
 */

class AlertService {
  constructor() {
    this.enabled = process.env.ENABLE_ALERTS === 'true';
    this.slackWebhook = process.env.SLACK_WEBHOOK_URL;
    this.discordWebhook = process.env.DISCORD_WEBHOOK_URL;
    this.customWebhook = process.env.CUSTOM_WEBHOOK_URL;
    this.minSeverity = process.env.ALERT_MIN_SEVERITY || 'HIGH';
    this.throttle = new Map(); // Prevent alert spam
    this.throttleWindow = parseInt(process.env.ALERT_THROTTLE_SECONDS) || 300; // 5 minutes
  }

  async sendAlert(event, mlResult, geoInfo = null) {
    if (!this.enabled) {
      logger.debug('Alerts disabled, skipping');
      return;
    }

    // Check severity threshold
    if (!this.shouldAlert(mlResult.severity)) {
      return;
    }

    // Check throttling
    const throttleKey = `${event.source_ip}_${mlResult.severity}`;
    if (this.isThrottled(throttleKey)) {
      logger.debug(`Alert throttled for ${throttleKey}`);
      return;
    }

    // Prepare alert data
    const alertData = this.prepareAlertData(event, mlResult, geoInfo);

    // Send to all configured channels
    const promises = [];
    
    if (this.slackWebhook) {
      promises.push(this.sendToSlack(alertData));
    }
    
    if (this.discordWebhook) {
      promises.push(this.sendToDiscord(alertData));
    }
    
    if (this.customWebhook) {
      promises.push(this.sendToCustomWebhook(alertData));
    }

    try {
      await Promise.all(promises);
      this.setThrottle(throttleKey);
      logger.info('Alert sent successfully', {
        ip: event.source_ip,
        severity: mlResult.severity,
        channels: promises.length
      });
    } catch (error) {
      logger.error('Failed to send alerts:', error.message);
    }
  }

  prepareAlertData(event, mlResult, geoInfo) {
    const commandAnalysis = mlResult.command_analysis;
    
    return {
      timestamp: new Date().toISOString(),
      severity: mlResult.severity,
      anomaly_score: mlResult.anomaly_score,
      
      event: {
        id: event.id,
        type: event.event_type,
        timestamp: event.timestamp,
        command: event.command || null,
        username: event.username || null,
        password: event.password || null,
        message: event.message || null
      },
      
      attacker: {
        ip: event.source_ip,
        session: event.cowrie_session_id,
        country: geoInfo?.country || 'Unknown',
        city: geoInfo?.city || 'Unknown',
        isp: geoInfo?.isp || 'Unknown'
      },
      
      analysis: {
        ml_score: mlResult.anomaly_score,
        attack_phases: commandAnalysis?.attack_phases || [],
        risk_score: commandAnalysis?.risk_score || 0,
        is_dangerous: commandAnalysis?.is_dangerous || false,
        techniques: commandAnalysis?.techniques || []
      }
    };
  }

  async sendToSlack(alertData) {
    const color = this.getSeverityColor(alertData.severity);
    const emoji = this.getSeverityEmoji(alertData.severity);
    
    const message = {
      text: `${emoji} *HIGH SEVERITY ATTACK DETECTED*`,
      attachments: [{
        color: color,
        fields: [
          {
            title: 'Severity',
            value: alertData.severity,
            short: true
          },
          {
            title: 'Anomaly Score',
            value: `${(alertData.anomaly_score * 100).toFixed(1)}%`,
            short: true
          },
          {
            title: 'Attacker IP',
            value: alertData.attacker.ip,
            short: true
          },
          {
            title: 'Location',
            value: `${alertData.attacker.city}, ${alertData.attacker.country}`,
            short: true
          },
          {
            title: 'Event Type',
            value: alertData.event.type,
            short: true
          },
          {
            title: 'Time',
            value: new Date(alertData.timestamp).toLocaleString(),
            short: true
          }
        ]
      }]
    };

    if (alertData.event.command) {
      message.attachments[0].fields.push({
        title: 'Command',
        value: `\`\`\`${alertData.event.command}\`\`\``,
        short: false
      });
    }

    if (alertData.analysis.attack_phases.length > 0) {
      message.attachments[0].fields.push({
        title: 'Attack Phases',
        value: alertData.analysis.attack_phases.join(', '),
        short: false
      });
    }

    return axios.post(this.slackWebhook, message, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 5000
    });
  }

  async sendToDiscord(alertData) {
    const color = this.getSeverityColorHex(alertData.severity);
    const emoji = this.getSeverityEmoji(alertData.severity);
    
    const embed = {
      embeds: [{
        title: `${emoji} High Severity Attack Detected`,
        color: parseInt(color.replace('#', ''), 16),
        fields: [
          {
            name: 'Severity',
            value: alertData.severity,
            inline: true
          },
          {
            name: 'Anomaly Score',
            value: `${(alertData.anomaly_score * 100).toFixed(1)}%`,
            inline: true
          },
          {
            name: 'Attacker IP',
            value: alertData.attacker.ip,
            inline: true
          },
          {
            name: 'Location',
            value: `${alertData.attacker.city}, ${alertData.attacker.country}`,
            inline: true
          },
          {
            name: 'Event Type',
            value: alertData.event.type,
            inline: false
          }
        ],
        timestamp: alertData.timestamp,
        footer: {
          text: 'AI Honeynet Alert System'
        }
      }]
    };

    if (alertData.event.command) {
      embed.embeds[0].fields.push({
        name: 'Command Executed',
        value: `\`\`\`${alertData.event.command}\`\`\``,
        inline: false
      });
    }

    if (alertData.analysis.attack_phases.length > 0) {
      embed.embeds[0].fields.push({
        name: 'Attack Phases Detected',
        value: alertData.analysis.attack_phases.join(', '),
        inline: false
      });
    }

    return axios.post(this.discordWebhook, embed, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 5000
    });
  }

  async sendToCustomWebhook(alertData) {
    return axios.post(this.customWebhook, {
      type: 'honeynet_alert',
      data: alertData
    }, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 5000
    });
  }

  shouldAlert(severity) {
    const severityLevels = { 'LOW': 1, 'MEDIUM': 2, 'HIGH': 3, 'CRITICAL': 4 };
    return severityLevels[severity] >= severityLevels[this.minSeverity];
  }

  isThrottled(key) {
    const lastAlert = this.throttle.get(key);
    if (!lastAlert) return false;
    
    const elapsed = (Date.now() - lastAlert) / 1000;
    return elapsed < this.throttleWindow;
  }

  setThrottle(key) {
    this.throttle.set(key, Date.now());
    
    // Clean up old entries
    if (this.throttle.size > 1000) {
      const cutoff = Date.now() - (this.throttleWindow * 1000);
      for (const [k, v] of this.throttle.entries()) {
        if (v < cutoff) {
          this.throttle.delete(k);
        }
      }
    }
  }

  getSeverityColor(severity) {
    const colors = {
      'LOW': 'good',
      'MEDIUM': 'warning',
      'HIGH': 'danger',
      'CRITICAL': '#8B0000'
    };
    return colors[severity] || 'warning';
  }

  getSeverityColorHex(severity) {
    const colors = {
      'LOW': '#00FF00',
      'MEDIUM': '#FFA500',
      'HIGH': '#FF0000',
      'CRITICAL': '#8B0000'
    };
    return colors[severity] || '#FFA500';
  }

  getSeverityEmoji(severity) {
    const emojis = {
      'LOW': '🟢',
      'MEDIUM': '🟡',
      'HIGH': '🔴',
      'CRITICAL': '🚨'
    };
    return emojis[severity] || '⚠️';
  }
}

module.exports = new AlertService();
