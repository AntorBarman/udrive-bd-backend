const express = require('express');
const adminController = require('../controllers/adminController');
const authMiddleware = require('../middlewares/auth');
const requireRole = require('../middlewares/requireRole');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');
const db = require('../config/database');

const router = express.Router();

// All routes require admin/staff
router.use(authMiddleware, requireRole('admin', 'staff'));

// ============ DASHBOARD STATS ============
router.get('/stats', adminController.getStats);

// ============ VEHICLES ============
router.get('/vehicles', adminController.getAllVehicles);
router.get('/vehicles/pending', adminController.getPendingVehicles);
router.patch('/vehicles/:id/approve', adminController.approveVehicle);
router.patch('/vehicles/:id/reject', adminController.rejectVehicle);
router.patch('/vehicles/:id/suspend', adminController.suspendVehicle);

// ============ BOOKINGS ============
router.get('/bookings', asyncHandler(async (req, res) => {
  const result = await db.query(`
    SELECT b.*, 
           c.name as customer_name,
           v.brand, v.model, v.year,
           o.name as owner_name
    FROM bookings b
    JOIN users c ON b.customer_id = c.id
    JOIN vehicles v ON b.vehicle_id = v.id
    JOIN users o ON v.owner_id = o.id
    ORDER BY b.created_at DESC
  `);
  
  res.json(ApiResponse.ok('Bookings retrieved', result.rows));
}));

// ============ PAYMENTS ============
router.get('/payments', asyncHandler(async (req, res) => {
  const result = await db.query(`
    SELECT p.*, 
           u.name as customer_name,
           b.id as booking_id
    FROM payments p
    JOIN users u ON p.user_id = u.id
    LEFT JOIN bookings b ON p.booking_id = b.id
    ORDER BY p.created_at DESC
  `);
  
  res.json(ApiResponse.ok('Payments retrieved', result.rows));
}));

// ============ USERS ============
router.get('/users', asyncHandler(async (req, res) => {
  const result = await db.query(`
    SELECT id, name, email, phone, role, is_active, is_email_verified, created_at
    FROM users
    ORDER BY created_at DESC
  `);
  
  res.json(ApiResponse.ok('Users retrieved', result.rows));
}));

// ============ KYC ============
router.get('/kyc', asyncHandler(async (req, res) => {
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

router.patch('/kyc/:id/approve', asyncHandler(async (req, res) => {
  const result = await db.query(
    `UPDATE documents SET status = 'approved', verified_by = $1, verified_at = CURRENT_TIMESTAMP 
     WHERE id = $2 RETURNING *`,
    [req.user.id, req.params.id]
  );
  
  if (result.rows.length === 0) {
    return res.status(404).json({ success: false, message: 'Document not found' });
  }
  
  res.json(ApiResponse.ok('Document approved', result.rows[0]));
}));

router.patch('/kyc/:id/reject', asyncHandler(async (req, res) => {
  const { reason } = req.body;
  
  if (!reason) {
    return res.status(400).json({ success: false, message: 'Rejection reason required' });
  }
  
  const result = await db.query(
    `UPDATE documents SET status = 'rejected', rejection_reason = $1, verified_by = $2, verified_at = CURRENT_TIMESTAMP 
     WHERE id = $3 RETURNING *`,
    [reason, req.user.id, req.params.id]
  );
  
  if (result.rows.length === 0) {
    return res.status(404).json({ success: false, message: 'Document not found' });
  }
  
  res.json(ApiResponse.ok('Document rejected', result.rows[0]));
}));

// Get user bookings
router.get('/users/:id/bookings', asyncHandler(async (req, res) => {
  const result = await db.query(`
    SELECT b.*, v.brand, v.model, v.year
    FROM bookings b
    JOIN vehicles v ON b.vehicle_id = v.id
    WHERE b.customer_id = $1
    ORDER BY b.created_at DESC
  `, [req.params.id]);
  
  res.json(ApiResponse.ok('User bookings retrieved', result.rows));
}));

// Suspend user
router.patch('/users/:id/suspend', asyncHandler(async (req, res) => {
  const result = await db.query(
    `UPDATE users SET is_active = FALSE WHERE id = $1 RETURNING id, name, is_active`,
    [req.params.id]
  );
  
  if (result.rows.length === 0) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }
  
  res.json(ApiResponse.ok('User suspended', result.rows[0]));
}));

// Activate user
router.patch('/users/:id/activate', asyncHandler(async (req, res) => {
  const result = await db.query(
    `UPDATE users SET is_active = TRUE WHERE id = $1 RETURNING id, name, is_active`,
    [req.params.id]
  );
  
  if (result.rows.length === 0) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }
  
  res.json(ApiResponse.ok('User activated', result.rows[0]));
}));

router.get('/audit-logs', asyncHandler(async (req, res) => {
  const result = await db.query(`
    SELECT al.*, u.name as actor_name
    FROM audit_logs al
    LEFT JOIN users u ON al.user_id = u.id
    ORDER BY al.created_at DESC
    LIMIT 200
  `);
  
  res.json(ApiResponse.ok('Audit logs retrieved', result.rows));
}));

module.exports = router;