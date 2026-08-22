const branchService = require('../services/branchService');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');

const getAllBranches = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, search, status, city } = req.query;
  
  const result = await branchService.getAllBranches({
    page: parseInt(page),
    limit: parseInt(limit),
    search,
    status,
    city,
  });
  
  res.json(ApiResponse.ok('Branches retrieved', result));
});

const getBranchById = asyncHandler(async (req, res) => {
  const branch = await branchService.getBranchById(req.params.id);
  res.json(ApiResponse.ok('Branch retrieved', branch));
});

const createBranch = asyncHandler(async (req, res) => {
  const branch = await branchService.createBranch(req.body, req.user.id);
  res.status(201).json(ApiResponse.created('Branch created', branch));
});

const updateBranch = asyncHandler(async (req, res) => {
  const branch = await branchService.updateBranch(req.params.id, req.body, req.user.id);
  res.json(ApiResponse.ok('Branch updated', branch));
});

const suspendBranch = asyncHandler(async (req, res) => {
  const branch = await branchService.suspendBranch(req.params.id, req.body.reason, req.user.id);
  res.json(ApiResponse.ok('Branch suspended', branch));
});

const activateBranch = asyncHandler(async (req, res) => {
  const branch = await branchService.activateBranch(req.params.id, req.user.id);
  res.json(ApiResponse.ok('Branch activated', branch));
});

module.exports = {
  getAllBranches,
  getBranchById,
  createBranch,
  updateBranch,
  suspendBranch,
  activateBranch,
};