const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'honeynet',
  user: 'honeynet',
  password: 'honeynet123',
});

async function checkEvents() {
  try {
    console.log('Connecting to database...');
    
    // Get total count
    const countResult = await pool.query('SELECT COUNT(*) as total FROM events');
    console.log(`\nTotal events in database: ${countResult.rows[0].total}`);
    
    // Get latest 10 events
    const eventsResult = await pool.query(`
      SELECT event_type, protocol, source_ip, command, timestamp, severity
      FROM events
      ORDER BY timestamp DESC
      LIMIT 10
    `);
    
    console.log('\nLatest 10 events:');
    console.table(eventsResult.rows);
    
    // Get HTTP events by actual timestamp (should show today's date now!)
    const httpResult = await pool.query(`
      SELECT event_type, protocol, source_ip, command, timestamp, severity, created_at
      FROM events
      WHERE protocol = 'HTTP'
      ORDER BY created_at DESC
      LIMIT 10
    `);
    
    console.log('\nLatest 10 HTTP events (ordered by created_at):');
    console.table(httpResult.rows);
    
    // Get count by protocol
    const protocolResult = await pool.query(`
      SELECT protocol, COUNT(*) as count
      FROM events
      GROUP BY protocol
      ORDER BY count DESC
    `);
    
    console.log('\nEvents by protocol:');
    console.table(protocolResult.rows);
    
    await pool.end();
    console.log('\nDone!');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkEvents();
