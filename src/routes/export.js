const express = require('express');
const router = express.Router();
const threatExportService = require('../services/threatExportService');
const logger = require('../utils/logger');

/**
 * GET /api/export/stix
 * Export threat intelligence in STIX 2.1 format
 */
router.get('/stix', async (req, res) => {
  try {
    const options = {
      hours: parseInt(req.query.hours) || 24,
      minSeverity: req.query.severity || 'MEDIUM',
      includeCommands: req.query.commands !== 'false',
      includeIPs: req.query.ips !== 'false',
      includeFiles: req.query.files !== 'false'
    };

    const stixBundle = await threatExportService.exportSTIX(options);

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="honeynet-stix-${Date.now()}.json"`);
    res.json(stixBundle);

    logger.info('STIX export downloaded', { options });
  } catch (error) {
    logger.error('STIX export failed:', error);
    res.status(500).json({ error: 'Failed to export STIX bundle' });
  }
});

/**
 * GET /api/export/misp
 * Export threat intelligence in MISP format
 */
router.get('/misp', async (req, res) => {
  try {
    const options = {
      hours: parseInt(req.query.hours) || 24,
      minSeverity: req.query.severity || 'MEDIUM'
    };

    const mispEvent = await threatExportService.exportMISP(options);

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="honeynet-misp-${Date.now()}.json"`);
    res.json(mispEvent);

    logger.info('MISP export downloaded', { options });
  } catch (error) {
    logger.error('MISP export failed:', error);
    res.status(500).json({ error: 'Failed to export MISP event' });
  }
});

/**
 * GET /api/export/csv
 * Export IOCs in simple CSV format
 */
router.get('/csv', async (req, res) => {
  try {
    const hours = parseInt(req.query.hours) || 24;
    const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

    // Get malicious IPs
    const ips = await threatExportService.getMaliciousIPs(since, 'LOW');

    // Create CSV
    let csv = 'IP Address,Threat Level,Total Events,First Seen,Last Seen,Country,Reputation Score\n';
    for (const ip of ips) {
      csv += `"${ip.ip_address}","${ip.threat_level}",${ip.total_events},"${ip.first_seen}","${ip.last_seen}","${ip.country_code || 'Unknown'}",${ip.reputation_score || 0}\n`;
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="honeynet-iocs-${Date.now()}.csv"`);
    res.send(csv);

    logger.info('CSV export downloaded');
  } catch (error) {
    logger.error('CSV export failed:', error);
    res.status(500).json({ error: 'Failed to export CSV' });
  }
});

/**
 * GET /api/export/info
 * Get information about available exports
 */
router.get('/info', (req, res) => {
  res.json({
    formats: ['stix', 'misp', 'csv'],
    description: {
      stix: 'STIX 2.1 format - Industry standard for sharing cyber threat intelligence',
      misp: 'MISP format - Malware Information Sharing Platform event format',
      csv: 'CSV format - Simple comma-separated values for spreadsheets'
    },
    parameters: {
      hours: 'Number of hours to include (default: 24)',
      severity: 'Minimum severity level: HIGH, MEDIUM, LOW (default: MEDIUM)',
      ips: 'Include malicious IPs (default: true)',
      commands: 'Include attack commands (STIX only, default: true)',
      files: 'Include malware samples (STIX only, default: true)'
    },
    examples: [
      '/api/export/stix?hours=48&severity=HIGH',
      '/api/export/misp?hours=24&severity=MEDIUM',
      '/api/export/csv?hours=168'
    ]
  });
});

module.exports = router;
