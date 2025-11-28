const db = require('./connection');
const logger = require('../utils/logger');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  try {
    logger.info('Starting database migration...');

    // Read schema file
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');

    // Connect to database
    await db.connect();

    // Execute schema
    await db.query(schemaSql);

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
