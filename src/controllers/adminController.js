const adminService = require('../services/adminService');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');

const getPendingVehicles = asyncHandler(async (req, res) => {
  const vehicles = await adminService.getPendingVehicles();
  
  res.status(200).json(
    ApiResponse.ok('Pending vehicles retrieved', vehicles)
  );
});

const getAllVehicles = asyncHandler(async (req, res) => {
  const vehicles = await adminService.getAllVehicles();
  
  res.status(200).json(
    ApiResponse.ok('All vehicles retrieved', vehicles)
  );
});

const approveVehicle = asyncHandler(async (req, res) => {
  const vehicle = await adminService.approveVehicle(req.params.id, req.user.id);
  
  res.status(200).json(
    ApiResponse.ok('Vehicle approved successfully', vehicle)
  );
});

const rejectVehicle = asyncHandler(async (req, res) => {
  const vehicle = await adminService.rejectVehicle(
    req.params.id,
    req.user.id,
    req.body.reason
  );
  
  res.status(200).json(
    ApiResponse.ok('Vehicle rejected', vehicle)
  );
});

const suspendVehicle = asyncHandler(async (req, res) => {
  const vehicle = await adminService.suspendVehicle(req.params.id, req.user.id);
  
  res.status(200).json(
    ApiResponse.ok('Vehicle suspended', vehicle)
  );
});

const getStats = asyncHandler(async (req, res) => {
  const stats = await adminService.getAdminStats();
  
  res.status(200).json(
    ApiResponse.ok('Admin stats retrieved', stats)
  );
});

module.exports = {
  getPendingVehicles,
  getAllVehicles,
  approveVehicle,
  rejectVehicle,
  suspendVehicle,
  getStats,
};