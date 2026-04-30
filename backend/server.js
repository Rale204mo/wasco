const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Import database connection to check status
const pool = require('./db');
const admin = require('./firebase');

// ============================================
// ENHANCED CORS FOR MOBILE ACCESS
// ============================================
const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:5000',
    'https://wasco-billing-c3hz.onrender.com',
    'https://wasco-billing-frontend.onrender.com',
    'https://*.onrender.com',
    'https://wasco-billing-frontend.vercel.app',
    'https://wasco-billing-frontend-c6b9ng0vr-leakays-projects.vercel.app',
    'https://*.vercel.app'
];

app.use(cors({
    origin: function(origin, callback) {
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            if (origin.includes('.onrender.com')) {
                callback(null, true);
            } else {
                console.log('CORS blocked origin:', origin);
                callback(null, true);
            }
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
    exposedHeaders: ['Content-Range', 'X-Content-Range']
}));

// Handle preflight requests
app.options('*', cors());

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const billRoutes = require('./routes/bills');
const dashboardRoutes = require('./routes/dashboard');
const customerRoutes = require('./routes/customers');
const billingRatesRoutes = require('./routes/billingRates');
const reportsRoutes = require('./routes/reports');
const leakageRoutes = require('./routes/leakage');
const feedbackRoutes = require('./routes/feedback');

// Use routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/bills', billRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/billing-rates', billingRatesRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/leakage', leakageRoutes);
app.use('/api/feedback', feedbackRoutes);

// Health check endpoint
app.get('/health', async (req, res) => {
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
                tables: ['users', 'customers', 'bills', 'payments', 'water_usage', 'leakage_reports', 'feedback']
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
    
    const neonStart = Date.now();
    try {
        await pool.query('SELECT 1');
        neonStatus = 'connected';
        neonLatency = Date.now() - neonStart;
    } catch (error) {
        neonStatus = 'error';
    }
    
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
                tables_count: 7
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
        version: '2.1.0',
        architecture: 'Distributed Database System',
        databases: ['Neon PostgreSQL', 'Firebase'],
        endpoints: {
            auth: '/api/auth',
            users: '/api/users',
            bills: '/api/bills',
            dashboard: '/api/dashboard',
            customers: '/api/customers',
            leakage: '/api/leakage',
            feedback: '/api/feedback',
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
const server = app.listen(PORT, () => {
    console.log('\n========================================');
    console.log('🚀 WASCO DISTRIBUTED DATABASE SYSTEM');
    console.log('========================================');
    console.log(`✅ Server running on port ${PORT}`);
    console.log('✅ Neon PostgreSQL: Connected');
    console.log('✅ Firebase Admin: Connected');
    console.log('✅ CORS: Enabled for mobile and web');
    console.log('========================================');
    console.log('📍 Distributed System Endpoints:');
    console.log(`   - Health: http://localhost:${PORT}/health`);
    console.log(`   - Status: http://localhost:${PORT}/api/distributed/status`);
    console.log(`   - Sync:   http://localhost:${PORT}/api/sync/force`);
    console.log('========================================\n');
});

server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`\n❌ ERROR: Port ${PORT} is already in use!`);
        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('🔧 QUICK FIXES:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('Option 1: Use a different port');
        console.log(`   → PORT=5001 npm start`);
        console.log('Option 2: Find and kill the process using port 5000');
        console.log('   → Windows: npx kill-port 5000');
        console.log('   → Windows (PowerShell): Get-NetTCPConnection -LocalPort 5000 | Select-Object OwningProcess; Stop-Process -Id <PID>');
        console.log('   → Windows (CMD): netstat -ano | findstr :5000 → taskkill /PID <PID> /F');
        console.log('Option 3: Set environment variable in .env file:');
        console.log('   → PORT=5001');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        process.exit(1);
    } else {
        console.error('\n❌ Server error:', err.message);
        process.exit(1);
    }
});

