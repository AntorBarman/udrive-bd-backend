const bookingRepository = require('../repositories/bookingRepository');
const vehicleRepository = require('../repositories/vehicleRepository');
const ApiError = require('../utils/ApiError');

class BookingService {
  async createBooking(bookingData, customerId) {
    try {
      const booking = await bookingRepository.createWithTransaction({
        ...bookingData,
        customerId,
        vehicleId: bookingData.vehicle_id,
        pickupDate: bookingData.pickup_date,
        returnDate: bookingData.return_date,
        pickupTime: bookingData.pickup_time || '10:00',
        returnTime: bookingData.return_time || '10:00',
      });
      
      return booking;
    } catch (error) {
      if (error.message === 'Vehicle not available for booking') {
        throw ApiError.notFound('Vehicle not available for booking');
      }
      if (error.message === 'Vehicle already booked for these dates') {
        throw ApiError.conflict('Vehicle already booked for these dates');
      }
      throw error;
    }
  }
  
  async getBookingById(id, userId, userRole) {
    const booking = await bookingRepository.findById(id);
    
    if (!booking) {
      throw ApiError.notFound('Booking not found');
    }
    
    // Authorization check
    const isCustomer = booking.customer_id === userId;
    const isOwner = booking.owner_id === userId;
    const isStaffOrAdmin = ['staff', 'admin'].includes(userRole);
    
    if (!isCustomer && !isOwner && !isStaffOrAdmin) {
      throw ApiError.forbidden('You do not have permission to view this booking');
    }
    
    return booking;
  }
  
  async getMyBookings(customerId, page, limit) {
    return bookingRepository.findByCustomerId(customerId, page, limit);
  }
  
  async getOwnerBookings(ownerId) {
    return bookingRepository.findByOwnerId(ownerId);
  }
  
  async cancelBooking(id, userId, userRole, cancelReason = '') {
    const booking = await bookingRepository.findById(id);
    
    if (!booking) {
      throw ApiError.notFound('Booking not found');
    }
    
    // Authorization check
    const isCustomer = booking.customer_id === userId;
    const isStaffOrAdmin = ['staff', 'admin'].includes(userRole);
    
    if (!isCustomer && !isStaffOrAdmin) {
      throw ApiError.forbidden('You do not have permission to cancel this booking');
    }
    
    // Check if already cancelled
    if (booking.status === 'cancelled') {
      throw ApiError.badRequest('Booking is already cancelled');
    }
    
    // Check if completed
    if (booking.status === 'completed') {
      throw ApiError.badRequest('Completed booking cannot be cancelled');
    }
    
    // Cancellation policy check
    const now = new Date();
    const pickupDate = new Date(booking.pickup_date);
    const hoursUntilPickup = (pickupDate - now) / (1000 * 60 * 60);
    
    // Simple policy: 24 hours আগে free cancel
    if (hoursUntilPickup < 24 && booking.status === 'confirmed') {
      throw ApiError.badRequest('Cancellation is only allowed 24 hours before pickup');
    }
    
    // Update booking status
    const updatedBooking = await bookingRepository.updateStatus(id, 'cancelled', {
      cancelReason,
      cancelledBy: userId,
      cancelledAt: new Date(),
    });
    
    return updatedBooking;
  }
  
  async updateBookingStatus(id, newStatus, userId, userRole) {
    const booking = await bookingRepository.findById(id);
    
    if (!booking) {
      throw ApiError.notFound('Booking not found');
    }
    
    // Authorization check
    const isStaffOrAdmin = ['staff', 'admin'].includes(userRole);
    if (!isStaffOrAdmin) {
      throw ApiError.forbidden('Only staff or admin can update booking status');
    }
    
    // Validate status transition
    const currentStatus = booking.status;
    const validTransitions = {
      'pending_payment': ['confirmed', 'cancelled', 'expired'],
      'confirmed': ['ongoing', 'cancelled'],
      'ongoing': ['completed'],
      'completed': [],
      'cancelled': [],
      'expired': [],
    };
    
    if (!validTransitions[currentStatus].includes(newStatus)) {
      throw ApiError.badRequest(
        `Invalid status transition: ${currentStatus} → ${newStatus}`
      );
    }
    
    // Update status
    const updateData = {};
    
    if (newStatus === 'ongoing') {
      updateData.actualPickupTime = new Date();
    }
    
    if (newStatus === 'completed') {
      updateData.actualReturnTime = new Date();
    }
    
    const updatedBooking = await bookingRepository.updateStatus(id, newStatus, updateData);
    
    return updatedBooking;
  }
}

module.exports = new BookingService();