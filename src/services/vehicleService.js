const vehicleRepository = require('../repositories/vehicleRepository');
const db = require('../config/database');
const ApiError = require('../utils/ApiError');

class VehicleService {
  async createVehicle(vehicleData, ownerId) {
    // ✅ OWNER KYC CHECK
    const kycResult = await db.query(
      `SELECT COUNT(*) as approved_count 
       FROM documents 
       WHERE user_id = $1 AND status = 'approved'`,
      [ownerId]
    );
    
    const approvedCount = parseInt(kycResult.rows[0].approved_count);
    
    if (approvedCount < 2) {
      throw ApiError.forbidden('KYC verification required before adding vehicles');
    }
    
    // Business validation
    if (vehicleData.daily_rate < 500) {
      throw ApiError.badRequest('Daily rate must be at least ৳500');
    }
    
    if (vehicleData.deposit_amount < vehicleData.daily_rate * 2) {
      throw ApiError.badRequest('Deposit amount must be at least 2x daily rate');
    }
    
    // Create vehicle
    const vehicle = await vehicleRepository.create({
      ...vehicleData,
      ownerId,
      status: 'pending',
    });
    
    return vehicle;
  }
  
  async getVehicleById(id) {
    const vehicle = await vehicleRepository.findById(id);
    
    if (!vehicle) {
      throw ApiError.notFound('Vehicle not found');
    }
    
    const images = await vehicleRepository.getImages(id);
    vehicle.images = images;
    
    return vehicle;
  }
  
  async getMyVehicles(ownerId) {
    return vehicleRepository.findByOwnerId(ownerId);
  }
  
  async updateVehicle(id, vehicleData, ownerId) {
    const vehicle = await vehicleRepository.findById(id);
    
    if (!vehicle) {
      throw ApiError.notFound('Vehicle not found');
    }
    
    if (vehicle.owner_id !== ownerId) {
      throw ApiError.forbidden('You can only update your own vehicles');
    }
    
    return vehicleRepository.update(id, vehicleData);
  }
  
  async deleteVehicle(id, ownerId) {
    const vehicle = await vehicleRepository.findById(id);
    
    if (!vehicle) {
      throw ApiError.notFound('Vehicle not found');
    }
    
    if (vehicle.owner_id !== ownerId) {
      throw ApiError.forbidden('You can only delete your own vehicles');
    }
    
    const hasBookings = await vehicleRepository.hasActiveBookings(id);
    if (hasBookings) {
      throw ApiError.conflict('Cannot delete vehicle with active bookings');
    }
    
    await vehicleRepository.softDelete(id);
    return true;
  }
  
  async uploadImages(vehicleId, files, ownerId) {
    const vehicle = await vehicleRepository.findById(vehicleId);
    
    if (!vehicle) {
      throw ApiError.notFound('Vehicle not found');
    }
    
    if (vehicle.owner_id !== ownerId) {
      throw ApiError.forbidden('You can only upload images for your own vehicles');
    }
    
    const uploadedImages = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      const image = await vehicleRepository.addImage(
        vehicleId,
        file.path || file.filename,
        file.filename || file.public_id,
        i === 0,
        i
      );
      
      uploadedImages.push(image);
    }
    
    return uploadedImages;
  }
  
  async searchVehicles(filters) {
    return vehicleRepository.search(filters);
  }
}

module.exports = new VehicleService();