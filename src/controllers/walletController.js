const walletService = require('../services/walletService');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');

const getBalance = asyncHandler(async (req, res) => {
  const balance = await walletService.getUserBalance(req.user.id);
  
  res.status(200).json(
    ApiResponse.ok('Balance retrieved', balance)
  );
});

const getTransactions = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  
  const result = await walletService.getUserTransactions(
    req.user.id,
    parseInt(page),
    parseInt(limit)
  );
  
  res.status(200).json(
    ApiResponse.ok('Transactions retrieved', result.transactions)
  );
});

module.exports = {
  getBalance,
  getTransactions,
};