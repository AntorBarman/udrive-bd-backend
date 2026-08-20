const express = require('express');
const multer = require('multer');
const authMiddleware = require('../middlewares/auth');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');
const db = require('../config/database');
const cloudinary = require('../config/cloudinary');

const router = express.Router();

// Multer setup for document upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPG, PNG, and PDF files allowed'));
    }
  },
});

// Valid document types (match database constraint)
const VALID_DOCUMENT_TYPES = [
  'nid',
  'driving_license',
  'vehicle_rc',
  'insurance',
  'vehicle_photo',
  'other',
];

// Get my documents (owner KYC + vehicle documents)
router.get('/my', authMiddleware, asyncHandler(async (req, res) => {
  const result = await db.query(
    `SELECT d.*, 
            v.brand, v.model, v.year
     FROM documents d
     LEFT JOIN vehicles v ON d.vehicle_id = v.id
     WHERE d.user_id = $1
     ORDER BY d.created_at DESC`,
    [req.user.id]
  );
  
  res.json(ApiResponse.ok('Documents retrieved', result.rows));
}));

// Get documents for specific vehicle
router.get('/vehicle/:vehicleId', authMiddleware, asyncHandler(async (req, res) => {
  const { vehicleId } = req.params;
  
  const result = await db.query(
    `SELECT * FROM documents 
     WHERE user_id = $1 AND vehicle_id = $2
     ORDER BY created_at DESC`,
    [req.user.id, vehicleId]
  );
  
  res.json(ApiResponse.ok('Vehicle documents retrieved', result.rows));
}));

// Upload document (with multer + Cloudinary + vehicle_id support)
router.post('/upload', authMiddleware, upload.single('file'), asyncHandler(async (req, res) => {
  const { document_type, vehicle_id } = req.body;
  
  console.log('🔍 Upload request:', {
    document_type,
    vehicle_id,
    file: req.file ? {
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
    } : null,
  });
  
  // Validate document_type
  if (!document_type) {
    return res.status(400).json({
      success: false,
      message: 'Document type is required',
    });
  }
  
  if (!VALID_DOCUMENT_TYPES.includes(document_type)) {
    return res.status(400).json({
      success: false,
      message: `Invalid document type. Allowed: ${VALID_DOCUMENT_TYPES.join(', ')}`,
    });
  }
  
  // Validate file
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: 'File is required',
    });
  }
  
  // If vehicle_id provided, verify ownership
  let vehicleId = null;
  if (vehicle_id) {
    const vehicleResult = await db.query(
      'SELECT id FROM vehicles WHERE id = $1 AND owner_id = $2',
      [vehicle_id, req.user.id]
    );
    
    if (vehicleResult.rows.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'You do not own this vehicle',
      });
    }
    
    vehicleId = vehicle_id;
  }
  
  // Upload to Cloudinary
  let documentUrl = req.file.originalname;
  let publicId = null;
  
  try {
    const base64 = req.file.buffer.toString('base64');
    const dataURI = `data:${req.file.mimetype};base64,${base64}`;
    
    const cloudinaryResult = await cloudinary.uploader.upload(dataURI, {
      folder: 'udrive-bangladesh/documents',
      resource_type: 'auto',
      public_id: `doc_${req.user.id.slice(0, 8)}_${Date.now()}`,
    });
    
    documentUrl = cloudinaryResult.secure_url;
    publicId = cloudinaryResult.public_id;
    
    console.log('✅ Cloudinary upload success:', documentUrl);
  } catch (cloudinaryError) {
    console.warn('⚠️ Cloudinary upload failed, using filename:', cloudinaryError.message);
  }
  
  // Insert into database (with vehicle_id)
  const result = await db.query(
    `INSERT INTO documents (user_id, vehicle_id, document_type, document_url, public_id, status)
     VALUES ($1, $2, $3, $4, $5, 'pending')
     RETURNING *`,
    [req.user.id, vehicleId, document_type, documentUrl, publicId]
  );
  
  res.status(201).json(ApiResponse.created('Document uploaded successfully', result.rows[0]));
}));

// Delete document
router.delete('/:id', authMiddleware, asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  // Check ownership
  const docResult = await db.query(
    'SELECT * FROM documents WHERE id = $1 AND user_id = $2',
    [id, req.user.id]
  );
  
  if (docResult.rows.length === 0) {
    return res.status(404).json({
      success: false,
      message: 'Document not found',
    });
  }
  
  // Delete from Cloudinary
  const doc = docResult.rows[0];
  if (doc.public_id) {
    try {
      await cloudinary.uploader.destroy(doc.public_id);
    } catch (error) {
      console.warn('⚠️ Cloudinary delete failed:', error.message);
    }
  }
  
  // Delete from database
  await db.query('DELETE FROM documents WHERE id = $1', [id]);
  
  res.json(ApiResponse.ok('Document deleted successfully'));
}));

module.exports = router;