const express = require('express');
const authMiddleware = require('../middlewares/auth');
const requireRole = require('../middlewares/requireRole');
const branchController = require('../controllers/branchController');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');
const db = require('../config/database');

const router = express.Router();

// Public: Get active branches
router.get('/', asyncHandler(async (req, res) => {
  const result = await db.query('SELECT * FROM branches WHERE is_active = TRUE ORDER BY name');
  res.json(ApiResponse.ok('Branches retrieved', result.rows));
}));

// Admin routes
router.get('/admin/all', authMiddleware, requireRole('admin', 'staff'), branchController.getAllBranches);
router.get('/admin/:id', authMiddleware, requireRole('admin', 'staff'), branchController.getBranchById);
router.post('/admin', authMiddleware, requireRole('admin'), branchController.createBranch);
router.patch('/admin/:id', authMiddleware, requireRole('admin'), branchController.updateBranch);
router.patch('/admin/:id/suspend', authMiddleware, requireRole('admin'), branchController.suspendBranch);
router.patch('/admin/:id/activate', authMiddleware, requireRole('admin'), branchController.activateBranch);

module.exports = router;