const express = require('express');
const router = express.Router();
const pool = require('../db');
const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token' });
    try {
        req.user = jwt.verify(token, process.env.JWT_SECRET);
        next();
    } catch (error) {
        res.status(401).json({ error: 'Invalid token' });
    }
};

// Customer dashboard stats
router.get('/customer/:userId', verifyToken, async (req, res) => {
    if (req.user.role !== 'customer' && req.user.userId !== parseInt(req.params.userId)) {
        return res.status(403).json({ error: 'Unauthorized' });
    }
    
    try {
        // Get customer account
        const customer = await pool.query(
            'SELECT account_number, name FROM customers WHERE user_id = $1',
            [req.params.userId]
        );
        
        if (customer.rows.length === 0) {
            return res.json({ hasAccount: false });
        }
        
        const accountNumber = customer.rows[0].account_number;
        
        // Get bills summary
        const billsResult = await pool.query(`
            SELECT 
                COUNT(*) as total_bills,
                SUM(CASE WHEN payment_status = 'PAID' THEN total_amount ELSE 0 END) as total_paid,
                SUM(CASE WHEN payment_status = 'UNPAID' THEN total_amount ELSE 0 END) as outstanding,
                COUNT(CASE WHEN payment_status = 'UNPAID' THEN 1 END) as unpaid_count
            FROM bills
            WHERE account_number = $1
        `, [accountNumber]);
        
        // Get monthly consumption for chart
        const consumptionResult = await pool.query(`
            SELECT 
                TO_CHAR(month, 'Mon YYYY') as month_label,
                consumption,
                total_amount
            FROM bills
            WHERE account_number = $1
            ORDER BY month DESC
            LIMIT 6
        `, [accountNumber]);
        
        // Get recent payments
        const paymentsResult = await pool.query(`
            SELECT p.*, b.bill_number
            FROM payments p
            JOIN bills b ON p.bill_id = b.id
            WHERE p.account_number = $1
            ORDER BY p.payment_date DESC
            LIMIT 5
        `, [accountNumber]);
        
        res.json({
            customer: customer.rows[0],
            summary: billsResult.rows[0],
            consumption_chart: consumptionResult.rows,
            recent_payments: paymentsResult.rows
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Manager dashboard stats
router.get('/manager', verifyToken, async (req, res) => {
    if (req.user.role !== 'manager' && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Unauthorized' });
    }
    
    try {
        // Daily, Weekly, Monthly, Quarterly, Yearly stats
        const stats = {};
        
        // Total revenue
        const revenueResult = await pool.query(`
            SELECT 
                SUM(amount) as total_revenue,
                COUNT(*) as total_transactions
            FROM payments
            WHERE payment_date >= DATE_TRUNC('month', CURRENT_DATE)
        `);
        stats.current_month_revenue = revenueResult.rows[0];
        
        // Outstanding amounts
        const outstandingResult = await pool.query(`
            SELECT 
                COUNT(*) as unpaid_bills,
                SUM(total_amount) as total_outstanding
            FROM bills
            WHERE payment_status = 'UNPAID' AND due_date < CURRENT_DATE
        `);
        stats.outstanding = outstandingResult.rows[0];
        
        // Monthly revenue for chart (last 6 months)
        const monthlyRevenue = await pool.query(`
            SELECT 
                TO_CHAR(DATE_TRUNC('month', payment_date), 'Mon YYYY') as month,
                SUM(amount) as revenue,
                COUNT(*) as payments_count
            FROM payments
            WHERE payment_date >= CURRENT_DATE - INTERVAL '6 months'
            GROUP BY DATE_TRUNC('month', payment_date)
            ORDER BY DATE_TRUNC('month', payment_date) DESC
        `);
        stats.monthly_revenue = monthlyRevenue.rows;
        
        // Water usage trends
        const usageTrends = await pool.query(`
            SELECT 
                TO_CHAR(month, 'Mon YYYY') as month,
                AVG(consumption) as avg_consumption,
                SUM(consumption) as total_consumption
            FROM bills
            WHERE month >= CURRENT_DATE - INTERVAL '6 months'
            GROUP BY DATE_TRUNC('month', month)
            ORDER BY DATE_TRUNC('month', month) DESC
        `);
        stats.usage_trends = usageTrends.rows;
        
        // Collection rate
        const collectionResult = await pool.query(`
            SELECT 
                SUM(CASE WHEN payment_status = 'PAID' THEN total_amount ELSE 0 END) as collected,
                SUM(total_amount) as total_billed,
                ROUND(100.0 * SUM(CASE WHEN payment_status = 'PAID' THEN total_amount ELSE 0 END) / NULLIF(SUM(total_amount), 0), 2) as collection_rate
            FROM bills
            WHERE month >= DATE_TRUNC('year', CURRENT_DATE)
        `);
        stats.collection_rate = collectionResult.rows[0];
        
        res.json(stats);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Admin dashboard stats
router.get('/admin', verifyToken, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }
    
    try {
        // User counts
        const userStats = await pool.query(`
            SELECT 
                role,
                COUNT(*) as count
            FROM users
            GROUP BY role
        `);
        
        // Customer accounts
        const customerStats = await pool.query(`
            SELECT COUNT(*) as total_customers FROM customers
        `);
        
        // Bill statistics
        const billStats = await pool.query(`
            SELECT 
                payment_status,
                COUNT(*) as count,
                SUM(total_amount) as total
            FROM bills
            GROUP BY payment_status
        `);
        
        res.json({
            users: userStats.rows,
            customers: customerStats.rows[0],
            bills: billStats.rows
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;