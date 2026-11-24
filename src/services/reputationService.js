const axios = require('axios');
const logger = require('../utils/logger');
const db = require('../database/connection');

/**
 * IP Reputation Service
 * Checks IP addresses against threat intelligence databases
 * Supports: AbuseIPDB, AlienVault OTX (free tier)
 */

class ReputationService {
  constructor() {
    this.abuseIPDBKey = process.env.ABUSEIPDB_API_KEY;
    this.enabled = process.env.ENABLE_REPUTATION_CHECK === 'true' && this.abuseIPDBKey;
    this.cache = new Map(); // Cache results for 24 hours
    this.cacheTTL = 24 * 60 * 60 * 1000; // 24 hours in ms
    
    // Free tier limits (AbuseIPDB: 1000 requests/day - PERMANENT FREE)
    this.dailyLimit = 1000;
    this.requestCount = 0;
    this.lastResetDate = new Date().toDateString();
    
    if (!this.abuseIPDBKey && process.env.ENABLE_REPUTATION_CHECK === 'true') {
      logger.warn('Reputation check enabled but ABUSEIPDB_API_KEY not set. Reputation checking disabled.');
      logger.info('Get free API key (1000 requests/day forever): https://www.abuseipdb.com/register');
      this.enabled = false;
    }
  }

  async checkReputation(ipAddress) {
    if (!this.enabled) {
      logger.debug('IP reputation checking disabled');
      return null;
    }

    try {
      // Check cache first
      const cached = this.getFromCache(ipAddress);
      if (cached) {
        logger.debug(`Reputation cache hit for ${ipAddress}`);
        return cached;
      }

      // Reset daily counter if new day
      this.resetDailyCountIfNeeded();

      // Check daily limit (SAFETY: prevents exceeding free tier)
      if (this.requestCount >= this.dailyLimit) {
        logger.warn(`AbuseIPDB daily limit reached (${this.dailyLimit}/${this.dailyLimit}). Skipping reputation check.`);
        logger.info('Free tier limit: 1000 requests/day. Resets at midnight UTC. No charges incurred.');
        return null;
      }

      // Check AbuseIPDB if API key is available (FREE: 1000/day forever)
      let reputationData = null;
      if (this.abuseIPDBKey) {
        reputationData = await this.checkAbuseIPDB(ipAddress);
      } else {
        // Fallback to basic checks without API key
        reputationData = await this.basicReputationCheck(ipAddress);
      }

      // Cache the result
      if (reputationData) {
        this.setCache(ipAddress, reputationData);
      }

      return reputationData;
    } catch (error) {
      logger.error(`Reputation check failed for ${ipAddress}:`, error.message);
      return null;
    }
  }

  async checkAbuseIPDB(ipAddress) {
    try {
      this.requestCount++;
      logger.debug(`AbuseIPDB request ${this.requestCount}/${this.dailyLimit} (FREE tier - no cost)`);

      const response = await axios.get('https://api.abuseipdb.com/api/v2/check', {
        params: {
          ipAddress: ipAddress,
          maxAgeInDays: 90,
          verbose: true
        },
        headers: {
          'Key': this.abuseIPDBKey,
          'Accept': 'application/json'
        },
        timeout: 5000
      });

      const data = response.data.data;

      const reputationData = {
        ip_address: ipAddress,
        reputation_score: data.abuseConfidenceScore || 0,
        is_known_threat: data.abuseConfidenceScore >= 50,
        threat_categories: this.mapAbuseCategories(data.reports || []),
        total_reports: data.totalReports || 0,
        last_reported: data.lastReportedAt || null,
        is_whitelisted: data.isWhitelisted || false,
        usage_type: data.usageType || null,
        isp: data.isp || null,
        domain: data.domain || null,
        country_code: data.countryCode || null,
        source: 'AbuseIPDB'
      };

      logger.info(`AbuseIPDB reputation check for ${ipAddress}`, {
        score: reputationData.reputation_score,
        is_threat: reputationData.is_known_threat
      });

      return reputationData;
    } catch (error) {
      if (error.response?.status === 429) {
        logger.warn('AbuseIPDB rate limit exceeded');
      } else if (error.response?.status === 401) {
        logger.error('AbuseIPDB API key invalid');
      } else {
        logger.error('AbuseIPDB API error:', error.message);
      }
      return null;
    }
  }

  async basicReputationCheck(ipAddress) {
    // Basic heuristics without API key
    const reputationData = {
      ip_address: ipAddress,
      reputation_score: 0,
      is_known_threat: false,
      threat_categories: [],
      source: 'basic_heuristics'
    };

    // Check if it's a known bad range (example heuristics)
    // This is very basic - real implementation would use local threat feeds
    if (this.isKnownBadRange(ipAddress)) {
      reputationData.reputation_score = 75;
      reputationData.is_known_threat = true;
      reputationData.threat_categories = ['suspicious_range'];
    }

    return reputationData;
  }

  isKnownBadRange(ipAddress) {
    // Example: Check against known bad IP ranges
    // In production, load from a local threat feed
    const knownBadRanges = [
      // Add known malicious IP ranges here
    ];
    
    // Simple check (extend with CIDR matching in production)
    return knownBadRanges.some(range => ipAddress.startsWith(range));
  }

  mapAbuseCategories(reports) {
    const categoryMap = {
      3: 'fraud',
      4: 'ddos',
      5: 'hacking',
      6: 'spam',
      9: 'web_attack',
      10: 'exploit',
      11: 'botnet',
      14: 'port_scan',
      15: 'brute_force',
      18: 'ssh_attack',
      19: 'iot_attack',
      20: 'database_attack',
      21: 'malware',
      22: 'backdoor'
    };

    const categories = new Set();
    reports.forEach(report => {
      report.categories?.forEach(catId => {
        const category = categoryMap[catId];
        if (category) categories.add(category);
      });
    });

    return Array.from(categories);
  }

  async updateAttackerReputation(ipAddress) {
    try {
      const reputationData = await this.checkReputation(ipAddress);
      
      if (!reputationData) {
        return false;
      }

      // Update attacker record in database
      const query = `
        UPDATE attackers
        SET 
          reputation_score = $2,
          is_known_threat = $3,
          threat_categories = $4,
          last_reputation_check = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
        WHERE ip_address = $1
      `;

      const values = [
        ipAddress,
        reputationData.reputation_score,
        reputationData.is_known_threat,
        reputationData.threat_categories
      ];

      await db.query(query, values);

      logger.info(`Updated reputation for ${ipAddress}`, {
        score: reputationData.reputation_score,
        is_threat: reputationData.is_known_threat
      });

      return reputationData;
    } catch (error) {
      logger.error(`Failed to update reputation for ${ipAddress}:`, error);
      return null;
    }
  }

  getFromCache(ipAddress) {
    const cached = this.cache.get(ipAddress);
    if (!cached) return null;

    const age = Date.now() - cached.timestamp;
    if (age > this.cacheTTL) {
      this.cache.delete(ipAddress);
      return null;
    }

    return cached.data;
  }

  setCache(ipAddress, data) {
    this.cache.set(ipAddress, {
      data: data,
      timestamp: Date.now()
    });

    // Clean old cache entries periodically
    if (this.cache.size > 10000) {
      this.cleanCache();
    }
  }

  cleanCache() {
    const now = Date.now();
    for (const [ip, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.cacheTTL) {
        this.cache.delete(ip);
      }
    }
  }

  resetDailyCountIfNeeded() {
    const today = new Date().toDateString();
    if (today !== this.lastResetDate) {
      this.requestCount = 0;
      this.lastResetDate = today;
      logger.info('IP reputation daily counter reset');
    }
  }

  getCacheStats() {
    return {
      cache_size: this.cache.size,
      daily_requests: this.requestCount,
      daily_limit: this.dailyLimit,
      requests_remaining: this.dailyLimit - this.requestCount
    };
  }
}

module.exports = new ReputationService();
