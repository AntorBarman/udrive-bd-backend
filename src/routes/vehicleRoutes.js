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

// Public routes
router.get('/', validateSearchQuery, vehicleController.searchVehicles);
router.get('/:id', vehicleController.getVehicleById);

// Owner routes (protected)
router.post(
  '/',
  authMiddleware,
  requireRole('owner'),
  validateCreateVehicle,
  vehicleController.createVehicle
);

router.get('/my', 
  authMiddleware, 
  requireRole('owner'), 
  vehicleController.getMyVehicles
);

router.patch(
  '/:id',
  authMiddleware,
  requireRole('owner'),
  validateUpdateVehicle,
  vehicleController.updateVehicle
);

router.delete(
  '/:id',
  authMiddleware,
  requireRole('owner'),
  vehicleController.deleteVehicle
);

router.post(
  '/:id/images',
  authMiddleware,
  requireRole('owner'),
  upload.array('images', 5),
  vehicleController.uploadImages
);

module.exports = router;