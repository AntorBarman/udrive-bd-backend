const express = require('express');
const paymentController = require('../controllers/paymentController');
const authMiddleware = require('../middlewares/auth');

const router = express.Router();

// Protected routes
router.post('/initiate', authMiddleware, paymentController.initiatePayment);
router.get('/status/:bookingId', authMiddleware, paymentController.getPaymentStatus);

// SSLCommerz callback routes (no auth required - gateway redirects here)
router.post('/success', paymentController.paymentSuccess);
router.post('/fail', paymentController.paymentFail);
router.post('/cancel', paymentController.paymentCancel);
router.post('/ipn', paymentController.paymentIPN);

module.exports = router;