const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

function getServiceAccount() {
    // Try to read from environment variables first
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

    if (privateKey && projectId && clientEmail) {
        // Normalize newlines: handle both \\n (escaped) and literal newlines
        let formattedKey = privateKey.replace(/\\n/g, '\n');
        
        // Ensure PEM headers exist
        if (!formattedKey.includes('-----BEGIN PRIVATE KEY-----')) {
            console.warn('[Firebase Warning] PRIVATE_KEY is missing PEM header. Make sure your .env contains the full key including -----BEGIN PRIVATE KEY-----');
        }
        if (!formattedKey.includes('-----END PRIVATE KEY-----')) {
            console.warn('[Firebase Warning] PRIVATE_KEY is missing PEM footer. Make sure your .env contains the full key including -----END PRIVATE KEY-----');
        }

        return {
            projectId,
            privateKey: formattedKey,
            clientEmail,
        };
    }

    // Fallback: try to load from serviceAccountKey.json if env vars are missing
    const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');
    if (fs.existsSync(serviceAccountPath)) {
        console.log('[Firebase] Loading credentials from serviceAccountKey.json');
        const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
        return {
            projectId: serviceAccount.project_id,
            privateKey: serviceAccount.private_key,
            clientEmail: serviceAccount.client_email,
        };
    }

    // Build a detailed error message
    const missing = [];
    if (!privateKey) missing.push('FIREBASE_PRIVATE_KEY');
    if (!projectId) missing.push('FIREBASE_PROJECT_ID');
    if (!clientEmail) missing.push('FIREBASE_CLIENT_EMAIL');

    throw new Error(
        `Missing required Firebase environment variables: ${missing.join(', ')}.\n\n` +
        `Please ensure your backend/.env file contains:\n` +
        `FIREBASE_PROJECT_ID=your-project-id\n` +
        `FIREBASE_CLIENT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com\n` +
        `FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----\\n\n\n` +
        `Note: The private key must include the full PEM block with BEGIN/END headers.\n` +
        `Alternatively, place a serviceAccountKey.json file in the backend/ directory.`
    );
}

const serviceAccount = getServiceAccount();

try {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
    });
    console.log('✅ Firebase Admin initialized successfully');
} catch (error) {
    console.error('[Firebase Initialization Error]', error.message);
    throw error;
}

module.exports = admin;

