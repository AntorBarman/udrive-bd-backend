const express = require('express');
const adminController = require('../controllers/adminController');
const authMiddleware = require('../middlewares/auth');
const requireRole = require('../middlewares/requireRole');

const router = express.Router();

// All admin routes require admin or staff role
router.use(authMiddleware, requireRole('admin', 'staff'));

// Stats
router.get('/stats', adminController.getStats);

// Vehicle management
router.get('/vehicles', adminController.getAllVehicles);
router.get('/vehicles/pending', adminController.getPendingVehicles);
router.patch('/vehicles/:id/approve', adminController.approveVehicle);
router.patch('/vehicles/:id/reject', adminController.rejectVehicle);
router.patch('/vehicles/:id/suspend', adminController.suspendVehicle);

module.exports = router;