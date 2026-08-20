const Joi = require('joi');  // ✅ Joi import থাকতে হবে

const createBookingSchema = Joi.object({
  vehicle_id: Joi.string().uuid().required(),
  pickup_date: Joi.date().iso().required(),
  return_date: Joi.date().iso().required(),
  pickup_time: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).default('10:00'),
  return_time: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).default('10:00'),
});

const updateBookingStatusSchema = Joi.object({
  status: Joi.string().valid('confirmed', 'ongoing', 'completed', 'cancelled').required(),
  cancel_reason: Joi.string().optional().allow('').max(500),
});

const validate = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });
    
    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));
      
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors,
      });
    }
    
    req.body = value;
    next();
  };
};

// ✅ Both validators must be exported
module.exports = {
  validateCreateBooking: validate(createBookingSchema),
  validateUpdateStatus: validate(updateBookingStatusSchema),
};