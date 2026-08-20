const express = require('express');
const db = require('../config/database');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const result = await db.query('SELECT id, name, city, address FROM branches WHERE is_active = TRUE');
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;