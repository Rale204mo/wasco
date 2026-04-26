const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authenticateToken, requireAdmin } = require('./auth');

// Get all billing rates (public)
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM billing_rates ORDER BY min_usage ASC'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching billing rates:', error);
    res.status(500).json({ error: 'Failed to fetch billing rates' });
  }
});

// Create new billing rate (admin/manager only)
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { tier, min_usage, max_usage, cost_per_unit } = req.body;

    if (!tier || cost_per_unit === undefined || cost_per_unit === null) {
      return res.status(400).json({ error: 'Tier and cost per unit are required' });
    }

    const result = await pool.query(
      `INSERT INTO billing_rates (tier, min_usage, max_usage, cost_per_unit)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [tier, min_usage || 0, max_usage || null, cost_per_unit]
    );

    res.status(201).json({ success: true, rate: result.rows[0] });
  } catch (error) {
    console.error('Error creating billing rate:', error);
    res.status(500).json({ error: 'Failed to create billing rate' });
  }
});

// Update billing rate (admin/manager only)
router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { tier, min_usage, max_usage, cost_per_unit } = req.body;

    const result = await pool.query(
      `UPDATE billing_rates 
       SET tier = $1, min_usage = $2, max_usage = $3, cost_per_unit = $4
       WHERE id = $5 RETURNING *`,
      [tier, min_usage || 0, max_usage || null, cost_per_unit, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Billing rate not found' });
    }

    res.json({ success: true, rate: result.rows[0] });
  } catch (error) {
    console.error('Error updating billing rate:', error);
    res.status(500).json({ error: 'Failed to update billing rate' });
  }
});

// Delete billing rate (admin/manager only)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM billing_rates WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Billing rate not found' });
    }

    res.json({ success: true, message: 'Billing rate deleted' });
  } catch (error) {
    console.error('Error deleting billing rate:', error);
    res.status(500).json({ error: 'Failed to delete billing rate' });
  }
});

module.exports = router;

