const admin = require('./firebase');
const pool = require('./db');

async function makeAdmin(email) {
    try {
        // Get user by email
        const user = await admin.auth().getUserByEmail(email);
        const uid = user.uid;
        
        // Set admin custom claim
        await admin.auth().setCustomUserClaims(uid, { role: 'admin' });
        
        // Update role in PostgreSQL
        await pool.query(
            'UPDATE users SET role = $1 WHERE email = $2',
            ['admin', email]
        );
        
        console.log(`✅ User ${email} is now an admin!`);
        console.log(`UID: ${uid}`);
        
        // Important: User must re-login for changes to take effect
        console.log('⚠️ Ask user to log out and log back in');
        
    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        pool.end();
    }
}

// Get email from command line
const email = process.argv[2];
if (!email) {
    console.log('Usage: node makeAdmin.js <email>');
    console.log('Example: node makeAdmin.js admin@wasco.com');
    process.exit(1);
}

makeAdmin(email);