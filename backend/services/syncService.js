const admin = require('../firebase');
const pool = require('../db');

class SyncService {
    constructor() {
        this.db = null;
        try {
            if (admin.apps.length > 0 && admin.firestore) {
                this.db = admin.firestore();
                console.log('✅ Firestore initialized');
            } else {
                console.log('⚠️ Firestore not available - sync disabled');
            }
        } catch (error) {
            console.log('⚠️ Firestore error:', error.message);
        }
    }

    async logActivity(accountNumber, action, details) {
        try {
            // Log to PostgreSQL only (Firestore is optional)
            await pool.query(
                `INSERT INTO activity_logs (account_number, action, details, created_at)
                 VALUES ($1, $2, $3, NOW())`,
                [accountNumber, action, JSON.stringify(details)]
            );
            console.log(`✅ Activity logged: ${action}`);
            
            // Try Firebase if available
            if (this.db) {
                try {
                    await this.db.collection('activity_logs').add({
                        accountNumber,
                        action,
                        details,
                        timestamp: new Date()
                    });
                } catch (fbError) {
                    console.log('Firebase log skipped:', fbError.message);
                }
            }
            return true;
        } catch (error) {
            console.error('Activity log error:', error);
            return false;
        }
    }

    async syncFirebaseToPostgreSQL() {
        // Skip if Firebase not available
        if (!this.db) {
            return { success: true, message: 'Firebase sync disabled', syncedCount: 0 };
        }
        
        try {
            const customersSnapshot = await this.db.collection('customers').get();
            let syncedCount = 0;
            
            for (const doc of customersSnapshot.docs) {
                const fbCustomer = doc.data();
                const existing = await pool.query(
                    'SELECT * FROM customers WHERE account_number = $1',
                    [fbCustomer.accountNumber]
                );
                
                if (existing.rows.length === 0) {
                    await pool.query(
                        `INSERT INTO customers (user_id, account_number, name, address, phone, created_at)
                         VALUES ($1, $2, $3, $4, $5, $6)`,
                        [fbCustomer.userId, fbCustomer.accountNumber, fbCustomer.name, 
                         fbCustomer.address, fbCustomer.phone, fbCustomer.createdAt || new Date()]
                    );
                    syncedCount++;
                }
            }
            return { success: true, syncedCount };
        } catch (error) {
            console.error('Sync error:', error.message);
            return { success: false, error: error.message };
        }
    }
}

module.exports = new SyncService();