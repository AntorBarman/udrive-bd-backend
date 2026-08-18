const Joi = require('joi');

const createBookingSchema = Joi.object({
  vehicle_id: Joi.string()
    .uuid()
    .required()
    .messages({
      'string.empty': 'Vehicle ID is required',
      'string.guid': 'Invalid vehicle ID',
    }),
  
  pickup_date: Joi.date()
    .iso()
    .greater('now')
    .required()
    .messages({
      'date.base': 'Invalid pickup date',
      'date.greater': 'Pickup date must be in the future',
    }),
  
  return_date: Joi.date()
    .iso()
    .greater(Joi.ref('pickup_date'))
    .required()
    .messages({
      'date.base': 'Invalid return date',
      'date.greater': 'Return date must be after pickup date',
    }),
  
  pickup_time: Joi.string()
    .pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .default('10:00')
    .messages({
      'string.pattern.base': 'Invalid pickup time format (HH:MM)',
    }),
  
  return_time: Joi.string()
    .pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .default('10:00')
    .messages({
      'string.pattern.base': 'Invalid return time format (HH:MM)',
    }),
});

const updateBookingStatusSchema = Joi.object({
  status: Joi.string()
    .valid('confirmed', 'ongoing', 'completed', 'cancelled')
    .required()
    .messages({
      'any.only': 'Invalid status',
    }),
  
  cancel_reason: Joi.string()
    .optional()
    .allow('')
    .max(500),
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

module.exports = {
  validateCreateBooking: validate(createBookingSchema),
  validateUpdateStatus: validate(updateBookingStatusSchema),
};