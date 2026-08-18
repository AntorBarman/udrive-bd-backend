const express = require('express');
const bookingController = require('../controllers/bookingController');
const authMiddleware = require('../middlewares/auth');
const requireRole = require('../middlewares/requireRole');
const {
  validateCreateBooking,
  validateUpdateStatus,
} = require('../validators/bookingValidator');

const router = express.Router();

// Customer routes
router.post(
  '/',
  authMiddleware,
  requireRole('customer'),
  validateCreateBooking,
  bookingController.createBooking
);

router.get(
  '/my',
  authMiddleware,
  requireRole('customer'),
  bookingController.getMyBookings
);

router.get(
  '/:id',
  authMiddleware,
  bookingController.getBookingById
);

router.post(
  '/:id/cancel',
  authMiddleware,
  bookingController.cancelBooking
);

// Owner routes
router.get(
  '/owner/all',
  authMiddleware,
  requireRole('owner'),
  bookingController.getOwnerBookings
);

// Admin/Staff routes
router.patch(
  '/:id/status',
  authMiddleware,
  requireRole('staff', 'admin'),
  validateUpdateStatus,
  bookingController.updateBookingStatus
);

module.exports = router;