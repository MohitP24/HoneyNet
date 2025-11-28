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
    
    // OS/Banner variations
    this.bannerTemplates = [
      'SSH-2.0-OpenSSH_8.2p1 Ubuntu-4ubuntu0.1',
      'SSH-2.0-OpenSSH_7.4 Red Hat Enterprise Linux',
      'SSH-2.0-OpenSSH_7.9p1 Debian-10+deb10u2',
      'SSH-2.0-OpenSSH_8.0p1 FreeBSD-20190702',
      'SSH-2.0-OpenSSH_8.4p1 Raspbian-5+deb11u1',
      'SSH-2.0-OpenSSH_7.6p1 Ubuntu-4ubuntu0.5'
    ];
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

      // Select a different random banner
      let newBanner;
      do {
        newBanner = this.bannerTemplates[Math.floor(Math.random() * this.bannerTemplates.length)];
      } while (newBanner === oldBanner && this.bannerTemplates.length > 1);

      // Replace banner in config
      const newConfig = configContent.replace(
        /ssh_version_string\s*=\s*.+/,
        `ssh_version_string = ${newBanner}`
      );

      await fs.writeFile(this.configPath, newConfig, 'utf8');

      logger.info('Banner changed', { from: oldBanner, to: newBanner });

      return {
        type: 'BANNER_CHANGE',
        success: true,
        details: {
          old_banner: oldBanner,
          new_banner: newBanner
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
