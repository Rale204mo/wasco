const express = require('express');
const router = express.Router();
const pool = require('../db');
const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token provided' });
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        res.status(401).json({ error: 'Invalid token' });
    }
};

// Customer: Submit a leakage report
router.post('/', verifyToken, async (req, res) => {
    if (req.user.role !== 'customer') {
        return res.status(403).json({ error: 'Only customers can submit leakage reports' });
    }

    const { location, description, severity } = req.body;
    if (!location || !description) {
        return res.status(400).json({ error: 'Location and description are required' });
    }

    try {
        const customerResult = await pool.query(
            'SELECT id, account_number FROM customers WHERE user_id = $1',
            [req.user.userId]
        );

        if (customerResult.rows.length === 0) {
            return res.status(404).json({ error: 'Customer profile not found' });
        }

        const customer = customerResult.rows[0];

        const result = await pool.query(`
            INSERT INTO leakage_reports (customer_id, account_number, location, description, severity, status, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, 'pending', NOW(), NOW())
            RETURNING *
        `, [customer.id, customer.account_number, location, description, severity || 'medium']);

        res.json({ success: true, report: result.rows[0], message: 'Leakage report submitted successfully' });
    } catch (error) {
        console.error('Submit leakage report error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Customer: Get my leakage reports
router.get('/my', verifyToken, async (req, res) => {
    if (req.user.role !== 'customer') {
        return res.status(403).json({ error: 'Unauthorized' });
    }

    try {
        const customerResult = await pool.query(
            'SELECT id FROM customers WHERE user_id = $1',
            [req.user.userId]
        );

        if (customerResult.rows.length === 0) {
            return res.json([]);
        }

        const result = await pool.query(`
            SELECT lr.*, c.name as customer_name
            FROM leakage_reports lr
            JOIN customers c ON lr.customer_id = c.id
            WHERE lr.customer_id = $1
            ORDER BY lr.created_at DESC
        `, [customerResult.rows[0].id]);

        res.json(result.rows);
    } catch (error) {
        console.error('Get my leakage reports error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Admin/Manager: Get all leakage reports
router.get('/all', verifyToken, async (req, res) => {
    if (req.user.role === 'customer') {
        return res.status(403).json({ error: 'Unauthorized' });
    }

    try {
        const result = await pool.query(`
            SELECT lr.*, c.name as customer_name, c.phone as customer_phone
            FROM leakage_reports lr
            JOIN customers c ON lr.customer_id = c.id
            ORDER BY 
                CASE lr.status 
                    WHEN 'pending' THEN 1 
                    WHEN 'in-progress' THEN 2 
                    WHEN 'resolved' THEN 3 
                END,
                lr.created_at DESC
        `);
        res.json(result.rows);
    } catch (error) {
        console.error('Get all leakage reports error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Admin/Manager: Update report status
router.put('/:id/status', verifyToken, async (req, res) => {
    if (req.user.role === 'customer') {
        return res.status(403).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;
    const { status } = req.body;

    if (!status || !['pending', 'in-progress', 'resolved'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status. Must be pending, in-progress, or resolved' });
    }

    try {
        const result = await pool.query(`
            UPDATE leakage_reports 
            SET status = $1, updated_at = NOW() 
            WHERE id = $2 
            RETURNING *
        `, [status, id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Report not found' });
        }

        res.json({ success: true, report: result.rows[0], message: 'Status updated successfully' });
    } catch (error) {
        console.error('Update leakage status error:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
