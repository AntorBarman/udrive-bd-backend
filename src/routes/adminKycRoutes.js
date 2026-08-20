const express = require('express');
const authMiddleware = require('../middlewares/auth');
const requireRole = require('../middlewares/requireRole');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');
const db = require('../config/database');

const router = express.Router();

// All routes require admin/staff
router.use(authMiddleware, requireRole('admin', 'staff'));

// Get all KYC documents
router.get('/', asyncHandler(async (req, res) => {
  const result = await db.query(`
    SELECT d.*, u.name as user_name, u.email as user_email, u.phone as user_phone
    FROM documents d
    JOIN users u ON d.user_id = u.id
    ORDER BY 
      CASE d.status WHEN 'pending' THEN 0 WHEN 'approved' THEN 1 ELSE 2 END,
      d.created_at ASC
  `);
  
  res.json(ApiResponse.ok('KYC documents retrieved', result.rows));
}));

// Approve document
router.patch('/:id/approve', asyncHandler(async (req, res) => {
  const result = await db.query(
    `UPDATE documents 
     SET status = 'approved', verified_by = $1, verified_at = CURRENT_TIMESTAMP 
     WHERE id = $2 RETURNING *`,
    [req.user.id, req.params.id]
  );
  
  if (result.rows.length === 0) {
    return res.status(404).json({ success: false, message: 'Document not found' });
  }
  
  res.json(ApiResponse.ok('Document approved', result.rows[0]));
}));

// Reject document
router.patch('/:id/reject', asyncHandler(async (req, res) => {
  const { reason } = req.body;
  
  if (!reason) {
    return res.status(400).json({ success: false, message: 'Rejection reason required' });
  }
  
  const result = await db.query(
    `UPDATE documents 
     SET status = 'rejected', rejection_reason = $1, verified_by = $2, verified_at = CURRENT_TIMESTAMP 
     WHERE id = $3 RETURNING *`,
    [reason, req.user.id, req.params.id]
  );
  
  if (result.rows.length === 0) {
    return res.status(404).json({ success: false, message: 'Document not found' });
  }
  
  res.json(ApiResponse.ok('Document rejected', result.rows[0]));
}));

module.exports = router;