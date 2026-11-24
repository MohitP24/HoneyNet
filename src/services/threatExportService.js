const db = require('../database/connection');
const logger = require('../utils/logger');

/**
 * Threat Intelligence Export Service
 * Exports IOCs in STIX 2.1 and MISP formats
 * Industry-standard threat sharing
 */

class ThreatExportService {
  constructor() {
    this.organizationName = process.env.ORGANIZATION_NAME || 'Adaptive Honeynet';
    this.organizationId = process.env.ORGANIZATION_ID || 'honeynet';
  }

  /**
   * Export threat intelligence in STIX 2.1 format
   */
  async exportSTIX(options = {}) {
    try {
      const {
        hours = 24,
        minSeverity = 'MEDIUM',
        includeCommands = true,
        includeIPs = true,
        includeFiles = true
      } = options;

      const bundle = {
        type: 'bundle',
        id: `bundle--${this.generateUUID()}`,
        spec_version: '2.1',
        objects: []
      };

      // Add identity object
      const identity = {
        type: 'identity',
        id: `identity--${this.generateUUID()}`,
        created: new Date().toISOString(),
        modified: new Date().toISOString(),
        name: this.organizationName,
        identity_class: 'organization'
      };
      bundle.objects.push(identity);

      // Get threat data
      const timeThreshold = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

      // Export malicious IPs as indicators
      if (includeIPs) {
        const ips = await this.getMaliciousIPs(timeThreshold, minSeverity);
        for (const ip of ips) {
          const indicator = this.createIPIndicator(ip, identity.id);
          const observedData = this.createIPObservation(ip, identity.id);
          bundle.objects.push(indicator, observedData);
        }
      }

      // Export attack patterns
      if (includeCommands) {
        const patterns = await this.getAttackPatterns(timeThreshold);
        for (const pattern of patterns) {
          const attackPattern = this.createAttackPattern(pattern, identity.id);
          bundle.objects.push(attackPattern);
        }
      }

      // Export malware samples
      if (includeFiles) {
        const malware = await this.getMalwareSamples(timeThreshold);
        for (const sample of malware) {
          const malwareObject = this.createMalwareObject(sample, identity.id);
          const fileIndicator = this.createFileIndicator(sample, identity.id);
          bundle.objects.push(malwareObject, fileIndicator);
        }
      }

      // Add threat actor objects for coordinated campaigns
      const campaigns = await this.getActiveCampaigns();
      for (const campaign of campaigns) {
        const threatActor = this.createThreatActor(campaign, identity.id);
        bundle.objects.push(threatActor);
      }

      logger.info(`STIX export created with ${bundle.objects.length} objects`);
      return bundle;
    } catch (error) {
      logger.error('STIX export failed:', error);
      throw error;
    }
  }

  /**
   * Export threat intelligence in MISP format
   */
  async exportMISP(options = {}) {
    try {
      const {
        hours = 24,
        minSeverity = 'MEDIUM'
      } = options;

      const event = {
        Event: {
          uuid: this.generateUUID(),
          info: `Honeynet Intelligence Feed - ${new Date().toISOString()}`,
          date: new Date().toISOString().split('T')[0],
          threat_level_id: this.getSeverityLevel(minSeverity),
          analysis: 2, // Completed
          distribution: 3, // All communities
          published: true,
          Org: {
            name: this.organizationName,
            uuid: this.generateUUID()
          },
          Attribute: []
        }
      };

      const timeThreshold = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

      // Add malicious IPs
      const ips = await this.getMaliciousIPs(timeThreshold, minSeverity);
      for (const ip of ips) {
        event.Event.Attribute.push({
          uuid: this.generateUUID(),
          type: 'ip-src',
          category: 'Network activity',
          value: ip.ip_address,
          to_ids: true,
          comment: `Threat level: ${ip.threat_level}, Events: ${ip.total_events}`,
          timestamp: new Date(ip.last_seen).getTime() / 1000,
          distribution: 5 // Inherit from event
        });

        // Add geolocation if available
        if (ip.country_code) {
          event.Event.Attribute.push({
            uuid: this.generateUUID(),
            type: 'text',
            category: 'Other',
            value: `${ip.country_code}`,
            comment: `GeoIP for ${ip.ip_address}`,
            timestamp: new Date(ip.last_seen).getTime() / 1000,
            distribution: 5
          });
        }
      }

      // Add attack patterns (commands)
      const commands = await this.getMaliciousCommands(timeThreshold);
      for (const cmd of commands) {
        event.Event.Attribute.push({
          uuid: this.generateUUID(),
          type: 'pattern-in-file',
          category: 'Artifacts dropped',
          value: cmd.command,
          to_ids: true,
          comment: `Attack phase: ${cmd.attack_phase || 'Unknown'}, Severity: ${cmd.severity}`,
          timestamp: new Date(cmd.timestamp).getTime() / 1000,
          distribution: 5
        });
      }

      // Add malware hashes
      const malware = await this.getMalwareSamples(timeThreshold);
      for (const sample of malware) {
        // SHA256
        event.Event.Attribute.push({
          uuid: this.generateUUID(),
          type: 'sha256',
          category: 'Payload delivery',
          value: sample.sha256,
          to_ids: true,
          comment: `File: ${sample.file_name}, Type: ${sample.file_type}`,
          timestamp: new Date(sample.analyzed_at).getTime() / 1000,
          distribution: 5
        });

        // MD5
        event.Event.Attribute.push({
          uuid: this.generateUUID(),
          type: 'md5',
          category: 'Payload delivery',
          value: sample.md5,
          to_ids: true,
          comment: `File: ${sample.file_name}`,
          timestamp: new Date(sample.analyzed_at).getTime() / 1000,
          distribution: 5
        });

        // Filename
        event.Event.Attribute.push({
          uuid: this.generateUUID(),
          type: 'filename',
          category: 'Payload delivery',
          value: sample.file_name,
          to_ids: false,
          comment: `SHA256: ${sample.sha256}`,
          timestamp: new Date(sample.analyzed_at).getTime() / 1000,
          distribution: 5
        });
      }

      logger.info(`MISP export created with ${event.Event.Attribute.length} attributes`);
      return event;
    } catch (error) {
      logger.error('MISP export failed:', error);
      throw error;
    }
  }

  // ===== STIX Helper Methods =====

  createIPIndicator(ip, createdBy) {
    return {
      type: 'indicator',
      id: `indicator--${this.generateUUID()}`,
      created: new Date(ip.first_seen).toISOString(),
      modified: new Date(ip.last_seen).toISOString(),
      created_by_ref: createdBy,
      name: `Malicious IP: ${ip.ip_address}`,
      description: `IP address observed conducting ${ip.total_events} malicious events. Threat level: ${ip.threat_level}`,
      pattern: `[ipv4-addr:value = '${ip.ip_address}']`,
      pattern_type: 'stix',
      valid_from: new Date(ip.first_seen).toISOString(),
      indicator_types: ['malicious-activity', 'anomalous-activity'],
      kill_chain_phases: [{
        kill_chain_name: 'lockheed-martin-cyber-kill-chain',
        phase_name: 'reconnaissance'
      }],
      confidence: this.calculateConfidence(ip.threat_level)
    };
  }

  createIPObservation(ip, createdBy) {
    return {
      type: 'observed-data',
      id: `observed-data--${this.generateUUID()}`,
      created: new Date(ip.first_seen).toISOString(),
      modified: new Date(ip.last_seen).toISOString(),
      created_by_ref: createdBy,
      first_observed: new Date(ip.first_seen).toISOString(),
      last_observed: new Date(ip.last_seen).toISOString(),
      number_observed: ip.total_events,
      objects: {
        '0': {
          type: 'ipv4-addr',
          value: ip.ip_address
        }
      }
    };
  }

  createAttackPattern(pattern, createdBy) {
    return {
      type: 'attack-pattern',
      id: `attack-pattern--${this.generateUUID()}`,
      created: new Date().toISOString(),
      modified: new Date().toISOString(),
      created_by_ref: createdBy,
      name: pattern.attack_phase || 'Unknown Attack Pattern',
      description: `Command pattern: ${pattern.command}`,
      kill_chain_phases: [{
        kill_chain_name: 'mitre-attack',
        phase_name: this.mapToMITRE(pattern.attack_phase)
      }]
    };
  }

  createMalwareObject(sample, createdBy) {
    return {
      type: 'malware',
      id: `malware--${this.generateUUID()}`,
      created: new Date(sample.analyzed_at).toISOString(),
      modified: new Date(sample.analyzed_at).toISOString(),
      created_by_ref: createdBy,
      name: sample.file_name,
      description: `Malware sample detected in honeynet. File type: ${sample.file_type}`,
      is_family: false,
      malware_types: ['remote-access-trojan']
    };
  }

  createFileIndicator(sample, createdBy) {
    return {
      type: 'indicator',
      id: `indicator--${this.generateUUID()}`,
      created: new Date(sample.analyzed_at).toISOString(),
      modified: new Date(sample.analyzed_at).toISOString(),
      created_by_ref: createdBy,
      name: `Malicious File: ${sample.file_name}`,
      description: `SHA256: ${sample.sha256}`,
      pattern: `[file:hashes.SHA256 = '${sample.sha256}']`,
      pattern_type: 'stix',
      valid_from: new Date(sample.analyzed_at).toISOString(),
      indicator_types: ['malicious-activity'],
      confidence: sample.is_malicious ? 85 : 50
    };
  }

  createThreatActor(campaign, createdBy) {
    return {
      type: 'threat-actor',
      id: `threat-actor--${this.generateUUID()}`,
      created: new Date(campaign.first_seen).toISOString(),
      modified: new Date(campaign.last_seen).toISOString(),
      created_by_ref: createdBy,
      name: `Campaign: ${campaign.campaign_type}`,
      description: `Coordinated attack involving ${campaign.ip_count} IP addresses. Indicator: ${campaign.indicator}`,
      threat_actor_types: ['hacker'],
      sophistication: 'intermediate',
      resource_level: 'individual',
      primary_motivation: 'organizational-gain'
    };
  }

  // ===== Database Query Methods =====

  async getMaliciousIPs(since, minSeverity) {
    const severityMap = { HIGH: 3, MEDIUM: 2, LOW: 1 };
    const minLevel = severityMap[minSeverity] || 2;

    const query = `
      SELECT 
        ip_address, 
        threat_level, 
        total_events, 
        first_seen, 
        last_seen,
        country_code,
        reputation_score
      FROM attackers
      WHERE last_seen > $1
        AND (
          (threat_level = 'HIGH' AND $2 <= 3)
          OR (threat_level = 'MEDIUM' AND $2 <= 2)
          OR (threat_level = 'LOW' AND $2 <= 1)
        )
      ORDER BY last_seen DESC
      LIMIT 1000
    `;

    const result = await db.query(query, [since, minLevel]);
    return result.rows;
  }

  async getAttackPatterns(since) {
    const query = `
      SELECT DISTINCT
        command,
        ml_labels->>'attack_phase' as attack_phase,
        severity,
        timestamp
      FROM events
      WHERE timestamp > $1
        AND severity IN ('HIGH', 'MEDIUM')
        AND ml_labels IS NOT NULL
      LIMIT 500
    `;

    const result = await db.query(query, [since]);
    return result.rows;
  }

  async getMaliciousCommands(since) {
    const query = `
      SELECT 
        command,
        ml_labels->>'attack_phase' as attack_phase,
        severity,
        timestamp
      FROM events
      WHERE timestamp > $1
        AND command IS NOT NULL
        AND severity IN ('HIGH', 'MEDIUM')
      ORDER BY timestamp DESC
      LIMIT 200
    `;

    const result = await db.query(query, [since]);
    return result.rows;
  }

  async getMalwareSamples(since) {
    const query = `
      SELECT 
        file_name,
        sha256,
        md5,
        sha1,
        file_type,
        is_malicious,
        analyzed_at
      FROM malware_analysis
      WHERE analyzed_at > $1
      ORDER BY analyzed_at DESC
      LIMIT 100
    `;

    const result = await db.query(query, [since]);
    return result.rows;
  }

  async getActiveCampaigns() {
    const query = `
      SELECT 
        campaign_type,
        indicator,
        ip_count,
        first_seen,
        last_seen,
        confidence
      FROM attack_campaigns
      WHERE is_active = TRUE
        AND confidence > 50
      ORDER BY last_seen DESC
      LIMIT 50
    `;

    const result = await db.query(query);
    return result.rows;
  }

  // ===== Utility Methods =====

  generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  calculateConfidence(threatLevel) {
    const map = { HIGH: 85, MEDIUM: 65, LOW: 45 };
    return map[threatLevel] || 50;
  }

  getSeverityLevel(severity) {
    const map = { HIGH: 1, MEDIUM: 2, LOW: 3 };
    return map[severity] || 2;
  }

  mapToMITRE(attackPhase) {
    const mapping = {
      RECONNAISSANCE: 'reconnaissance',
      CREDENTIAL_ACCESS: 'credential-access',
      PERSISTENCE: 'persistence',
      PRIVILEGE_ESCALATION: 'privilege-escalation',
      DEFENSE_EVASION: 'defense-evasion',
      DISCOVERY: 'discovery',
      LATERAL_MOVEMENT: 'lateral-movement',
      COLLECTION: 'collection',
      EXFILTRATION: 'exfiltration',
      EXPLOITATION: 'exploitation',
      MALWARE_DEPLOYMENT: 'execution'
    };

    return mapping[attackPhase] || 'execution';
  }
}

module.exports = new ThreatExportService();
