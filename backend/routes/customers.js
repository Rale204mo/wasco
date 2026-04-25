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

// Create customer profile
router.post('/create', verifyToken, async (req, res) => {
    const { userId, name, address, phone } = req.body;
    
    if (!userId) {
        return res.status(400).json({ error: 'User ID is required' });
    }
    
    try {
        // Check if customer already exists
        const existing = await pool.query(
            'SELECT * FROM customers WHERE user_id = $1',
            [userId]
        );
        
        if (existing.rows.length > 0) {
            return res.json({ 
                success: true, 
                customer: existing.rows[0],
                message: 'Profile already exists'
            });
        }
        
        // Generate unique account number
        const accountNumber = `WASCO${new Date().getFullYear()}${userId}${Math.floor(Math.random() * 1000)}`;
        
        const result = await pool.query(
            `INSERT INTO customers (user_id, account_number, name, address, phone, created_at) 
             VALUES ($1, $2, $3, $4, $5, NOW()) 
             RETURNING *`,
            [userId, accountNumber, name || 'Customer', address || 'Not specified', phone || 'Not provided']
        );
        
        res.json({ 
            success: true, 
            customer: result.rows[0],
            message: 'Customer profile created successfully'
        });
    } catch (error) {
        console.error('Error creating customer:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get customer profile
router.get('/profile', verifyToken, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT c.*, u.email, u.full_name 
             FROM customers c 
             JOIN users u ON c.user_id = u.id 
             WHERE c.user_id = $1`,
            [req.user.userId]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'No customer profile found' });
        }
        
        res.json({ success: true, customer: result.rows[0] });
    } catch (error) {
        console.error('Error getting customer:', error);
        res.status(500).json({ error: error.message });
    }
});





// Get all customers (Admin/Manager only)
router.get('/all', verifyToken, async (req, res) => {
    if (req.user.role === 'customer') {
        return res.status(403).json({ error: 'Unauthorized' });
    }
    
    try {
        const result = await pool.query(`
            SELECT c.*, u.email, u.full_name 
            FROM customers c 
            JOIN users u ON c.user_id = u.id 
            ORDER BY c.name ASC
        `);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching customers:', error);
        res.status(500).json({ error: error.message });
    }
});




// Get customer by account number
router.get('/account/:accountNumber', verifyToken, async (req, res) => {
    const { accountNumber } = req.params;
    
    try {
        const result = await pool.query(
            `SELECT c.*, u.email 
             FROM customers c 
             JOIN users u ON c.user_id = u.id 
             WHERE c.account_number = $1`,
            [accountNumber]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Customer not found' });
        }
        
        res.json({ success: true, customer: result.rows[0] });
    } catch (error) {
        console.error('Error finding customer:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;