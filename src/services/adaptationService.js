const fs = require('fs').promises;
const { exec } = require('child_process');
const util = require('util');
const logger = require('../utils/logger');
const db = require('../database/connection');
const { v4: uuidv4 } = require('uuid');

const execAsync = util.promisify(exec);

class AdaptationService {
  constructor() {
    this.configPath = process.env.COWRIE_CONFIG_PATH;
    this.honeyfilesPath = process.env.COWRIE_HONEYFILES_PATH;
    this.restartCommand = process.env.COWRIE_RESTART_COMMAND || 'sudo systemctl restart cowrie';
    this.cooldownPeriod = parseInt(process.env.ADAPTATION_COOLDOWN) || 300; // 5 minutes
    this.lastAdaptation = null;
    
    // Fallback banner templates (used only if DB query fails)
    this.fallbackBanners = [
      'SSH-2.0-OpenSSH_8.2p1 Ubuntu-4ubuntu0.1',
      'SSH-2.0-OpenSSH_7.4 Red Hat Enterprise Linux',
      'SSH-2.0-OpenSSH_7.9p1 Debian-10+deb10u2',
      'SSH-2.0-OpenSSH_8.0p1 FreeBSD-20190702',
      'SSH-2.0-OpenSSH_8.4p1 Raspbian-5+deb11u1',
      'SSH-2.0-OpenSSH_7.6p1 Ubuntu-4ubuntu0.5'
    ];
    
    // Banner cache (updated every 10 minutes)
    this.bannerCache = null;
    this.lastBannerUpdate = 0;
    this.bannerCacheDuration = 600000; // 10 minutes
  }

  async adapt(event, mlResult) {
    try {
      // Check cooldown
      if (this.isInCooldown()) {
        logger.info('Adaptation in cooldown period, skipping');
        return;
      }

      logger.logAdaptation('Starting adaptation', mlResult.severity, {
        event_id: event.id,
        source_ip: event.source_ip
      });

      const actions = [];

      // Determine adaptations based on severity and event type
      if (mlResult.severity === 'HIGH') {
        // Change SSH banner
        actions.push(await this.changeBanner());

        // Add/modify honeyfiles
        actions.push(await this.modifyHoneyfiles(event, mlResult));

        // Restart Cowrie to apply changes
        actions.push(await this.restartCowrie());
      }

      // Record adaptation
      await this.recordAdaptation(event, mlResult, actions);

      this.lastAdaptation = Date.now();

      logger.logAdaptation('Adaptation complete', mlResult.severity, {
        actions: actions.length
      });

    } catch (error) {
      logger.error('Adaptation failed:', error);
      throw error;
    }
  }

  isInCooldown() {
    if (!this.lastAdaptation) return false;
    const elapsed = (Date.now() - this.lastAdaptation) / 1000;
    return elapsed < this.cooldownPeriod;
  }

  /**
   * Get dynamic banner suggestions based on attacker behavior
   * Analyzes recent SSH client versions to mimic what attackers expect
   */
  async getDynamicBanners() {
    try {
      // Check cache first
      const now = Date.now();
      if (this.bannerCache && (now - this.lastBannerUpdate) < this.bannerCacheDuration) {
        return this.bannerCache;
      }

      // Query top SSH client versions from last 30 days
      const query = `
        SELECT 
          client_version,
          COUNT(*) as usage_count,
          COUNT(CASE WHEN successful_login = true THEN 1 END) as successful_attacks,
          AVG(event_count) as avg_events
        FROM sessions
        WHERE 
          client_version IS NOT NULL 
          AND client_version != ''
          AND start_time > NOW() - INTERVAL '30 days'
        GROUP BY client_version
        ORDER BY usage_count DESC, successful_attacks DESC
        LIMIT 10
      `;

      const result = await db.query(query);
      
      if (result.rows.length === 0) {
        logger.warn('No client versions found in DB, using fallback banners');
        this.bannerCache = this.fallbackBanners;
        this.lastBannerUpdate = now;
        return this.fallbackBanners;
      }

      // Generate banners based on attacker client patterns
      const dynamicBanners = this.generateBannersFromClients(result.rows);
      
      logger.info('Dynamic banners updated', { 
        count: dynamicBanners.length,
        topClient: result.rows[0].client_version,
        usageCount: result.rows[0].usage_count
      });

      this.bannerCache = dynamicBanners;
      this.lastBannerUpdate = now;
      
      return dynamicBanners;
    } catch (error) {
      logger.error('Failed to get dynamic banners:', error);
      return this.fallbackBanners;
    }
  }

  /**
   * Generate SSH banners that match attacker expectations
   * Based on their SSH client versions and targeting patterns
   */
  generateBannersFromClients(clientStats) {
    const banners = [];
    
    for (const stat of clientStats) {
      const client = stat.client_version.toLowerCase();
      
      // Analyze client version to determine what OS/version they expect
      if (client.includes('ubuntu')) {
        banners.push('SSH-2.0-OpenSSH_8.2p1 Ubuntu-4ubuntu0.5');
        banners.push('SSH-2.0-OpenSSH_7.6p1 Ubuntu-4ubuntu0.7');
      } else if (client.includes('debian')) {
        banners.push('SSH-2.0-OpenSSH_7.9p1 Debian-10+deb10u2');
        banners.push('SSH-2.0-OpenSSH_8.4p1 Debian-11+deb11u1');
      } else if (client.includes('putty')) {
        // PuTTY users often target Windows SSH servers
        banners.push('SSH-2.0-OpenSSH_for_Windows_8.1');
        banners.push('SSH-2.0-OpenSSH_7.7p1 Win32');
      } else if (client.includes('openssh')) {
        // Extract version if possible
        const versionMatch = client.match(/openssh[_\s]*([\d.]+)/i);
        if (versionMatch) {
          const version = versionMatch[1];
          banners.push(`SSH-2.0-OpenSSH_${version}p1 Ubuntu-4ubuntu0.1`);
        }
      } else if (client.includes('libssh')) {
        // Often automated tools, target older vulnerable versions
        banners.push('SSH-2.0-OpenSSH_7.4p1 Debian-10+deb9u7');
        banners.push('SSH-2.0-OpenSSH_6.7p1 Debian-5+deb8u8');
      }
      
      // Add Red Hat/CentOS for enterprise attackers
      if (stat.successful_attacks > 0) {
        banners.push('SSH-2.0-OpenSSH_7.4 Red Hat Enterprise Linux');
        banners.push('SSH-2.0-OpenSSH_8.0p1 CentOS Linux');
      }
    }

    // Remove duplicates and limit to 10
    const uniqueBanners = [...new Set(banners)];
    
    // If we generated less than 5, add fallbacks
    if (uniqueBanners.length < 5) {
      uniqueBanners.push(...this.fallbackBanners.slice(0, 5 - uniqueBanners.length));
    }

    return uniqueBanners.slice(0, 10);
  }

  async changeBanner() {
    try {
      if (!this.configPath) {
        throw new Error('COWRIE_CONFIG_PATH not configured');
      }

      // Read current config
      const configContent = await fs.readFile(this.configPath, 'utf8');
      
      // Extract current banner
      const bannerMatch = configContent.match(/ssh_version_string\s*=\s*(.+)/);
      const oldBanner = bannerMatch ? bannerMatch[1].trim() : 'Unknown';

      // Get dynamic banners based on attacker behavior
      const availableBanners = await this.getDynamicBanners();

      // Select a different banner (prefer ones attackers are targeting)
      let newBanner;
      do {
        newBanner = availableBanners[Math.floor(Math.random() * availableBanners.length)];
      } while (newBanner === oldBanner && availableBanners.length > 1);

      // Replace banner in config
      const newConfig = configContent.replace(
        /ssh_version_string\s*=\s*.+/,
        `ssh_version_string = ${newBanner}`
      );

      await fs.writeFile(this.configPath, newConfig, 'utf8');

      logger.info('Banner changed (DYNAMIC)', { 
        from: oldBanner, 
        to: newBanner,
        source: 'attacker_behavior_analysis'
      });

      return {
        type: 'BANNER_CHANGE',
        success: true,
        details: {
          old_banner: oldBanner,
          new_banner: newBanner,
          dynamic: true,
          available_banners: availableBanners.length
        }
      };
    } catch (error) {
      logger.error('Failed to change banner:', error);
      return {
        type: 'BANNER_CHANGE',
        success: false,
        error: error.message
      };
    }
  }

  async modifyHoneyfiles(event, mlResult) {
    try {
      if (!this.honeyfilesPath) {
        throw new Error('COWRIE_HONEYFILES_PATH not configured');
      }

      const modifications = [];

      // Add fake AWS credentials
      if (this.shouldAddFile('aws', event)) {
        await this.addFakeAWSCredentials();
        modifications.push('aws_credentials');
      }

      // Add fake database config
      if (this.shouldAddFile('database', event)) {
        await this.addFakeDatabaseConfig();
        modifications.push('database_config');
      }

      // Add fake SSH keys
      if (this.shouldAddFile('ssh_key', event)) {
        await this.addFakeSSHKey();
        modifications.push('ssh_key');
      }

      // Add fake backup script
      if (this.shouldAddFile('backup', event)) {
        await this.addFakeBackupScript();
        modifications.push('backup_script');
      }

      // Modify fake logs
      await this.updateFakeLogs(event);
      modifications.push('system_logs');

      logger.info('Honeyfiles modified', { modifications });

      return {
        type: 'HONEYFILE_MODIFICATION',
        success: true,
        details: {
          files_modified: modifications
        }
      };
    } catch (error) {
      logger.error('Failed to modify honeyfiles:', error);
      return {
        type: 'HONEYFILE_MODIFICATION',
        success: false,
        error: error.message
      };
    }
  }

  shouldAddFile(type, event) {
    // Random chance to add files, higher for certain commands
    const baseChance = 0.3;
    const commandBoost = event.command && event.command.match(/(ls|cat|find|grep)/) ? 0.3 : 0;
    return Math.random() < (baseChance + commandBoost);
  }

  async addFakeAWSCredentials() {
    const path = `${this.honeyfilesPath}/root/.aws`;
    await fs.mkdir(path, { recursive: true });

    const content = `[default]
aws_access_key_id = AKIA${this.randomString(16)}
aws_secret_access_key = ${this.randomString(40)}
region = us-east-1

[production]
aws_access_key_id = AKIA${this.randomString(16)}
aws_secret_access_key = ${this.randomString(40)}
region = us-west-2
`;

    await fs.writeFile(`${path}/credentials`, content, 'utf8');
  }

  async addFakeDatabaseConfig() {
    const content = `DB_HOST=prod-db-${this.randomString(6)}.internal
DB_PORT=5432
DB_NAME=production
DB_USER=admin
DB_PASSWORD=${this.randomPassword()}
REDIS_HOST=redis.internal
REDIS_PASSWORD=${this.randomPassword()}
`;

    await fs.writeFile(`${this.honeyfilesPath}/root/.env`, content, 'utf8');
  }

  async addFakeSSHKey() {
    const path = `${this.honeyfilesPath}/root/.ssh`;
    await fs.mkdir(path, { recursive: true });

    const content = `-----BEGIN RSA PRIVATE KEY-----
MIIEpAIBAAKCAQEA${this.randomString(64)}
${this.randomString(64)}
${this.randomString(64)}
[... fake key content ...]
-----END RSA PRIVATE KEY-----
`;

    await fs.writeFile(`${path}/id_rsa`, content, 'utf8');
  }

  async addFakeBackupScript() {
    const content = `#!/bin/bash
# Daily backup script
DB_HOST=prod-db.internal
DB_USER=backup_user
DB_PASS="${this.randomPassword()}"

mysqldump -h $DB_HOST -u $DB_USER -p$DB_PASS --all-databases > /backups/daily_\`date +%Y%m%d\`.sql
scp /backups/daily_*.sql backup@backup-server:/storage/
`;

    await fs.writeFile(`${this.honeyfilesPath}/root/backup.sh`, content, 'utf8');
  }

  async updateFakeLogs(event) {
    const logPath = `${this.honeyfilesPath}/var/log`;
    await fs.mkdir(logPath, { recursive: true });

    const timestamp = new Date().toISOString();
    const logEntry = `${timestamp} server01 sshd[${Math.floor(Math.random() * 10000)}]: Accepted password for admin from ${event.source_ip}\n`;

    await fs.appendFile(`${logPath}/auth.log`, logEntry, 'utf8');
  }

  async restartCowrie() {
    try {
      logger.info('Restarting Cowrie...');
      
      const { stdout, stderr } = await execAsync(this.restartCommand);
      
      if (stderr) {
        logger.warn('Cowrie restart stderr:', stderr);
      }

      // Wait for service to stabilize
      await this.sleep(2000);

      logger.info('Cowrie restarted successfully');

      return {
        type: 'SERVICE_RESTART',
        success: true,
        details: {
          stdout: stdout,
          stderr: stderr
        }
      };
    } catch (error) {
      logger.error('Failed to restart Cowrie:', error);
      return {
        type: 'SERVICE_RESTART',
        success: false,
        error: error.message
      };
    }
  }

  async recordAdaptation(event, mlResult, actions) {
    const successfulActions = actions.filter(a => a.success);
    const failedActions = actions.filter(a => !a.success);

    const query = `
      INSERT INTO adaptations (
        id, timestamp, trigger_event_id, trigger_ip,
        severity, action_type, action_details, success,
        error_message, automated
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `;

    for (const action of actions) {
      const values = [
        uuidv4(),
        new Date(),
        event.id,
        event.source_ip,
        mlResult.severity,
        action.type,
        JSON.stringify(action.details || {}),
        action.success,
        action.error || null,
        true
      ];

      await db.query(query, values);
    }

    logger.info('Adaptation recorded', {
      total: actions.length,
      successful: successfulActions.length,
      failed: failedActions.length
    });
  }

  randomString(length) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  randomPassword() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let result = '';
    for (let i = 0; i < 16; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = new AdaptationService();
