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

// GET /reports/dashboard-summary - Overall summary for dashboard
router.get('/dashboard-summary', verifyToken, async (req, res) => {
    if (req.user.role === 'customer') {
        return res.status(403).json({ error: 'Unauthorized' });
    }

    try {
        // Total revenue
        const revenueResult = await pool.query(`
            SELECT COALESCE(SUM(amount), 0) as total_revenue FROM payments
        `);

        // Total customers
        const customersResult = await pool.query(`
            SELECT COUNT(*) as total_customers FROM customers
        `);

        // Total bills
        const billsResult = await pool.query(`
            SELECT COUNT(*) as total_bills FROM bills
        `);

        // Collection rate
        const collectionResult = await pool.query(`
            SELECT 
                COALESCE(SUM(CASE WHEN payment_status = 'PAID' THEN total_amount ELSE 0 END), 0) as collected,
                COALESCE(SUM(total_amount), 0) as total_billed,
                ROUND(100.0 * SUM(CASE WHEN payment_status = 'PAID' THEN total_amount ELSE 0 END) / NULLIF(SUM(total_amount), 0), 2) as collection_rate
            FROM bills
        `);

        // Bill status distribution
        const statusResult = await pool.query(`
            SELECT 
                payment_status as name,
                COUNT(*) as value
            FROM bills
            GROUP BY payment_status
        `);

        res.json({
            total_revenue: revenueResult.rows[0].total_revenue,
            total_customers: customersResult.rows[0].total_customers,
            total_bills: billsResult.rows[0].total_bills,
            collection_rate: collectionResult.rows[0].collection_rate || 0,
            bill_status: statusResult.rows
        });
    } catch (error) {
        console.error('Dashboard summary error:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET /reports/summary?type=&year=&month= - Report data by period
router.get('/summary', verifyToken, async (req, res) => {
    if (req.user.role === 'customer') {
        return res.status(403).json({ error: 'Unauthorized' });
    }

    const { type = 'monthly', year = new Date().getFullYear(), month = new Date().getMonth() + 1 } = req.query;

    try {
        let monthlyRevenueQuery;
        let usageQuery;

        if (type === 'daily') {
            // Last 30 days
            monthlyRevenueQuery = pool.query(`
                SELECT 
                    TO_CHAR(payment_date, 'DD Mon') as month,
                    COALESCE(SUM(amount), 0) as revenue,
                    COUNT(*) as collections
                FROM payments
                WHERE payment_date >= CURRENT_DATE - INTERVAL '30 days'
                GROUP BY DATE_TRUNC('day', payment_date), TO_CHAR(payment_date, 'DD Mon')
                ORDER BY DATE_TRUNC('day', payment_date) DESC
                LIMIT 30
            `);
            usageQuery = pool.query(`
                SELECT 
                    TO_CHAR(month, 'DD Mon') as period,
                    COALESCE(SUM(consumption), 0) as consumption
                FROM bills
                WHERE month >= CURRENT_DATE - INTERVAL '30 days'
                GROUP BY DATE_TRUNC('day', month), TO_CHAR(month, 'DD Mon')
                ORDER BY DATE_TRUNC('day', month) DESC
                LIMIT 30
            `);
        } else if (type === 'weekly') {
            // Last 12 weeks
            monthlyRevenueQuery = pool.query(`
                SELECT 
                    'Week ' || EXTRACT(WEEK FROM payment_date) as month,
                    COALESCE(SUM(amount), 0) as revenue,
                    COUNT(*) as collections
                FROM payments
                WHERE payment_date >= CURRENT_DATE - INTERVAL '12 weeks'
                GROUP BY EXTRACT(WEEK FROM payment_date), EXTRACT(YEAR FROM payment_date)
                ORDER BY EXTRACT(YEAR FROM payment_date) DESC, EXTRACT(WEEK FROM payment_date) DESC
                LIMIT 12
            `);
            usageQuery = pool.query(`
                SELECT 
                    'Week ' || EXTRACT(WEEK FROM month) as period,
                    COALESCE(SUM(consumption), 0) as consumption
                FROM bills
                WHERE month >= CURRENT_DATE - INTERVAL '12 weeks'
                GROUP BY EXTRACT(WEEK FROM month), EXTRACT(YEAR FROM month)
                ORDER BY EXTRACT(YEAR FROM month) DESC, EXTRACT(WEEK FROM month) DESC
                LIMIT 12
            `);
        } else if (type === 'monthly') {
            // Specific year months
            monthlyRevenueQuery = pool.query(`
                SELECT 
                    TO_CHAR(payment_date, 'Mon') as month,
                    COALESCE(SUM(amount), 0) as revenue,
                    COUNT(*) as collections
                FROM payments
                WHERE EXTRACT(YEAR FROM payment_date) = $1
                GROUP BY EXTRACT(MONTH FROM payment_date), TO_CHAR(payment_date, 'Mon')
                ORDER BY EXTRACT(MONTH FROM payment_date)
            `, [year]);
            usageQuery = pool.query(`
                SELECT 
                    TO_CHAR(month, 'Mon') as period,
                    COALESCE(SUM(consumption), 0) as consumption
                FROM bills
                WHERE EXTRACT(YEAR FROM month) = $1
                GROUP BY EXTRACT(MONTH FROM month), TO_CHAR(month, 'Mon')
                ORDER BY EXTRACT(MONTH FROM month)
            `, [year]);
        } else if (type === 'quarterly') {
            // Last 8 quarters
            monthlyRevenueQuery = pool.query(`
                SELECT 
                    'Q' || EXTRACT(QUARTER FROM payment_date) || ' ' || EXTRACT(YEAR FROM payment_date) as month,
                    COALESCE(SUM(amount), 0) as revenue,
                    COUNT(*) as collections
                FROM payments
                WHERE payment_date >= CURRENT_DATE - INTERVAL '2 years'
                GROUP BY EXTRACT(QUARTER FROM payment_date), EXTRACT(YEAR FROM payment_date)
                ORDER BY EXTRACT(YEAR FROM payment_date) DESC, EXTRACT(QUARTER FROM payment_date) DESC
                LIMIT 8
            `);
            usageQuery = pool.query(`
                SELECT 
                    'Q' || EXTRACT(QUARTER FROM month) || ' ' || EXTRACT(YEAR FROM month) as period,
                    COALESCE(SUM(consumption), 0) as consumption
                FROM bills
                WHERE month >= CURRENT_DATE - INTERVAL '2 years'
                GROUP BY EXTRACT(QUARTER FROM month), EXTRACT(YEAR FROM month)
                ORDER BY EXTRACT(YEAR FROM month) DESC, EXTRACT(QUARTER FROM month) DESC
                LIMIT 8
            `);
        } else {
            // Yearly - last 5 years
            monthlyRevenueQuery = pool.query(`
                SELECT 
                    EXTRACT(YEAR FROM payment_date)::text as month,
                    COALESCE(SUM(amount), 0) as revenue,
                    COUNT(*) as collections
                FROM payments
                WHERE payment_date >= CURRENT_DATE - INTERVAL '5 years'
                GROUP BY EXTRACT(YEAR FROM payment_date)
                ORDER BY EXTRACT(YEAR FROM payment_date) DESC
                LIMIT 5
            `);
            usageQuery = pool.query(`
                SELECT 
                    EXTRACT(YEAR FROM month)::text as period,
                    COALESCE(SUM(consumption), 0) as consumption
                FROM bills
                WHERE month >= CURRENT_DATE - INTERVAL '5 years'
                GROUP BY EXTRACT(YEAR FROM month)
                ORDER BY EXTRACT(YEAR FROM month) DESC
                LIMIT 5
            `);
        }

        const [revenueResult, usageResult] = await Promise.all([monthlyRevenueQuery, usageQuery]);

        res.json({
            monthly_revenue: revenueResult.rows,
            usage_trends: usageResult.rows,
            report_type: type,
            year: year,
            month: month
        });
    } catch (error) {
        console.error('Report summary error:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET /reports/all-payments - All payments for manager view
router.get('/all-payments', verifyToken, async (req, res) => {
    if (req.user.role === 'customer') {
        return res.status(403).json({ error: 'Unauthorized' });
    }

    try {
        const result = await pool.query(`
            SELECT p.*, b.bill_number, c.name as customer_name
            FROM payments p
            JOIN bills b ON p.bill_id = b.id
            JOIN customers c ON p.account_number = c.account_number
            ORDER BY p.payment_date DESC
            LIMIT 200
        `);
        res.json(result.rows);
    } catch (error) {
        console.error('All payments error:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET /reports/all-water-usage - All water usage for manager view
router.get('/all-water-usage', verifyToken, async (req, res) => {
    if (req.user.role === 'customer') {
        return res.status(403).json({ error: 'Unauthorized' });
    }

    try {
        const result = await pool.query(`
            SELECT wu.*, c.name as customer_name
            FROM water_usage wu
            JOIN customers c ON wu.account_number = c.account_number
            ORDER BY wu.month DESC
            LIMIT 200
        `);
        res.json(result.rows);
    } catch (error) {
        console.error('All water usage error:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;

