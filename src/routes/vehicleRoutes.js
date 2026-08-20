const express = require('express');
const vehicleController = require('../controllers/vehicleController');
const authMiddleware = require('../middlewares/auth');
const requireRole = require('../middlewares/requireRole');
const upload = require('../middlewares/upload');
const {
  validateCreateVehicle,
  validateUpdateVehicle,
  validateSearchQuery,
} = require('../validators/vehicleValidator');

const router = express.Router();

// ============================================
// ✅ SPECIFIC ROUTES FIRST
// ============================================

// Owner: My vehicles (BEFORE /:id)
router.get(
  '/my',
  authMiddleware,
  requireRole('owner'),
  vehicleController.getMyVehicles
);

// Owner: Upload images (BEFORE /:id)
router.post(
  '/:id/images',
  authMiddleware,
  requireRole('owner'),
  upload.array('images', 5),
  vehicleController.uploadImages
);

// ============================================
// ✅ COLLECTION ROUTES
// ============================================

// Public: Search vehicles
router.get(
  '/',
  validateSearchQuery,
  vehicleController.searchVehicles
);

// Owner: Create vehicle
router.post(
  '/',
  authMiddleware,
  requireRole('owner'),
  validateCreateVehicle,
  vehicleController.createVehicle
);

// ============================================
// ✅ DYNAMIC ROUTES LAST
// ============================================

// Owner: Update vehicle
router.patch(
  '/:id',
  authMiddleware,
  requireRole('owner'),
  validateUpdateVehicle,
  vehicleController.updateVehicle
);

// Owner: Delete vehicle
router.delete(
  '/:id',
  authMiddleware,
  requireRole('owner'),
  vehicleController.deleteVehicle
);

// Public: Get single vehicle (LAST!)
router.get(
  '/:id',
  vehicleController.getVehicleById
);

module.exports = router;