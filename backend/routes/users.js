const express = require('express');
const router = express.Router();
const pool = require('../db');
const admin = require('../firebase');

// Middleware to check admin role
const checkAdmin = async (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token' });
    
    try {
        const decoded = require('jsonwebtoken').verify(token, process.env.JWT_SECRET);
        if (decoded.role !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }
        req.user = decoded;
        next();
    } catch (error) {
        res.status(401).json({ error: 'Invalid token' });
    }
};

// Get all users (Admin only)
router.get('/', checkAdmin, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT u.id, u.email, u.full_name, u.role, u.created_at,
                   c.account_number, c.name as customer_name
            FROM users u
            LEFT JOIN customers c ON u.id = c.user_id
            ORDER BY u.created_at DESC
        `);
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create user (Admin only)
router.post('/', checkAdmin, async (req, res) => {
    const { email, full_name, role, password } = req.body;
    
    try {
        // Create Firebase user
        const firebaseUser = await admin.auth().createUser({
            email,
            password,
            displayName: full_name,
        });
        
        // Create PostgreSQL user
        const result = await pool.query(
            'INSERT INTO users (uid, email, full_name, role) VALUES ($1, $2, $3, $4) RETURNING *',
            [firebaseUser.uid, email, full_name, role]
        );
        
        res.json({ success: true, user: result.rows[0] });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update user role
router.put('/:id/role', checkAdmin, async (req, res) => {
    const { id } = req.params;
    const { role } = req.body;
    
    try {
        const result = await pool.query(
            'UPDATE users SET role = $1 WHERE id = $2 RETURNING *',
            [role, id]
        );
        res.json({ success: true, user: result.rows[0] });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete user
router.delete('/:id', checkAdmin, async (req, res) => {
    const { id } = req.params;
    
    try {
        const user = await pool.query('SELECT uid FROM users WHERE id = $1', [id]);
        if (user.rows[0]?.uid) {
            await admin.auth().deleteUser(user.rows[0].uid);
        }
        await pool.query('DELETE FROM users WHERE id = $1', [id]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;