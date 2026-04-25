const { Pool } = require('pg');
require('dotenv').config();

// Using the SAME working configuration from test-connection.js
const pool = new Pool({
    user: 'neondb_owner',
    host: 'ep-long-surf-amg6n9l2-pooler.c-5.us-east-1.aws.neon.tech',
    database: 'neondb',
    password: 'npg_rNinmdD5AE3s',
    port: 5432,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 5000,
});

// Test connection
pool.connect((err, client, release) => {
    if (err) {
        console.error('❌ PostgreSQL Error:', err.message);
    } else {
        console.log('✅ Connected to Neon PostgreSQL');
        release();
    }
});

module.exports = pool;