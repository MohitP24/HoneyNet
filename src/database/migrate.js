const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const db = require('./connection');
const logger = require('../utils/logger');
const fs = require('fs');

async function runMigration() {
  try {
    logger.info('Starting database migration...');

    // Connect to database
    await db.connect();

    // Execute schema and feature migrations in order
    const migrationFiles = [
      'schema.sql',
      'migration_honeynet.sql',
      'migration_enhanced_features.sql'
    ];

    for (const file of migrationFiles) {
      const filePath = path.join(__dirname, file);
      if (fs.existsSync(filePath)) {
        logger.info(`Applying migration: ${file}...`);
        const sql = fs.readFileSync(filePath, 'utf8');
        await db.query(sql);
      }
    }

    logger.info('Database migration completed successfully');
    
    // Verify tables
    const result = await db.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);

    logger.info('Created tables:', result.rows.map(r => r.table_name));

    await db.close();
    process.exit(0);
  } catch (error) {
    logger.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
