const Joi = require('joi');

const initiatePaymentSchema = Joi.object({
  booking_id: Joi.string()
    .uuid()
    .required()
    .messages({
      'string.empty': 'Booking ID is required',
      'string.guid': 'Invalid booking ID format',
      'any.required': 'Booking ID is required',
    }),
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
  validateInitiatePayment: validate(initiatePaymentSchema),
};