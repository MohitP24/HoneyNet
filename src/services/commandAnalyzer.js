const logger = require('../utils/logger');

/**
 * Command Pattern Analyzer
 * Classifies attacker commands into attack phases and techniques
 * Based on MITRE ATT&CK framework patterns
 */

class CommandAnalyzer {
  constructor() {
    // Attack phase patterns based on MITRE ATT&CK
    this.patterns = {
      RECONNAISSANCE: {
        commands: [
          /whoami/, /id\b/, /uname/, /hostname/, /pwd/, /ls/, /dir/, 
          /ps/, /netstat/, /ifconfig/, /ip\s+addr/, /arp/, /route/,
          /cat\s+\/proc/, /cat\s+\/etc\/passwd/, /cat\s+\/etc\/shadow/,
          /w\b/, /who/, /last/, /lastlog/, /uptime/
        ],
        description: 'System reconnaissance and information gathering'
      },
      
      CREDENTIAL_ACCESS: {
        commands: [
          /cat\s+.*passwd/, /cat\s+.*shadow/, /cat\s+.*\.ssh/, 
          /grep.*password/, /find.*password/, /\.aws\/credentials/,
          /\.bash_history/, /\.mysql_history/, /\.env/,
          /sudo\s+-l/, /ssh.*key/, /id_rsa/, /authorized_keys/
        ],
        description: 'Attempting to steal credentials or keys'
      },
      
      PERSISTENCE: {
        commands: [
          /crontab/, /systemctl/, /service\s+/, /rc\.local/, /\.bashrc/,
          /\.profile/, /autostart/, /init\.d/, /systemd/,
          /ssh.*authorized_keys/, /adduser/, /useradd/
        ],
        description: 'Establishing persistence mechanisms'
      },
      
      PRIVILEGE_ESCALATION: {
        commands: [
          /sudo/, /su\s+/, /chmod.*777/, /chmod.*\+s/,
          /find.*perm/, /getcap/, /setcap/,
          /\/etc\/sudoers/, /pkexec/, /polkit/
        ],
        description: 'Attempting privilege escalation'
      },
      
      DEFENSE_EVASION: {
        commands: [
          /rm\s+.*history/, /history\s+-c/, /unset\s+HISTFILE/,
          /kill.*rsyslog/, /systemctl.*disable/, /iptables.*DROP/,
          /pkill/, /killall/, /base64/, /echo.*\|.*sh/
        ],
        description: 'Hiding tracks and evading detection'
      },
      
      DISCOVERY: {
        commands: [
          /find/, /locate/, /which/, /whereis/,
          /cat\s+\/proc/, /lsof/, /ss\b/, /nmap/, /nc\s+/, /telnet/,
          /curl.*metadata/, /wget.*metadata/, /aws\s+/, /docker\s+ps/
        ],
        description: 'Exploring system and network'
      },
      
      LATERAL_MOVEMENT: {
        commands: [
          /ssh\s+/, /scp\s+/, /rsync/, /nc\s+-l/, /socat/,
          /\.ssh\/config/, /ssh-keygen/, /ssh-copy-id/
        ],
        description: 'Attempting to move to other systems'
      },
      
      COLLECTION: {
        commands: [
          /tar\s+/, /zip/, /gzip/, /7z/, /rar/,
          /cp\s+.*\/tmp/, /mv\s+.*\/tmp/, /dd\s+if=/,
          /find.*-name.*\./, /grep.*-r/, /cat.*\.sql/,
          /mysqldump/, /pg_dump/, /mongodump/
        ],
        description: 'Collecting data for exfiltration'
      },
      
      EXFILTRATION: {
        commands: [
          /curl.*-X\s+POST/, /wget.*--post/, /nc.*>/, /scp.*@/,
          /ftp/, /tftp/, /rsync.*@/, /base64/, /xxd/,
          /curl.*pastebin/, /curl.*discord/, /curl.*telegram/
        ],
        description: 'Exfiltrating data from system'
      },
      
      EXPLOITATION: {
        commands: [
          /wget.*\.sh/, /curl.*\.sh.*\|.*sh/, /bash\s+-i/,
          /python.*-c/, /perl.*-e/, /ruby.*-e/, /php.*-r/,
          /nc.*-e/, /\/bin\/sh/, /\/bin\/bash/, /mknod/,
          /busybox/, /\/dev\/tcp/
        ],
        description: 'Downloading or executing exploits'
      },
      
      MALWARE_DEPLOYMENT: {
        commands: [
          /chmod.*\+x/, /\.\/[a-z0-9]+$/, /nohup/, /&\s*$/,
          /screen\s+-dm/, /tmux/, /disown/,
          /miner/, /cryptonight/, /xmrig/, /\.\/xmr/
        ],
        description: 'Installing or running malware'
      }
    };
    
    // High-risk command indicators
    this.dangerousPatterns = [
      /rm\s+-rf\s+\//, /:\(\)\{\s*:\|:&\s*\};:/, // fork bomb
      /dd\s+if=\/dev\/zero/, /mkfs/, /fdisk/,
      /iptables.*FLUSH/, /init\s+0/, /shutdown/, /reboot/,
      /curl.*\|.*sh/, /wget.*\|.*sh/
    ];
  }

  /**
   * Analyze a single command
   * @param {string} command - The command to analyze
   * @returns {object} Analysis result
   */
  analyzeCommand(command) {
    if (!command || typeof command !== 'string') {
      return {
        attack_phases: [],
        techniques: [],
        risk_score: 0,
        is_dangerous: false
      };
    }

    const lowerCommand = command.toLowerCase().trim();
    const detectedPhases = [];
    const techniques = [];
    let riskScore = 0;

    // Check against each attack phase
    for (const [phase, data] of Object.entries(this.patterns)) {
      for (const pattern of data.commands) {
        if (pattern.test(lowerCommand)) {
          if (!detectedPhases.includes(phase)) {
            detectedPhases.push(phase);
            techniques.push({
              phase: phase,
              description: data.description,
              matched_pattern: pattern.toString()
            });
          }
          riskScore += 10; // Each match adds to risk
          break; // Only count each phase once per command
        }
      }
    }

    // Check for dangerous patterns
    const isDangerous = this.dangerousPatterns.some(pattern => pattern.test(lowerCommand));
    if (isDangerous) {
      riskScore += 50; // Dangerous commands get high risk boost
    }

    // Calculate final risk score (0-100)
    riskScore = Math.min(riskScore, 100);

    return {
      command: command,
      attack_phases: detectedPhases,
      techniques: techniques,
      risk_score: riskScore,
      is_dangerous: isDangerous,
      severity: this.calculateSeverity(riskScore, detectedPhases.length)
    };
  }

  /**
   * Analyze a sequence of commands (session-level analysis)
   * @param {array} commands - Array of command strings
   * @returns {object} Session analysis
   */
  analyzeSession(commands) {
    if (!Array.isArray(commands) || commands.length === 0) {
      return {
        total_commands: 0,
        unique_phases: [],
        average_risk: 0,
        attack_sophistication: 'LOW',
        kill_chain_progress: []
      };
    }

    const commandAnalyses = commands.map(cmd => this.analyzeCommand(cmd));
    const allPhases = new Set();
    let totalRisk = 0;

    commandAnalyses.forEach(analysis => {
      analysis.attack_phases.forEach(phase => allPhases.add(phase));
      totalRisk += analysis.risk_score;
    });

    const averageRisk = totalRisk / commands.length;
    const killChain = this.buildKillChain(Array.from(allPhases));
    const sophistication = this.calculateSophistication(allPhases.size, averageRisk);

    return {
      total_commands: commands.length,
      unique_phases: Array.from(allPhases),
      average_risk: Math.round(averageRisk),
      attack_sophistication: sophistication,
      kill_chain_progress: killChain,
      analyses: commandAnalyses,
      threat_level: this.calculateThreatLevel(averageRisk, allPhases.size)
    };
  }

  calculateSeverity(riskScore, phaseCount) {
    if (riskScore >= 70 || phaseCount >= 4) return 'HIGH';
    if (riskScore >= 40 || phaseCount >= 2) return 'MEDIUM';
    return 'LOW';
  }

  calculateSophistication(uniquePhases, averageRisk) {
    if (uniquePhases >= 5 && averageRisk >= 50) return 'ADVANCED';
    if (uniquePhases >= 3 && averageRisk >= 30) return 'INTERMEDIATE';
    return 'BASIC';
  }

  calculateThreatLevel(averageRisk, phaseCount) {
    const score = (averageRisk * 0.7) + (phaseCount * 5);
    
    if (score >= 70) return 'CRITICAL';
    if (score >= 50) return 'HIGH';
    if (score >= 30) return 'MEDIUM';
    return 'LOW';
  }

  buildKillChain(phases) {
    const killChainOrder = [
      'RECONNAISSANCE',
      'CREDENTIAL_ACCESS',
      'PRIVILEGE_ESCALATION',
      'PERSISTENCE',
      'DEFENSE_EVASION',
      'DISCOVERY',
      'LATERAL_MOVEMENT',
      'COLLECTION',
      'EXFILTRATION',
      'EXPLOITATION',
      'MALWARE_DEPLOYMENT'
    ];

    return killChainOrder.filter(phase => phases.includes(phase));
  }

  /**
   * Get statistics about command patterns
   * @param {array} commands - Array of commands
   * @returns {object} Statistics
   */
  getStatistics(commands) {
    const analyses = commands.map(cmd => this.analyzeCommand(cmd));
    const phaseDistribution = {};
    
    analyses.forEach(analysis => {
      analysis.attack_phases.forEach(phase => {
        phaseDistribution[phase] = (phaseDistribution[phase] || 0) + 1;
      });
    });

    return {
      total_analyzed: commands.length,
      dangerous_commands: analyses.filter(a => a.is_dangerous).length,
      high_risk_commands: analyses.filter(a => a.risk_score >= 70).length,
      phase_distribution: phaseDistribution,
      average_risk_score: analyses.reduce((sum, a) => sum + a.risk_score, 0) / analyses.length
    };
  }
}

module.exports = new CommandAnalyzer();
