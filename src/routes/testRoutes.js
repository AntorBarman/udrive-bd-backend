const express = require('express');
const authMiddleware = require('../middlewares/auth');
const requireRole = require('../middlewares/requireRole');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

// Protected route (any authenticated user)
router.get('/protected', authMiddleware, asyncHandler(async (req, res) => {
  res.status(200).json(ApiResponse.ok('You are authenticated', { user: req.user }));
}));

// Customer only route
router.get('/customer-only', authMiddleware, requireRole('customer'), asyncHandler(async (req, res) => {
  res.status(200).json(ApiResponse.ok('Customer access granted'));
}));

// Owner only route
router.get('/owner-only', authMiddleware, requireRole('owner'), asyncHandler(async (req, res) => {
  res.status(200).json(ApiResponse.ok('Owner access granted'));
}));

module.exports = router;