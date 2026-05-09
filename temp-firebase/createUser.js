const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

async function createUser() {
  try {
    const userRecord = await admin.auth().createUser({
      email: 'admin@wasco.com',
      password: 'Admin@123',
      emailVerified: true,
    });
    console.log('✅ User created successfully! UID:', userRecord.uid);
  } catch (error) {
    console.error('❌ Error creating user:', error.message);
  }
}

createUser();