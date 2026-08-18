const bookingService = require('../services/bookingService');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');

const createBooking = asyncHandler(async (req, res) => {
  const booking = await bookingService.createBooking(req.body, req.user.id);
  
  res.status(201).json(
    ApiResponse.created('Booking created successfully', booking)
  );
});

const getBookingById = asyncHandler(async (req, res) => {
  const booking = await bookingService.getBookingById(
    req.params.id,
    req.user.id,
    req.user.role
  );
  
  res.status(200).json(
    ApiResponse.ok('Booking retrieved successfully', booking)
  );
});

const getMyBookings = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  
  const result = await bookingService.getMyBookings(
    req.user.id,
    parseInt(page),
    parseInt(limit)
  );
  
  res.status(200).json(
    ApiResponse.ok('Bookings retrieved successfully', result.bookings)
  );
});

const getOwnerBookings = asyncHandler(async (req, res) => {
  const bookings = await bookingService.getOwnerBookings(req.user.id);
  
  res.status(200).json(
    ApiResponse.ok('Owner bookings retrieved successfully', bookings)
  );
});

const cancelBooking = asyncHandler(async (req, res) => {
  const booking = await bookingService.cancelBooking(
    req.params.id,
    req.user.id,
    req.user.role,
    req.body.cancel_reason || ''
  );
  
  res.status(200).json(
    ApiResponse.ok('Booking cancelled successfully', booking)
  );
});

const updateBookingStatus = asyncHandler(async (req, res) => {
  const booking = await bookingService.updateBookingStatus(
    req.params.id,
    req.body.status,
    req.user.id,
    req.user.role
  );
  
  res.status(200).json(
    ApiResponse.ok('Booking status updated successfully', booking)
  );
});

module.exports = {
  createBooking,
  getBookingById,
  getMyBookings,
  getOwnerBookings,
  cancelBooking,
  updateBookingStatus,
};