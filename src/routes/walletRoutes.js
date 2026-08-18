const express = require('express');
const walletController = require('../controllers/walletController');
const authMiddleware = require('../middlewares/auth');

const router = express.Router();

router.get('/balance', authMiddleware, walletController.getBalance);
router.get('/transactions', authMiddleware, walletController.getTransactions);

module.exports = router;