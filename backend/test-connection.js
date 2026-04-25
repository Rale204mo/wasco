const { Client } = require('pg');

const client = new Client({
    user: 'neondb_owner',
    host: 'ep-long-surf-amg6n9l2-pooler.c-5.us-east-1.aws.neon.tech',
    database: 'neondb',
    password: 'npg_rNinmdD5AE3s',
    port: 5432,
    ssl: { rejectUnauthorized: false },
});

client.connect()
    .then(() => {
        console.log('✅ SUCCESS! Connected to Neon!');
        return client.query('SELECT NOW() as time, version() as version');
    })
    .then(result => {
        console.log('📅 Server time:', result.rows[0].time);
        console.log('🐘 PostgreSQL version:', result.rows[0].version);
        client.end();
    })
    .catch(err => {
        console.error('❌ Failed:', err.message);
        console.log('\nTroubleshooting tips:');
        console.log('1. Check if password is correct');
        console.log('2. Try using pooler endpoint');
        console.log('3. Check if IP is allowed in Neon settings');
    });