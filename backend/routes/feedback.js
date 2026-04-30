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

// Admin: Send feedback to a customer
router.post('/', verifyToken, async (req, res) => {
    if (req.user.role !== 'admin' && req.user.role !== 'manager') {
        return res.status(403).json({ error: 'Only admins and managers can send feedback' });
    }

    const { customerId, subject, message } = req.body;
    if (!customerId || !subject || !message) {
        return res.status(400).json({ error: 'Customer ID, subject, and message are required' });
    }

    try {
        const customerResult = await pool.query(
            'SELECT id FROM customers WHERE id = $1',
            [customerId]
        );

        if (customerResult.rows.length === 0) {
            return res.status(404).json({ error: 'Customer not found' });
        }

        const result = await pool.query(`
            INSERT INTO feedback (customer_id, admin_id, subject, message, is_read, created_at)
            VALUES ($1, $2, $3, $4, FALSE, NOW())
            RETURNING *
        `, [customerId, req.user.userId, subject, message]);

        res.json({ success: true, feedback: result.rows[0], message: 'Feedback sent successfully' });
    } catch (error) {
        console.error('Send feedback error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Customer: Get my feedback
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
            SELECT f.*, u.full_name as admin_name
            FROM feedback f
            JOIN users u ON f.admin_id = u.id
            WHERE f.customer_id = $1
            ORDER BY f.created_at DESC
        `, [customerResult.rows[0].id]);

        res.json(result.rows);
    } catch (error) {
        console.error('Get my feedback error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Customer: Mark feedback as read
router.put('/:id/read', verifyToken, async (req, res) => {
    if (req.user.role !== 'customer') {
        return res.status(403).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;

    try {
        const customerResult = await pool.query(
            'SELECT id FROM customers WHERE user_id = $1',
            [req.user.userId]
        );

        if (customerResult.rows.length === 0) {
            return res.status(404).json({ error: 'Customer not found' });
        }

        const result = await pool.query(`
            UPDATE feedback 
            SET is_read = TRUE 
            WHERE id = $1 AND customer_id = $2
            RETURNING *
        `, [id, customerResult.rows[0].id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Feedback not found' });
        }

        res.json({ success: true, message: 'Marked as read' });
    } catch (error) {
        console.error('Mark feedback read error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Admin/Manager: Get all feedback they've sent
router.get('/all', verifyToken, async (req, res) => {
    if (req.user.role === 'customer') {
        return res.status(403).json({ error: 'Unauthorized' });
    }

    try {
        const result = await pool.query(`
            SELECT f.*, c.name as customer_name, c.account_number
            FROM feedback f
            JOIN customers c ON f.customer_id = c.id
            WHERE f.admin_id = $1
            ORDER BY f.created_at DESC
        `, [req.user.userId]);

        res.json(result.rows);
    } catch (error) {
        console.error('Get all feedback error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Admin/Manager: Get feedback for a specific customer
router.get('/customer/:customerId', verifyToken, async (req, res) => {
    if (req.user.role === 'customer') {
        return res.status(403).json({ error: 'Unauthorized' });
    }

    const { customerId } = req.params;

    try {
        const result = await pool.query(`
            SELECT f.*, u.full_name as admin_name
            FROM feedback f
            JOIN users u ON f.admin_id = u.id
            WHERE f.customer_id = $1
            ORDER BY f.created_at DESC
        `, [customerId]);

        res.json(result.rows);
    } catch (error) {
        console.error('Get customer feedback error:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;

