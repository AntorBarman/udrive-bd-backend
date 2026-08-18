const vehicleRepository = require('../repositories/vehicleRepository');
const cloudinary = require('../config/cloudinary');
const ApiError = require('../utils/ApiError');

class VehicleService {
  async createVehicle(vehicleData, ownerId) {
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
      status: 'pending', // Always pending until admin approval
    });
    
    return vehicle;
  }
  
  async getVehicleById(id) {
    const vehicle = await vehicleRepository.findById(id);
    
    if (!vehicle) {
      throw ApiError.notFound('Vehicle not found');
    }
    
    // Get images
    const images = await vehicleRepository.getImages(id);
    vehicle.images = images;
    
    return vehicle;
  }
  
  async getMyVehicles(ownerId) {
    return vehicleRepository.findByOwnerId(ownerId);
  }
  
  async updateVehicle(id, vehicleData, ownerId) {
    // Check vehicle exists
    const vehicle = await vehicleRepository.findById(id);
    
    if (!vehicle) {
      throw ApiError.notFound('Vehicle not found');
    }
    
    // Check ownership
    if (vehicle.owner_id !== ownerId) {
      throw ApiError.forbidden('You can only update your own vehicles');
    }
    
    // Update vehicle
    const updatedVehicle = await vehicleRepository.update(id, vehicleData);
    
    return updatedVehicle;
  }
  
  async deleteVehicle(id, ownerId) {
    // Check vehicle exists
    const vehicle = await vehicleRepository.findById(id);
    
    if (!vehicle) {
      throw ApiError.notFound('Vehicle not found');
    }
    
    // Check ownership
    if (vehicle.owner_id !== ownerId) {
      throw ApiError.forbidden('You can only delete your own vehicles');
    }
    
    // Check active bookings
    const hasBookings = await vehicleRepository.hasActiveBookings(id);
    if (hasBookings) {
      throw ApiError.conflict('Cannot delete vehicle with active bookings');
    }
    
    // Soft delete
    await vehicleRepository.softDelete(id);
    
    return true;
  }
  
  async uploadImages(vehicleId, files, ownerId) {
    // Check vehicle exists
    const vehicle = await vehicleRepository.findById(vehicleId);
    
    if (!vehicle) {
      throw ApiError.notFound('Vehicle not found');
    }
    
    // Check ownership
    if (vehicle.owner_id !== ownerId) {
      throw ApiError.forbidden('You can only upload images for your own vehicles');
    }
    
    // Upload each file
    const uploadedImages = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      const image = await vehicleRepository.addImage(
        vehicleId,
        file.path, // Cloudinary URL
        file.filename, // Cloudinary public ID
        i === 0, // First image is primary
        i // Display order
      );
      
      uploadedImages.push(image);
    }
    
    return uploadedImages;
  }
  
  async deleteImage(imageId, ownerId) {
    // Get image
    const images = await vehicleRepository.getImages(imageId);
    // Note: This is simplified - in production, check properly
    
    // Delete from Cloudinary
    // await cloudinary.uploader.destroy(image.public_id);
    
    // Delete from database
    const deleted = await vehicleRepository.deleteImage(imageId);
    
    return deleted;
  }
  
  async searchVehicles(filters) {
    return vehicleRepository.search(filters);
  }
}

module.exports = new VehicleService();