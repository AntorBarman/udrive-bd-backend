const vehicleService = require('../services/vehicleService');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');

const createVehicle = asyncHandler(async (req, res) => {
  const vehicle = await vehicleService.createVehicle(req.body, req.user.id);
  
  res.status(201).json(
    ApiResponse.created('Vehicle created successfully', vehicle)
  );
});

const getVehicleById = asyncHandler(async (req, res) => {
  const vehicle = await vehicleService.getVehicleById(req.params.id);
  
  res.status(200).json(
    ApiResponse.ok('Vehicle retrieved successfully', vehicle)
  );
});

const getMyVehicles = asyncHandler(async (req, res) => {
  const vehicles = await vehicleService.getMyVehicles(req.user.id);
  
  res.status(200).json(
    ApiResponse.ok('Vehicles retrieved successfully', vehicles)
  );
});

const updateVehicle = asyncHandler(async (req, res) => {
  const vehicle = await vehicleService.updateVehicle(req.params.id, req.body, req.user.id);
  
  res.status(200).json(
    ApiResponse.ok('Vehicle updated successfully', vehicle)
  );
});

const deleteVehicle = asyncHandler(async (req, res) => {
  await vehicleService.deleteVehicle(req.params.id, req.user.id);
  
  res.status(200).json(
    ApiResponse.ok('Vehicle deleted successfully')
  );
});

const uploadImages = asyncHandler(async (req, res) => {
  const images = await vehicleService.uploadImages(
    req.params.id,
    req.files,
    req.user.id
  );
  
  res.status(201).json(
    ApiResponse.created('Images uploaded successfully', images)
  );
});

const searchVehicles = asyncHandler(async (req, res) => {
  const result = await vehicleService.searchVehicles(req.query);
  
  res.status(200).json(
    ApiResponse.ok('Vehicles retrieved successfully', result.vehicles, result.pagination)
  );
});

module.exports = {
  createVehicle,
  getVehicleById,
  getMyVehicles,
  updateVehicle,
  deleteVehicle,
  uploadImages,
  searchVehicles,
};