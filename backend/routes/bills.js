const express = require('express');
const router = express.Router();
const pool = require('../db');
const jwt = require('jsonwebtoken');
const PDFDocument = require('pdfkit');
const fs = require('fs-extra');
const path = require('path');

// Middleware to verify JWT
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

// Calculate bill based on consumption
const calculateBill = (consumption) => {
    if (consumption <= 15) return consumption * 5.50;
    if (consumption <= 30) return (15 * 5.50) + ((consumption - 15) * 8.75);
    if (consumption <= 50) return (15 * 5.50) + (15 * 8.75) + ((consumption - 30) * 12.00);
    return (15 * 5.50) + (15 * 8.75) + (20 * 12.00) + ((consumption - 50) * 15.50);
};

// GENERATE SAMPLE DATA FOR TESTING
router.post('/generate-sample', verifyToken, async (req, res) => {
    const { accountNumber } = req.body;
    
    if (!accountNumber) {
        return res.status(400).json({ error: 'Account number is required' });
    }
    
    try {
        // Check if bills already exist for this account
        const existingBills = await pool.query(
            'SELECT COUNT(*) FROM bills WHERE account_number = $1',
            [accountNumber]
        );
        
        if (parseInt(existingBills.rows[0].count) > 0) {
            return res.json({ 
                success: true, 
                message: 'Sample data already exists for this account',
                bills_count: existingBills.rows[0].count
            });
        }
        
        // Insert sample water usage for last 6 months (without ON CONFLICT)
        const sampleUsage = [
            { month: '2024-11-01', reading: 1000, previous: 950 },
            { month: '2024-12-01', reading: 1080, previous: 1000 },
            { month: '2025-01-01', reading: 1150, previous: 1080 },
            { month: '2025-02-01', reading: 1250, previous: 1150 },
            { month: '2025-03-01', reading: 1320, previous: 1250 },
            { month: '2025-04-01', reading: 1380, previous: 1320 }
        ];
        
        for (const usage of sampleUsage) {
            // Check if exists first
            const check = await pool.query(
                'SELECT id FROM water_usage WHERE account_number = $1 AND month = $2',
                [accountNumber, usage.month]
            );
            
            if (check.rows.length === 0) {
                await pool.query(`
                    INSERT INTO water_usage (account_number, month, meter_reading, previous_reading)
                    VALUES ($1, $2, $3, $4)
                `, [accountNumber, usage.month, usage.reading, usage.previous]);
            }
        }
        
        // Insert sample bills
        const sampleBills = [
            { month: '2024-11-01', consumption: 50, amount: 275.00, due: '2024-12-01', status: 'PAID', billNum: 'BILL2024001' },
            { month: '2024-12-01', consumption: 80, amount: 440.00, due: '2025-01-05', status: 'PAID', billNum: 'BILL2024002' },
            { month: '2025-01-01', consumption: 70, amount: 385.00, due: '2025-02-01', status: 'PAID', billNum: 'BILL2025001' },
            { month: '2025-02-01', consumption: 100, amount: 550.00, due: '2025-03-01', status: 'PAID', billNum: 'BILL2025002' },
            { month: '2025-03-01', consumption: 70, amount: 385.00, due: '2025-04-01', status: 'UNPAID', billNum: 'BILL2025003' },
            { month: '2025-04-01', consumption: 60, amount: 330.00, due: '2025-05-01', status: 'UNPAID', billNum: 'BILL2025004' }
        ];
        
        const insertedBills = [];
        for (const bill of sampleBills) {
            const check = await pool.query(
                'SELECT id FROM bills WHERE account_number = $1 AND month = $2',
                [accountNumber, bill.month]
            );
            
            if (check.rows.length === 0) {
                const result = await pool.query(`
                    INSERT INTO bills (bill_number, account_number, month, consumption, total_amount, due_date, payment_status)
                    VALUES ($1, $2, $3, $4, $5, $6, $7)
                    RETURNING *
                `, [bill.billNum, accountNumber, bill.month, bill.consumption, bill.amount, bill.due, bill.status]);
                
                insertedBills.push(result.rows[0]);
                
                // Add payment records for paid bills
                if (bill.status === 'PAID') {
                    await pool.query(`
                        INSERT INTO payments (bill_id, account_number, amount, transaction_id, payment_method, payment_date)
                        VALUES ($1, $2, $3, $4, $5, $6)
                    `, [result.rows[0].id, accountNumber, bill.amount, `TXN${bill.billNum}`, 'CREDIT_CARD', bill.due]);
                }
            }
        }
        
        res.json({ 
            success: true, 
            message: `Generated ${insertedBills.length} sample bills`,
            bills: insertedBills
        });
    } catch (error) {
        console.error('Generate sample error:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET PAYMENT HISTORY FOR A CUSTOMER
router.get('/payments/history/:accountNumber', verifyToken, async (req, res) => {
    const { accountNumber } = req.params;
    
    try {
        // Check authorization
        if (req.user.role === 'customer') {
            const customer = await pool.query(
                'SELECT account_number FROM customers WHERE user_id = $1',
                [req.user.userId]
            );
            if (customer.rows.length === 0 || customer.rows[0]?.account_number !== accountNumber) {
                return res.status(403).json({ error: 'Unauthorized' });
            }
        }
        
        const result = await pool.query(`
            SELECT p.*, b.bill_number 
            FROM payments p
            JOIN bills b ON p.bill_id = b.id
            WHERE p.account_number = $1
            ORDER BY p.payment_date DESC
        `, [accountNumber]);
        
        res.json(result.rows);
    } catch (error) {
        console.error('Get payment history error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Generate bills for all customers
router.post('/generate', verifyToken, async (req, res) => {
    const { month } = req.body;
    
    if (!month) {
        return res.status(400).json({ error: 'Month is required' });
    }
    
    try {
        const usageResult = await pool.query(`
            SELECT wu.*, c.name as customer_name
            FROM water_usage wu
            JOIN customers c ON wu.account_number = c.account_number
            WHERE DATE_TRUNC('month', wu.month) = DATE_TRUNC('month', $1::date)
        `, [month]);
        
        if (usageResult.rows.length === 0) {
            return res.json({ success: true, message: 'No water usage found for this month', bills_generated: 0 });
        }
        
        const bills = [];
        for (const usage of usageResult.rows) {
            const amount = calculateBill(usage.consumption);
            const billNumber = `WASCO${new Date().getFullYear()}${Math.floor(Math.random() * 10000)}`;
            
            const billResult = await pool.query(`
                INSERT INTO bills (bill_number, account_number, month, consumption, total_amount, due_date, payment_status)
                VALUES ($1, $2, $3, $4, $5, CURRENT_DATE + INTERVAL '30 days', 'UNPAID')
                RETURNING *
            `, [billNumber, usage.account_number, month, usage.consumption, amount]);
            
            bills.push(billResult.rows[0]);
        }
        
        res.json({ success: true, bills_generated: bills.length, bills });
    } catch (error) {
        console.error('Generate bills error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get bills for a customer
router.get('/customer/:accountNumber', verifyToken, async (req, res) => {
    const { accountNumber } = req.params;
    
    try {
        if (req.user.role === 'customer') {
            const customer = await pool.query(
                'SELECT account_number FROM customers WHERE user_id = $1',
                [req.user.userId]
            );
            if (customer.rows.length === 0 || customer.rows[0]?.account_number !== accountNumber) {
                return res.status(403).json({ error: 'Unauthorized' });
            }
        }
        
        const result = await pool.query(`
            SELECT b.*, 
                   p.payment_date as paid_date, 
                   p.transaction_id,
                   p.payment_method
            FROM bills b
            LEFT JOIN payments p ON b.id = p.bill_id
            WHERE b.account_number = $1
            ORDER BY b.month DESC
        `, [accountNumber]);
        
        res.json(result.rows);
    } catch (error) {
        console.error('Get customer bills error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Make payment
router.post('/pay', verifyToken, async (req, res) => {
    const { billId, amount, paymentMethod, cardLast4, cardHolder } = req.body;
    
    if (!billId || !amount) {
        return res.status(400).json({ error: 'Bill ID and amount are required' });
    }
    
    try {
        const billResult = await pool.query('SELECT * FROM bills WHERE id = $1', [billId]);
        
        if (billResult.rows.length === 0) {
            return res.status(404).json({ error: 'Bill not found' });
        }
        
        const bill = billResult.rows[0];
        
        if (bill.payment_status === 'PAID') {
            return res.status(400).json({ error: 'Bill already paid' });
        }
        
        const transactionId = `TXN${Date.now()}${Math.floor(Math.random() * 1000)}`;
        const paymentResult = await pool.query(`
            INSERT INTO payments (bill_id, account_number, amount, transaction_id, payment_method, card_last4, card_holder, receipt_path, payment_date)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
            RETURNING *
        `, [billId, bill.account_number, amount, transactionId, paymentMethod || 'CREDIT_CARD', cardLast4 || null, cardHolder || null, null]);
        // Generate receipt PDF
        const payment = paymentResult.rows[0];
        const receiptPath = `/receipts/${payment.id}_${Date.now()}.pdf`;
        const fullReceiptPath = path.join(__dirname, '..', 'public', 'receipts', `${payment.id}_${Date.now()}.pdf`);

        // Ensure directory exists
        await fs.ensureDir(path.dirname(fullReceiptPath));

        // Get customer details
        const customerResult = await pool.query('SELECT * FROM customers WHERE account_number = $1', [bill.account_number]);
        const customer = customerResult.rows[0] || {};

        // Create PDF
        const doc = new PDFDocument({ margin: 50 });
        doc.pipe(fs.createWriteStream(fullReceiptPath));

        // Header
        doc.fontSize(20).text('WASCO Water Authority', { align: 'center' });
        doc.fontSize(12).text('Payment Receipt', { align: 'center' });
        doc.moveDown();

        // Receipt details
        doc.fontSize(14).text(`Receipt #${payment.id}`, { continued: true }).text(`Date: ${new Date().toLocaleDateString()}`);
        doc.moveDown();

        doc.text(`Transaction ID: ${transactionId}`);
        doc.text(`Account Number: ${bill.account_number}`);
        doc.text(`Customer: ${customer.name || 'N/A'} | ${customer.phone || 'N/A'}`);
        doc.text(`Bill Number: ${bill.bill_number}`);
        doc.text(`Month: ${new Date(bill.month).toLocaleDateString()}`);
        doc.text(`Consumption: ${bill.consumption} m³`);
        doc.text(`Payment Method: ${paymentMethod || 'CREDIT_CARD'}`);
        if (cardLast4) doc.text(`Card Last 4: **** **** **** ${cardLast4}`);
        if (cardHolder) doc.text(`Card Holder: ${cardHolder}`);
        doc.moveDown(0.5);

        doc.fontSize(16).text(`Amount Paid: Maloti M ${parseFloat(amount).toLocaleString()}`, { align: 'right' });
        doc.moveDown();

        doc.text('Thank you for your payment!', { align: 'center' });
        doc.text('This is your official receipt.', { underline: true, align: 'center' });
        doc.moveDown();

        // Footer
        doc.fontSize(10).text('WASCO Customer Service: +265 1 123 456', { align: 'center' });
        doc.text('Email: support@wasco.mw', { align: 'center' });

        doc.end();

        // Update payment with receipt path
        await pool.query('UPDATE payments SET receipt_path = $1 WHERE id = $2', [receiptPath, payment.id]);

        await pool.query(`
            UPDATE bills 
            SET payment_status = 'PAID', payment_date = CURRENT_DATE
            WHERE id = $1
        `, [billId]);
        
        res.json({ 
            success: true, 
            payment: { ...payment, receipt_path: receiptPath },
            message: 'Payment successful. Receipt generated.',
            receipt_url: `http://localhost:5000${receiptPath}` // Adjust for production
        });
    } catch (error) {
        console.error('Payment error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get all bills (Admin/Manager only)
router.get('/all', verifyToken, async (req, res) => {
    if (req.user.role === 'customer') {
        return res.status(403).json({ error: 'Unauthorized' });
    }
    
    try {
        const result = await pool.query(`
            SELECT b.*, c.name as customer_name, c.address
            FROM bills b
            JOIN customers c ON b.account_number = c.account_number
            ORDER BY b.month DESC
            LIMIT 100
        `);
        res.json(result.rows);
    } catch (error) {
        console.error('Get all bills error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get bill summary for a customer
router.get('/summary/:accountNumber', verifyToken, async (req, res) => {
    const { accountNumber } = req.params;
    
    try {
        const result = await pool.query(`
            SELECT 
                COUNT(*) as total_bills,
                SUM(CASE WHEN payment_status = 'PAID' THEN total_amount ELSE 0 END) as total_paid,
                SUM(CASE WHEN payment_status = 'UNPAID' THEN total_amount ELSE 0 END) as outstanding_balance,
                COUNT(CASE WHEN payment_status = 'UNPAID' THEN 1 END) as unpaid_count,
                COALESCE(AVG(total_amount), 0) as average_bill
            FROM bills
            WHERE account_number = $1
        `, [accountNumber]);
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Get summary error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Record water usage (legacy endpoint)
router.post('/usage', verifyToken, async (req, res) => {
    const { accountNumber, month, meterReading } = req.body;
    
    if (!accountNumber || !month || !meterReading) {
        return res.status(400).json({ error: 'Account number, month, and meter reading are required' });
    }
    
    try {
        const previousResult = await pool.query(`
            SELECT meter_reading FROM water_usage 
            WHERE account_number = $1 
            ORDER BY month DESC LIMIT 1
        `, [accountNumber]);
        
        const previousReading = previousResult.rows[0]?.meter_reading || 0;
        const consumption = meterReading - previousReading;
        
        const result = await pool.query(`
            INSERT INTO water_usage (account_number, month, meter_reading, previous_reading, consumption)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `, [accountNumber, month, meterReading, previousReading, consumption]);
        
        const amount = calculateBill(consumption);
        const billNumber = `WASCO${new Date().getFullYear()}${Math.floor(Math.random() * 10000)}`;
        
        const billResult = await pool.query(`
            INSERT INTO bills (bill_number, account_number, month, consumption, total_amount, due_date, payment_status)
            VALUES ($1, $2, $3, $4, $5, CURRENT_DATE + INTERVAL '30 days', 'UNPAID')
            RETURNING *
        `, [billNumber, accountNumber, month, consumption, amount]);
        
        res.json({ 
            success: true, 
            usage: result.rows[0], 
            bill: billResult.rows[0]
        });
    } catch (error) {
        console.error('Record usage error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get water usage history
router.get('/usage/:accountNumber', verifyToken, async (req, res) => {
    const { accountNumber } = req.params;
    
    try {
        const result = await pool.query(`
            SELECT * FROM water_usage 
            WHERE account_number = $1 
            ORDER BY month DESC
            LIMIT 12
        `, [accountNumber]);
        
        res.json(result.rows);
    } catch (error) {
        console.error('Get usage error:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET ALL WATER USAGE (Admin/Manager only) - FIXED ENDPOINT
router.get('/water-usage/all', verifyToken, async (req, res) => {
    if (req.user.role === 'customer') {
        return res.status(403).json({ error: 'Unauthorized' });
    }
    
    try {
        const result = await pool.query(`
            SELECT wu.*, c.name as customer_name
            FROM water_usage wu
            JOIN customers c ON wu.account_number = c.account_number
            ORDER BY wu.month DESC, wu.created_at DESC
        `);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching water usage:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET WATER USAGE FOR SPECIFIC CUSTOMER
router.get('/water-usage/customer/:accountNumber', verifyToken, async (req, res) => {
    const { accountNumber } = req.params;
    
    try {
        const result = await pool.query(`
            SELECT * FROM water_usage 
            WHERE account_number = $1 
            ORDER BY month DESC
        `, [accountNumber]);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching customer water usage:', error);
        res.status(500).json({ error: error.message });
    }
});

// RECORD NEW WATER USAGE - FIXED ENDPOINT
router.post('/water-usage', verifyToken, async (req, res) => {
    const { account_number, month, meter_reading } = req.body;
    
    if (!account_number || !month || !meter_reading) {
        return res.status(400).json({ error: 'Account number, month, and meter reading are required' });
    }
    
    try {
        // Get previous reading
        const previousResult = await pool.query(`
            SELECT meter_reading FROM water_usage 
            WHERE account_number = $1 
            ORDER BY month DESC LIMIT 1
        `, [account_number]);
        
        const previous_reading = previousResult.rows[0]?.meter_reading || 0;
        
        // Check if entry already exists for this month
        const existing = await pool.query(`
            SELECT id FROM water_usage 
            WHERE account_number = $1 AND month = $2
        `, [account_number, month]);
        
        if (existing.rows.length > 0) {
            return res.status(400).json({ error: 'Water usage already recorded for this month' });
        }
        
        const result = await pool.query(`
            INSERT INTO water_usage (account_number, month, meter_reading, previous_reading)
            VALUES ($1, $2, $3, $4)
            RETURNING *
        `, [account_number, month, meter_reading, previous_reading]);
        
        // Auto-generate bill based on consumption
        const consumption = meter_reading - previous_reading;
        if (consumption > 0) {
            const amount = calculateBill(consumption);
            const billNumber = `WASCO${new Date().getFullYear()}${Date.now()}`;
            
            await pool.query(`
                INSERT INTO bills (bill_number, account_number, month, consumption, total_amount, due_date, payment_status)
                VALUES ($1, $2, $3, $4, $5, CURRENT_DATE + INTERVAL '30 days', 'UNPAID')
            `, [billNumber, account_number, month, consumption, amount]);
        }
        
        res.json({ success: true, usage: result.rows[0] });
    } catch (error) {
        console.error('Error recording water usage:', error);
        res.status(500).json({ error: error.message });
    }
});

// Generate sample water usage data
router.post('/water-usage/generate-sample', verifyToken, async (req, res) => {
    const { accountNumber } = req.body;
    
    if (!accountNumber) {
        return res.status(400).json({ error: 'Account number is required' });
    }
    
    try {
        // Check if usage already exists
        const existing = await pool.query(
            'SELECT COUNT(*) FROM water_usage WHERE account_number = $1',
            [accountNumber]
        );
        
        if (parseInt(existing.rows[0].count) > 0) {
            return res.json({ 
                success: true, 
                message: 'Usage data already exists',
                count: existing.rows[0].count
            });
        }
        
        // Generate sample water usage for last 6 months
        const sampleData = [
            { month: '2025-01-01', reading: 1250, previous: 1200 },
            { month: '2025-02-01', reading: 1305, previous: 1250 },
            { month: '2025-03-01', reading: 1380, previous: 1305 },
            { month: '2025-04-01', reading: 1450, previous: 1380 },
            { month: '2025-05-01', reading: 1490, previous: 1450 },
            { month: '2025-06-01', reading: 1520, previous: 1490 }
        ];
        
        const inserted = [];
        for (const data of sampleData) {
            const consumption = data.reading - data.previous;
            const result = await pool.query(`
                INSERT INTO water_usage (account_number, month, meter_reading, previous_reading, consumption)
                VALUES ($1, $2, $3, $4, $5)
                RETURNING *
            `, [accountNumber, data.month, data.reading, data.previous, consumption]);
            inserted.push(result.rows[0]);
            
            // Also generate corresponding bills
            const amount = calculateBill(consumption);
            const billNumber = `WASCO${new Date(data.month).getFullYear()}${Math.floor(Math.random() * 10000)}`;
            
            await pool.query(`
                INSERT INTO bills (bill_number, account_number, month, consumption, total_amount, due_date, payment_status)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
            `, [billNumber, accountNumber, data.month, consumption, amount, new Date(data.month), 'UNPAID']);
        }
        
        res.json({ 
            success: true, 
            message: `Generated ${inserted.length} months of water usage data`,
            count: inserted.length
        });
    } catch (error) {
        console.error('Generate sample usage error:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;