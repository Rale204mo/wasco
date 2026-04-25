const express = require('express');
const router = express.Router();
const admin = require('../firebase');
const pool = require('../db');
const jwt = require('jsonwebtoken');

// Login route with automatic customer profile creation
router.post('/login', async (req, res) => {
    const { idToken } = req.body;
    
    if (!idToken) {
        return res.status(400).json({ error: 'ID token is required' });
    }
    
    try {
        // Verify Firebase token
        let decodedToken;
        try {
            decodedToken = await admin.auth().verifyIdToken(idToken);
        } catch (firebaseError) {
            console.error('Firebase verification error:', firebaseError.message);
            return res.status(401).json({ error: 'Invalid Firebase token' });
        }
        
        const email = decodedToken.email;
        const uid = decodedToken.uid;
        const fullName = decodedToken.name || email.split('@')[0];
        
        if (!email) {
            return res.status(400).json({ error: 'Email not found in token' });
        }
        
        // Check if user exists in PostgreSQL
        let result;
        try {
            result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        } catch (dbError) {
            console.error('Database error:', dbError.message);
            return res.status(500).json({ error: 'Database connection error' });
        }
        
        let user;
        if (result.rows.length === 0) {
            // Create new user with default 'customer' role
            try {
                const newUser = await pool.query(
                    'INSERT INTO users (uid, email, role, full_name) VALUES ($1, $2, $3, $4) RETURNING id, email, role, full_name',
                    [uid, email, 'customer', fullName]
                );
                user = newUser.rows[0];
                
                // AUTOMATICALLY CREATE CUSTOMER PROFILE FOR NEW USER
                const accountNumber = `WASCO${new Date().getFullYear()}${user.id}${Math.floor(Math.random() * 1000)}`;
                await pool.query(
                    `INSERT INTO customers (user_id, account_number, name, address, phone, created_at) 
                     VALUES ($1, $2, $3, $4, $5, NOW())`,
                    [user.id, accountNumber, fullName, 'Please update your address', 'Not provided']
                );
                console.log(`✅ Customer profile created for ${email} with account: ${accountNumber}`);
                
            } catch (insertError) {
                console.error('User creation error:', insertError.message);
                return res.status(500).json({ error: 'Failed to create user' });
            }
        } else {
            user = result.rows[0];
            // Update uid if not set
            if (!user.uid) {
                await pool.query('UPDATE users SET uid = $1 WHERE id = $2', [uid, user.id]);
            }
            
            // CHECK IF CUSTOMER PROFILE EXISTS, CREATE IF NOT
            const customerCheck = await pool.query(
                'SELECT * FROM customers WHERE user_id = $1',
                [user.id]
            );
            
            if (customerCheck.rows.length === 0 && user.role === 'customer') {
                // Create missing customer profile for existing user
                const accountNumber = `WASCO${new Date().getFullYear()}${user.id}${Math.floor(Math.random() * 1000)}`;
                await pool.query(
                    `INSERT INTO customers (user_id, account_number, name, address, phone, created_at) 
                     VALUES ($1, $2, $3, $4, $5, NOW())`,
                    [user.id, accountNumber, user.full_name || user.email.split('@')[0], 'Please update your address', 'Not provided']
                );
                console.log(`✅ Missing customer profile created for ${email} with account: ${accountNumber}`);
            }
        }
        
        // Get customer info if exists
        let customerInfo = null;
        if (user.role === 'customer') {
            const customerResult = await pool.query(
                'SELECT * FROM customers WHERE user_id = $1',
                [user.id]
            );
            if (customerResult.rows.length > 0) {
                customerInfo = customerResult.rows[0];
            }
        }
        
        // Create JWT token
        const token = jwt.sign(
            { userId: user.id, email: user.email, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );
        
        res.json({
            success: true,
            token,
            user: {
                id: user.id,
                email: user.email,
                role: user.role,
                full_name: user.full_name,
                customer: customerInfo ? {
                    account_number: customerInfo.account_number,
                    name: customerInfo.name,
                    address: customerInfo.address
                } : null
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Register new user with customer profile
router.post('/register', async (req, res) => {
    const { idToken, fullName, email, address, phone } = req.body;
    
    if (!idToken) {
        return res.status(400).json({ error: 'ID token is required' });
    }
    
    try {
        // Verify Firebase token
        let decodedToken;
        try {
            decodedToken = await admin.auth().verifyIdToken(idToken);
        } catch (firebaseError) {
            console.error('Firebase verification error:', firebaseError.message);
            return res.status(401).json({ error: 'Invalid Firebase token' });
        }
        
        const userEmail = email || decodedToken.email;
        const uid = decodedToken.uid;
        const userFullName = fullName || decodedToken.name || userEmail.split('@')[0];
        
        // Check if user already exists
        const existingUser = await pool.query('SELECT * FROM users WHERE email = $1', [userEmail]);
        
        let user;
        if (existingUser.rows.length === 0) {
            // Create new user
            const newUser = await pool.query(
                'INSERT INTO users (uid, email, role, full_name) VALUES ($1, $2, $3, $4) RETURNING id, email, role, full_name',
                [uid, userEmail, 'customer', userFullName]
            );
            user = newUser.rows[0];
            
            // Create customer profile
            const accountNumber = `WASCO${new Date().getFullYear()}${user.id}${Math.floor(Math.random() * 1000)}`;
            await pool.query(
                `INSERT INTO customers (user_id, account_number, name, address, phone, created_at) 
                 VALUES ($1, $2, $3, $4, $5, NOW())`,
                [user.id, accountNumber, userFullName, address || 'Not specified', phone || 'Not provided']
            );
            
            // Create JWT token
            const token = jwt.sign(
                { userId: user.id, email: user.email, role: user.role },
                process.env.JWT_SECRET,
                { expiresIn: '24h' }
            );
            
            res.json({
                success: true,
                token,
                user: {
                    id: user.id,
                    email: user.email,
                    role: user.role,
                    full_name: user.full_name,
                    customer: {
                        account_number: accountNumber,
                        name: userFullName,
                        address: address || 'Not specified'
                    }
                }
            });
        } else {
            res.status(400).json({ error: 'User already exists. Please login.' });
        }
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get customer profile
router.get('/customer/profile', async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }
    
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        const customerResult = await pool.query(
            `SELECT c.*, u.email, u.full_name 
             FROM customers c 
             JOIN users u ON c.user_id = u.id 
             WHERE u.id = $1`,
            [decoded.userId]
        );
        
        if (customerResult.rows.length === 0) {
            return res.status(404).json({ error: 'Customer profile not found' });
        }
        
        res.json({ success: true, customer: customerResult.rows[0] });
    } catch (error) {
        res.status(401).json({ error: 'Invalid token' });
    }
});

// Update customer profile
router.put('/customer/profile', async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    const { name, address, phone } = req.body;
    
    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }
    
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        const result = await pool.query(
            `UPDATE customers 
             SET name = COALESCE($1, name), 
                 address = COALESCE($2, address), 
                 phone = COALESCE($3, phone),
                 updated_at = NOW()
             WHERE user_id = $4 
             RETURNING *`,
            [name, address, phone, decoded.userId]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Customer profile not found' });
        }
        
        res.json({ success: true, customer: result.rows[0] });
    } catch (error) {
        res.status(401).json({ error: 'Invalid token' });
    }
});

// Verify token endpoint
router.post('/verify', async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }
    
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        res.json({ success: true, user: decoded });
    } catch (error) {
        res.status(401).json({ success: false, error: 'Invalid token' });
    }
});

module.exports = router;