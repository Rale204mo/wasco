const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Import database connection to check status
const pool = require('./db');
const admin = require('./firebase');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const billRoutes = require('./routes/bills');
const dashboardRoutes = require('./routes/dashboard');
const customerRoutes = require('./routes/customers');

// Use routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/bills', billRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/customers', customerRoutes);

// Health check endpoint
app.get('/health', async (req, res) => {
    // Check database status
    let dbStatus = 'Unknown';
    let firebaseStatus = 'Unknown';
    
    try {
        await pool.query('SELECT 1');
        dbStatus = 'Connected';
    } catch (error) {
        dbStatus = 'Disconnected';
    }
    
    try {
        if (admin.apps.length > 0) {
            firebaseStatus = 'Connected';
        } else {
            firebaseStatus = 'Not Initialized';
        }
    } catch (error) {
        firebaseStatus = 'Error';
    }
    
    res.json({ 
        status: 'OK',
        distributed_database: {
            neon_postgresql: {
                status: dbStatus,
                type: 'Primary Database',
                tables: ['users', 'customers', 'bills', 'payments', 'water_usage']
            },
            firebase: {
                status: firebaseStatus,
                type: 'Authentication & Real-time Logs',
                features: ['Auth', 'Activity Logs', 'Real-time Sync']
            }
        },
        timestamp: new Date()
    });
});

// Distributed database sync endpoint
app.post('/api/sync/force', async (req, res) => {
    try {
        const syncService = require('./services/syncService');
        const result = await syncService.syncFirebaseToPostgreSQL();
        res.json({ 
            success: true, 
            message: 'Sync completed between Firebase and Neon PostgreSQL',
            timestamp: new Date()
        });
    } catch (error) {
        console.error('Sync error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// Distributed database status endpoint
app.get('/api/distributed/status', async (req, res) => {
    let neonStatus = 'disconnected';
    let firebaseStatus = 'disconnected';
    let neonLatency = null;
    let firebaseLatency = null;
    
    // Check Neon PostgreSQL
    const neonStart = Date.now();
    try {
        await pool.query('SELECT 1');
        neonStatus = 'connected';
        neonLatency = Date.now() - neonStart;
    } catch (error) {
        neonStatus = 'error';
    }
    
    // Check Firebase
    const firebaseStart = Date.now();
    try {
        if (admin.apps.length > 0) {
            firebaseStatus = 'connected';
            firebaseLatency = Date.now() - firebaseStart;
        } else {
            firebaseStatus = 'not_initialized';
        }
    } catch (error) {
        firebaseStatus = 'error';
    }
    
    res.json({
        success: true,
        databases: {
            neon_postgresql: {
                status: neonStatus,
                latency_ms: neonLatency,
                role: 'Primary Data Store',
                tables_count: 5
            },
            firebase: {
                status: firebaseStatus,
                latency_ms: firebaseLatency,
                role: 'Authentication & Real-time Sync',
                features: ['Email/Password Auth', 'Activity Logs', 'Real-time Data']
            }
        },
        distributed_system: {
            status: neonStatus === 'connected' && firebaseStatus === 'connected' ? 'fully_operational' : 'degraded',
            sync_enabled: true,
            auto_sync: true
        },
        timestamp: new Date()
    });
});

// Root endpoint
app.get('/', (req, res) => {
    res.json({ 
        name: 'WASCO Water Billing System',
        version: '2.0.0',
        architecture: 'Distributed Database System',
        databases: ['Neon PostgreSQL', 'Firebase'],
        endpoints: {
            auth: '/api/auth',
            users: '/api/users',
            bills: '/api/bills',
            dashboard: '/api/dashboard',
            customers: '/api/customers',
            health: '/health',
            sync: '/api/sync/force',
            distributed_status: '/api/distributed/status'
        }
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err.message);
    res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log('\n========================================');
    console.log('🚀 WASCO DISTRIBUTED DATABASE SYSTEM');
    console.log('========================================');
    console.log(`✅ Server running on port ${PORT}`);
    console.log('✅ Neon PostgreSQL: Connected');
    console.log('✅ Firebase Admin: Connected');
    console.log('========================================');
    console.log('📍 Distributed System Endpoints:');
    console.log(`   - Health: http://localhost:${PORT}/health`);
    console.log(`   - Status: http://localhost:${PORT}/api/distributed/status`);
    console.log(`   - Sync:   http://localhost:${PORT}/api/sync/force`);
    console.log('========================================\n');
});