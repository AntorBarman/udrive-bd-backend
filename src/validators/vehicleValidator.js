const Joi = require('joi');

const createVehicleSchema = Joi.object({
  brand: Joi.string()
    .required()
    .messages({
      'string.empty': 'Brand is required',
    }),
  
  model: Joi.string()
    .required()
    .messages({
      'string.empty': 'Model is required',
    }),
  
  year: Joi.number()
    .integer()
    .min(2000)
    .max(new Date().getFullYear() + 1)
    .required()
    .messages({
      'number.base': 'Year must be a number',
      'number.min': 'Year must be at least 2000',
      'number.max': `Year cannot be more than ${new Date().getFullYear() + 1}`,
    }),
  
  vehicle_type: Joi.string()
    .valid('sedan', 'suv', 'hatchback', 'microbus', 'pickup', 'luxury')
    .required()
    .messages({
      'any.only': 'Invalid vehicle type',
    }),
  
  transmission: Joi.string()
    .valid('automatic', 'manual')
    .required()
    .messages({
      'any.only': 'Transmission must be automatic or manual',
    }),
  
  fuel_type: Joi.string()
    .valid('petrol', 'diesel', 'cng', 'hybrid', 'electric')
    .required()
    .messages({
      'any.only': 'Invalid fuel type',
    }),
  
  seats: Joi.number()
    .integer()
    .min(2)
    .max(15)
    .required()
    .messages({
      'number.base': 'Seats must be a number',
      'number.min': 'Minimum 2 seats',
      'number.max': 'Maximum 15 seats',
    }),
  
  color: Joi.string()
    .optional()
    .allow(''),
  
  registration_number: Joi.string()
    .optional()
    .allow(''),
  
  description: Joi.string()
    .optional()
    .allow('')
    .max(1000),
  
  daily_rate: Joi.number()
    .min(500)
    .required()
    .messages({
      'number.base': 'Daily rate must be a number',
      'number.min': 'Daily rate must be at least ৳500',
    }),
  
  deposit_amount: Joi.number()
    .min(1000)
    .required()
    .messages({
      'number.base': 'Deposit amount must be a number',
      'number.min': 'Deposit amount must be at least ৳1000',
    }),
  
  branch_id: Joi.string()
    .uuid()
    .required()
    .messages({
      'string.empty': 'Branch is required',
      'string.guid': 'Invalid branch ID',
    }),
});

const updateVehicleSchema = Joi.object({
  brand: Joi.string().optional(),
  model: Joi.string().optional(),
  year: Joi.number().integer().min(2000).max(new Date().getFullYear() + 1).optional(),
  vehicle_type: Joi.string().valid('sedan', 'suv', 'hatchback', 'microbus', 'pickup', 'luxury').optional(),
  transmission: Joi.string().valid('automatic', 'manual').optional(),
  fuel_type: Joi.string().valid('petrol', 'diesel', 'cng', 'hybrid', 'electric').optional(),
  seats: Joi.number().integer().min(2).max(15).optional(),
  color: Joi.string().optional().allow(''),
  description: Joi.string().optional().allow('').max(1000),
  daily_rate: Joi.number().min(500).optional(),
  deposit_amount: Joi.number().min(1000).optional(),
  branch_id: Joi.string().uuid().optional(),
}).min(1).messages({
  'object.min': 'At least one field is required for update',
});

const searchQuerySchema = Joi.object({
  brand: Joi.string().optional(),
  vehicle_type: Joi.string().valid('sedan', 'suv', 'hatchback', 'microbus', 'pickup', 'luxury').optional(),
  transmission: Joi.string().valid('automatic', 'manual').optional(),
  fuel_type: Joi.string().valid('petrol', 'diesel', 'cng', 'hybrid', 'electric').optional(),
  seats: Joi.number().integer().min(2).max(15).optional(),
  min_price: Joi.number().min(0).optional(),
  max_price: Joi.number().min(0).optional(),
  branch_id: Joi.string().uuid().optional(),
  start_date: Joi.date().iso().optional(),
  end_date: Joi.date().iso().optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(50).default(10),
  sort_by: Joi.string().valid('price', 'created_at', 'rating').default('created_at'),
  sort_order: Joi.string().valid('asc', 'desc').default('desc'),
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

const validateQuery = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.query, {
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
        message: 'Invalid query parameters',
        errors,
      });
    }
    
    req.query = value;
    next();
  };
};

module.exports = {
  validateCreateVehicle: validate(createVehicleSchema),
  validateUpdateVehicle: validate(updateVehicleSchema),
  validateSearchQuery: validateQuery(searchQuerySchema),
};